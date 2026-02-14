import os
import logging
import time
from typing import Dict, List, Optional, Any, Union, AsyncGenerator
from enum import Enum
from dataclasses import dataclass
import asyncio
import aiohttp
try:
    import aiohttp.client_exceptions
except ImportError:
    pass

# Monkey-patch aiohttp for google-genai compatibility
if not hasattr(aiohttp, 'ClientConnectorDNSError'):
    try:
        # Define the missing exception
        base_exc = getattr(aiohttp, 'ClientConnectorError', Exception)
        
        class ClientConnectorDNSError(base_exc):
            pass
            
        # Patch main module
        setattr(aiohttp, 'ClientConnectorDNSError', ClientConnectorDNSError)
        
        # Patch client_exceptions module if available
        if hasattr(aiohttp, 'client_exceptions'):
            setattr(aiohttp.client_exceptions, 'ClientConnectorDNSError', ClientConnectorDNSError)
            
    except Exception as e:
        pass

# Providers
import openai
from openai import AsyncOpenAI
from google import genai
from google.genai import types
import anthropic
import cohere

logger = logging.getLogger(__name__)

class ModelProvider(Enum):
    OPENAI = "openai"
    GOOGLE = "google"
    ANTHROPIC = "anthropic"
    COHERE = "cohere"
    HUGGINGFACE = "huggingface"
    OLLAMA = "ollama"
    MOCK = "mock"

@dataclass
class ModelConfig:
    provider: ModelProvider
    model_name: str
    max_tokens: int = 2000
    temperature: float = 0.7
    cost_per_1k_tokens: float = 0.0
    supports_streaming: bool = True

class LLMProvider:
    def __init__(self):
        self.clients = {}
        self.google_keys = []
        self.models = {
            'gpt-4-turbo': ModelConfig(ModelProvider.OPENAI, 'gpt-4-turbo-preview', max_tokens=4000, cost_per_1k_tokens=0.03),
            'gpt-3.5-turbo': ModelConfig(ModelProvider.OPENAI, 'gpt-3.5-turbo', max_tokens=4000, cost_per_1k_tokens=0.002),
            'gemini-1.5-flash': ModelConfig(ModelProvider.GOOGLE, 'gemini-flash-latest', max_tokens=8192, cost_per_1k_tokens=0.0005),
            'gemini-1.5-pro': ModelConfig(ModelProvider.GOOGLE, 'gemini-pro-latest', max_tokens=2048, cost_per_1k_tokens=0.001),
            'gemini-2.0-flash': ModelConfig(ModelProvider.GOOGLE, 'gemini-2.0-flash', max_tokens=8192, cost_per_1k_tokens=0.0005),
            'gemini-2.0-flash-lite': ModelConfig(ModelProvider.GOOGLE, 'gemini-2.0-flash-lite', max_tokens=8192, cost_per_1k_tokens=0.0005),
            'claude-3-sonnet': ModelConfig(ModelProvider.ANTHROPIC, 'claude-3-sonnet-20240229', max_tokens=4000, cost_per_1k_tokens=0.015),
            'command-r': ModelConfig(ModelProvider.COHERE, 'command-r', max_tokens=4000, cost_per_1k_tokens=0.0005),
            'mistral-7b': ModelConfig(ModelProvider.HUGGINGFACE, 'mistralai/Mistral-7B-Instruct-v0.2', max_tokens=2048),
            'llama3': ModelConfig(ModelProvider.OLLAMA, 'llama3', max_tokens=4000)
        }
        self._init_clients()
        
    def _init_clients(self):
        # OpenAI
        if os.getenv('OPENAI_API_KEY'):
            self.clients[ModelProvider.OPENAI] = AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        # Google - Load all available keys for rotation
        google_key = os.getenv('GOOGLE_API_KEY')
        if google_key:
            # Support multiple keys separated by commas
            self.google_keys = [k.strip() for k in google_key.split(',') if k.strip()]
            
        # Google Client is initialized per-request in _call_google to avoid asyncio loop issues
            
        # Anthropic
        if os.getenv('ANTHROPIC_API_KEY'):
            self.clients[ModelProvider.ANTHROPIC] = anthropic.AsyncAnthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
            
        # Cohere
        if os.getenv('COHERE_API_KEY'):
            self.clients[ModelProvider.COHERE] = cohere.AsyncClient(api_key=os.getenv('COHERE_API_KEY'))
            
        # HuggingFace (using requests/httpx since no official async sdk is standard for inference api in this env)
        if os.getenv('HUGGINGFACE_API_KEY'):
            self.clients[ModelProvider.HUGGINGFACE] = os.getenv('HUGGINGFACE_API_KEY')
            
        # Ollama
        if os.getenv('ENABLE_LOCAL_MODELS', 'false').lower() == 'true':
            self.clients[ModelProvider.OLLAMA] = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')

    async def generate_response(
        self, 
        prompt: Union[str, List[Any]], 
        model_name: Optional[str] = None,
        system_prompt: Optional[str] = None,
        tried_models: Optional[List[str]] = None,
        **kwargs
    ) -> Union[str, Dict[str, Any]]:
        if model_name is None:
            model_name = os.getenv('DEFAULT_LLM_MODEL', 'gemini-2.0-flash-lite')
            
        if tried_models is None:
            tried_models = []
            
        # Check for model cooldown (skip if it failed recently)
        if not tried_models and hasattr(self, 'cooldowns') and model_name in self.cooldowns:
            if time.time() < self.cooldowns[model_name]:
                logger.info(f"Model {model_name} is in cooldown. Switching to fallback.")
                # Force switch to next best gemini or openai
                fallback_preference = ["gemini-1.5-flash", "gemini-2.0-flash", "gpt-3.5-turbo"]
                for m in fallback_preference:
                    if m != model_name and m not in tried_models:
                        return await self.generate_response(prompt, m, system_prompt, tried_models=[model_name], **kwargs)

        tried_models.append(model_name)
        
        # Resolve model alias if defined in configuration
        target_model = model_name
        if model_name in self.models:
            target_model = self.models[model_name].model_name

        provider = self._get_provider_for_model(model_name)
        
        if provider == ModelProvider.MOCK or (provider not in self.clients and (provider != ModelProvider.GOOGLE or not os.getenv('GOOGLE_API_KEY'))):
            return f"Mock response ({model_name} not configured): {self._generate_mock_response(prompt)}"

        try:
            if provider == ModelProvider.OPENAI:
                return await self._call_openai(prompt, target_model, system_prompt, **kwargs)
            elif provider == ModelProvider.GOOGLE:
                return await self._call_google(prompt, target_model, system_prompt, **kwargs)
            elif provider == ModelProvider.ANTHROPIC:
                return await self._call_anthropic(prompt, target_model, system_prompt, **kwargs)
            elif provider == ModelProvider.COHERE:
                return await self._call_cohere(prompt, target_model, system_prompt, **kwargs)
            elif provider == ModelProvider.HUGGINGFACE:
                return await self._call_huggingface(prompt, target_model, system_prompt, **kwargs)
            elif provider == ModelProvider.OLLAMA:
                return await self._call_ollama(prompt, target_model, system_prompt, **kwargs)
        except Exception as e:
            error_str = str(e).upper()
            
            # Quota/Rate limit detection (429, 503, RESOURCE_EXHAUSTED, UNAVAILABLE, QUOTA)
            if any(code in error_str for code in ["429", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE", "QUOTA"]):
                logger.warning(f"Quota/Rate limit hit for {model_name} (Attempt {len(tried_models)}).")
                
                # Add model to cooldown (60 seconds)
                if not hasattr(self, 'cooldowns'):
                    self.cooldowns = {}
                self.cooldowns[model_name] = time.time() + 60
                
                # Multi-provider fallback chain
                if provider == ModelProvider.GOOGLE:
                    # Try other Gemini models first
                    gemini_fallback = ["gemini-2.0-flash-lite", "gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]
                    
                    next_model = None
                    for m in gemini_fallback:
                        if m not in tried_models:
                            next_model = m
                            break
                    
                    if next_model:
                        logger.info(f"Fallback: Switching from {model_name} to {next_model}")
                        return await self.generate_response(
                            prompt, 
                            model_name=next_model, 
                            system_prompt=system_prompt, 
                            tried_models=tried_models,
                            **kwargs
                        )
                    
                    # All Gemini models failed, try OpenAI
                    if ModelProvider.OPENAI in self.clients and "gpt-3.5-turbo" not in tried_models:
                        logger.info(f"All Gemini models exhausted. Falling back to OpenAI GPT-3.5-turbo")
                        return await self.generate_response(
                            prompt,
                            model_name="gpt-3.5-turbo",
                            system_prompt=system_prompt,
                            tried_models=tried_models,
                            **kwargs
                        )
                    
                    # Try Anthropic as last resort
                    if ModelProvider.ANTHROPIC in self.clients and "claude-3-sonnet" not in tried_models:
                        logger.info(f"OpenAI also unavailable. Falling back to Claude")
                        return await self.generate_response(
                            prompt,
                            model_name="claude-3-sonnet",
                            system_prompt=system_prompt,
                            tried_models=tried_models,
                            **kwargs
                        )
                    
                    # Try Cohere as last resort
                    if ModelProvider.COHERE in self.clients and "command-r" not in tried_models:
                        logger.info(f"Google, OpenAI, and Anthropic unavailable. Falling back to Cohere")
                        return await self.generate_response(
                            prompt,
                            model_name="command-r",
                            system_prompt=system_prompt,
                            tried_models=tried_models,
                            **kwargs
                        )
                    
                    # Try HuggingFace
                    if ModelProvider.HUGGINGFACE in self.clients and "mistral-7b" not in tried_models:
                        logger.info(f"Adding HuggingFace to fallback chain")
                        return await self.generate_response(
                            prompt,
                            model_name="mistral-7b",
                            system_prompt=system_prompt,
                            tried_models=tried_models,
                            **kwargs
                        )
                        
                    # Final Local Fallback (Ollama)
                    if ModelProvider.OLLAMA in self.clients and "llama3" not in tried_models:
                        logger.info(f"Using local Ollama as ultimate backup")
                        return await self.generate_response(
                            prompt,
                            model_name="llama3",
                            system_prompt=system_prompt,
                            tried_models=tried_models,
                            **kwargs
                        )
                
                # If we get here, all providers failed
                logger.error(f"All AI providers exhausted after trying: {tried_models}")
                return (
                    "I'm currently experiencing issues with all AI providers. "
                    "This could be due to rate limits or service unavailability. "
                    "Please try again in a few minutes."
                )
            
            logger.error(f"LLM Provider error ({model_name}): {str(e)}")
            return f"AI Error ({model_name}): {str(e)}. Please check your API key."

    def _get_provider_for_model(self, model_name: str) -> ModelProvider:
        if "gpt" in model_name:
            return ModelProvider.OPENAI
        if "gemini" in model_name:
            return ModelProvider.GOOGLE
        if "claude" in model_name:
            return ModelProvider.ANTHROPIC
        if "command" in model_name or "cohere" in model_name:
            return ModelProvider.COHERE
        if "/" in model_name or "huggingface" in model_name or "mistral" in model_name:
            return ModelProvider.HUGGINGFACE
        if "llama" in model_name or "ollama" in model_name:
            return ModelProvider.OLLAMA
        return ModelProvider.MOCK

    async def _call_openai(self, prompt, model, system, **kwargs):
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        
        # Handle list vs string
        content = prompt
        if isinstance(prompt, list):
            content = " ".join([str(p) for p in prompt if isinstance(p, str)])
            
        messages.append({"role": "user", "content": content})
        
        response = await self.clients[ModelProvider.OPENAI].chat.completions.create(
            model=model,
            messages=messages,
            **kwargs
        )
        return response.choices[0].message.content

    async def _call_google(self, prompt, model_name, system, **kwargs):
        import random
        
        # 1. Select a key (Randomized load balancing)
        if not self.google_keys:
             return "Error: GOOGLE_API_KEY not found."
        
        # Function to try a specific key
        async def try_with_key(api_key, attempt_num=0):
            client = genai.Client(api_key=api_key)
            
            contents = prompt if isinstance(prompt, list) else [{"role": "user", "parts": [{"text": str(prompt)}]}]
            tools = kwargs.get('tools')
            
            try:
                response = await client.aio.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        temperature=kwargs.get('temperature', 0.7),
                        top_p=kwargs.get('top_p', 0.9),
                        system_instruction=system,
                        tools=tools
                    )
                )
                return response
            except Exception as e:
                # If quota exceeded and we have other keys, raise special exception to trigger retry
                error_msg = str(e).upper()
                if any(code in error_msg for code in ["429", "RESOURCE_EXHAUSTED", "QUOTA"]) and len(self.google_keys) > 1 and attempt_num < 3:
                    raise ResourceWarning("Quota exceeded - trigger key rotation")
                raise e

        # 2. Key Rotation / Retry Loop
        current_key = random.choice(self.google_keys)
        response = None
        
        try:
            response = await try_with_key(current_key)
        except ResourceWarning:
            # Rate limit hit -> Try one more time with a different key
            new_key = random.choice([k for k in self.google_keys if k != current_key])
            logger.info(f"Rate limited on key ...{current_key[-4:]}. Rotating to ...{new_key[-4:]}")
            response = await try_with_key(new_key, attempt_num=1)
        

        
        # Handle Tool Calls
        tool_calls = []
        content_parts = []
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                # Serialize the part as a dict to preserve all fields (thought_signature, etc.)
                part_dict = part.model_dump(exclude_none=True)
                content_parts.append(part_dict)
                
                if part.function_call:
                    tool_calls.append({
                        "name": part.function_call.name,
                        "args": part.function_call.args
                    })
        
        if tool_calls:
            return {
                "tool_calls": tool_calls, 
                "model_message": {"role": "model", "parts": content_parts},
                "text": "".join([p.text for p in response.candidates[0].content.parts if p.text]) or ""
            }
        
        return response.text

    async def _call_anthropic(self, prompt, model, system, **kwargs):
        content = prompt
        if isinstance(prompt, list):
            content = " ".join([str(p) for p in prompt if isinstance(p, str)])
            
        response = await self.clients[ModelProvider.ANTHROPIC].messages.create(
            model=model,
            max_tokens=kwargs.get('max_tokens', 2000),
            system=system,
            messages=[{"role": "user", "content": content}]
        )
        return response.content[0].text

    async def _call_cohere(self, prompt, model, system, **kwargs):
        content = prompt
        if isinstance(prompt, list):
            content = " ".join([str(p) for p in prompt if isinstance(p, str)])
            
        chat_history = []
        if system:
            chat_history.append({"role": "SYSTEM", "message": system})
            
        response = await self.clients[ModelProvider.COHERE].chat(
            model=model,
            message=content,
            chat_history=chat_history,
            **kwargs
        )
        return response.text

    async def _call_huggingface(self, prompt, model, system, **kwargs):
        api_key = self.clients[ModelProvider.HUGGINGFACE]
        api_url = f"https://api-inference.huggingface.co/models/{model}"
        headers = {"Authorization": f"Bearer {api_key}"}
        
        content = prompt
        if isinstance(prompt, list):
            content = " ".join([str(p) for p in prompt if isinstance(p, str)])
            
        full_prompt = f"System: {system}\nUser: {content}\nAssistant:" if system else f"User: {content}\nAssistant:"
        
        payload = {
            "inputs": full_prompt,
            "parameters": {"max_new_tokens": kwargs.get('max_tokens', 1000), "temperature": kwargs.get('temperature', 0.7)}
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(api_url, headers=headers, json=payload) as response:
                if response.status != 200:
                    raise Exception(f"HuggingFace API error: {await response.text()}")
                result = await response.json()
                # HF returns a list of dicts with generated_text
                if isinstance(result, list) and len(result) > 0:
                    text = result[0].get('generated_text', '')
                    # Strip the prompt if it's included
                    if text.startswith(full_prompt):
                        text = text[len(full_prompt):].strip()
                    return text
                return str(result)

    async def _call_ollama(self, prompt, model, system, **kwargs):
        base_url = self.clients[ModelProvider.OLLAMA]
        api_url = f"{base_url}/api/generate"
        
        content = prompt
        if isinstance(prompt, list):
            content = " ".join([str(p) for p in prompt if isinstance(p, str)])
            
        payload = {
            "model": model,
            "prompt": f"System: {system}\nUser: {content}" if system else content,
            "stream": False,
            "options": {
                "num_predict": kwargs.get('max_tokens', 1000),
                "temperature": kwargs.get('temperature', 0.7)
            }
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(api_url, json=payload) as response:
                if response.status != 200:
                    raise Exception(f"Ollama API error: {await response.text()}")
                result = await response.json()
                return result.get('response', '')

    def get_available_models(self) -> Dict[str, Any]:
        available = {}
        for key, config in self.models.items():
            # Check if provider is configured
            if config.provider == ModelProvider.MOCK or config.provider in self.clients or (config.provider == ModelProvider.GOOGLE and os.getenv('GOOGLE_API_KEY')):
                available[key] = {
                    'provider': config.provider.value,
                    'model_name': config.model_name,
                    'max_tokens': config.max_tokens,
                    'cost_per_1k_tokens': config.cost_per_1k_tokens,
                    'supports_streaming': config.supports_streaming
                }
            elif config.provider == ModelProvider.GOOGLE and self.google_keys:
                 # Special check for Google keys (since they are in a list, not client map)
                 available[key] = {
                    'provider': config.provider.value,
                    'model_name': config.model_name,
                    'max_tokens': config.max_tokens,
                    'cost_per_1k_tokens': config.cost_per_1k_tokens,
                    'supports_streaming': config.supports_streaming
                }

        return available

    def _generate_mock_response(self, prompt: str) -> str:
        # Simplified mock for now
        if "packing list" in prompt.lower():
            return '[{"item": "Passport", "category": "Documents", "quantity": 1, "reason": "Required"}]'
        return "I'm RoamIQ, currently in demo mode. Please configure API keys to unlock my full potential."

llm_provider = LLMProvider()

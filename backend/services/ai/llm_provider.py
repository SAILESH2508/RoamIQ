import os
import logging
import time
from typing import Dict, List, Optional, Any, Union, AsyncGenerator
from enum import Enum
from dataclasses import dataclass

# Providers
import openai
from openai import AsyncOpenAI
from google import genai
from google.genai import types
import anthropic

logger = logging.getLogger(__name__)

class ModelProvider(Enum):
    OPENAI = "openai"
    GOOGLE = "google"
    ANTHROPIC = "anthropic"
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
        self.models = {
            'gpt-4-turbo': ModelConfig(ModelProvider.OPENAI, 'gpt-4-turbo-preview', max_tokens=4000, cost_per_1k_tokens=0.03),
            'gpt-3.5-turbo': ModelConfig(ModelProvider.OPENAI, 'gpt-3.5-turbo', max_tokens=4000, cost_per_1k_tokens=0.002),
            'gemini-1.5-flash': ModelConfig(ModelProvider.GOOGLE, 'gemini-flash-latest', max_tokens=8192, cost_per_1k_tokens=0.0005),
            'gemini-1.5-pro': ModelConfig(ModelProvider.GOOGLE, 'gemini-pro-latest', max_tokens=2048, cost_per_1k_tokens=0.001),
            'gemini-2.0-flash': ModelConfig(ModelProvider.GOOGLE, 'gemini-2.0-flash', max_tokens=8192, cost_per_1k_tokens=0.0005),
            'gemini-2.0-flash-lite': ModelConfig(ModelProvider.GOOGLE, 'gemini-2.0-flash-lite', max_tokens=8192, cost_per_1k_tokens=0.0005),
            'claude-3-sonnet': ModelConfig(ModelProvider.ANTHROPIC, 'claude-3-sonnet-20240229', max_tokens=4000, cost_per_1k_tokens=0.015)
        }
        self._init_clients()
        
    def _init_clients(self):
        # OpenAI
        if os.getenv('OPENAI_API_KEY'):
            self.clients[ModelProvider.OPENAI] = AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        # Google (Updated to google-genai)
        if os.getenv('GOOGLE_API_KEY'):
            self.clients[ModelProvider.GOOGLE] = genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))
            
        # Anthropic
        if os.getenv('ANTHROPIC_API_KEY'):
            self.clients[ModelProvider.ANTHROPIC] = anthropic.AsyncAnthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))

    async def generate_response(
        self, 
        prompt: Union[str, List[Any]], 
        model_name: str = "gemini-1.5-flash",
        system_prompt: Optional[str] = None,
        tried_models: Optional[List[str]] = None,
        **kwargs
    ) -> str:
        if tried_models is None:
            tried_models = []
            
        tried_models.append(model_name)
        
        # Resolve model alias if defined in configuration
        target_model = model_name
        if model_name in self.models:
            target_model = self.models[model_name].model_name

        provider = self._get_provider_for_model(model_name)
        
        if provider == ModelProvider.MOCK or provider not in self.clients:
            return f"Mock response ({model_name} not configured): {self._generate_mock_response(prompt)}"

        try:
            if provider == ModelProvider.OPENAI:
                return await self._call_openai(prompt, target_model, system_prompt, **kwargs)
            elif provider == ModelProvider.GOOGLE:
                return await self._call_google(prompt, target_model, system_prompt, **kwargs)
            elif provider == ModelProvider.ANTHROPIC:
                return await self._call_anthropic(prompt, target_model, system_prompt, **kwargs)
        except Exception as e:
            error_str = str(e).upper()
            
            # Quota/Rate limit detection
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "QUOTA" in error_str:
                logger.warning(f"Quota hit for {model_name} (Attempt {len(tried_models)}).")
                
                # Multi-model fallback chain for Gemini
                if provider == ModelProvider.GOOGLE:
                    fallback_chain = ["gemini-2.0-flash-lite", "gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]
                    
                    # Try finding the next model in the chain that hasn't been tried
                    next_model = None
                    for m in fallback_chain:
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
                
                logger.warning(f"All fallback models failed OR Rate Limit reached for non-Google provider ({model_name}).")
                return (
                    "I'm currently receiving too many requests or my API quota is exhausted. "
                    "As I'm running on a free-tier Gemini plan, limits are very strict. "
                    "Please try again in a few minutes or try a shorter message."
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
        client = self.clients[ModelProvider.GOOGLE]
        
        contents = prompt if isinstance(prompt, list) else [prompt]
        
        # Retry parameters
        max_retries = 3
        base_delay = 2
        
        for attempt in range(max_retries):
            try:
                # New SDK call
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        temperature=kwargs.get('temperature', 0.7),
                        top_p=kwargs.get('top_p', 0.9),
                        system_instruction=system
                    )
                )
                return response.text
                
            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    if attempt < max_retries - 1:
                        wait_time = base_delay * (2 ** attempt)
                        logger.warning(f"Quota hit for {model_name}. Retrying in {wait_time}s (Attempt {attempt+1}/{max_retries})...")
                        import asyncio
                        await asyncio.sleep(wait_time)
                        continue
                # If not 429 or max retries reached, re-raise
                raise e

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

    def get_available_models(self) -> Dict[str, Any]:
        available = {}
        for key, config in self.models.items():
            # Check if provider is configured
            if config.provider == ModelProvider.MOCK or config.provider in self.clients:
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

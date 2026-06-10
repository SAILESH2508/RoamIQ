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
        else:
            # Create client_exceptions module if it doesn't exist
            class ClientExceptions:
                ClientConnectorDNSError = ClientConnectorDNSError
            setattr(aiohttp, 'client_exceptions', ClientExceptions())
            
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
        self.cooldowns = {}
        self.clients = {}
        self.client_loops = {}
        
        self.models = {
            'gpt-4o-mini': ModelConfig(ModelProvider.OPENAI, 'gpt-4o-mini', max_tokens=16000, cost_per_1k_tokens=0.00015),
            'gpt-4o': ModelConfig(ModelProvider.OPENAI, 'gpt-4o', max_tokens=4000, cost_per_1k_tokens=0.03),
            'gemini-1.5-flash': ModelConfig(ModelProvider.GOOGLE, 'gemini-1.5-flash', max_tokens=8192, cost_per_1k_tokens=0.0005),
            'gemini-1.5-pro': ModelConfig(ModelProvider.GOOGLE, 'gemini-1.5-pro', max_tokens=8192, cost_per_1k_tokens=0.001),
            'gemini-2.0-flash': ModelConfig(ModelProvider.GOOGLE, 'gemini-2.0-flash', max_tokens=8192, cost_per_1k_tokens=0.0005),
            'gemini-2.0-flash-v2': ModelConfig(ModelProvider.GOOGLE, 'gemini-2.0-flash', max_tokens=8192, cost_per_1k_tokens=0.0005),
            'gemini-2.5-flash': ModelConfig(ModelProvider.GOOGLE, 'gemini-2.5-flash', max_tokens=8192, cost_per_1k_tokens=0.0005),
            'gemini-3.5-flash': ModelConfig(ModelProvider.GOOGLE, 'gemini-3.5-flash', max_tokens=8192, cost_per_1k_tokens=0.0005),
            'claude-3-5-sonnet': ModelConfig(ModelProvider.ANTHROPIC, 'claude-3-5-sonnet-20240620', max_tokens=8192, cost_per_1k_tokens=0.015),
            'command-r-plus': ModelConfig(ModelProvider.COHERE, 'command-r-plus-08-2024', max_tokens=4000, cost_per_1k_tokens=0.0005),
            'offline-mock': ModelConfig(ModelProvider.MOCK, 'offline-mock', max_tokens=2000)
        }
        self._load_keys()

    def _load_keys(self):
        """Load API keys from environment."""
        def split_keys(env_var):
            val = os.getenv(env_var)
            return [k.strip() for k in val.split(',') if k.strip()] if val else []

        self.openai_keys = split_keys('OPENAI_API_KEY')
        self.google_keys = split_keys('GOOGLE_API_KEY')
        self.anthropic_keys = split_keys('ANTHROPIC_API_KEY')
        self.cohere_keys = split_keys('COHERE_API_KEY')
        self.hf_key = os.getenv('HUGGINGFACE_API_KEY')
        self.ollama_url = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434') if os.getenv('ENABLE_LOCAL_MODELS', 'false').lower() == 'true' else None

    async def _get_client(self, provider: ModelProvider, key_idx: int = 0) -> Any:
        """Lazy initialization of clients with key rotation support and resilience."""
        current_loop = None
        try:
            current_loop = asyncio.get_running_loop()
            if current_loop.is_closed():
                current_loop = None
        except RuntimeError:
            pass

        client_key = f"{provider.value}_{key_idx % 10}"
        client = self.clients.get(client_key)
        cached_loop = self.client_loops.get(client_key)

        # If loop changed, loop closed, or client never initialized, re-init
        loop_invalid = not cached_loop or (current_loop and cached_loop != current_loop) or (cached_loop and cached_loop.is_closed())
        
        if not client or loop_invalid:
            try:
                # Close old client if possible to prevent leaks
                if client:
                    try:
                        if hasattr(client, 'close'):
                            if asyncio.iscoroutinefunction(client.close):
                                await client.close()
                            else:
                                client.close()
                    except Exception as close_e:
                        logger.warning(f"Failed to close old client: {close_e}")

                if provider == ModelProvider.OPENAI and self.openai_keys:
                    key = self.openai_keys[key_idx % len(self.openai_keys)]
                    try:
                        # Attempt to initialize with http_client to avoid 'proxies' argument bug in some httpx versions
                        import httpx
                        http_client = httpx.AsyncClient(verify=False)
                        client = AsyncOpenAI(api_key=key, http_client=http_client)
                    except Exception as e:
                        logger.warning(f"Failed to init OpenAI with custom http_client: {e}. Trying default.")
                        client = AsyncOpenAI(api_key=key)
                elif provider == ModelProvider.GOOGLE and self.google_keys:
                    key = self.google_keys[key_idx % len(self.google_keys)]
                    # google-genai client handles its own loop or uses current
                    client = genai.Client(api_key=key)
                elif provider == ModelProvider.ANTHROPIC and self.anthropic_keys:
                    key = self.anthropic_keys[key_idx % len(self.anthropic_keys)]
                    client = anthropic.AsyncAnthropic(api_key=key)
                elif provider == ModelProvider.COHERE and self.cohere_keys:
                    key = self.cohere_keys[key_idx % len(self.cohere_keys)]
                    # Use newest Cohere client
                    client = cohere.AsyncClient(api_key=key)
                
                if client:
                    self.clients[client_key] = client
                    self.client_loops[client_key] = current_loop
            except Exception as e:
                logger.error(f"Failed to initialize {provider} client: {e}")
                return None
        
        return client

    async def generate_response(
        self, 
        prompt: Union[str, List[Any]], 
        model_name: Optional[str] = None,
        system_prompt: Optional[str] = None,
        tried_models: Optional[List[str]] = None,
        timeout: float = 25.0,
        **kwargs
    ) -> Union[str, Dict[str, Any]]:
        # Backend-only choice for the "best" available model
        if model_name is None:
            model_name = os.getenv('DEFAULT_LLM_MODEL', 'gemini-3.5-flash')
            if model_name not in self.models:
                model_name = 'gemini-2.5-flash'
            
        if tried_models is None:
            tried_models = []

        # 1. Cooldown Check
        if model_name in self.cooldowns:
            if time.time() < self.cooldowns[model_name]:
                logger.debug(f"Model {model_name} in cooldown. Selecting fallback.")
                next_best = self._select_best_fallback(tried_models + [model_name])
                if next_best:
                    return await self.generate_response(prompt, next_best, system_prompt, tried_models + [model_name], timeout, **kwargs)

        tried_models.append(model_name)
        provider = self._get_provider_for_model(model_name)
        
        # Resolve model name
        config = self.models.get(model_name)
        target_model = config.model_name if config else model_name

        # 2. Key-Level Retry/Rotation Loop
        num_keys = 0
        if provider == ModelProvider.OPENAI: num_keys = len(self.openai_keys)
        elif provider == ModelProvider.GOOGLE: num_keys = len(self.google_keys)
        elif provider == ModelProvider.ANTHROPIC: num_keys = len(self.anthropic_keys)
        elif provider == ModelProvider.COHERE: num_keys = len(self.cohere_keys)
        
        max_attempts = max(1, num_keys)
        
        for k_idx in range(max_attempts):
            try:
                # Remove model from kwargs to avoid parameter conflicts
                clean_kwargs = {k: v for k, v in kwargs.items() if k != 'model'}
                
                if provider == ModelProvider.OPENAI:
                    client = await self._get_client(provider, k_idx)
                    return await asyncio.wait_for(self._call_openai(client, prompt, target_model, system_prompt, **clean_kwargs), timeout=timeout)
                elif provider == ModelProvider.GOOGLE:
                    client = await self._get_client(provider, k_idx)
                    return await asyncio.wait_for(self._call_google(client, prompt, target_model, system_prompt, **clean_kwargs), timeout=timeout)
                elif provider == ModelProvider.ANTHROPIC:
                    client = await self._get_client(provider, k_idx)
                    return await asyncio.wait_for(self._call_anthropic(client, prompt, target_model, system_prompt, **clean_kwargs), timeout=timeout)
                elif provider == ModelProvider.COHERE:
                    client = await self._get_client(provider, k_idx)
                    return await asyncio.wait_for(self._call_cohere(client, prompt, target_model, system_prompt, **clean_kwargs), timeout=timeout)
                elif provider == ModelProvider.OLLAMA and self.ollama_url:
                    return await asyncio.wait_for(self._call_ollama(prompt, target_model, system_prompt, **clean_kwargs), timeout=timeout)
                elif provider == ModelProvider.HUGGINGFACE and self.hf_key:
                    return await asyncio.wait_for(self._call_huggingface(prompt, target_model, system_prompt, **clean_kwargs), timeout=timeout)
                elif provider == ModelProvider.MOCK:
                    return await self._call_mock(prompt, system_prompt, **clean_kwargs)
                else:
                    raise Exception(f"Provider {provider} not configured")

            except (asyncio.TimeoutError, Exception) as e:
                err_msg = str(e).upper()
                
                # Check for critical re-init triggers
                reinit_needed = any(x in err_msg for x in ["EVENT LOOP IS CLOSED", "CANNOT SCHEDULE NEW FUTURES", "SHUTDOWN"])
                if reinit_needed:
                    logger.warning(f"Critical error on {model_name}: {e}. Clearing client cache for {provider}.")
                    for cache_key in list(self.clients.keys()):
                        if cache_key.startswith(provider.value):
                            self.clients.pop(cache_key, None)
                    if k_idx < max_attempts - 1: continue 
                
                is_rate_limit = any(x in err_msg for x in ["429", "QUOTA", "RESOURCES_EXHAUSTED", "LIMIT", "OVERLOADED"])
                
                if is_rate_limit:
                    if k_idx < max_attempts - 1:
                        logger.warning(f"Key {k_idx} for {model_name} rate limited. Rotating key...")
                        continue
                    
                    # If all keys for this model are exhausted, wait a bit before model-level fallback
                    backoff_time = 2 ** (len(tried_models)) # Exponential wait based on how many fallbacks we've tried
                    logger.warning(f"All keys for {model_name} exhausted. Backing off {backoff_time}s...")
                    await asyncio.sleep(backoff_time)
                
                # If we're here, we need to try a different model
                logger.error(f"Model {model_name} failed definitively: {e}. Attempting fallback.")
                self.cooldowns[model_name] = time.time() + 60 # 1 minute cooldown
                
                next_model = self._select_best_fallback(tried_models)
                if next_model:
                     return await self.generate_response(prompt, next_model, system_prompt, tried_models, timeout, **kwargs)
                
                return f"AI system failure. All fallbacks exhausted. Final error: {e}"

    def _select_best_fallback(self, tried_models: List[str]) -> Optional[str]:
        chain = ['gemini-3.5-flash', 'gemini-2.5-flash', 'command-r-plus', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gpt-4o-mini', 'offline-mock']
        for model in chain:
            if model not in tried_models:
                p = self._get_provider_for_model(model)
                if p == ModelProvider.GOOGLE and self.google_keys: return model
                if p == ModelProvider.OPENAI and self.openai_keys: return model
                if p == ModelProvider.ANTHROPIC and self.anthropic_keys: return model
                if p == ModelProvider.COHERE and self.cohere_keys: return model
                if p == ModelProvider.MOCK: return model
        return None

    def _get_provider_for_model(self, model_name: str) -> ModelProvider:
        m = model_name.lower()
        if "gpt" in m: return ModelProvider.OPENAI
        if "gemini" in m: return ModelProvider.GOOGLE
        if "claude" in m: return ModelProvider.ANTHROPIC
        if "command" in m: return ModelProvider.COHERE
        if "llama" in m: return ModelProvider.OLLAMA
        if "/" in m: return ModelProvider.HUGGINGFACE
        return ModelProvider.MOCK

    def _stringify_prompt(self, prompt: Any) -> str:
        if isinstance(prompt, str): return prompt
        if isinstance(prompt, list):
            texts = []
            for p in prompt:
                if isinstance(p, str): texts.append(p)
                elif isinstance(p, dict):
                    parts = p.get('parts', [])
                    for pt in parts:
                        if isinstance(pt, dict) and 'text' in pt: texts.append(pt['text'])
                        elif isinstance(pt, str): texts.append(pt)
            return "\n".join(texts)
        return str(prompt)

    async def _call_openai(self, client, prompt, model, system, **kwargs):
        messages = []
        if system: messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": self._stringify_prompt(prompt)})
        res = await client.chat.completions.create(model=model, messages=messages, **{k:v for k,v in kwargs.items() if k != 'tools'})
        return res.choices[0].message.content

    async def _call_google(self, client, prompt, model, system, **kwargs):
        from google.genai import types
        contents = prompt if isinstance(prompt, list) else [{"role": "user", "parts": [{"text": str(prompt)}]}]
        tools = kwargs.get('tools') or []
        
        # Ensure model doesn't have double prefix
        clean_model = model.replace('models/', '')
        
        try:
            config = types.GenerateContentConfig(
                temperature=kwargs.get('temperature', 0.7),
                system_instruction=system,
                tools=tools
            )
            res = await client.aio.models.generate_content(
                model=clean_model,
                contents=contents,
                config=config
            )
            
            t_calls = []
            p_list = []
            if res.candidates and res.candidates[0].content.parts:
                for p in res.candidates[0].content.parts:
                    if p.function_call:
                        t_calls.append({"name": p.function_call.name, "args": p.function_call.args})
                        p_list.append({"function_call": {"name": p.function_call.name, "args": p.function_call.args}})
                    elif p.text:
                        p_list.append({"text": p.text})
            
            if t_calls:
                return {
                    "tool_calls": t_calls,
                    "model_message": {"role": "model", "parts": p_list},
                    "text": res.text
                }
            return res.text or "No response"
        except Exception as e:
            if "NOT_FOUND" in str(e).upper():
                # Try with models/ prefix if it failed without it
                fallback_config = types.GenerateContentConfig(
                    temperature=kwargs.get('temperature', 0.7),
                    system_instruction=system,
                    tools=tools
                )
                res = await client.aio.models.generate_content(
                    model=f"models/{clean_model}",
                    contents=contents,
                    config=fallback_config
                )
                
                t_calls = []
                p_list = []
                if res.candidates and res.candidates[0].content.parts:
                    for p in res.candidates[0].content.parts:
                        if p.function_call:
                            t_calls.append({"name": p.function_call.name, "args": p.function_call.args})
                            p_list.append({"function_call": {"name": p.function_call.name, "args": p.function_call.args}})
                        elif p.text:
                            p_list.append({"text": p.text})
                
                if t_calls:
                    return {
                        "tool_calls": t_calls,
                        "model_message": {"role": "model", "parts": p_list},
                        "text": res.text
                    }
                return res.text or "No response"
            raise e

    async def _call_anthropic(self, client, prompt, model, system, **kwargs):
        res = await client.messages.create(model=model, max_tokens=kwargs.get('max_tokens', 2000), system=system, messages=[{"role": "user", "content": self._stringify_prompt(prompt)}])
        return res.content[0].text

    async def _call_cohere(self, client, prompt, model, system, **kwargs):
        try:
            # Build request parameters
            request_params = {
                'model': model,
                'message': self._stringify_prompt(prompt)
            }
            
            # Only add chat_history if system message exists
            if system:
                request_params['chat_history'] = [{"role": "SYSTEM", "message": system}]
            
            # Use correct Cohere API format
            res = await client.chat(**request_params)
            
            # Handle different response formats
            if hasattr(res, 'text'):
                return res.text
            elif hasattr(res, 'response'):
                return res.response
            elif isinstance(res, dict) and 'text' in res:
                return res['text']
            elif isinstance(res, dict) and 'response' in res:
                return res['response']
            else:
                return str(res)
        except Exception as e:
            logger.error(f"Cohere API call failed: {e}")
            raise e

    async def _call_ollama(self, prompt, model, system, **kwargs):
        payload = {"model": model, "prompt": f"System: {system}\nUser: {self._stringify_prompt(prompt)}" if system else self._stringify_prompt(prompt), "stream": False}
        async with aiohttp.ClientSession() as s:
            async with s.post(f"{self.ollama_url}/api/generate", json=payload) as r:
                return (await r.json()).get('response', '')

    async def _call_huggingface(self, prompt, model, system, **kwargs):
        headers = {"Authorization": f"Bearer {self.hf_key}"}
        content = self._stringify_prompt(prompt)
        fp = f"System: {system}\nUser: {content}\nAssistant:" if system else f"User: {content}\nAssistant:"
        async with aiohttp.ClientSession() as s:
            async with s.post(f"https://api-inference.huggingface.co/models/{model}", headers=headers, json={"inputs": fp, "parameters": {"max_new_tokens": 1000}}) as r:
                d = await r.json()
                if isinstance(d, list) and len(d) > 0: return d[0].get('generated_text', '').replace(fp, "").strip()
                return str(d)

    def get_available_models(self) -> List[Dict[str, Any]]:
        av = []
        for k, c in self.models.items():
            p = c.provider
            ok = False
            if p == ModelProvider.OPENAI: ok = bool(self.openai_keys)
            elif p == ModelProvider.GOOGLE: ok = bool(self.google_keys)
            elif p == ModelProvider.ANTHROPIC: ok = bool(self.anthropic_keys)
            elif p == ModelProvider.COHERE: ok = bool(self.cohere_keys)
            elif p == ModelProvider.OLLAMA: ok = bool(self.ollama_url)
            elif p == ModelProvider.HUGGINGFACE: ok = bool(self.hf_key)
            if ok: 
                av.append({
                    'id': k,
                    'name': k.replace('-', ' ').title(), 
                    'provider': p.value, 
                    'max_tokens': c.max_tokens
                })
        return av

    async def _call_mock(self, prompt, system, **kwargs):
        """Mock provider for offline testing and fallback."""
        import time
        await asyncio.sleep(0.5)  # Simulate processing time
        return self._generate_mock_response(prompt)

    def _generate_mock_response(self, prompt: Any) -> str:
        if "packing list" in str(prompt).lower(): return '[{"item": "Passport", "category": "Documents", "quantity": 1, "reason": "Required"}]'
        return "RoamIQ Demo Mode. Configure keys to unlock full potential."

llm_provider = LLMProvider()

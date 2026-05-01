"""
Caching service for AI responses and external API calls
"""
import json
import hashlib
import pickle
import os
from datetime import datetime, timedelta
from typing import Any, Optional, Dict
import logging

logger = logging.getLogger(__name__)

class CacheService:
    def __init__(self, cache_dir='backend/cache'):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
        
        # Try to use Redis if available, fallback to file cache
        try:
            import redis
            self.redis_client = redis.Redis(
                host=os.getenv('REDIS_HOST', 'localhost'),
                port=int(os.getenv('REDIS_PORT', 6379)),
                db=0,
                decode_responses=True
            )
            self.redis_client.ping()  # Test connection
            self.use_redis = True
            logger.info("Using Redis for caching")
        except:
            self.redis_client = None
            self.use_redis = False
            logger.info("Using file-based caching")
    
    def _generate_key(self, prefix: str, data: Any) -> str:
        """Generate cache key from data"""
        if isinstance(data, dict):
            data_str = json.dumps(data, sort_keys=True)
        else:
            data_str = str(data)
        
        hash_obj = hashlib.md5(data_str.encode())
        return f"{prefix}:{hash_obj.hexdigest()}"
    
    def get(self, key: str) -> Optional[Any]:
        """Get cached value"""
        try:
            if self.use_redis:
                cached = self.redis_client.get(key)
                if cached:
                    return json.loads(cached)
            else:
                cache_file = os.path.join(self.cache_dir, f"{key}.cache")
                if os.path.exists(cache_file):
                    with open(cache_file, 'rb') as f:
                        cached_data = pickle.load(f)
                        if cached_data['expires'] > datetime.now():
                            return cached_data['data']
                        else:
                            os.remove(cache_file)
        except Exception as e:
            logger.error(f"Cache get error: {e}")
        
        return None
    
    def set(self, key: str, value: Any, ttl_seconds: int = 3600):
        """Set cached value with TTL"""
        try:
            if self.use_redis:
                self.redis_client.setex(
                    key, 
                    ttl_seconds, 
                    json.dumps(value, default=str)
                )
            else:
                cache_file = os.path.join(self.cache_dir, f"{key}.cache")
                cached_data = {
                    'data': value,
                    'expires': datetime.now() + timedelta(seconds=ttl_seconds)
                }
                with open(cache_file, 'wb') as f:
                    pickle.dump(cached_data, f)
        except Exception as e:
            logger.error(f"Cache set error: {e}")
    
    def cache_ai_response(self, prompt: str, response: str, ttl_seconds: int = 1800):
        """Cache AI response"""
        key = self._generate_key("ai_response", prompt)
        self.set(key, response, ttl_seconds)
    
    def get_cached_ai_response(self, prompt: str) -> Optional[str]:
        """Get cached AI response"""
        key = self._generate_key("ai_response", prompt)
        return self.get(key)
    
    def cache_destination_info(self, destination: str, info: Dict, ttl_seconds: int = 86400):
        """Cache destination information"""
        key = self._generate_key("destination", destination.lower())
        self.set(key, info, ttl_seconds)
    
    def get_cached_destination_info(self, destination: str) -> Optional[Dict]:
        """Get cached destination information"""
        key = self._generate_key("destination", destination.lower())
        return self.get(key)
    
    def clear_expired(self):
        """Clear expired cache entries (file-based only)"""
        if not self.use_redis:
            try:
                for filename in os.listdir(self.cache_dir):
                    if filename.endswith('.cache'):
                        filepath = os.path.join(self.cache_dir, filename)
                        try:
                            with open(filepath, 'rb') as f:
                                cached_data = pickle.load(f)
                                if cached_data['expires'] <= datetime.now():
                                    os.remove(filepath)
                        except:
                            # Remove corrupted cache files
                            os.remove(filepath)
            except Exception as e:
                logger.error(f"Cache cleanup error: {e}")

# Global cache instance
cache_service = CacheService()
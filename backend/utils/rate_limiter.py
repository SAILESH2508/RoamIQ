"""
Rate limiting and security utilities
"""
import time
from functools import wraps
from flask import request, jsonify, g
from collections import defaultdict, deque
import hashlib
import hmac

class RateLimiter:
    def __init__(self):
        self.requests = defaultdict(deque)
        self.blocked_ips = set()
    
    def is_rate_limited(self, identifier, max_requests=100, window_seconds=3600):
        """Check if identifier is rate limited"""
        now = time.time()
        window_start = now - window_seconds
        
        # Clean old requests
        while self.requests[identifier] and self.requests[identifier][0] < window_start:
            self.requests[identifier].popleft()
        
        # Check if limit exceeded
        if len(self.requests[identifier]) >= max_requests:
            return True
        
        # Add current request
        self.requests[identifier].append(now)
        return False
    
    def block_ip(self, ip, duration=3600):
        """Block IP for specified duration"""
        self.blocked_ips.add((ip, time.time() + duration))
    
    def is_blocked(self, ip):
        """Check if IP is blocked"""
        now = time.time()
        # Remove expired blocks
        self.blocked_ips = {(blocked_ip, expiry) for blocked_ip, expiry in self.blocked_ips if expiry > now}
        return any(blocked_ip == ip for blocked_ip, _ in self.blocked_ips)

rate_limiter = RateLimiter()

def rate_limit(max_requests=100, window_seconds=3600, per_user=False):
    """Rate limiting decorator"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Determine identifier
            if per_user and hasattr(g, 'current_user'):
                identifier = f"user_{g.current_user.id}"
            else:
                identifier = request.remote_addr
            
            # Check if blocked
            if rate_limiter.is_blocked(request.remote_addr):
                return jsonify({'error': 'IP temporarily blocked'}), 429
            
            # Check rate limit
            if rate_limiter.is_rate_limited(identifier, max_requests, window_seconds):
                return jsonify({'error': 'Rate limit exceeded'}), 429
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def validate_api_key(api_key, secret_key):
    """Validate API key using HMAC"""
    if not api_key or not secret_key:
        return False
    
    try:
        # Simple HMAC validation (implement your own logic)
        expected = hmac.new(
            secret_key.encode(),
            'roamiq_api'.encode(),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(api_key, expected)
    except:
        return False

def security_headers(f):
    """Add security headers to response"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        response = f(*args, **kwargs)
        if hasattr(response, 'headers'):
            response.headers['X-Content-Type-Options'] = 'nosniff'
            response.headers['X-Frame-Options'] = 'DENY'
            response.headers['X-XSS-Protection'] = '1; mode=block'
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        return response
    return decorated_function
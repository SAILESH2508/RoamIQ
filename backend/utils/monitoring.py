"""
Application monitoring and metrics collection
"""
import time
import logging
from functools import wraps
from flask import request, g
from prometheus_client import Counter, Histogram, Gauge, generate_latest
import psutil
import os

logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_DURATION = Histogram('http_request_duration_seconds', 'HTTP request duration', ['method', 'endpoint'])
ACTIVE_USERS = Gauge('active_users_total', 'Number of active users')
AI_REQUESTS = Counter('ai_requests_total', 'Total AI requests', ['model', 'status'])
AI_RESPONSE_TIME = Histogram('ai_response_duration_seconds', 'AI response time', ['model'])
DATABASE_QUERIES = Counter('database_queries_total', 'Total database queries', ['operation'])
CACHE_HITS = Counter('cache_hits_total', 'Cache hits', ['cache_type'])
CACHE_MISSES = Counter('cache_misses_total', 'Cache misses', ['cache_type'])

# System metrics
CPU_USAGE = Gauge('system_cpu_usage_percent', 'CPU usage percentage')
MEMORY_USAGE = Gauge('system_memory_usage_bytes', 'Memory usage in bytes')
DISK_USAGE = Gauge('system_disk_usage_percent', 'Disk usage percentage')

class PerformanceMonitor:
    def __init__(self):
        self.start_time = time.time()
        self.active_requests = 0
    
    def track_request(self, f):
        """Decorator to track request metrics"""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            start_time = time.time()
            self.active_requests += 1
            
            try:
                response = f(*args, **kwargs)
                status_code = getattr(response, 'status_code', 200)
                REQUEST_COUNT.labels(
                    method=request.method,
                    endpoint=request.endpoint or 'unknown',
                    status=status_code
                ).inc()
                
                return response
            
            except Exception as e:
                REQUEST_COUNT.labels(
                    method=request.method,
                    endpoint=request.endpoint or 'unknown',
                    status=500
                ).inc()
                raise
            
            finally:
                duration = time.time() - start_time
                REQUEST_DURATION.labels(
                    method=request.method,
                    endpoint=request.endpoint or 'unknown'
                ).observe(duration)
                self.active_requests -= 1
        
        return decorated_function
    
    def track_ai_request(self, model: str):
        """Context manager for tracking AI requests"""
        class AIRequestTracker:
            def __init__(self, model):
                self.model = model
                self.start_time = None
            
            def __enter__(self):
                self.start_time = time.time()
                return self
            
            def __exit__(self, exc_type, exc_val, exc_tb):
                duration = time.time() - self.start_time
                status = 'success' if exc_type is None else 'error'
                
                AI_REQUESTS.labels(model=self.model, status=status).inc()
                AI_RESPONSE_TIME.labels(model=self.model).observe(duration)
        
        return AIRequestTracker(model)
    
    def track_database_query(self, operation: str):
        """Track database query"""
        DATABASE_QUERIES.labels(operation=operation).inc()
    
    def track_cache_hit(self, cache_type: str):
        """Track cache hit"""
        CACHE_HITS.labels(cache_type=cache_type).inc()
    
    def track_cache_miss(self, cache_type: str):
        """Track cache miss"""
        CACHE_MISSES.labels(cache_type=cache_type).inc()
    
    def update_system_metrics(self):
        """Update system resource metrics"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            CPU_USAGE.set(cpu_percent)
            
            # Memory usage
            memory = psutil.virtual_memory()
            MEMORY_USAGE.set(memory.used)
            
            # Disk usage
            disk = psutil.disk_usage('/')
            DISK_USAGE.set(disk.percent)
            
        except Exception as e:
            logger.error(f"Error updating system metrics: {e}")
    
    def get_metrics(self):
        """Get current metrics as text"""
        self.update_system_metrics()
        return generate_latest()
    
    def get_health_status(self):
        """Get application health status"""
        try:
            # Check database connection
            from backend.extensions import db
            db.session.execute('SELECT 1')
            db_status = 'healthy'
        except:
            db_status = 'unhealthy'
        
        # Check system resources
        cpu_percent = psutil.cpu_percent()
        memory_percent = psutil.virtual_memory().percent
        disk_percent = psutil.disk_usage('/').percent
        
        overall_status = 'healthy'
        if cpu_percent > 90 or memory_percent > 90 or disk_percent > 90:
            overall_status = 'degraded'
        if db_status == 'unhealthy':
            overall_status = 'unhealthy'
        
        return {
            'status': overall_status,
            'timestamp': time.time(),
            'uptime': time.time() - self.start_time,
            'database': db_status,
            'system': {
                'cpu_percent': cpu_percent,
                'memory_percent': memory_percent,
                'disk_percent': disk_percent
            },
            'active_requests': self.active_requests
        }

# Global monitor instance
monitor = PerformanceMonitor()

def init_monitoring(app):
    """Initialize monitoring for Flask app"""
    
    @app.before_request
    def before_request():
        g.start_time = time.time()
    
    @app.after_request
    def after_request(response):
        if hasattr(g, 'start_time'):
            duration = time.time() - g.start_time
            REQUEST_DURATION.labels(
                method=request.method,
                endpoint=request.endpoint or 'unknown'
            ).observe(duration)
        
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=request.endpoint or 'unknown',
            status=response.status_code
        ).inc()
        
        return response
    
    @app.route('/metrics')
    def metrics():
        """Prometheus metrics endpoint"""
        return monitor.get_metrics(), 200, {'Content-Type': 'text/plain'}
    
    @app.route('/api/health')
    def health():
        """Health check endpoint"""
        return monitor.get_health_status()
    
    logger.info("Monitoring initialized")
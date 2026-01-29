"""
Centralized error handling and logging utilities
"""
import logging
import traceback
from functools import wraps
from flask import jsonify, request
from werkzeug.exceptions import HTTPException

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend_error.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class APIError(Exception):
    """Custom API exception class"""
    def __init__(self, message, status_code=400, payload=None):
        super().__init__()
        self.message = message
        self.status_code = status_code
        self.payload = payload

def handle_api_error(error):
    """Global error handler for API errors"""
    response = {'error': error.message}
    if error.payload:
        response.update(error.payload)
    
    logger.error(f"API Error: {error.message} - Status: {error.status_code}")
    return jsonify(response), error.status_code

def handle_http_exception(error):
    """Handle HTTP exceptions"""
    logger.error(f"HTTP Exception: {error.description} - Status: {error.code}")
    return jsonify({'error': error.description}), error.code

def handle_generic_exception(error):
    """Handle unexpected exceptions"""
    logger.error(f"Unexpected error: {str(error)}\n{traceback.format_exc()}")
    return jsonify({'error': 'Internal server error'}), 500

def log_request_info():
    """Log incoming request information"""
    logger.info(f"{request.method} {request.path} - IP: {request.remote_addr}")

def api_error_handler(f):
    """Decorator for handling API errors in routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except APIError as e:
            return handle_api_error(e)
        except HTTPException as e:
            return handle_http_exception(e)
        except Exception as e:
            return handle_generic_exception(e)
    return decorated_function

def validate_required_fields(data, required_fields):
    """Validate required fields in request data"""
    missing_fields = [field for field in required_fields if field not in data or not data[field]]
    if missing_fields:
        raise APIError(f"Missing required fields: {', '.join(missing_fields)}", 400)

def validate_email(email):
    """Basic email validation"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        raise APIError("Invalid email format", 400)
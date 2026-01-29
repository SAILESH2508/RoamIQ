"""
Swagger/OpenAPI documentation configuration
"""
from flask import Flask
from flasgger import Swagger, swag_from
from flasgger.utils import swag_from

def init_swagger(app: Flask):
    """Initialize Swagger documentation"""
    
    swagger_config = {
        "headers": [],
        "specs": [
            {
                "endpoint": 'apispec',
                "route": '/apispec.json',
                "rule_filter": lambda rule: True,
                "model_filter": lambda tag: True,
            }
        ],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
        "specs_route": "/docs/"
    }
    
    swagger_template = {
        "swagger": "2.0",
        "info": {
            "title": "RoamIQ API",
            "description": "AI-powered travel companion API",
            "version": "1.0.0",
            "contact": {
                "name": "RoamIQ Team",
                "email": "support@roamiq.com"
            }
        },
        "host": "localhost:5000",
        "basePath": "/api",
        "schemes": ["http", "https"],
        "securityDefinitions": {
            "Bearer": {
                "type": "apiKey",
                "name": "Authorization",
                "in": "header",
                "description": "JWT Authorization header using the Bearer scheme. Example: 'Bearer {token}'"
            }
        },
        "security": [{"Bearer": []}],
        "tags": [
            {
                "name": "Authentication",
                "description": "User authentication and profile management"
            },
            {
                "name": "Chat",
                "description": "AI chat and travel recommendations"
            },
            {
                "name": "Travel",
                "description": "Trip planning and travel preferences"
            },
            {
                "name": "Mood",
                "description": "Mood tracking and analysis"
            }
        ]
    }
    
    return Swagger(app, config=swagger_config, template=swagger_template)

# Swagger documentation decorators for common responses
def swagger_auth_responses():
    """Common authentication responses"""
    return {
        "401": {"description": "Unauthorized - Invalid or missing token"},
        "403": {"description": "Forbidden - Insufficient permissions"}
    }

def swagger_validation_responses():
    """Common validation error responses"""
    return {
        "400": {"description": "Bad Request - Invalid input data"},
        "422": {"description": "Unprocessable Entity - Validation errors"}
    }

def swagger_server_responses():
    """Common server error responses"""
    return {
        "500": {"description": "Internal Server Error"},
        "503": {"description": "Service Unavailable"}
    }

# Example swagger documentation for routes
AUTH_LOGIN_SPEC = {
    "tags": ["Authentication"],
    "summary": "User login",
    "description": "Authenticate user and return JWT token",
    "parameters": [
        {
            "name": "body",
            "in": "body",
            "required": True,
            "schema": {
                "type": "object",
                "required": ["username", "password"],
                "properties": {
                    "username": {
                        "type": "string",
                        "description": "Username or email"
                    },
                    "password": {
                        "type": "string",
                        "description": "User password"
                    }
                }
            }
        }
    ],
    "responses": {
        "200": {
            "description": "Login successful",
            "schema": {
                "type": "object",
                "properties": {
                    "access_token": {"type": "string"},
                    "user": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "integer"},
                            "username": {"type": "string"},
                            "email": {"type": "string"},
                            "full_name": {"type": "string"}
                        }
                    }
                }
            }
        },
        **swagger_validation_responses(),
        **swagger_server_responses()
    }
}

CHAT_MESSAGE_SPEC = {
    "tags": ["Chat"],
    "summary": "Send message to AI",
    "description": "Send a travel-related message to the AI and get a response with mood analysis",
    "security": [{"Bearer": []}],
    "parameters": [
        {
            "name": "body",
            "in": "body",
            "required": True,
            "schema": {
                "type": "object",
                "required": ["message"],
                "properties": {
                    "message": {
                        "type": "string",
                        "description": "User message to the AI"
                    },
                    "include_mood_analysis": {
                        "type": "boolean",
                        "description": "Whether to include mood analysis",
                        "default": True
                    }
                }
            }
        }
    ],
    "responses": {
        "200": {
            "description": "AI response with mood analysis",
            "schema": {
                "type": "object",
                "properties": {
                    "response": {"type": "string"},
                    "mood_analysis": {
                        "type": "object",
                        "properties": {
                            "mood": {"type": "string"},
                            "energy": {"type": "string"},
                            "polarity": {"type": "number"},
                            "subjectivity": {"type": "number"}
                        }
                    },
                    "quick_suggestions": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                }
            }
        },
        **swagger_auth_responses(),
        **swagger_validation_responses(),
        **swagger_server_responses()
    }
}
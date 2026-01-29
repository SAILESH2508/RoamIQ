"""
WebSocket handler for real-time chat functionality
"""
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_jwt_extended import decode_token
from backend.services.ai_service import AIService
import logging

logger = logging.getLogger(__name__)

class WebSocketHandler:
    def __init__(self, app, socketio):
        self.app = app
        self.socketio = socketio
        self.ai_service = AIService()
        self.setup_handlers()
    
    def setup_handlers(self):
        @self.socketio.on('connect')
        def handle_connect(auth):
            try:
                # Verify JWT token
                token = auth.get('token') if auth else None
                if not token:
                    return False
                
                decoded_token = decode_token(token)
                user_id = decoded_token['sub']
                join_room(f"user_{user_id}")
                
                emit('connected', {'status': 'Connected to RoamIQ'})
                logger.info(f"User {user_id} connected via WebSocket")
                
            except Exception as e:
                logger.error(f"WebSocket connection error: {e}")
                return False
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            logger.info("User disconnected from WebSocket")
        
        @self.socketio.on('chat_message')
        def handle_chat_message(data):
            try:
                token = data.get('token')
                message = data.get('message')
                
                if not token or not message:
                    emit('error', {'message': 'Missing token or message'})
                    return
                
                decoded_token = decode_token(token)
                user_id = decoded_token['sub']
                
                # Process message with AI service
                response = self.ai_service.generate_travel_response(
                    message, user_id, include_mood_analysis=True
                )
                
                # Emit response back to user
                emit('chat_response', {
                    'response': response['response'],
                    'mood_analysis': response.get('mood_analysis'),
                    'quick_suggestions': response.get('quick_suggestions', []),
                    'timestamp': response.get('timestamp')
                }, room=f"user_{user_id}")
                
            except Exception as e:
                logger.error(f"Chat message error: {e}")
                emit('error', {'message': 'Failed to process message'})
        
        @self.socketio.on('typing')
        def handle_typing(data):
            # Handle typing indicators for future multi-user features
            pass
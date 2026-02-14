"""
Async-compatible AI Routes for RoamIQ
Uses the redesigned modular AI service
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
from datetime import datetime

from backend.services.ai_service import ai_service
from backend.services.ai.llm_provider import llm_provider
from backend.utils.error_handler import api_error_handler, validate_required_fields

logger = logging.getLogger(__name__)

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')

# Removed run_async - Flask 2.0+ handles async routes natively

@ai_bp.route('/models', methods=['GET'])
@jwt_required()
@api_error_handler
def get_available_models():
    """Get list of available AI models."""
    try:
        models = llm_provider.get_available_models()
        return jsonify({
            'models': models,
            'default_model': 'gemini-1.5-flash',
            'total_models': len(models)
        })
    except Exception as e:
        logger.error(f"Error getting models: {e}")
        return jsonify({'error': 'Failed to retrieve models'}), 500

@ai_bp.route('/chat', methods=['POST'])
@jwt_required()
@api_error_handler
async def chat_with_ai():
    """Unified chat endpoint using the NEW AIService."""
    try:
        data = request.get_json()
        validate_required_fields(data, ['message'])
        
        message = data['message']
        model = data.get('model', 'gemini-1.5-flash')
        conversation_id = data.get('conversation_id')
        currency = data.get('currency', 'USD')
        
        # Get user identity and resolve to ID
        user_identity = get_jwt_identity()
        user_id = int(user_identity) if user_identity and str(user_identity).isdigit() else None

        # Directly await the async service
        result = await ai_service.get_chat_response(
            message=message,
            model=model,
            conversation_id=conversation_id,
            user_id=user_id,
            currency=currency
        )
        
        return jsonify(result)
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(f"Chat route error: {str(e)}")
        return jsonify({'error': 'Failed to generate AI response', 'details': str(e)}), 500

@ai_bp.route('/chat/history/<conversation_id>', methods=['GET'])
@jwt_required()
@api_error_handler
def get_chat_history(conversation_id):
    """Retrieve chat history for a specific conversation."""
    try:
        from backend.models.chat_message import ChatMessage
        user_identity = get_jwt_identity()
        user_id = int(user_identity) if user_identity and str(user_identity).isdigit() else None
        
        # Check if conversation messages exist for this user
        messages = ChatMessage.query.filter_by(
            conversation_id=conversation_id,
            user_id=user_id
        ).order_by(ChatMessage.timestamp.asc()).all()
        
        return jsonify([msg.to_dict() for msg in messages])
    except Exception as e:
        logger.error(f"Error fetching chat history: {e}")
        return jsonify({'error': 'Failed to fetch history'}), 500

@ai_bp.route('/user/patterns', methods=['GET'])
@jwt_required()
@api_error_handler
async def get_user_patterns():
    """Retrieve AI-analyzed user patterns."""
    user_identity = get_jwt_identity()
    user_id = int(user_identity) if user_identity and str(user_identity).isdigit() else None
    result = await ai_service.get_user_patterns(user_id=user_id)
    return jsonify(result)

@ai_bp.route('/chat/conversations', methods=['GET'])
@jwt_required()
@api_error_handler
def get_conversations():
    """List summary of all conversations for the current user."""
    try:
        from backend.models.chat_message import ChatMessage
        from backend.extensions import db
        from sqlalchemy import func
        user_identity = get_jwt_identity()
        user_id = int(user_identity) if user_identity and str(user_identity).isdigit() else None
        
        logger.debug(f"Fetching conversations for user_id: {user_id}")
        
        # Robust query: get latest message per conversation using max(id)
        # Re-restoring filter now that debugging is complete
        conversations = ChatMessage.query.filter(
            ChatMessage.user_id == user_id,
            ChatMessage.id.in_(
                db.session.query(func.max(ChatMessage.id))
                .filter(ChatMessage.user_id == user_id)
                .group_by(ChatMessage.conversation_id)
            )
        ).order_by(ChatMessage.timestamp.desc()).all()
        
        logger.debug(f"SQLite query returned {len(conversations)} conversations for user {user_id}")
        
        results = []
        for conv in conversations:
            # Try to get the first user message as the title
            first_msg = ChatMessage.query.filter_by(
                conversation_id=conv.conversation_id, 
                role='user'
            ).order_by(ChatMessage.timestamp.asc()).first()
            
            title = first_msg.content[:40] + "..." if first_msg and len(first_msg.content) > 40 else (first_msg.content if first_msg else "New Chat")
            
            results.append({
                'id': conv.conversation_id,
                'title': title,
                'last_message': conv.content[:60] + "..." if len(conv.content) > 60 else conv.content,
                'timestamp': conv.timestamp.isoformat() + "Z"
            })
            
        return jsonify(results)
    except Exception as e:
        logger.error(f"Error listing conversations: {e}")
        return jsonify({'error': 'Failed to list conversations'}), 500

@ai_bp.route('/chat/conversations/<conversation_id>', methods=['DELETE'])
@jwt_required()
@api_error_handler
def delete_conversation(conversation_id):
    """Delete all messages associated with a conversation."""
    try:
        from backend.models.chat_message import ChatMessage
        from backend.extensions import db
        user_identity = get_jwt_identity()
        user_id = int(user_identity) if user_identity and str(user_identity).isdigit() else None
        
        # Delete all messages for this user and conversation
        deleted_count = ChatMessage.query.filter_by(
            conversation_id=conversation_id,
            user_id=user_id
        ).delete()
        
        db.session.commit()
        logger.info(f"Deleted {deleted_count} messages for conversation {conversation_id}")
        
        return jsonify({
            'success': True, 
            'message': f'Conversation deleted successfully',
            'deleted_count': deleted_count
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting conversation {conversation_id}: {e}")
        return jsonify({'error': 'Failed to delete conversation'}), 500

@ai_bp.route('/generate/itinerary', methods=['POST'])
@jwt_required()
@api_error_handler
async def generate_itinerary():
    """Structured itinerary generation."""
    try:
        data = request.get_json()
        validate_required_fields(data, ['destination', 'days', 'budget'])
        
        itinerary = await ai_service.generate_itinerary(
            destination=data['destination'],
            days=int(data['days']),
            budget=data['budget'],
            preferences=data.get('preferences'),
            currency=data.get('currency', 'USD')
        )
        
        return jsonify(itinerary)
    except Exception as e:
        logger.error(f"Itinerary route error: {e}")
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/generate/packing-list', methods=['POST'])
@jwt_required()
@api_error_handler
async def generate_packing_list():
    """Smart packing list generation."""
    try:
        data = request.get_json()
        validate_required_fields(data, ['destination', 'duration'])
        
        packing_list = await ai_service.generate_packing_list(
            destination=data['destination'],
            duration=int(data['duration']),
            activities=data.get('activities', []),
            currency=data.get('currency', 'USD')
        )
        
        return jsonify(packing_list)
    except Exception as e:
        logger.error(f"Packing list route error: {e}")
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/file/analyze', methods=['POST'])
@jwt_required()
@api_error_handler
async def analyze_file():
    """Analyze ANY uploaded file."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
            
        file = request.files['file']
        file_data = file.read()
        mime_type = file.mimetype
        filename = file.filename
        
        result = await ai_service.analyze_file(file_data, mime_type, filename)
        return jsonify(result)
    except Exception as e:
        logger.error(f"File analysis route error: {e}")
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/audio/transcribe', methods=['POST'])
@jwt_required()
@api_error_handler
async def transcribe_audio():
    """Transcribe voice input."""
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
            
        file = request.files['audio']
        audio_data = file.read()
        
        # Get metadata for contextual response
        conversation_id = request.form.get('conversation_id')
        user_identity = get_jwt_identity()
        user_id = int(user_identity) if user_identity and str(user_identity).isdigit() else None
        
        result = await ai_service.transcribe_audio(
            audio_data, 
            user_id=user_id, 
            conversation_id=conversation_id
        )
        return jsonify(result)
    except Exception as e:
        logger.error(f"Transcription route error: {e}")
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/audio/synthesize', methods=['POST'])
@jwt_required()
@api_error_handler
async def synthesize_audio():
    """Synthesize text to speech."""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        result = await ai_service.synthesize_speech(text)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Synthesis route error: {e}")
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/status', methods=['GET'])
def ai_status():
    """Check AI system health."""
    return jsonify({
        "status": "online",
        "version": "2.0.0-async",
        "timestamp": datetime.now().isoformat()
    })
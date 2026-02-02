from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.user import User
from backend.models.preference import UserPreference
from backend.models.mood_log import MoodLog
from backend.services.ai_service import ai_service
from datetime import datetime
import json
import asyncio
from backend.extensions import db
import logging

logger = logging.getLogger(__name__)

chat_bp = Blueprint('chat', __name__)

def run_async(coro):
    return asyncio.run(coro)

@chat_bp.route('/message', methods=['POST'])
@jwt_required()
def process_message():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or not data.get('message'):
            return jsonify({'error': 'Message is required'}), 400
        
        user_message = data['message']
        model_name = data.get('model', 'gemini-2.0-flash-lite')
        
        # Get user preferences
        preferences = UserPreference.query.filter_by(user_id=user_id).first()
        preferences_dict = preferences.to_dict() if preferences else {}
        
        # Unified AI response
        result = run_async(ai_service.get_chat_response(
            message=user_message,
            model=model_name,
            user_preferences=preferences_dict
        ))
        
        # Save mood log
        try:
            mood_analysis = result.get('mood_analysis')
            if mood_analysis:
                mood_log = MoodLog(
                    user_id=user_id,
                    mood=mood_analysis.get('mood', 'neutral'),
                    energy=mood_analysis.get('energy', 'medium'),
                    polarity=mood_analysis.get('polarity', 0.0),
                    subjectivity=mood_analysis.get('subjectivity', 0.0),
                    note=user_message
                )
                db.session.add(mood_log)
                db.session.commit()
        except Exception as log_error:
            logger.error(f"Error saving mood log: {log_error}")
            db.session.rollback()
        
        return jsonify({
            'user_message': user_message,
            'ai_response': result['ai_response'],
            'mood_analysis': result['mood_analysis'],
            'timestamp': str(datetime.utcnow()),
            'suggestions': result.get('suggestions', [])
        }), 200
        
    except Exception as e:
        logger.error(f"Unexpected error in process_message: {e}")
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/generate-itinerary', methods=['POST'])
@jwt_required()
def generate_itinerary():
    try:
        data = request.get_json()
        itinerary = run_async(ai_service.generate_itinerary(
            destination=data['destination'],
            days=int(data.get('duration', 1)),
            budget=data['budget']
        ))
        return jsonify({'itinerary': itinerary}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.mood_log import MoodLog
from sqlalchemy import desc

import logging

logger = logging.getLogger(__name__)

mood_bp = Blueprint('mood', __name__)

@mood_bp.route('/history', methods=['GET'])
@jwt_required()
def get_mood_history():
    try:
        user_id = get_jwt_identity()
        limit = request.args.get('limit', 10, type=int)
        
        logs = MoodLog.query.filter_by(user_id=user_id)\
            .order_by(desc(MoodLog.created_at))\
            .limit(limit)\
            .all()
            
        return jsonify({
            'history': [log.to_dict() for log in reversed(logs)]
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching mood history: {e}")
        return jsonify({'error': str(e)}), 500

@mood_bp.route('/recommendations', methods=['POST'])
@jwt_required()
async def get_recommendations():
    try:
        data = request.get_json()
        mood = data.get('mood', 'neutral')
        energy = data.get('energy', 'medium')
        
        from backend.services.ai_service import ai_service
        recommendations = await ai_service.get_mood_recommendations(mood, energy)
        
        return jsonify({
            'recommendations': recommendations
        }), 200
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        return jsonify({'error': str(e)}), 500

@mood_bp.route('/log', methods=['POST'])
@jwt_required()
def log_mood():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        from backend.extensions import db
        new_log = MoodLog(
            user_id=user_id,
            mood=data.get('mood'),
            energy=data.get('energy'),
            polarity=data.get('polarity', 0.0),
            subjectivity=data.get('subjectivity', 0.0),
            note=data.get('note')
        )
        db.session.add(new_log)
        db.session.commit()
        
        return jsonify(new_log.to_dict()), 201
    except Exception as e:
        logger.error(f"Error logging mood: {e}")
        return jsonify({'error': str(e)}), 500

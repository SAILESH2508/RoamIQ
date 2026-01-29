from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.mood_log import MoodLog
from sqlalchemy import desc

mood_bp = Blueprint('mood', __name__)

@mood_bp.route('/history', methods=['GET'])
@jwt_required()
def get_mood_history():
    try:
        user_id = get_jwt_identity()
        # Get last 7 days or last 10 entries by default
        limit = request.args.get('limit', 10, type=int)
        
        logs = MoodLog.query.filter_by(user_id=user_id)\
            .order_by(desc(MoodLog.created_at))\
            .limit(limit)\
            .all()
            
        # Return in reverse chronological order (oldest to newest) for charts
        return jsonify({
            'history': [log.to_dict() for log in reversed(logs)]
        }), 200
        
    except Exception as e:
        print(f"Error fetching mood history: {e}")
        return jsonify({'error': str(e)}), 500

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from backend.models.user import User, db
from backend.models.preference import UserPreference
import sys
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)

@auth_bp.before_request
def before_auth_request():
    pass

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        logger.debug(f"Registration attempt for user: {data.get('username')}")
        
        # Validate required fields
        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if not data.get(field):
                logger.warning(f"Registration failed: {field} is required")
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if user already exists
        if User.query.filter_by(username=data['username']).first():
            logger.warning(f"Registration failed: Username '{data['username']}' already exists")
            return jsonify({'error': 'Username already exists'}), 400
        
        if User.query.filter_by(email=data['email']).first():
            logger.warning(f"Registration failed: Email '{data['email']}' already exists")
            return jsonify({'error': 'Email already exists'}), 400
        
        # Create new user
        user = User(
            username=data['username'],
            email=data['email'],
            full_name=data.get('full_name', ''),
            phone=data.get('phone', '')
        )
        user.set_password(data['password'])
        
        # Parse date of birth if provided
        if data.get('date_of_birth'):
            try:
                user.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
            except ValueError:
                logger.warning(f"Registration failed: Invalid date format '{data['date_of_birth']}'")
                return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        db.session.add(user)
        db.session.commit()
        logger.info(f"User '{user.username}' created successfully with ID: {user.id}")
        
        # Create default preferences
        try:
            preferences = UserPreference(user_id=user.id)
            db.session.add(preferences)
            db.session.commit()
            logger.debug(f"Default preferences created for user ID: {user.id}")
        except Exception as pref_e:
            logger.warning(f"Failed to create preferences for user {user.id}: {pref_e}")
            # Continue even if preferences fail
        
        # Generate access token
        access_token = create_access_token(identity=str(user.id))
        
        return jsonify({
            'message': 'User registered successfully',
            'access_token': access_token,
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Registration error: {str(e)}\n{error_trace}")
        db.session.rollback()
        return jsonify({
            'error': str(e),
            'traceback': error_trace if request.args.get('debug') else None
        }), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        logger.debug(f"Login attempt for user/email: {data.get('username')}")
        
        if not data.get('username') or not data.get('password'):
            logger.warning("Login failed: Username and password are required")
            return jsonify({'error': 'Username and password are required'}), 400
        
        # Find user by username or email
        user = User.query.filter(
            (User.username == data['username']) | (User.email == data['username'])
        ).first()
        
        if not user:
            logger.warning(f"Login failed: User '{data['username']}' not found")
            return jsonify({'error': 'Invalid credentials'}), 401
            
        if not user.check_password(data['password']):
            logger.warning(f"Login failed: Incorrect password for user '{user.username}'")
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Generate access token
        access_token = create_access_token(identity=str(user.id))
        logger.info(f"Login successful for user '{user.username}' (ID: {user.id})")
        
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Login error: {str(e)}\n{error_trace}")
        return jsonify({
            'error': str(e),
            'traceback': error_trace if request.args.get('debug') else None
        }), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'user': user.to_dict()}), 200
        
    except Exception as e:
        logger.error(f"Profile GET error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        if 'full_name' in data:
            user.full_name = data['full_name']
        if 'phone' in data:
            user.phone = data['phone']
        if 'date_of_birth' in data and data['date_of_birth']:
            try:
                user.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Profile PUT error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
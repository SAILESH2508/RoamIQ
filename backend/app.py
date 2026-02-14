from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

import logging
from logging.handlers import RotatingFileHandler

def setup_logging(app):
    handler = RotatingFileHandler('backend_debug.log', maxBytes=10000000, backupCount=5)
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    )
    handler.setFormatter(formatter)
    app.logger.addHandler(handler)
    app.logger.setLevel(logging.INFO)

def create_app():
    app = Flask(__name__)
    setup_logging(app)
    
    # Database Configuration
    # prioritizing environment variable (for production like Render/Postgres)
    database_url = os.getenv('DATABASE_URL')
    
    if database_url and database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
        
    if database_url:
        app.config['SQLALCHEMY_DATABASE_URI'] = database_url
        app.logger.info("Using Production Database URL")
    else:
        # Fallback to local SQLite
        from pathlib import Path
        project_root = Path(__file__).resolve().parent.parent
        db_path = project_root / 'instance' / 'roamiq.db'
        
        # SQLite on Windows needs special care with absolute paths (all forward slashes)
        db_uri = f"sqlite:///{db_path.as_posix()}"
        app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
        app.logger.info(f"Using Local SQLite Database: {db_uri}")
    
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'roamiq-secret-key')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-string')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
    
    # Initialize extensions
    from backend.extensions import db, jwt, cors
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app)
    
    # Create instance directory
    db_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Register blueprints
    with app.app_context():
        from backend.routes.auth import auth_bp
        from backend.routes.travel import travel_bp
        from backend.routes.mood import mood_bp
        from backend.routes.ai_routes import ai_bp
        
        app.register_blueprint(auth_bp, url_prefix='/api/auth')
        app.register_blueprint(travel_bp, url_prefix='/api/travel')
        app.register_blueprint(mood_bp, url_prefix='/api/mood')
        app.register_blueprint(ai_bp, url_prefix='/api/ai')
        
        app.logger.info("Successfully registered all blueprints")
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'healthy', 
            'timestamp': datetime.now().isoformat(),
            'message': 'RoamIQ Gen AI API is running'
        })

    # Serve favicon to stop 404 errors
    @app.route('/favicon.ico')
    def favicon():
        return '', 204
    
    return app

# Initialize the app
app = create_app()

if __name__ == '__main__':
    with app.app_context():
        from backend.extensions import db
        db.create_all()
    
    port = int(os.getenv('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)

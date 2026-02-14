#!/usr/bin/env python3
"""
RoamIQ Backend Server
"""
import os
import sys

# Suppress TensorFlow logs and oneDNN messages
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

# Add project root to path (explicitly, though usually not needed if running from root)
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

# Load environment variables early
load_dotenv()

from backend.app import create_app

if __name__ == '__main__':
    print("Starting RoamIQ Gen AI Backend...")
    print("=" * 50)
    
    app = create_app()
    
    # Initialize database
    with app.app_context():
        try:
            from backend.extensions import db
            db.create_all()
            print("Database tables initialized successfully")
        except Exception as e:
            print(f"Error initializing database: {e}")
    
    print("Backend server initialized")
    print("Server running at: http://localhost:5000")
    print("Health check: http://localhost:5000/api/health")
    print("=" * 50)
    
    try:
        app.run(
            debug=True,
            host='0.0.0.0',
            port=5000,
            use_reloader=True
        )
    except KeyboardInterrupt:
        print("\nShutting down RoamIQ backend...")
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)
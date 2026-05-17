#!/usr/bin/env python3
"""
RoamIQ Flask Backend Server
"""
import os
import sys

# Suppress TensorFlow logs and oneDNN messages
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

# Load environment variables early
load_dotenv()

from backend.app import create_app

if __name__ == '__main__':
    
    app = create_app()
    
    # Initialize database
    with app.app_context():
        try:
            from backend.extensions import db
            db.create_all()
        except Exception as e:
            print(f"Database initialization error: {e}")

    print("Backend server initialized")
    print("Server running at: http://localhost:5000")
    
    try:
        app.run(
            debug=True,
            host='0.0.0.0',
            port=5000,
            use_reloader=False
        )
    except KeyboardInterrupt:
        print("Server stopped by user")
        sys.exit(0)
    except Exception as e:
        print(f"Server error: {e}")
        sys.exit(1)
from datetime import datetime
import bcrypt
import json
from backend.extensions import db
from backend.models.ticket import Ticket
from backend.models.chat_message import ChatMessage
from backend.models.preference import UserPreference
from backend.models.trip import Trip

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    full_name = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    date_of_birth = db.Column(db.Date)
    preferred_currency = db.Column(db.String(3), default='INR') # Global currency support
    last_location = db.Column(db.Text)  # JSON string format {"lat": float, "lng": float, "updated_at": "ISOString"}
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    preferences = db.relationship('UserPreference', backref='user', lazy=True, cascade='all, delete-orphan')
    trips = db.relationship('Trip', backref='user', lazy=True, cascade='all, delete-orphan')
    tickets = db.relationship('Ticket', backref='user', lazy=True, cascade='all, delete-orphan')
    chat_messages = db.relationship('ChatMessage', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def check_password(self, password):
        """Check if provided password matches hash"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def _get_location_data(self):
        if not self.last_location:
            return None
        try:
            return json.loads(self.last_location)
        except (ValueError, TypeError):
            return None

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'phone': self.phone,
            'preferred_currency': self.preferred_currency,
            'last_location': self._get_location_data(),
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'created_at': self.created_at.isoformat() + 'Z',
            'updated_at': self.updated_at.isoformat() + 'Z'
        }
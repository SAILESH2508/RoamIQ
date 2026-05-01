from datetime import datetime
from backend.extensions import db

class MoodLog(db.Model):
    __tablename__ = 'mood_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    mood = db.Column(db.String(50), nullable=False)
    energy = db.Column(db.String(50), nullable=False)
    polarity = db.Column(db.Float, nullable=False)
    subjectivity = db.Column(db.Float, nullable=False)
    note = db.Column(db.Text, nullable=True) # Optional note or context (e.g., user message)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'mood': self.mood,
            'energy': self.energy,
            'polarity': self.polarity,
            'subjectivity': self.subjectivity,
            'note': self.note,
            'created_at': self.created_at.isoformat() + 'Z'
        }

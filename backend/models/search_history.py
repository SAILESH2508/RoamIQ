from datetime import datetime, timezone
from backend.extensions import db

class SearchHistory(db.Model):
    __tablename__ = 'search_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    place_name = db.Column(db.String(200), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    display_name = db.Column(db.String(500))
    
    searched_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'place_name': self.place_name,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'display_name': self.display_name,
            'searched_at': self.searched_at.isoformat() + 'Z'
        }

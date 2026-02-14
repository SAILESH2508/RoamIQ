from datetime import datetime
import json
from backend.extensions import db

class Trip(db.Model):
    __tablename__ = 'trips'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Basic Trip Info
    title = db.Column(db.String(200), nullable=False)
    destination = db.Column(db.String(200), nullable=False)
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    duration_days = db.Column(db.Integer)
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)
    
    # Trip Details
    budget = db.Column(db.Float)
    actual_cost = db.Column(db.Float)
    group_size = db.Column(db.Integer, default=1)
    trip_type = db.Column(db.String(50))  # 'leisure', 'business', 'adventure', etc.
    
    # Itinerary and Planning
    itinerary = db.Column(db.Text)  # JSON string
    places_visited = db.Column(db.Text)  # JSON string
    accommodation_details = db.Column(db.Text)  # JSON string
    
    # Status and Metadata
    status = db.Column(db.String(20), default='planned')  # 'planned', 'ongoing', 'completed', 'cancelled'
    rating = db.Column(db.Integer)  # 1-5 stars
    notes = db.Column(db.Text)
    
    # AI Generated Data
    mood_analysis = db.Column(db.Text)  # JSON string
    sustainability_score = db.Column(db.Float)
    safety_alerts = db.Column(db.Text)  # JSON string
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def set_itinerary(self, itinerary_data):
        """Set itinerary as JSON"""
        self.itinerary = json.dumps(itinerary_data)
    
    def get_itinerary(self):
        """Get itinerary as dict"""
        return json.loads(self.itinerary) if self.itinerary else {}
    
    def set_places_visited(self, places_list):
        """Set places visited as JSON"""
        self.places_visited = json.dumps(places_list)
    
    def get_places_visited(self):
        """Get places visited as list"""
        return json.loads(self.places_visited) if self.places_visited else []
    
    def set_safety_alerts(self, alerts_list):
        """Set safety alerts as JSON"""
        self.safety_alerts = json.dumps(alerts_list)
    
    def get_safety_alerts(self):
        """Get safety alerts as list"""
        return json.loads(self.safety_alerts) if self.safety_alerts else []
    
    def calculate_duration(self):
        """Calculate trip duration in days"""
        if self.start_date and self.end_date:
            self.duration_days = (self.end_date - self.start_date).days + 1
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'destination': self.destination,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'duration_days': self.duration_days,
            'lat': self.lat,
            'lng': self.lng,
            'budget': self.budget,
            'actual_cost': self.actual_cost,
            'group_size': self.group_size,
            'trip_type': self.trip_type,
            'itinerary': self.get_itinerary(),
            'places_visited': self.get_places_visited(),
            'status': self.status,
            'rating': self.rating,
            'notes': self.notes,
            'sustainability_score': self.sustainability_score,
            'safety_alerts': self.get_safety_alerts(),
            'created_at': self.created_at.isoformat() + 'Z',
            'updated_at': self.updated_at.isoformat() + 'Z'
        }
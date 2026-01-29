from datetime import datetime
import json
from backend.extensions import db

class Ticket(db.Model):
    __tablename__ = 'tickets'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id'), nullable=True)
    
    # Ticket Details
    ticket_type = db.Column(db.String(50), nullable=False)  # 'flight', 'train', 'bus', 'event', 'museum', etc.
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    
    # Booking Info
    booking_reference = db.Column(db.String(100))
    confirmation_number = db.Column(db.String(100))
    
    # Pricing
    price = db.Column(db.Float)
    currency = db.Column(db.String(3), default='USD')
    
    # Timing
    booking_date = db.Column(db.DateTime, default=datetime.utcnow)
    valid_from = db.Column(db.DateTime)
    valid_until = db.Column(db.DateTime)
    
    # Meta
    status = db.Column(db.String(20), default='confirmed')  # 'confirmed', 'cancelled', 'used', 'expired'
    additional_info = db.Column(db.Text)  # JSON string for platform specific details
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def set_additional_info(self, data):
        """Set info as JSON"""
        self.additional_info = json.dumps(data)
    
    def get_additional_info(self):
        """Get info as dict"""
        return json.loads(self.additional_info) if self.additional_info else {}
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'trip_id': self.trip_id,
            'ticket_type': self.ticket_type,
            'title': self.title,
            'description': self.description,
            'booking_reference': self.booking_reference,
            'confirmation_number': self.confirmation_number,
            'price': self.price,
            'currency': self.currency,
            'booking_date': self.booking_date.isoformat() if self.booking_date else None,
            'valid_from': self.valid_from.isoformat() if self.valid_from else None,
            'valid_until': self.valid_until.isoformat() if self.valid_until else None,
            'status': self.status,
            'additional_info': self.get_additional_info(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

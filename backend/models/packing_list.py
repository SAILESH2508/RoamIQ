from datetime import datetime
from backend.extensions import db

class PackingItem(db.Model):
    __tablename__ = 'packing_items'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id'), nullable=True)

    item = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(50), default='general')
    is_packed = db.Column(db.Boolean, default=False)
    quantity = db.Column(db.Integer, default=1)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'trip_id': self.trip_id,
            'item': self.item,
            'category': self.category,
            'is_packed': self.is_packed,
            'quantity': self.quantity,
            'created_at': self.created_at.isoformat() + 'Z'
        }

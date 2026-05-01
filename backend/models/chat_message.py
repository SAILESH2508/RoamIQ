from datetime import datetime
from backend.extensions import db

class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.String(100), index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    role = db.Column(db.String(20)) # 'user' or 'ai'
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
           'conversation_id': self.conversation_id,
            'user_id': self.user_id,
            'role': self.role,
            'content': self.content,
            'timestamp': self.timestamp.isoformat() + 'Z' if self.timestamp else None
        }

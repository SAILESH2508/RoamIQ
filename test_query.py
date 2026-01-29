from backend.app import app
from backend.models.chat_message import ChatMessage
from backend.extensions import db
from sqlalchemy import func

user_id = 3

with app.app_context():
    print(f"Testing robust query for user_id: {user_id}")
    
    # The new robust query
    conversations = ChatMessage.query.filter(
        ChatMessage.user_id == user_id,
        ChatMessage.id.in_(
            db.session.query(func.max(ChatMessage.id))
            .filter(ChatMessage.user_id == user_id)
            .group_by(ChatMessage.conversation_id)
        )
    ).order_by(ChatMessage.timestamp.desc()).all()
    
    print(f"Found {len(conversations)} conversations")
    for conv in conversations:
        # Title logic
        first_msg = ChatMessage.query.filter_by(
            conversation_id=conv.conversation_id, 
            role='user'
        ).order_by(ChatMessage.timestamp.asc()).first()
        
        title = first_msg.content[:40] if first_msg else "New Chat"
        print(f"ID: {conv.conversation_id}, Title: {title}, Last: {conv.content[:30]}")

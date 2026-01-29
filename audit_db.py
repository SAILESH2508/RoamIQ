from backend.app import app
from backend.models.chat_message import ChatMessage
from backend.models.user import User

with app.app_context():
    print("Users in DB:")
    users = User.query.all()
    for u in users:
        print(f"ID: {u.id}, Name: {u.username}")
        
    print("\nRecent messages (all users):")
    msgs = ChatMessage.query.order_by(ChatMessage.timestamp.desc()).limit(10).all()
    for m in msgs:
        print(f"ID: {m.id}, User: {m.user_id}, Conv: {m.conversation_id}, Role: {m.role}")

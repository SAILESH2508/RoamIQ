import logging
import json
from typing import Dict, List, Optional, Any
from backend.services.ai.llm_provider import llm_provider
from backend.services.ai.rag_service import rag_service

logger = logging.getLogger(__name__)

class AIService:
    """
    Primary AI Orchestrator for RoamIQ.
    Delegates complex tasks to specialized sub-services.
    """
    
    def __init__(self):
        self.name = "RoamIQ Orchestrator"

    async def get_chat_response(
        self, 
        message: str, 
        model: str = "gemini-1.5-flash",
        conversation_id: Optional[str] = None,
        user_preferences: Optional[Dict] = None,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Generate a contextual chat response."""
        try:
            from backend.models.chat_message import ChatMessage
            from backend.extensions import db
            from backend.app import app

            # Ensure user_id is integer if provided
            if user_id:
                try:
                    user_id = int(user_id)
                except (ValueError, TypeError):
                    pass

            # 1. Retrieve history for context BEFORE saving current
            history = []
            if conversation_id:
                with app.app_context():
                    # Get last 10 messages for context (5 pairs)
                    past_messages = ChatMessage.query.filter_by(conversation_id=conversation_id)\
                        .order_by(ChatMessage.timestamp.desc())\
                        .limit(10).all()
                    
                    past_messages.reverse() # Back to chronological
                    
                    for msg in past_messages:
                        role = 'user' if msg.role == 'user' else 'model'
                        history.append({"role": role, "parts": [{"text": msg.content}]})

            # 2. Save user message to DB
            if conversation_id:
                 with app.app_context():
                    user_msg = ChatMessage(
                        conversation_id=conversation_id,
                        user_id=user_id,
                        role='user',
                        content=message
                    )
                    db.session.add(user_msg)
                    db.session.commit()

            # 3. RAG Search for context if it's a travel query
            context = ""
            if any(word in message.lower() for word in ['where', 'plan', 'visit', 'how', 'trip', 'travel']):
                related_docs = await rag_service.search(message)
                if related_docs:
                    context = "\nRelevant Info:\n" + "\n".join([d['content'] for d in related_docs])

            # 2. Build system prompt
            system_prompt = "You are RoamIQ, a premium AI travel assistant. "
            if user_preferences:
                system_prompt += f"User prefers: {json.dumps(user_preferences)}. "
            
            # Add user location if available
            if user_id:
                from backend.models.user import User
                user = User.query.get(user_id)
                if user and user.last_location:
                    system_prompt += f"User's current location: {user.last_location}. "
            
            if context:
                system_prompt += f"Use this context for more accurate advice: {context}"

            # 4. Generate response using LLM provider
            full_prompt = history + [{"role": "user", "parts": [{"text": message}]}]
            
            ai_response = await llm_provider.generate_response(
                prompt=full_prompt,
                model_name=model,
                system_prompt=system_prompt
            )

            # 5. Save AI response to DB
            if conversation_id:
                 with app.app_context():
                    ai_msg = ChatMessage(
                        conversation_id=conversation_id,
                        user_id=user_id,
                        role='ai',
                        content=ai_response
                    )
                    db.session.add(ai_msg)
                    db.session.commit()

            # 6. Analyze mood (simple internal logic for now)
            mood = self._basic_mood_analysis(message)

            return {
                "ai_response": ai_response,
                "mood_analysis": mood,
                "suggestions": ["Tell me more", "Plan this trip", "What about budget?"]
            }

        except Exception as e:
            logger.error(f"AIService error: {e}")
            return {
                "ai_response": "I'm having trouble thinking right now. Could you ask again?",
                "error": str(e)
            }

    async def generate_itinerary(
        self, 
        destination: str, 
        days: int, 
        budget: str, 
        preferences: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Generate a structured itinerary."""
        prompt = f"""Create a {days}-day itinerary for {destination} with a {budget} budget.
        Preferences: {json.dumps(preferences or {})}
        Return ONLY a JSON object with:
        {{
            "trip_title": "string",
            "summary": "string",
            "days": [{{ "day": 1, "title": "string", "activities": [{{ "time": "string", "activity": "string", "description": "string", "type": "string", "estimated_cost": 0 }}] }}]
        }}
        """
        
        response = await llm_provider.generate_response(
            prompt=prompt,
            system_prompt="You are a professional travel local expert. You output ONLY valid JSON strings."
        )
        
        try:
            # Clean possible markdown
            clean_res = response.strip()
            if clean_res.startswith("```json"):
                clean_res = clean_res[7:-3].strip()
            elif clean_res.startswith("```"):
                clean_res = clean_res[3:-3].strip()
            
            return json.loads(clean_res)
        except Exception as e:
            logger.error(f"Failed to parse itinerary: {e}. Raw: {response}")
            return {"error": "Failed to generate structured plan. Please try again."}

    async def generate_packing_list(self, destination: str, duration: int, activities: List[str] = None) -> List[Dict]:
        """Generate activities-aware packing list."""
        prompt = f"Packing list for {duration} days in {destination}. Activities: {', '.join(activities or [])}. Return JSON array of objects with item, category, quantity, reason."
        
        response = await llm_provider.generate_response(
            prompt=prompt,
            system_prompt="You are a master traveler. Respond with JSON array ONLY."
        )
        
        try:
            clean_res = response.strip()
            if clean_res.startswith("```json"):
                clean_res = clean_res[7:-3].strip()
            return json.loads(clean_res)
        except:
             return [{"item": "Passport", "category": "Essentials", "quantity": 1, "reason": "Required"}]

    async def analyze_file(self, file_data: bytes, mime_type: str, filename: str) -> Dict[str, Any]:
        """Analyze a generic file (Image, PDF, Text, Code) using Gemini."""
        try:
             from google.genai import types
             
             prompt_text = f"Analyze this file ({filename}). "
             contents = []

             # 1. Text/Code Files (Read content directly)
             text_mimes = ['text/plain', 'text/csv', 'application/json', 'text/markdown', 'text/x-python', 'text/javascript']
             is_text_file = any(m in mime_type for m in text_mimes) or filename.endswith(('.txt', '.py', '.js', '.md', '.csv', '.json', '.html', '.css'))
             
             if is_text_file:
                 try:
                     text_content = file_data.decode('utf-8')
                     prompt_text += f"Here is the content:\n\n{text_content}\n\nProvide a summary and code review/analysis if applicable."
                     contents = [prompt_text]
                 except Exception:
                     # Fallback if decode fails (maybe binary disguised as text)
                     contents = [prompt_text, types.Part.from_bytes(data=file_data, mime_type=mime_type)]
             
             # 2. PDF / Images (Send as binary part)
             else:
                 prompt_text += "Describe the visual or document content in detail."
                 # Gemini supports PDF and Images via bytes
                 file_part = types.Part.from_bytes(data=file_data, mime_type=mime_type)
                 contents = [prompt_text, file_part]

             # Call Gemini via LLM Provider (enables fallback)
             summary = await llm_provider.generate_response(
                prompt=contents,
                model_name='gemini-1.5-flash'
             )
             
             return {
                 "summary": summary,
                 "type": "text" if is_text_file else "binary",
                 "filename": filename
             }
        except Exception as e:
            logger.error(f"File analysis failed: {e}")
            return {"error": str(e)}

    async def transcribe_audio(self, audio_data: bytes, user_id: Optional[int] = None, conversation_id: Optional[str] = None) -> Dict[str, Any]:
        """Transcribe audio using Gemini."""
        try:
             from google.genai import types
             
             audio_size = len(audio_data)
             logger.info(f"Transcribing audio: {audio_size} bytes")
             
             if audio_size < 100:
                 return {"error": "Audio data too small", "text": ""}
                 
             audio_part = types.Part.from_bytes(data=audio_data, mime_type="audio/webm")
             
             # Use a more descriptive prompt for transcription
             prompt = [
                 "Please transcribe this audio recording exactly as spoken. "
                 "If there is no speech, return an empty string. "
                 "Do not add any explanations or notes.",
                 audio_part
             ]
             
             text = await llm_provider.generate_response(
                prompt=prompt,
                model_name='gemini-1.5-flash'
             )
             
             text = text.strip() if text else ""
             
             ai_response = ""
             if text:
                 # Now that we have the text, treat it as a real prompt
                 chat_result = await self.get_chat_response(
                     message=text,
                     user_id=user_id,
                     conversation_id=conversation_id
                 )
                 ai_response = chat_result.get('ai_response', "I've processed your message.")
             else:
                 ai_response = "I couldn't hear any speech in that message."
             
             return {
                 "text": text,
                 "ai_response": ai_response
             }
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            return {"error": str(e), "text": ""}

    async def synthesize_speech(self, text: str) -> Dict[str, Any]:
        """Synthesize speech (Mock for now)."""
        # Return empty audio or simple mock to prevent frontend crash
        return {"audio_data": ""} # Frontend expects base64 string

    def _basic_mood_analysis(self, text: str) -> Dict:
        """Lightweight sentiment/mood analysis."""
        text = text.lower()
        mood = "neutral"
        energy = "medium"
        polarity = 0.0
        subjectivity = 0.0
        
        if any(w in text for w in ['happy', 'excited', 'great', 'awesome']):
            mood = "excited"
            energy = "high"
            polarity = 0.8
            subjectivity = 0.8
        elif any(w in text for w in ['sad', 'tired', 'bored']):
            mood = "low"
            energy = "low"
            polarity = -0.5
            subjectivity = 0.6
            
        return {
            "mood": mood, 
            "energy": energy,
            "polarity": polarity,
            "subjectivity": subjectivity
        }

    async def get_user_patterns(self, user_id: Optional[int] = None) -> Dict[str, Any]:
        """Analyze user behavior and travel preferences."""
        from backend.models.trip import Trip
        from backend.models.preference import UserPreference
        
        # Ensure user_id is int
        if user_id:
            try:
                user_id = int(user_id)
            except:
                pass
        
        patterns = {
            "travel_frequency": 0,
            "favorite_destinations": [],
            "preferred_travel_style": "Discovering",
            "average_budget": 0,
            "common_activities": ["Sightseeing", "Cultural Tours"]
        }
        
        if user_id:
            trips = Trip.query.filter_by(user_id=user_id).all()
            patterns["travel_frequency"] = len(trips)
            
            if trips:
                dests = [t.destination for t in trips if t.destination]
                patterns["favorite_destinations"] = list(set(dests))[:3]
                
                budgets = [t.budget for t in trips if t.budget]
                if budgets:
                    patterns["average_budget"] = sum(budgets) / len(budgets)
            
            prefs = UserPreference.query.filter_by(user_id=user_id).first()
            if prefs:
                patterns["preferred_travel_style"] = prefs.travel_style or "Discovering"
        
        return {
            "patterns": patterns,
            "recommendations": [
                "Based on your interest in culture, we recommend Kyoto for your next trip.",
                "You tend to travel solo; check out our new safety-first group tours!",
                "Most of your trips are mid-range; we've found 3 premium deals in your budget."
            ],
            "timestamp": datetime.now().isoformat()
        }

# Singleton instance
ai_service = AIService()

import logging
import json
from typing import Dict, List, Optional, Any
from backend.services.ai.llm_provider import llm_provider
from backend.services.ai.rag_service import rag_service
from datetime import datetime

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
        model: str = "gemini-2.0-flash-lite",
        conversation_id: Optional[str] = None,
        user_preferences: Optional[Dict] = None,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Generate a contextual chat response with tool-calling support."""
        try:
            from backend.models.chat_message import ChatMessage
            from backend.extensions import db
            from backend.app import app
            from backend.services.ai.tools import AVAILABLE_TOOLS, TOOL_DECLARATIONS

            # Ensure user_id is integer if provided
            if user_id:
                try:
                    user_id = int(user_id)
                except (ValueError, TypeError):
                    pass

            # 1 & 3. Parallelize History and RAG
            async def get_history():
                if not conversation_id:
                    return []
                with app.app_context():
                    past_messages = ChatMessage.query.filter_by(conversation_id=conversation_id)\
                        .order_by(ChatMessage.timestamp.desc())\
                        .limit(8).all() # Slightly reduced limit for speed
                    past_messages.reverse()
                    return [{"role": 'user' if msg.role == 'user' else 'model', "parts": [{"text": msg.content}]} for msg in past_messages]

            async def get_rag_context():
                # Only RAG if there's enough substance in the query
                if len(message.split()) > 3 and any(word in message.lower() for word in ['where', 'plan', 'visit', 'trip', 'travel', 'hotel', 'flight', 'recommend']):
                    related_docs = await rag_service.search(message)
                    if related_docs:
                        return "\nRelevant Info:\n" + "\n".join([d['content'] for d in related_docs])
                return ""

            # Run history retrieval and RAG search in parallel
            history, context = await asyncio.gather(get_history(), get_rag_context())

            # 2. Save user message (Done after history pull to avoid self-inclusion)
            if conversation_id:
                 with app.app_context():
                    user_msg = ChatMessage(conversation_id=conversation_id, user_id=user_id, role='user', content=message)
                    db.session.add(user_msg)
                    db.session.commit()

            # 4. System Prompt
            system_prompt = (
                "You are RoamIQ, a professional travel orchestrator. "
                "Help users plan trips, book tickets, manage expenses, and generate reports. "
                "Be concise and focus on immediate travel needs."
            )
            
            if user_id:
                from backend.models.user import User
                with app.app_context():
                    user = User.query.get(user_id)
                    if user and user.last_location:
                        system_prompt += f"\nUser's current location: {user.last_location}"

            if context:
                system_prompt += f"\n\nContext for advice: {context}"

            # 5. Tool-Calling Loop
            contents = history + [{"role": "user", "parts": [{"text": message}]}]
            tools = [{"function_declarations": TOOL_DECLARATIONS}]
            
            # Initial LLM call
            response = await llm_provider.generate_response(
                prompt=contents,
                model_name=model,
                system_prompt=system_prompt,
                tools=tools
            )

            # Execution loop (up to 5 iterations to prevent infinite loops)
            for _ in range(5):
                if isinstance(response, dict) and "tool_calls" in response:
                    tool_results_parts = []
                    
                    # Execute each tool call
                    for tc in response["tool_calls"]:
                        tool_name = tc["name"]
                        args = tc["args"]
                        
                        logger.info(f"AI calling tool: {tool_name} with {args}")
                        
                        if tool_name in AVAILABLE_TOOLS:
                            # Inject user_id into tool args
                            args['user_id'] = user_id
                            
                            # Execute within app context
                            with app.app_context():
                                try:
                                    result = AVAILABLE_TOOLS[tool_name](**args)
                                except Exception as e:
                                    logger.error(f"Tool {tool_name} failed: {e}")
                                    result = {"error": str(e)}
                            
                            # Add to response parts for next LLM iteration
                            tool_results_parts.append({
                                "function_response": {
                                    "name": tool_name,
                                    "response": result
                                }
                            })

                    # Use the preserved model message from the provider to keep all metadata (thought signatures, etc.)
                    contents.append(response["model_message"])
                    
                    # Add result parts to contents
                    contents.append({"role": "user", "parts": tool_results_parts})
                    
                    # Call LLM again with results
                    response = await llm_provider.generate_response(
                        prompt=contents,
                        model_name=model,
                        system_prompt=system_prompt,
                        tools=tools
                    )
                else:
                    # Final text response received
                    break

            # Handle final response
            ai_text = response if isinstance(response, str) else response.get("text", "I've processed your request.")

            # 6. Save AI response
            if conversation_id:
                 with app.app_context():
                    ai_msg = ChatMessage(conversation_id=conversation_id, user_id=user_id, role='ai', content=ai_text)
                    db.session.add(ai_msg)
                    db.session.commit()

            mood = self._basic_mood_analysis(message)

            return {
                "ai_response": ai_text,
                "mood_analysis": mood,
                "suggestions": ["View my trips", "What's my budget?", "Generate a trip report"]
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

    async def get_mood_recommendations(self, mood: str, energy: str) -> List[Dict[str, Any]]:
        """Generate travel recommendations based on current mood and energy."""
        prompt = f"""The user is currently feeling '{mood}' with '{energy}' energy. 
        Suggest 3 travel destinations or types of experiences that would perfectly match this vibe.
        For each, provide:
        - name: Destination or activity name
        - reason: Why it matches their current mood
        - vibe: A short description of the atmosphere
        - icon: A relevant emoji
        
        Return ONLY a JSON array of objects.
        """
        
        response = await llm_provider.generate_response(
            prompt=prompt,
            system_prompt="You are a travel psychologist and expert. You provide personalized, vibe-matched travel advice in JSON format."
        )
        
        try:
            clean_res = response.strip()
            if clean_res.startswith("```json"):
                clean_res = clean_res[7:-3].strip()
            elif clean_res.startswith("```"):
                clean_res = clean_res[3:-3].strip()
            return json.loads(clean_res)
        except Exception as e:
            logger.error(f"Failed to parse mood recommendations: {e}")
            return [
                {"name": "Mountain Retreat", "reason": "Peaceful atmosphere to recharge", "vibe": "Serene & Quiet", "icon": "🏔️"},
                {"name": "Tropical Beach", "reason": "Sun and sand to lift spirits", "vibe": "Relaxing & Warm", "icon": "🏖️"},
                {"name": "Vibrant Capital", "reason": "High energy and culture", "vibe": "Exciting & Busy", "icon": "🏙️"}
            ]

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

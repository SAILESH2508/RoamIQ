import logging
import json
from typing import Dict, List, Optional, Any
from backend.services.ai.llm_provider import llm_provider
from backend.services.ai.rag_service import rag_service
from datetime import datetime
import asyncio

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
        model: Optional[str] = None,
        conversation_id: Optional[str] = None,
        user_preferences: Optional[Dict] = None,
        user_id: Optional[int] = None,
        currency: str = "USD",
        save_to_history: bool = True,
        timeout: float = 20.0
    ) -> Dict[str, Any]:
        """Generate a contextual chat response with tool-calling support."""
        try:
            from backend.models.chat_message import ChatMessage
            from backend.extensions import db
            from flask import current_app
            from backend.services.ai.tools import AVAILABLE_TOOLS, TOOL_DECLARATIONS

            # Ensure user_id is integer if provided
            if user_id:
                try:
                    user_id = int(user_id)
                except (ValueError, TypeError):
                    pass

            app = current_app._get_current_object()

            # 1 & 3. Parallelize History, RAG, and Trip Context
            async def get_history():
                if not conversation_id:
                    return []
                # Internal system calls (like summaries) don't need deep history - keeps them fast
                fetch_limit = 5 if save_to_history else 2
                
                def _fetch_history():
                    with app.app_context():
                        try:
                            past_messages = ChatMessage.query.filter_by(conversation_id=conversation_id)\
                                .order_by(ChatMessage.timestamp.desc())\
                                .limit(fetch_limit).all() 
                            past_messages.reverse()
                            return [{"role": 'user' if msg.role == 'user' else 'model', "parts": [{"text": msg.content}]} for msg in past_messages]
                        except Exception as e:
                            logger.error(f"History fetch failed: {e}")
                            return []

                return await asyncio.get_running_loop().run_in_executor(None, _fetch_history)

            async def get_trip_context():
                """Get user's trip context for better AI responses"""
                if not user_id:
                    return ""
                
                def _fetch_trips():
                    with app.app_context():
                        try:
                            from backend.models.trip import Trip
                            # Get user's recent trips (up to 3)
                            recent_trips = Trip.query.filter_by(user_id=user_id)\
                                .order_by(Trip.created_at.desc())\
                                .limit(3).all()
                            
                            if not recent_trips:
                                return ""
                            
                            context_parts = ["User's Recent Trips:"]
                            for trip in recent_trips:
                                trip_info = f"- {trip.title} to {trip.destination}"
                                if trip.start_date:
                                    trip_info += f" ({trip.start_date.strftime('%b %d')}"
                                    if trip.end_date:
                                        trip_info += f" - {trip.end_date.strftime('%b %d')}"
                                    trip_info += ")"
                                if trip.budget:
                                    trip_info += f" - Budget: ${trip.budget:,.0f}"
                                context_parts.append(trip_info)
                            
                            return "\n".join(context_parts)
                        except Exception as e:
                            logger.error(f"Trip context fetch failed: {e}")
                            return ""

                return await asyncio.get_running_loop().run_in_executor(None, _fetch_trips)

            async def get_rag_context():
                # Skip RAG context for internal system actions (like trip extraction) to maximize speed
                if not save_to_history:
                    return ""
                    
                # Ensure message is a string for analysis
                msg_str = str(message)
                # Quick bypass for very short messages or greetings
                if len(msg_str.split()) < 3:
                     return ""
                     
                # Only RAG if there's enough substance in the query
                keyword_triggers = ['where', 'plan', 'visit', 'trip', 'travel', 'hotel', 'flight', 'recommend', 'destination', 'budget', 'itinerary']
                if any(word in msg_str.lower() for word in keyword_triggers):
                    try:
                        # Reduced timeout to 3s for better speed balance
                        related_docs = await asyncio.wait_for(rag_service.search(msg_str), timeout=3.0)
                        if related_docs:
                            return "\nRelevant Info:\n" + "\n".join([d['content'] for d in related_docs])
                    except asyncio.TimeoutError:
                        logger.warning("RAG context search timed out (3s). Proceeding without context.")
                return ""

            # Run history retrieval, RAG search, and trip context in parallel
            history, rag_context, trip_context = await asyncio.gather(
                get_history(), 
                get_rag_context(), 
                get_trip_context()
            )
            
            # Combine contexts
            context = rag_context
            if trip_context:
                context += f"\n{trip_context}" if context else trip_context

            # 2. Save user message (Done after history pull to avoid self-inclusion)
            if conversation_id and save_to_history:
                 def _save_user_msg():
                     with app.app_context():
                         user_msg = ChatMessage(conversation_id=conversation_id, user_id=user_id, role='user', content=message)
                         db.session.add(user_msg)
                         db.session.commit()
                 
                 await asyncio.get_running_loop().run_in_executor(None, _save_user_msg)

            # 4. System Prompt
            system_prompt = (
                "You are RoamIQ, a professional travel orchestrator. "
                "Help users plan trips, book tickets, manage expenses, and generate reports. "
                f"ALWAYS use {currency} for any financial estimates or costs. "
                "IMPORTANT: If you are generating a travel plan or itinerary, you MUST ALWAYS include a structured JSON block at the end of your response wrapped in ```json ... ``` tags. "
                "The JSON must follow this format: "
                "{\"trip_title\": \"...\", \"destination\": \"...\", \"estimated_total_cost\": 0, \"days\": [...]}. "
                "This allows the system to save the trip correctly. "
                "IMPORTANT COST RULES: "
                "1. Keep all travel estimates and costs highly realistic and BUDGET-FRIENDLY. Users find current estimates too expensive. "
                "2. For any 'NEARBY' or 'LOCAL' spots/trips, the total cost MUST NEVER EXCEED 10,000 RS. "
                "3. Prioritize affordable options unless the user explicitly asks for luxury. "
                "IMPORTANT: If the user's recent trips are shown in context, use that information "
                "instead of asking for destinations or trip details that are already known. "
                "When creating packing lists or itineraries, reference the specific destinations "
                "from their existing trips when relevant."
            )
            
            if user_id:
                from backend.models.user import User
                user = db.session.get(User, user_id)
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
                tools=tools,
                timeout=timeout
            )

            # Execution loop (up to 3 iterations to prevent infinite loops and reduce lag)
            for _ in range(3):
                if isinstance(response, dict) and "tool_calls" in response:
                    # 5.1 Parallelize independent tool calls
                    async def run_tool(tc):
                        tool_name = tc["name"]
                        args = tc.get("args", {}).copy()
                        logger.info(f"AI calling tool: {tool_name}")
                        
                        if tool_name in AVAILABLE_TOOLS:
                            args['user_id'] = user_id
                            try:
                                tool_func = AVAILABLE_TOOLS[tool_name]
                                if asyncio.iscoroutinefunction(tool_func):
                                    # Execute async tool directly
                                    with app.app_context():
                                        result = await tool_func(**args)
                                else:
                                    # Execute sync tool in executor
                                    def _run_tool():
                                        with app.app_context():
                                            return tool_func(**args)
                                            
                                    result = await asyncio.get_running_loop().run_in_executor(None, _run_tool)
                                
                                return {
                                    "function_response": {
                                        "name": tool_name,
                                        "response": result
                                    }
                                }
                            except Exception as e:
                                logger.error(f"Tool {tool_name} failed: {e}")
                                return {
                                    "function_response": {
                                        "name": tool_name,
                                        "response": {"error": str(e)}
                                    }
                                }
                        return None

                    # Run all tool calls in parallel
                    tool_tasks = [run_tool(tc) for tc in response["tool_calls"]]
                    results = await asyncio.gather(*tool_tasks)
                    
                    # Filter out None and add to response parts
                    tool_results_parts = [r for r in results if r]

                    # Use the preserved model message from the provider to keep all metadata (thought signatures, etc.)
                    contents.append(response["model_message"])
                    
                    # Add result parts to contents
                    contents.append({"role": "user", "parts": tool_results_parts})
                    
                    # Call LLM again with results
                    response = await llm_provider.generate_response(
                        prompt=contents,
                        model_name=model,
                        system_prompt=system_prompt,
                        tools=tools,
                        timeout=timeout
                    )
                else:
                    # Final text response received
                    break

            # Handle final response
            if response is None:
                ai_text = "I'm sorry, I couldn't generate a response after trying multiple providers. Please check your API limits."
            else:
                ai_text = response if isinstance(response, str) else response.get("text", "I've processed your request.")

            # 6. Save AI response
            if conversation_id and save_to_history:
                 def _save_ai_msg():
                     with app.app_context():
                         ai_msg = ChatMessage(conversation_id=conversation_id, user_id=user_id, role='ai', content=ai_text)
                         db.session.add(ai_msg)
                         db.session.commit()
                 
                 await asyncio.get_running_loop().run_in_executor(None, _save_ai_msg)

            mood = self._basic_mood_analysis(str(message))

            return {
                "ai_response": ai_text or "I'm having trouble thinking right now.",
                "mood_analysis": mood,
                "suggestions": ["View my trips", "What's my budget?", "Generate a trip report"]
            }

        except Exception as e:
            logger.error(f"AIService error: {e}")
            error_msg = str(e)
            
            # Clarify quota/timeout issues to user
            if any(term in error_msg for term in ["RESOURCE_EXHAUSTED", "TIMEOUT", "429", "QUOTA"]):
                friendly_error = "I'm currently overwhelmed by API rate limits across all providers (OpenAI, Gemini, etc.). Please wait a minute or check your .env file keys."
            else:
                friendly_error = f"I'm having trouble thinking right now. {error_msg}. Please try asking again in a moment."
                
            return {
                "ai_response": friendly_error,
                "suggestions": ["Try again", "Switch Model", "Check API Keys"]
            }

    async def generate_itinerary(
        self, 
        destination: str, 
        days: int, 
        budget: str, 
        preferences: Optional[Dict] = None,
        currency: str = "USD"
    ) -> Dict[str, Any]:
        """Generate a structured itinerary."""
        prompt = f"""Create a {days}-day itinerary for {destination} with a {budget} budget.
        Preferences: {json.dumps(preferences or {})}
        
        COST CONSTRAINTS:
        - Keep costs realistic and budget-friendly.
        - If this is a nearby/local spot, the total estimated cost MUST NOT EXCEED 10,000 RS.
        - Provide estimated_cost for each activity.
        
        Return ONLY a JSON object with:
        {{
            "trip_title": "string",
            "summary": "string",
            "estimated_total_cost": number,
            "days": [{{ "day": 1, "title": "string", "activities": [{{ "time": "string", "activity": "string", "description": "string", "type": "string", "estimated_cost": 0 }}] }}]
        }}
        """
        
        response = await llm_provider.generate_response(
            prompt=prompt,
            system_prompt=f"You are a professional travel local expert. You output ONLY valid JSON strings. ALWAYS use {currency} for all costs."
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

    async def generate_packing_list(self, destination: str, duration: int, activities: List[str] = None, currency: str = "USD") -> List[Dict]:
        """Generate activities-aware packing list."""
        prompt = f"Packing list for {duration} days in {destination}. Activities: {', '.join(activities or [])}. Return JSON array of objects with item, category, quantity, reason. Mention costs of missing items if any in {currency}."
        
        response = await llm_provider.generate_response(
            prompt=prompt,
            system_prompt="You are a master traveler. Respond with JSON array ONLY."
        )
        
        try:
            clean_res = response.strip()
            if clean_res.startswith("```json"):
                clean_res = clean_res[7:-3].strip()
            return json.loads(clean_res)
        except Exception as e:
             logger.error(f"Failed to generate packing list: {e}")
             return [{"item": "Passport", "category": "Essentials", "quantity": 1, "reason": "Required"}]

    async def analyze_file(self, file_data: bytes, mime_type: str, filename: str) -> Dict[str, Any]:
        """Analyze a generic file (Image, PDF, Text, Code) using Gemini."""
        try:
             from google.genai import types
             
             prompt_text = f"Analyze this file ({filename}). "
             
             # Specialized Path: Receipt/Invoice Detection
             is_image = mime_type.startswith('image/')
             if is_image:
                 receipt_prompt = """
                 If this is a receipt or invoice, extract:
                 - total_amount (number)
                 - currency (3-letter code)
                 - store_name (string)
                 - category (food, travel, transport, shopping, etc.)
                 - date (YYYY-MM-DD if found)
                 Return ONLY a JSON object. If NOT a receipt, return "NOT_RECEIPT".
                 """
                 file_part = types.Part.from_bytes(data=file_data, mime_type=mime_type)
                 res = await llm_provider.generate_response(prompt=[receipt_prompt, file_part], model_name='gemini-1.5-flash')
                 
                 if "NOT_RECEIPT" not in res.upper() and ("{" in res):
                     try:
                         import json
                         clean_res = res.strip()
                         if clean_res.startswith("```json"): clean_res = clean_res[7:-3].strip()
                         receipt_data = json.loads(clean_res)
                         return {
                             "type": "receipt",
                             "data": receipt_data,
                             "summary": f"Receipt from {receipt_data.get('store_name')} for {receipt_data.get('total_amount')} {receipt_data.get('currency')} extracted and categorized as {receipt_data.get('category')}."
                         }
                     except: pass

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

    def _basic_mood_analysis(self, text: Any) -> Dict:
        """Lightweight sentiment/mood analysis."""
        text_str = str(text).lower()
        mood = "neutral"
        energy = "medium"
        polarity = 0.0
        subjectivity = 0.0
        
        if any(w in text_str for w in ['happy', 'excited', 'great', 'awesome']):
            mood = "excited"
            energy = "high"
            polarity = 0.8
            subjectivity = 0.8
        elif any(w in text_str for w in ['sad', 'tired', 'bored']):
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
            except (ValueError, TypeError):
                user_id = None
        
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

    def calculate_sustainability_score(self, trip_data: Dict) -> float:
        """Calculate a sustainability score from 0 to 1 based on transport and distance."""
        score = 0.5 # Baseline
        
        transport = trip_data.get('transportation', '').lower()
        if transport == 'train': score += 0.3
        elif transport == 'bus': score += 0.2
        elif transport == 'flight': score -= 0.2
        
        # Distance penalty
        distance = trip_data.get('distance', 1000)
        if distance > 5000: score -= 0.1
        
        return max(0.1, min(1.0, score))

    def get_safety_alerts(self, destination: str) -> Dict:
        """Search for travel safety alerts and common scams."""
        # This could be an LLM call, but for speed let's use common data or simple search
        # Mocking common alerts for demonstration
        return {
            "scam_alerts": [
                f"Be aware of unofficial taxi aggregators in {destination}.",
                "Common 'broken meter' scams reported at major transit hubs.",
                "Keep valuables secured in crowded tourist areas."
            ]
        }

    async def get_destination_insights(self, destination: str, current_month: int = 4) -> Dict[str, Any]:
        """
        Unique Feature: Destination Intelligence
        Combines safety, weather-appropriate advice, and 'vibe' analysis.
        """
        prompt = f"""Provide intelligence for {destination} in the month of {current_month}:
        1. Weather vibe (1 sentence)
        2. Top 3 'hidden gems' (names only)
        3. Local laws/customs to respect
        4. Carbon footprint advice for this area
        Return JSON object with keys: weather_vibe, hidden_gems, customs, green_tip.
        """
        
        response = await llm_provider.generate_response(
            prompt=prompt,
            system_prompt="You are a global travel intelligence officer. Respond with precise JSON."
        )
        
        try:
            import json
            clean_res = response.strip()
            if clean_res.startswith("```json"): clean_res = clean_res[7:-3].strip()
            data = json.loads(clean_res)
            
            # Combine with local safety mock
            safety = self.get_safety_alerts(destination)
            data.update(safety)
            return data
        except:
            return {"error": "Intelligence gathering timed out."}

    async def generate_travel_postcard(self, trip_id: int, user_id: int) -> Dict[str, Any]:
        """
        Unique Feature: AI Travel Postcard
        Creates a poetic summary of the trip.
        """
        from backend.models.trip import Trip
        trip = Trip.query.filter_by(id=trip_id, user_id=user_id).first()
        if not trip: return {"error": "Trip not found"}
        
        prompt = f"Write a charming, poetic 3-sentence postcard message from {trip.destination} reflecting on a trip titled '{trip.title}'."
        message = await llm_provider.generate_response(prompt=prompt, system_prompt="You are a travel writer.")
        
        return {
            "postcard_text": message,
            "destination": trip.destination,
            "signature": f"Sent from RoamIQ by {trip.user.username if trip.user else 'Traveler'}"
        }

    async def update_trip_with_ai(
        self, 
        trip_data: Dict[str, Any], 
        prompt: str, 
        preferences: Optional[Dict] = None,
        currency: str = "USD"
    ) -> Dict[str, Any]:
        """Update an existing trip's itinerary based on a user prompt."""
        system_prompt = f"""You are an expert travel consultant. You are updating an existing trip.
        Current Trip Data: {json.dumps(trip_data)}
        User Preferences: {json.dumps(preferences or {})}
        
        The user wants to update this trip with the following request: "{prompt}"
        
        Return ONLY a JSON object representing the updated trip. The object must contain:
        {{
            "title": "string",
            "destination": "string",
            "budget": number (in {currency}),
            "itinerary": {{
                "trip_title": "string",
                "summary": "string",
                "days": [{{ "day": 1, "title": "string", "activities": [{{ "time": "string", "activity": "string", "description": "string", "type": "string", "estimated_cost": 0 }}] }}]
            }}
        }}
        Maintain as much of the original trip as possible unless the user explicitly asks for changes.
        """
        
        response = await llm_provider.generate_response(
            prompt=f"Update request: {prompt}",
            system_prompt=system_prompt
        )
        
        try:
            clean_res = response.strip()
            if clean_res.startswith("```json"):
                clean_res = clean_res[7:-3].strip()
            elif clean_res.startswith("```"):
                clean_res = clean_res[3:-3].strip()
            return json.loads(clean_res)
        except Exception as e:
            logger.error(f"Failed to parse AI trip update: {e}. Raw: {response}")
            return {"error": "Failed to update trip with AI. Please try again with a clearer request."}

# Singleton instance
ai_service = AIService()

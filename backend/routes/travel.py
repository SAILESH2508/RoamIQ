from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
from backend.models.user import User
from backend.models.trip import Trip
from backend.models.expense import Expense
from backend.models.packing_list import PackingItem
from backend.models.preference import UserPreference
from backend.extensions import db
from backend.models.ticket import Ticket
from backend.services.ai_service import AIService
from datetime import datetime, date, timezone
import json
import logging
import requests

logger = logging.getLogger(__name__)

# Create blueprint
travel_bp = Blueprint('travel', __name__, url_prefix='/api/travel')

from backend.services.ai_service import ai_service

@travel_bp.route('/preferences', methods=['GET'])
@jwt_required()
def get_preferences():
    try:
        user_id = get_jwt_identity()
        preferences = UserPreference.query.filter_by(user_id=user_id).first()
        
        if not preferences:
            # Create default preferences if none exist
            preferences = UserPreference(user_id=user_id)
            db.session.add(preferences)
            db.session.commit()
            logger.debug(f"Created default preferences for user {user_id}")
        
        logger.debug(f"Fetched preferences for user {user_id}")
        return jsonify({'preferences': preferences.to_dict()}), 200
        
    except Exception as e:
        logger.error(f"Error fetching preferences for user {get_jwt_identity()}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@travel_bp.route('/preferences', methods=['PUT'])
@jwt_required()
def update_preferences():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        preferences = UserPreference.query.filter_by(user_id=user_id).first()
        if not preferences:
            preferences = UserPreference(user_id=user_id)
            logger.debug(f"Creating new preferences for user {user_id} during update as none existed.")
        
        # Update preferences
        if 'budget_range' in data:
            preferences.budget_range = data['budget_range']
        if 'travel_style' in data:
            preferences.travel_style = data['travel_style']
        if 'group_type' in data:
            preferences.group_type = data['group_type']
        if 'dietary_restrictions' in data:
            preferences.set_dietary_restrictions(data['dietary_restrictions'])
        if 'cuisine_preferences' in data:
            preferences.set_cuisine_preferences(data['cuisine_preferences'])
        if 'food_adventure_level' in data:
            preferences.food_adventure_level = data['food_adventure_level']
        if 'activity_interests' in data:
            preferences.set_activity_interests(data['activity_interests'])
        if 'fitness_level' in data:
            preferences.fitness_level = data['fitness_level']
        if 'accommodation_type' in data:
            preferences.accommodation_type = data['accommodation_type']
        if 'sustainability_priority' in data:
            preferences.sustainability_priority = data['sustainability_priority']
        
        preferences.updated_at = datetime.now(timezone.utc)
        db.session.add(preferences)
        db.session.commit()
        
        logger.debug(f"Preferences updated successfully for user {user_id}")
        return jsonify({
            'message': 'Preferences updated successfully',
            'preferences': preferences.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating preferences for user {get_jwt_identity()}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@travel_bp.route('/trips', methods=['GET'])
@jwt_required()
def get_trips():
    try:
        user_id = get_jwt_identity()
        trips = Trip.query.filter_by(user_id=user_id).order_by(Trip.created_at.desc()).all()
        
        logger.debug(f"Fetched {len(trips)} trips for user {user_id}")
        return jsonify({
            'trips': [trip.to_dict() for trip in trips]
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching trips for user {get_jwt_identity()}: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ==========================================
# BOOKING & TICKETS ROUTES
# ==========================================

@travel_bp.route('/tickets', methods=['GET'])
@jwt_required()
def get_tickets():
    """Get all tickets for the user, optionally filtered by trip"""
    try:
        user_id = get_jwt_identity()
        trip_id = request.args.get('trip_id')
        
        query = Ticket.query.filter_by(user_id=user_id)
        if trip_id:
            query = query.filter_by(trip_id=trip_id)
            
        tickets = query.all()
        logger.debug(f"Fetched {len(tickets)} tickets for user {user_id}, trip_id: {trip_id}")
        return jsonify([t.to_dict() for t in tickets])
    except Exception as e:
        logger.error(f"Error fetching tickets for user {get_jwt_identity()}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@travel_bp.route('/tickets', methods=['POST'])
@jwt_required()
def add_ticket():
    """Add a new ticket/booking"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data.get('ticket_type') or not data.get('title'):
            logger.debug(f"Missing required fields for adding ticket for user {user_id}")
            return jsonify({'error': 'Missing required fields'}), 400
            
        ticket = Ticket(
            user_id=user_id,
            trip_id=data.get('trip_id'),
            ticket_type=data['ticket_type'],
            title=data['title'],
            description=data.get('description'),
            booking_reference=data.get('booking_reference'),
            confirmation_number=data.get('confirmation_number'),
            price=data.get('price'),
            currency=data.get('currency', 'USD'),
            valid_from=datetime.fromisoformat(data['valid_from']) if data.get('valid_from') and str(data['valid_from']).strip() else None,
            valid_until=datetime.fromisoformat(data['valid_until']) if data.get('valid_until') and str(data['valid_until']).strip() else None,
            status=data.get('status', 'confirmed')
        )
        
        if data.get('additional_info'):
            ticket.set_additional_info(data['additional_info'])
            
        db.session.add(ticket)
        db.session.commit()
        
        logger.debug(f"Ticket added successfully for user {user_id}: {ticket.id}")
        return jsonify(ticket.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding ticket for user {get_jwt_identity()}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@travel_bp.route('/tickets/<int:ticket_id>', methods=['DELETE'])
@jwt_required()
def delete_ticket(ticket_id):
    """Remove a ticket"""
    try:
        user_id = get_jwt_identity()
        ticket = Ticket.query.filter_by(id=ticket_id, user_id=user_id).first_or_404()
        
        db.session.delete(ticket)
        db.session.commit()
        
        logger.debug(f"Ticket {ticket_id} deleted successfully for user {user_id}")
        return jsonify({'message': 'Ticket deleted'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting ticket {ticket_id} for user {get_jwt_identity()}: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ==========================================
# LOCATION SERVICES
# ==========================================

@travel_bp.route('/user/location', methods=['POST'])
@jwt_required()
def update_location():
    """Update user's last known location"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'lat' not in data or 'lng' not in data:
            logger.debug(f"Missing lat/lng for user {user_id} location update")
            return jsonify({'error': 'Latitude and longitude required'}), 400
            
        user = User.query.get(int(user_id))
        if not user:
            logger.debug(f"User {user_id} not found for location update")
            return jsonify({'error': 'User not found'}), 404

        location_data = {
            'lat': data['lat'],
            'lng': data['lng'],
            'address': data.get('address', ''),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        user.last_location = json.dumps(location_data)
        db.session.commit()
        
        logger.debug(f"Updated location for user {user_id}: {location_data}")
        return jsonify({'message': 'Location updated', 'location': location_data})
    except Exception as e:
        logger.error(f"Failed to update location for user {get_jwt_identity()}: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@travel_bp.route('/trips', methods=['POST'])
@jwt_required()
def create_trip():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'destination']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Create new trip
        trip = Trip(
            user_id=user_id,
            title=data['title'],
            destination=data['destination'],
            budget=data.get('budget'),
            group_size=data.get('group_size', 1),
            trip_type=data.get('trip_type', 'leisure'),
            notes=data.get('notes', '')
        )
        
        if data.get('start_date'):
            trip.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        if data.get('end_date'):
            trip.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
            
        # Geocode destination for the map
        try:
            geo_url = f"https://nominatim.openstreetmap.org/search?format=json&q={requests.utils.quote(trip.destination)}&limit=1"
            geo_res = requests.get(geo_url, headers={'User-Agent': 'RoamIQ/1.0'}, timeout=5)
            if geo_res.status_code == 200 and geo_res.json():
                loc = geo_res.json()[0]
                trip.lat = float(loc['lat'])
                trip.lng = float(loc['lon'])
                logger.info(f"Geocoded '{trip.destination}' to {trip.lat}, {trip.lng}")
        except Exception as ge:
            logger.warning(f"Failed to geocode destination '{trip.destination}': {ge}")
        
        # Calculate duration
        trip.calculate_duration()
        
        # Handle itinerary
        if data.get('itinerary'):
            trip.set_itinerary(data['itinerary'])
        elif trip.budget and trip.duration_days:
            preferences = UserPreference.query.filter_by(user_id=user_id).first()
            try:
                import asyncio
                loop = asyncio.new_event_loop()
                itinerary = loop.run_until_complete(ai_service.generate_itinerary(
                    trip.destination,
                    trip.duration_days,
                    trip.budget,
                    preferences.to_dict() if preferences else None,
                    currency=data.get('currency', 'USD')
                ))
                loop.close()
                trip.set_itinerary(itinerary)
            except Exception as ai_e:
                logger.warning(f"AI itinerary generation failed: {ai_e}")
        
        # Calculate sustainability score
        trip_data = {
            'transportation': data.get('transportation', 'flight'),
            'accommodation_type': data.get('accommodation_type', 'hotel'),
            'local_transport': data.get('local_transport', 'mixed'),
            'distance': data.get('distance', 1000)
        }
        trip.sustainability_score = ai_service.calculate_sustainability_score(trip_data)
        
        # Get safety alerts
        safety_alerts = ai_service.get_safety_alerts(trip.destination)
        trip.set_safety_alerts(safety_alerts.get('scam_alerts', []))
        
        db.session.add(trip)
        db.session.commit()
        
        return jsonify({
            'message': 'Trip created successfully',
            'trip': trip.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@travel_bp.route('/trips/<int:trip_id>', methods=['GET'])
@jwt_required()
def get_trip(trip_id):
    try:
        user_id = get_jwt_identity()
        trip = Trip.query.filter_by(id=trip_id, user_id=user_id).first()
        
        if not trip:
            return jsonify({'error': 'Trip not found'}), 404
        
        return jsonify({'trip': trip.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@travel_bp.route('/trips/<int:trip_id>', methods=['PUT'])
@jwt_required()
def update_trip(trip_id):
    try:
        user_id = get_jwt_identity()
        trip = Trip.query.filter_by(id=trip_id, user_id=user_id).first()
        
        if not trip:
            return jsonify({'error': 'Trip not found'}), 404
        
        data = request.get_json()
        
        # Update trip fields
        if 'title' in data:
            trip.title = data['title']
        if 'destination' in data:
            trip.destination = data['destination']
        if 'budget' in data:
            trip.budget = data['budget']
        if 'actual_cost' in data:
            trip.actual_cost = data['actual_cost']
        if 'group_size' in data:
            trip.group_size = data['group_size']
        if 'trip_type' in data:
            trip.trip_type = data['trip_type']
        if 'status' in data:
            trip.status = data['status']
        if 'rating' in data:
            trip.rating = data['rating']
        if 'notes' in data:
            trip.notes = data['notes']
        
        # Update dates
        if 'start_date' in data and data['start_date']:
            trip.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        if 'end_date' in data and data['end_date']:
            trip.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        
        # Recalculate duration
        trip.calculate_duration()
        
        trip.updated_at = datetime.now(timezone.utc)
        db.session.commit()
        
        return jsonify({
            'message': 'Trip updated successfully',
            'trip': trip.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@travel_bp.route('/trips/<int:trip_id>', methods=['DELETE'])
@jwt_required()
def delete_trip(trip_id):
    try:
        user_id = get_jwt_identity()
        trip = Trip.query.filter_by(id=trip_id, user_id=user_id).first()
        
        if not trip:
            return jsonify({'error': 'Trip not found'}), 404
        
        db.session.delete(trip)
        db.session.commit()
        
        return jsonify({'message': 'Trip deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@travel_bp.route('/trips/<int:trip_id>/update-ai', methods=['POST'])
@jwt_required()
def update_trip_ai(trip_id):
    try:
        user_id = get_jwt_identity()
        trip = Trip.query.filter_by(id=trip_id, user_id=user_id).first()
        
        if not trip:
            return jsonify({'error': 'Trip not found'}), 404
        
        data = request.get_json()
        prompt = data.get('prompt')
        
        if not prompt:
            return jsonify({'error': 'Prompt is required'}), 400
            
        preferences = UserPreference.query.filter_by(user_id=user_id).first()
        trip_data = trip.to_dict()
        
        try:
            import asyncio
            loop = asyncio.new_event_loop()
            updated_data = loop.run_until_complete(ai_service.update_trip_with_ai(
                trip_data,
                prompt,
                preferences.to_dict() if preferences else None,
                currency=data.get('currency', 'USD')
            ))
            loop.close()
        except Exception as ai_e:
            logger.error(f"AI update failed for trip {trip_id}: {ai_e}")
            return jsonify({'error': f'AI update failed: {str(ai_e)}'}), 500
        
        if 'error' in updated_data:
            return jsonify({'error': updated_data['error']}), 400
            
        if 'title' in updated_data:
            trip.title = updated_data['title']
        if 'destination' in updated_data:
            trip.destination = updated_data['destination']
        if 'budget' in updated_data:
            trip.budget = updated_data['budget']
        if 'itinerary' in updated_data:
            trip.set_itinerary(updated_data['itinerary'])
            
        trip.updated_at = datetime.now(timezone.utc)
        db.session.commit()
        
        return jsonify({
            'message': 'Trip updated by AI successfully',
            'trip': trip.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating trip {trip_id} with AI: {e}")
        return jsonify({'error': str(e)}), 500

@travel_bp.route('/destinations/search', methods=['GET'])
@jwt_required()
def search_destinations():
    try:
        query = request.args.get('q', '')
        mood = request.args.get('mood', 'neutral')
        budget = request.args.get('budget', 'mid-range')
        
        # This would typically query a destinations database
        # For now, return mock data based on query and mood
        destinations = generate_destination_suggestions(query, mood, budget)
        
        return jsonify({
            'query': query,
            'mood': mood,
            'budget': budget,
            'destinations': destinations
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def generate_destination_suggestions(query, mood, budget):
    """Generate destination suggestions based on query, mood, and budget"""
    # Mock destination data - in a real app, this would query a database
    destinations = {
        'beach': [
            {'name': 'Goa', 'country': 'India', 'type': 'beach', 'budget_level': 'budget'},
            {'name': 'Maldives', 'country': 'Maldives', 'type': 'beach', 'budget_level': 'luxury'},
            {'name': 'Phuket', 'country': 'Thailand', 'type': 'beach', 'budget_level': 'mid-range'}
        ],
        'mountain': [
            {'name': 'Manali', 'country': 'India', 'type': 'mountain', 'budget_level': 'budget'},
            {'name': 'Swiss Alps', 'country': 'Switzerland', 'type': 'mountain', 'budget_level': 'luxury'},
            {'name': 'Nepal Himalayas', 'country': 'Nepal', 'type': 'mountain', 'budget_level': 'mid-range'}
        ],
        'city': [
            {'name': 'Mumbai', 'country': 'India', 'type': 'city', 'budget_level': 'mid-range'},
            {'name': 'Tokyo', 'country': 'Japan', 'type': 'city', 'budget_level': 'luxury'},
            {'name': 'Bangkok', 'country': 'Thailand', 'type': 'city', 'budget_level': 'budget'}
        ]
    }
    
    # Filter based on query
    if query.lower() in ['beach', 'sea', 'ocean']:
        results = destinations['beach']
    elif query.lower() in ['mountain', 'hill', 'trek']:
        results = destinations['mountain']
    elif query.lower() in ['city', 'urban', 'metro']:
        results = destinations['city']
    else:
        # Return mixed results
        results = destinations['beach'][:1] + destinations['mountain'][:1] + destinations['city'][:1]
    
    # Filter by budget
    results = [d for d in results if d['budget_level'] == budget or budget == 'any']
    
    # Add mood-based scoring
    for dest in results:
        if mood == 'excited' and dest['type'] in ['city', 'beach']:
            dest['mood_match'] = 0.9
        elif mood == 'stressed' and dest['type'] in ['mountain', 'beach']:
            dest['mood_match'] = 0.9
        else:
            dest['mood_match'] = 0.7
    
    return sorted(results, key=lambda x: x['mood_match'], reverse=True)

# ==========================================
# EXPENSE TRACKER ROUTES
# ==========================================

@travel_bp.route('/expenses', methods=['GET'])
@jwt_required()
def get_expenses():
    try:
        user_id = get_jwt_identity()
        trip_id = request.args.get('trip_id')

        query = Expense.query.filter_by(user_id=user_id)
        if trip_id:
            query = query.filter_by(trip_id=trip_id)

        expenses = query.order_by(Expense.date.desc()).all()
        return jsonify([e.to_dict() for e in expenses]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@travel_bp.route('/expenses', methods=['POST'])
@jwt_required()
def add_expense():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        expense = Expense(
            user_id=user_id,
            trip_id=data.get('trip_id'),
            amount=data.get('amount'),
            currency=data.get('currency', 'USD'),
            category=data.get('category'),
            description=data.get('description'),
            date=datetime.fromisoformat(data['date']) if data.get('date') and str(data['date']).strip() else datetime.now(timezone.utc)
        )
        db.session.add(expense)
        db.session.commit()
        return jsonify(expense.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@travel_bp.route('/expenses/<int:expense_id>', methods=['DELETE'])
@jwt_required()
def delete_expense(expense_id):
    try:
        user_id = get_jwt_identity()
        expense = Expense.query.filter_by(id=expense_id, user_id=user_id).first()
        if not expense:
            return jsonify({'error': 'Expense not found'}), 404
        
        db.session.delete(expense)
        db.session.commit()
        return jsonify({'message': 'Expense deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==========================================
# PACKING LIST ROUTES
# ==========================================

@travel_bp.route('/packing-list', methods=['GET'])
@jwt_required()
def get_packing_list():
    try:
        user_id = get_jwt_identity()
        trip_id = request.args.get('trip_id')

        query = PackingItem.query.filter_by(user_id=user_id)
        if trip_id:
            query = query.filter_by(trip_id=trip_id)
        
        # Sort manually or via SQL: unchecked first, then checked
        items = query.order_by(PackingItem.is_packed, PackingItem.category, PackingItem.item).all()
        return jsonify([i.to_dict() for i in items]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@travel_bp.route('/packing-list', methods=['POST'])
@jwt_required()
def add_packing_item():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        item = PackingItem(
            user_id=user_id,
            trip_id=data.get('trip_id'),
            item=data.get('item'),
            category=data.get('category', 'general'),
            quantity=data.get('quantity', 1),
            is_packed=data.get('is_packed', False)
        )
        db.session.add(item)
        db.session.commit()
        return jsonify(item.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@travel_bp.route('/packing-list/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_packing_item(item_id):
    try:
        user_id = get_jwt_identity()
        item = PackingItem.query.filter_by(id=item_id, user_id=user_id).first()
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        
        data = request.get_json()
        if 'is_packed' in data:
            item.is_packed = data['is_packed']
        if 'quantity' in data:
            item.quantity = data['quantity']
        if 'item' in data:
            item.item = data['item']
        
        db.session.commit()
        return jsonify(item.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@travel_bp.route('/packing-list/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_packing_item(item_id):
    try:
        user_id = get_jwt_identity()
        item = PackingItem.query.filter_by(id=item_id, user_id=user_id).first()
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        
        db.session.delete(item)
        db.session.commit()
        return jsonify({'message': 'Item deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
@travel_bp.route('/packing-list/generate', methods=['POST'])
@jwt_required()
def generate_packing_list_ai():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        destination = data.get('destination')
        duration = data.get('duration', 7)
        activities = data.get('activities', [])
        
        if not destination:
            return jsonify({'error': 'Destination is required'}), 400

        try:
            import asyncio
            loop = asyncio.new_event_loop()
            packing_list = loop.run_until_complete(
                ai_service.generate_packing_list(destination, duration, activities)
            )
            loop.close()
        except Exception as ai_e:
            logger.error(f"AI packing list generation failed: {ai_e}")
            return jsonify({'error': f'AI generation failed: {str(ai_e)}'}), 500
        
        return jsonify({'packing_list': packing_list}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@travel_bp.route('/search', methods=['GET'], strict_slashes=False)
def proxy_search():
    """Proxy Nominatim search requests to avoid CORS issues"""
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([]), 200
    
    try:
        headers = {
            'User-Agent': 'RoamIQ/1.0 (Travel Planner App)',
            'Accept-Language': 'en-US,en;q=0.9'
        }
        
        params = {
            'format': 'json',
            'q': query,
            'limit': 10,
            'addressdetails': 1
        }
        
        url = "https://nominatim.openstreetmap.org/search"
        res = requests.get(url, params=params, headers=headers, timeout=8)
        
        if res.status_code == 200:
            return jsonify(res.json())
        
        # Fallback to empty list instead of error for better UI experience
        return jsonify([])

    except Exception as e:
        logger.error(f"Geocoding proxy error for '{query}': {e}")
        return jsonify([]), 200 # Return empty list on error to keep UI stable

_geo_cache = {}

@travel_bp.route('/reverse', methods=['GET'], strict_slashes=False)
def proxy_reverse():
    """Proxy Nominatim reverse geocoding requests"""
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    if not lat or not lon:
        return jsonify({'error': 'Lat/Lon required'}), 400
        
    try:
        cache_key = f"{round(float(lat), 3)}_{round(float(lon), 3)}"
        if cache_key in _geo_cache:
            return jsonify(_geo_cache[cache_key])
    except ValueError:
        pass
    
    try:
        headers = {
            'User-Agent': 'RoamIQ/1.0 (Travel Planner App)',
            'Accept-Language': 'en-US,en;q=0.9'
        }
        params = {
            'format': 'json',
            'lat': lat,
            'lon': lon,
            'addressdetails': 1
        }
        url = "https://nominatim.openstreetmap.org/reverse"
        res = requests.get(url, params=params, headers=headers, timeout=8)
        
        if res.status_code != 200:
            # If rate limited, blocked, or forbidden, return a clean fallback display name instead of crashing
            return jsonify({
                "display_name": "Coimbatore, Tamil Nadu, India" if abs(float(lat) - 11.0168) < 0.1 else f"Location ({round(float(lat), 4)}, {round(float(lon), 4)})",
                "address": {"city": "Coimbatore" if abs(float(lat) - 11.0168) < 0.1 else "Current Location"}
            }), 200
            
        try:
            data = res.json()
            if 'cache_key' in locals():
                _geo_cache[cache_key] = data
            return jsonify(data)
        except Exception as json_err:
            logger.error(f"Failed to parse reverse geocoding JSON: {json_err}. Raw: {res.text[:100]}")
            return jsonify({'error': 'Invalid response from reverse API'}), 502

    except requests.exceptions.RequestException as e:
        logger.error(f"Reverse geocoding connection error: {e}")
        return jsonify({'error': 'Reverse lookup failed: Connection issue'}), 503
    except Exception as e:
        logger.error(f"Reverse geocoding proxy error: {e}")
        return jsonify({'error': f'Internal Reverse Error: {str(e)}'}), 500

@travel_bp.route('/current', methods=['GET'], strict_slashes=False)
def get_current_weather():
    """Fetch current weather from Open-Meteo"""
    lat = request.args.get('lat', 11.0168)
    lon = request.args.get('lon', 76.9558)
    city = request.args.get('city', 'Coimbatore')
    
    try:
        # Open-Meteo API URL
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,precipitation,rain,weather_code,pressure_msl,surface_pressure,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,uv_index_clear_sky,is_day,sunshine_duration&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,daylight_duration,sunshine_duration,uv_index_max,uv_index_clear_sky_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,precipitation_probability_max&timezone=auto"
        
        res = requests.get(url, timeout=10)
        if res.status_code != 200:
            return jsonify({'error': 'Weather service error'}), 502
            
        data = res.json()
        
        # Map to our frontend format
        weather_data = {
            'temperature': data['current']['temperature_2m'],
            'description': get_wmo_description(data['current']['weather_code']),
            'weather_code': data['current']['weather_code'],
            'humidity': data['current']['relative_humidity_2m'],
            'wind_speed': data['current']['wind_speed_10m'],
            'city': city,
            'is_day': data['current']['is_day'],
            'hourly': data['hourly'],
            'daily': data['daily']
        }
        
        return jsonify(weather_data)
    except Exception as e:
        logger.error(f"Weather Fetch Error: {e}")
        return jsonify({'error': str(e)}), 500

@travel_bp.route('/predict_fast', methods=['POST'])
def predict_weather_fast():
    """Fast weather prediction using heuristic logic"""
    try:
        data = request.get_json()
        t = data.get('temperature', 25)
        h = data.get('humidity', 60)
        r = data.get('rainfall', 0)
        w = data.get('wind_speed', 10)
        
        # Simple prediction logic
        prediction = "Partly Cloudy"
        if r > 10: prediction = "Heavy Rain"
        elif r > 0: prediction = "Light Rain"
        elif h > 80: prediction = "Humid/Foggy"
        elif t > 35: prediction = "Hot/Sunny"
        
        return jsonify({
            'predicted_temperature': round(t + (h/100) - (r/10), 1),
            'predicted_rainfall': round(r + (h/50), 1),
            'condition_tomorrow': prediction,
            'message': "Simulation complete based on current parameters."
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_wmo_description(code):
    """Map WMO codes to human descriptions"""
    mapping = {
        0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Fog", 48: "Depositing rime fog",
        51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
        61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
        71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
        77: "Snow grains", 80: "Slight rain showers", 81: "Moderate rain showers",
        82: "Violent rain showers", 95: "Thunderstorm", 96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail"
    }
    return mapping.get(code, "Clear Sky")

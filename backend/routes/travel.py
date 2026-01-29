from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.user import User
from backend.models.trip import Trip
from backend.models.expense import Expense
from backend.models.packing_list import PackingItem
from backend.models.preference import UserPreference, db
from backend.models.ticket import Ticket
from backend.services.ai_service import AIService
from datetime import datetime, date
import json

travel_bp = Blueprint('travel', __name__)
ai_service = AIService()

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
        
        return jsonify({'preferences': preferences.to_dict()}), 200
        
    except Exception as e:
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
        
        preferences.updated_at = datetime.utcnow()
        db.session.add(preferences)
        db.session.commit()
        
        return jsonify({
            'message': 'Preferences updated successfully',
            'preferences': preferences.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@travel_bp.route('/trips', methods=['GET'])
@jwt_required()
def get_trips():
    try:
        user_id = get_jwt_identity()
        trips = Trip.query.filter_by(user_id=user_id).order_by(Trip.created_at.desc()).all()
        
        return jsonify({
            'trips': [trip.to_dict() for trip in trips]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==========================================
# BOOKING & TICKETS ROUTES
# ==========================================

@travel_bp.route('/tickets', methods=['GET'])
@jwt_required()
def get_tickets():
    """Get all tickets for the user, optionally filtered by trip"""
    user_id = get_jwt_identity()
    trip_id = request.args.get('trip_id')
    
    query = Ticket.query.filter_by(user_id=user_id)
    if trip_id:
        query = query.filter_by(trip_id=trip_id)
        
    tickets = query.all()
    return jsonify([t.to_dict() for t in tickets])

@travel_bp.route('/tickets', methods=['POST'])
@jwt_required()
def add_ticket():
    """Add a new ticket/booking"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data.get('ticket_type') or not data.get('title'):
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
    
    return jsonify(ticket.to_dict()), 201

@travel_bp.route('/tickets/<int:ticket_id>', methods=['DELETE'])
@jwt_required()
def delete_ticket(ticket_id):
    """Remove a ticket"""
    user_id = get_jwt_identity()
    ticket = Ticket.query.filter_by(id=ticket_id, user_id=user_id).first_or_404()
    
    db.session.delete(ticket)
    db.session.commit()
    
    return jsonify({'message': 'Ticket deleted'})

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
            return jsonify({'error': 'Latitude and longitude required'}), 400
            
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        location_data = {
            'lat': data['lat'],
            'lng': data['lng'],
            'updated_at': datetime.utcnow().isoformat()
        }
        
        user.last_location = json.dumps(location_data)
        db.session.commit()
        
        print(f"DEBUG: Updated location for user {user_id}: {location_data}")
        return jsonify({'message': 'Location updated', 'location': location_data})
    except Exception as e:
        print(f"ERROR: Failed to update location for user {get_jwt_identity()}: {str(e)}")
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
        
        # Parse dates if provided
        if data.get('start_date'):
            trip.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        if data.get('end_date'):
            trip.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        
        # Calculate duration
        trip.calculate_duration()
        
        # Generate initial itinerary if budget and duration are provided
        if trip.budget and trip.duration_days:
            preferences = UserPreference.query.filter_by(user_id=user_id).first()
            itinerary = ai_service.generate_itinerary(
                trip.destination,
                trip.duration_days,
                trip.budget,
                preferences.to_dict() if preferences else None
            )
            trip.set_itinerary(itinerary)
        
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
        
        trip.updated_at = datetime.utcnow()
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
            date=datetime.fromisoformat(data['date']) if data.get('date') and str(data['date']).strip() else datetime.utcnow()
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

        # Generate list using AI Service
        packing_list = ai_service.generate_packing_list(destination, duration, activities)
        
        return jsonify({'packing_list': packing_list}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


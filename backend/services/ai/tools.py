import logging
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
from backend.extensions import db
from backend.models.trip import Trip
from backend.models.ticket import Ticket
from backend.models.expense import Expense

logger = logging.getLogger(__name__)

def create_trip(user_id: int, destination: str, title: str, start_date: str, end_date: str, budget: float = 0.0) -> Dict[str, Any]:
    """
    Create a new travel trip.
    Dates must be in ISO format (YYYY-MM-DD).
    """
    try:
        from datetime import datetime
        s_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        e_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        new_trip = Trip(
            user_id=user_id,
            destination=destination,
            title=title,
            start_date=s_date,
            end_date=e_date,
            budget=budget,
            status='planned'
        )
        new_trip.calculate_duration()
        db.session.add(new_trip)
        db.session.commit()
        return {"success": True, "trip": new_trip.to_dict()}
    except Exception as e:
        logger.error(f"Error creating trip: {e}")
        return {"success": False, "error": str(e)}

def add_ticket(user_id: int, trip_id: Optional[int], ticket_type: str, title: str, price: float = 0.0, confirmation_number: str = "") -> Dict[str, Any]:
    """
    Add/Book a ticket for a trip or general use.
    ticket_type: 'flight', 'train', 'bus', 'event', 'museum', etc.
    """
    try:
        new_ticket = Ticket(
            user_id=user_id,
            trip_id=trip_id,
            ticket_type=ticket_type,
            title=title,
            price=price,
            confirmation_number=confirmation_number,
            status='confirmed'
        )
        db.session.add(new_ticket)
        db.session.commit()
        return {"success": True, "ticket": new_ticket.to_dict()}
    except Exception as e:
        logger.error(f"Error adding ticket: {e}")
        return {"success": False, "error": str(e)}

def add_expense(user_id: int, trip_id: int, title: str, amount: float, category: str = "other") -> Dict[str, Any]:
    """
    Add an expense to a specific trip.
    """
    try:
        new_expense = Expense(
            user_id=user_id,
            trip_id=trip_id,
            description=title,
            amount=amount,
            category=category,
            date=datetime.utcnow()
        )
        db.session.add(new_expense)
        db.session.commit()
        return {"success": True, "expense": new_expense.to_dict()}
    except Exception as e:
        logger.error(f"Error adding expense: {e}")
        return {"success": False, "error": str(e)}

def get_user_trips(user_id: int) -> Dict[str, Any]:
    """Get list of active/planned trips for the user."""
    try:
        trips = Trip.query.filter_by(user_id=user_id).order_by(Trip.start_date.desc()).all()
        return {"success": True, "trips": [t.to_dict() for t in trips]}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_finalized_trips(user_id: int) -> Dict[str, Any]:
    """Get list of completed/finalized trips for report generation."""
    try:
        trips = Trip.query.filter_by(user_id=user_id, status='completed').order_by(Trip.end_date.desc()).all()
        # If no completed trips, just show most recent ones as fallback
        if not trips:
             trips = Trip.query.filter_by(user_id=user_id).order_by(Trip.end_date.desc()).limit(5).all()
        return {"success": True, "trips": [t.to_dict() for t in trips]}
    except Exception as e:
        return {"success": False, "error": str(e)}

def generate_trip_report(user_id: int, trip_id: int) -> Dict[str, Any]:
    """
    Generate a detailed textual report of a trip including costs and tickets.
    The AI will take this raw data and format it into a beautiful summary.
    """
    try:
        trip = Trip.query.filter_by(id=trip_id, user_id=user_id).first()
        if not trip:
            return {"success": False, "error": "Trip not found"}
        
        tickets = Ticket.query.filter_by(trip_id=trip_id).all()
        expenses = Expense.query.filter_by(trip_id=trip_id).all()
        
        total_spent = sum(e.amount for e in expenses)
        ticket_summary = [{"type": t.ticket_type, "title": t.title, "price": t.price} for t in tickets]
        
        report_data = {
            "title": trip.title,
            "destination": trip.destination,
            "dates": f"{trip.start_date} to {trip.end_date}",
            "budget": trip.budget,
            "actual_spending": total_spent,
            "ticket_count": len(tickets),
            "tickets": ticket_summary,
            "expenses": [{"title": e.description, "amount": e.amount, "category": e.category} for e in expenses],
            "notes": trip.notes or "No notes added."
        }
        
        return {"success": True, "report_data": report_data}
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        return {"success": False, "error": str(e)}

# Map tools for the LLM
AVAILABLE_TOOLS = {
    "create_trip": create_trip,
    "add_ticket": add_ticket,
    "add_expense": add_expense,
    "get_user_trips": get_user_trips,
    "get_finalized_trips": get_finalized_trips,
    "generate_trip_report": generate_trip_report
}

# Declarations for Gemini (OpenAPI-like schema)
TOOL_DECLARATIONS = [
    {
        "name": "create_trip",
        "description": "Initialize a new travel plan/trip in the system.",
        "parameters": {
            "type": "object",
            "properties": {
                "destination": {"type": "string", "description": "City or Country name"},
                "title": {"type": "string", "description": "A catchy title for the trip"},
                "start_date": {"type": "string", "description": "Start date in YYYY-MM-DD"},
                "end_date": {"type": "string", "description": "End date in YYYY-MM-DD"},
                "budget": {"type": "number", "description": "Estimated budget amount"}
            },
            "required": ["destination", "title", "start_date", "end_date"]
        }
    },
    {
        "name": "add_ticket",
        "description": "Log a booking for a flight, train, or event.",
        "parameters": {
            "type": "object",
            "properties": {
                "trip_id": {"type": "integer", "description": "ID of the trip this ticket belongs to (optional)"},
                "ticket_type": {"type": "string", "description": "Type: flight, hotel, train, event"},
                "title": {"type": "string", "description": "Name of the booking/service"},
                "price": {"type": "number", "description": "Cost of the ticket"},
                "confirmation_number": {"type": "string", "description": "Booking reference code"}
            },
            "required": ["ticket_type", "title"]
        }
    },
    {
        "name": "add_expense",
        "description": "Add a cost or expense item to a trip.",
        "parameters": {
            "type": "object",
            "properties": {
                "trip_id": {"type": "integer", "description": "ID of the trip"},
                "title": {"type": "string", "description": "What was the expense for?"},
                "amount": {"type": "number", "description": "Amount spent"},
                "category": {"type": "string", "description": "food, transport, shopping, etc."}
            },
            "required": ["trip_id", "title", "amount"]
        }
    },
    {
        "name": "get_user_trips",
        "description": "Fetch all trips planned by the user to get their IDs.",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "get_finalized_trips",
        "description": "Fetch completed trips to select one for report generation.",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "generate_trip_report",
        "description": "Get deep data about a specific trip (costs/tickets) to write a summary report.",
        "parameters": {
            "type": "object",
            "properties": {
                "trip_id": {"type": "integer", "description": "The ID of the trip to report on"}
            },
            "required": ["trip_id"]
        }
    }
]

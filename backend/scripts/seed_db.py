#!/usr/bin/env python3
"""
RoamIQ Setup Script
Initializes the database and creates sample data
"""

import os
import sys
from datetime import datetime, date
from backend.app import app, db
from backend.models.user import User
from backend.models.preference import UserPreference
from backend.models.trip import Trip

def create_database():
    """Create database tables"""
    with app.app_context():
        db.create_all()

def create_sample_user():
    """Create a sample user for testing"""
    with app.app_context():
        # Check if user already exists
        existing_user = User.query.filter_by(username='demo').first()
        if existing_user:
            return existing_user
        
        # Create sample user
        user = User(
            username='demo',
            email='demo@roamiq.com',
            full_name='Demo User',
            phone='+1234567890'
        )
        user.set_password('demo123')
        
        db.session.add(user)
        db.session.commit()
        
        # Create preferences for the user
        preferences = UserPreference(
            user_id=user.id,
            budget_range='mid-range',
            travel_style='leisure',
            group_type='solo',
            food_adventure_level='moderate',
            fitness_level='moderate',
            accommodation_type='hotel',
            sustainability_priority=True
        )
        preferences.set_dietary_restrictions(['Vegetarian'])
        preferences.set_cuisine_preferences(['Italian', 'Indian', 'Thai'])
        preferences.set_activity_interests(['Cultural Sites', 'Photography', 'Food Tours'])
        
        db.session.add(preferences)
        db.session.commit()
        
        
        return user

def create_sample_trip(user):
    """Create a sample trip for the user"""
    with app.app_context():
        # Check if trip already exists
        existing_trip = Trip.query.filter_by(user_id=user.id).first()
        if existing_trip:
            return
        
        trip = Trip(
            user_id=user.id,
            title='Weekend Getaway to Goa',
            destination='Goa, India',
            start_date=date(2024, 3, 15),
            end_date=date(2024, 3, 17),
            budget=800.0,
            group_size=2,
            trip_type='leisure',
            status='planned',
            notes='Beach vacation with friends',
            sustainability_score=75.0
        )
        trip.calculate_duration()
        
        # Sample itinerary
        itinerary = {
            "days": [
                {
                    "day": 1,
                    "theme": "Arrival & Beach Time",
                    "activities": ["Check-in to hotel", "Baga Beach visit", "Sunset at Anjuna"],
                    "meals": ["Lunch at beach shack", "Dinner at local restaurant"],
                    "estimated_cost": 150
                },
                {
                    "day": 2,
                    "theme": "Culture & Adventure",
                    "activities": ["Old Goa churches", "Spice plantation tour", "Water sports"],
                    "meals": ["Traditional Goan breakfast", "Seafood dinner"],
                    "estimated_cost": 200
                },
                {
                    "day": 3,
                    "theme": "Relaxation & Departure",
                    "activities": ["Beach relaxation", "Shopping at markets", "Departure"],
                    "meals": ["Brunch at cafe"],
                    "estimated_cost": 100
                }
            ],
            "total_estimated_cost": 450,
            "tips": ["Carry sunscreen", "Try local cashew feni", "Bargain at markets"],
            "hidden_gems": ["Divar Island", "Fontainhas Latin Quarter"]
        }
        trip.set_itinerary(itinerary)
        
        # Safety alerts
        safety_alerts = [
            "Be cautious while swimming in the sea",
            "Avoid isolated beaches at night",
            "Use licensed taxi services"
        ]
        trip.set_safety_alerts(safety_alerts)
        
        db.session.add(trip)
        db.session.commit()
        

def main():
    """Main setup function"""
    
    try:
        # Create database
        create_database()
        
        # Create sample user
        user = create_sample_user()
        
        # Create sample trip
        create_sample_trip(user)
        
        
    except Exception as e:
        sys.exit(1)

if __name__ == '__main__':
    main()
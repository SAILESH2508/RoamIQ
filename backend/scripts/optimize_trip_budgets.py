#!/usr/bin/env python3
"""
Script to optimize trip budgets to be more compact based on destination and duration
"""

import sys
import os
import sqlite3
from datetime import datetime, date

# Database path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'instance', 'roamiq.db')

# Budget optimization data based on destination type and duration
BUDGET_GUIDELINES = {
    'budget': {
        'per_day': 50,      # $50 per person per day
        'multiplier': 1.0
    },
    'moderate': {
        'per_day': 100,     # $100 per person per day
        'multiplier': 1.5
    },
    'luxury': {
        'per_day': 200,     # $200 per person per day
        'multiplier': 2.0
    }
}

# Destination categories (can be expanded)
DESTINATION_CATEGORIES = {
    # Budget-friendly destinations
    'budget': ['thailand', 'vietnam', 'indonesia', 'india', 'philippines', 'malaysia', 'cambodia', 'laos'],
    
    # Moderate destinations
    'moderate': ['spain', 'portugal', 'greece', 'turkey', 'mexico', 'brazil', 'argentina', 'chile', 'peru'],
    
    # Luxury destinations
    'luxury': ['switzerland', 'norway', 'denmark', 'sweden', 'iceland', 'japan', 'singapore', 'uae', 'monaco']
}

def categorize_destination(destination):
    """Categorize destination based on country/region"""
    destination_lower = destination.lower()
    
    for category, places in DESTINATION_CATEGORIES.items():
        for place in places:
            if place in destination_lower:
                return category
    
    # Default to moderate if not found
    return 'moderate'

def calculate_optimized_budget(destination, duration_days, group_size=1):
    """Calculate optimized budget based on destination and duration"""
    category = categorize_destination(destination)
    guidelines = BUDGET_GUIDELINES[category]
    
    # Base budget calculation
    base_budget = guidelines['per_day'] * duration_days * group_size
    
    # Apply multiplier
    optimized_budget = base_budget * guidelines['multiplier']
    
    # Add some buffer for unexpected expenses (10%)
    optimized_budget *= 1.1
    
    return round(optimized_budget, 2)

def optimize_all_trips():
    """Optimize budgets for all trips in the database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get all trips
        cursor.execute("SELECT id, destination, start_date, end_date, duration_days, group_size, budget FROM trips")
        trips = cursor.fetchall()
        
        optimized_count = 0
        print(f"Found {len(trips)} trips to optimize...")
        
        for trip in trips:
            trip_id, destination, start_date, end_date, duration_days, group_size, budget = trip
            
            # Calculate duration if missing
            if not duration_days or duration_days <= 0:
                if start_date and end_date:
                    # Parse dates and calculate duration
                    start = datetime.strptime(start_date, '%Y-%m-%d').date()
                    end = datetime.strptime(end_date, '%Y-%m-%d').date()
                    duration_days = (end - start).days + 1
                else:
                    print(f"Skipping trip {trip_id} - no duration information")
                    continue
            
            # Calculate optimized budget
            new_budget = calculate_optimized_budget(
                destination, 
                duration_days, 
                group_size or 1
            )
            
            # Only update if new budget is significantly different (more than 20% difference)
            try:
                budget_float = float(budget) if budget else None
                if budget_float is None or abs(new_budget - budget_float) > (budget_float * 0.2):
                    cursor.execute(
                        "UPDATE trips SET budget = ? WHERE id = ?",
                        (new_budget, trip_id)
                    )
                    optimized_count += 1
                    print(f"Trip {trip_id}: {destination}")
                    print(f"  Duration: {duration_days} days")
                    print(f"  Group size: {group_size or 1}")
                    print(f"  Old budget: ${budget_float or 'N/A'}")
                    print(f"  New budget: ${new_budget}")
                    print(f"  Category: {categorize_destination(destination)}")
                    print("-" * 50)
            except (ValueError, TypeError) as e:
                print(f"Skipping trip {trip_id} - invalid budget data: {budget}")
                continue
        
        if optimized_count > 0:
            conn.commit()
            print(f"Successfully optimized {optimized_count} trips!")
        else:
            print("No trips needed optimization.")
        
        conn.close()
        return optimized_count
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return 0

def main():
    """Main function"""
    print("Starting trip budget optimization...")
    print("=" * 60)
    
    optimized = optimize_all_trips()
    print("=" * 60)
    print(f"Budget optimization completed. {optimized} trips updated.")

if __name__ == "__main__":
    main()

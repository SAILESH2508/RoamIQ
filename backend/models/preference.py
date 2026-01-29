from datetime import datetime
import json
from backend.extensions import db

class UserPreference(db.Model):
    __tablename__ = 'user_preferences'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Travel Preferences
    budget_range = db.Column(db.String(50))  # 'budget', 'mid-range', 'luxury'
    travel_style = db.Column(db.String(50))  # 'adventure', 'relaxation', 'cultural', 'business'
    group_type = db.Column(db.String(50))    # 'solo', 'couple', 'family', 'friends'
    
    # Food Preferences
    dietary_restrictions = db.Column(db.Text)  # JSON string
    cuisine_preferences = db.Column(db.Text)   # JSON string
    food_adventure_level = db.Column(db.String(20))  # 'conservative', 'moderate', 'adventurous'
    
    # Activity Preferences
    activity_interests = db.Column(db.Text)    # JSON string
    fitness_level = db.Column(db.String(20))   # 'low', 'moderate', 'high'
    
    # Accommodation Preferences
    accommodation_type = db.Column(db.String(50))  # 'hotel', 'hostel', 'airbnb', 'resort'
    
    # Other Preferences
    languages_spoken = db.Column(db.Text)      # JSON string
    accessibility_needs = db.Column(db.Text)   # JSON string
    sustainability_priority = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def set_dietary_restrictions(self, restrictions_list):
        """Set dietary restrictions as JSON"""
        self.dietary_restrictions = json.dumps(restrictions_list)
    
    def get_dietary_restrictions(self):
        """Get dietary restrictions as list"""
        return json.loads(self.dietary_restrictions) if self.dietary_restrictions else []
    
    def set_cuisine_preferences(self, cuisines_list):
        """Set cuisine preferences as JSON"""
        self.cuisine_preferences = json.dumps(cuisines_list)
    
    def get_cuisine_preferences(self):
        """Get cuisine preferences as list"""
        return json.loads(self.cuisine_preferences) if self.cuisine_preferences else []
    
    def set_activity_interests(self, activities_list):
        """Set activity interests as JSON"""
        self.activity_interests = json.dumps(activities_list)
    
    def get_activity_interests(self):
        """Get activity interests as list"""
        return json.loads(self.activity_interests) if self.activity_interests else []
    
    def get_languages_spoken(self):
        """Get languages spoken as list"""
        return json.loads(self.languages_spoken) if self.languages_spoken else []
    
    def get_accessibility_needs(self):
        """Get accessibility needs as list"""
        return json.loads(self.accessibility_needs) if self.accessibility_needs else []
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'budget_range': self.budget_range,
            'travel_style': self.travel_style,
            'group_type': self.group_type,
            'dietary_restrictions': self.get_dietary_restrictions(),
            'cuisine_preferences': self.get_cuisine_preferences(),
            'food_adventure_level': self.food_adventure_level,
            'activity_interests': self.get_activity_interests(),
            'fitness_level': self.fitness_level,
            'accommodation_type': self.accommodation_type,
            'languages_spoken': self.get_languages_spoken(),
            'accessibility_needs': self.get_accessibility_needs(),
            'sustainability_priority': self.sustainability_priority,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
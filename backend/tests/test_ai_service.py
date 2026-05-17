"""
Unit tests for AI Service
"""
import unittest
from unittest.mock import Mock, patch, AsyncMock
import sys
import os
import asyncio

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.ai_service import AIService

class TestAIService(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures"""
        self.ai_service = AIService()
        # Create helper to run async tests easily
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
    
    def tearDown(self):
        self.loop.close()

    def test_basic_mood_analysis_positive(self):
        """Test mood analysis for positive text"""
        text = "I'm so excited about my upcoming trip to Paris!"
        result = self.ai_service._basic_mood_analysis(text)
        
        self.assertIsInstance(result, dict)
        self.assertIn('mood', result)
        self.assertIn('energy', result)
        self.assertIn('polarity', result)
        self.assertIn('subjectivity', result)
        self.assertEqual(result['mood'], 'excited')
        self.assertEqual(result['energy'], 'high')
        self.assertGreater(result['polarity'], 0)  # Should be positive
    
    def test_basic_mood_analysis_negative(self):
        """Test mood analysis for negative text"""
        text = "I'm sad and tired from work"
        result = self.ai_service._basic_mood_analysis(text)
        
        self.assertIsInstance(result, dict)
        self.assertEqual(result['mood'], 'low')
        self.assertEqual(result['energy'], 'low')
        self.assertLess(result['polarity'], 0)  # Should be negative
    
    def test_basic_mood_analysis_empty_text(self):
        """Test mood analysis with neutral text"""
        result = self.ai_service._basic_mood_analysis("just standard planning text")
        
        self.assertEqual(result['mood'], 'neutral')
        self.assertEqual(result['energy'], 'medium')
        self.assertEqual(result['polarity'], 0)
        self.assertEqual(result['subjectivity'], 0)
    
    def test_calculate_sustainability_score(self):
        """Test sustainability score calculation"""
        trip_data = {
            'transportation': 'flight',
            'distance': 6000
        }
        score = self.ai_service.calculate_sustainability_score(trip_data)
        
        self.assertIsInstance(score, (int, float))
        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 1.0)
        
        # Train should have better score
        train_trip = {'transportation': 'train', 'distance': 500}
        train_score = self.ai_service.calculate_sustainability_score(train_trip)
        self.assertGreater(train_score, score)

    def test_get_safety_alerts(self):
        """Test fetching safety alerts for destination"""
        alerts = self.ai_service.get_safety_alerts("Paris")
        self.assertIsInstance(alerts, dict)
        self.assertIn('scam_alerts', alerts)
        self.assertTrue(len(alerts['scam_alerts']) > 0)

    @patch('backend.services.ai.llm_provider.llm_provider.generate_response', new_callable=AsyncMock)
    def test_generate_itinerary(self, mock_generate_response):
        """Test itinerary generation with mocked LLM provider"""
        mock_generate_response.return_value = """
        {
            "trip_title": "Trip to Paris",
            "summary": "Beautiful days in Paris",
            "estimated_total_cost": 1500,
            "days": [
                {
                    "day": 1,
                    "title": "Arrival",
                    "activities": [
                        {
                            "time": "10:00 AM",
                            "activity": "Eiffel Tower",
                            "description": "Visit the tower",
                            "type": "sightseeing",
                            "estimated_cost": 25
                        }
                    ]
                }
            ]
        }
        """
        
        result = self.loop.run_until_complete(
            self.ai_service.generate_itinerary("Paris", 1, "budget")
        )
        
        self.assertIsInstance(result, dict)
        self.assertIn('trip_title', result)
        self.assertEqual(result['trip_title'], 'Trip to Paris')
        self.assertEqual(result['estimated_total_cost'], 1500)

    @patch('backend.services.ai.llm_provider.llm_provider.generate_response', new_callable=AsyncMock)
    def test_generate_packing_list(self, mock_generate_response):
        """Test packing list generation with mocked LLM provider"""
        mock_generate_response.return_value = """
        [
            {"item": "Camera", "category": "Electronics", "quantity": 1, "reason": "Photos"}
        ]
        """
        
        result = self.loop.run_until_complete(
            self.ai_service.generate_packing_list("Paris", 3)
        )
        
        self.assertIsInstance(result, list)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['item'], 'Camera')

if __name__ == '__main__':
    unittest.main()
"""
Unit tests for AI Service
"""
import unittest
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.ai_service import AIService

class TestAIService(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures"""
        self.ai_service = AIService()
    
    def test_analyze_mood_positive(self):
        """Test mood analysis for positive text"""
        text = "I'm so excited about my upcoming trip to Paris!"
        result = self.ai_service.analyze_mood(text)
        
        self.assertIsInstance(result, dict)
        self.assertIn('mood', result)
        self.assertIn('energy', result)
        self.assertIn('polarity', result)
        self.assertIn('subjectivity', result)
        self.assertGreater(result['polarity'], 0)  # Should be positive
    
    def test_analyze_mood_negative(self):
        """Test mood analysis for negative text"""
        text = "I'm worried about traveling alone and feeling unsafe"
        result = self.ai_service.analyze_mood(text)
        
        self.assertIsInstance(result, dict)
        self.assertLess(result['polarity'], 0)  # Should be negative
    
    def test_analyze_mood_empty_text(self):
        """Test mood analysis with empty text"""
        result = self.ai_service.analyze_mood("")
        
        self.assertEqual(result['mood'], 'neutral')
        self.assertEqual(result['energy'], 'medium')
        self.assertEqual(result['polarity'], 0)
        self.assertEqual(result['subjectivity'], 0)
    
    def test_calculate_sustainability_score(self):
        """Test sustainability score calculation"""
        trip_data = {
            'transportation': 'flight',
            'accommodation': 'hotel',
            'local_transport': 'public',
            'duration_days': 7
        }
        
        score = self.ai_service.calculate_sustainability_score(trip_data)
        
        self.assertIsInstance(score, (int, float))
        self.assertGreaterEqual(score, 0)
        self.assertLessEqual(score, 100)
    
    @patch('services.ai_service.OpenAI')
    def test_generate_travel_response_with_mock(self, mock_openai):
        """Test AI response generation with mocked OpenAI"""
        # Mock OpenAI response
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "Great choice! Paris is wonderful in spring."
        
        mock_client = Mock()
        mock_client.chat.completions.create.return_value = mock_response
        mock_openai.return_value = mock_client
        
        # Test the method
        self.ai_service.client = mock_client
        result = self.ai_service.generate_travel_response("Tell me about Paris", user_id=1)
        
        self.assertIsInstance(result, dict)
        self.assertIn('response', result)
    
    def test_generate_quick_suggestions(self):
        """Test quick suggestions generation"""
        context = "planning a trip to Japan"
        suggestions = self.ai_service.generate_quick_suggestions(context)
        
        self.assertIsInstance(suggestions, list)
        self.assertLessEqual(len(suggestions), 4)  # Should return max 4 suggestions
        
        for suggestion in suggestions:
            self.assertIsInstance(suggestion, str)
            self.assertGreater(len(suggestion), 0)

class TestAIServiceIntegration(unittest.TestCase):
    """Integration tests that require actual API keys"""
    
    def setUp(self):
        self.ai_service = AIService()
    
    @unittest.skipUnless(os.getenv('OPENAI_API_KEY'), "OpenAI API key required")
    def test_real_ai_response(self):
        """Test with real OpenAI API (requires API key)"""
        result = self.ai_service.generate_travel_response(
            "What's the best time to visit Tokyo?", 
            user_id=1
        )
        
        self.assertIsInstance(result, dict)
        self.assertIn('response', result)
        self.assertIsInstance(result['response'], str)
        self.assertGreater(len(result['response']), 0)

if __name__ == '__main__':
    unittest.main()
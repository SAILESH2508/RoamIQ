import requests
import json

# Test the AI chat endpoint
url = "http://localhost:5000/api/ai/chat"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_TOKEN_HERE"  # You'll need to replace this
}

data = {
    "message": "Hello, test message",
    "model": "gemini-2.0-flash-lite"
}

try:
    response = requests.post(url, json=data, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")

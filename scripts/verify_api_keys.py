import os
from dotenv import load_dotenv

load_dotenv()

print("=== Testing API Keys ===\n")

# Test OpenAI
openai_key = os.getenv('OPENAI_API_KEY')
if openai_key:
    print(f"OpenAI Key: {openai_key[:20]}...{openai_key[-4:]}")
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_key)
        
        # Quick test call
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Say 'test successful'"}],
            max_tokens=10
        )
        print(f"✅ OpenAI: {response.choices[0].message.content}")
    except Exception as e:
        print(f"❌ OpenAI Error: {str(e)[:100]}")
else:
    print("❌ OpenAI: No API key found")

print("\n" + "="*50)

# Test Google
google_key = os.getenv('GOOGLE_API_KEY')
if google_key:
    print(f"\nGoogle Key: {google_key[:20]}...{google_key[-4:]}")
    try:
        from google import genai
        client = genai.Client(api_key=google_key)
        response = client.models.generate_content(
            model='gemini-2.0-flash-lite',
            contents='Say test successful'
        )
        print(f"✅ Google: {response.text[:50]}")
    except Exception as e:
        print(f"❌ Google Error: {str(e)[:100]}")
else:
    print("❌ Google: No API key found")

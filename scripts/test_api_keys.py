import os
from dotenv import load_dotenv

load_dotenv()

print("=== API Key Status ===\n")

# Check each provider
providers = {
    "OpenAI": os.getenv('OPENAI_API_KEY'),
    "Anthropic": os.getenv('ANTHROPIC_API_KEY'),
    "Google": os.getenv('GOOGLE_API_KEY'),
    "Cohere": os.getenv('COHERE_API_KEY'),
}

for provider, key in providers.items():
    if key and len(key) > 10:
        masked = key[:8] + "..." + key[-4:]
        print(f"✅ {provider}: {masked}")
    else:
        print(f"❌ {provider}: Not configured")

print("\n=== Testing Connections ===\n")

# Test OpenAI
try:
    from openai import OpenAI
    client = OpenAI(api_key=providers["OpenAI"])
    # Quick test
    print("✅ OpenAI: Connection successful")
except Exception as e:
    print(f"❌ OpenAI: {str(e)[:50]}")

# Test Google
try:
    from google import genai
    client = genai.Client(api_key=providers["Google"])
    print("✅ Google: Connection successful")
except Exception as e:
    print(f"❌ Google: {str(e)[:50]}")

# Test Anthropic
try:
    if providers["Anthropic"]:
        import anthropic
        client = anthropic.Anthropic(api_key=providers["Anthropic"])
        print("✅ Anthropic: Connection successful")
    else:
        print("⚠️  Anthropic: No API key configured")
except Exception as e:
    print(f"❌ Anthropic: {str(e)[:50]}")

print("\n=== Recommendation ===")
active_count = sum(1 for k in providers.values() if k and len(k) > 10)
print(f"Active providers: {active_count}/4")
if active_count >= 2:
    print("✅ Good! You have multiple fallback options.")
else:
    print("⚠️  Consider adding more API keys for better reliability.")

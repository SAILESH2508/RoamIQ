# RoamIQ AI - Unlimited Usage Guide

## Current Status ✅
Your AI Chat is now working with **enhanced retry logic**:
- **5 retry attempts** (up from 3)
- **Exponential backoff**: 3s → 6s → 12s → 24s → 48s
- **Handles both 429 (rate limit) and 503 (unavailable) errors**

## Solutions for Unlimited AI Access

### Option 1: Upgrade Google AI API (Easiest) 💳
**Cost**: ~$0.0005 per 1K tokens (very cheap)
**Steps**:
1. Go to https://aistudio.google.com/
2. Click "Upgrade to paid plan"
3. Add billing information
4. Get 10-100x higher rate limits

**Pros**: 
- Same API key works
- No code changes needed
- Very affordable

---

### Option 2: Add Multiple AI Providers (Best Reliability) 🔄

#### Step 1: Get API Keys
- **OpenAI**: https://platform.openai.com/api-keys
  - GPT-4o, GPT-4, GPT-3.5-turbo
  - $5 free credit for new users
  
- **Anthropic**: https://console.anthropic.com/
  - Claude 3.5 Sonnet (best quality)
  - Claude 3 Haiku (fastest)

#### Step 2: Add to `.env`
```bash
# Google (current)
GOOGLE_API_KEY=your_google_key_here

# Add these for fallback
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
```

#### Step 3: Restart Backend
```bash
# Stop the current backend (Ctrl+C)
python run_backend.py
```

**Your system will automatically**:
- Try Google first
- Fall back to OpenAI if Google fails
- Fall back to Anthropic if both fail
- Cycle through all available models

---

### Option 3: Optimize Free Tier Usage 🆓

#### A. Use Shorter Messages
- Keep prompts under 100 words
- Avoid uploading large files frequently

#### B. Wait Between Requests
- Free tier resets every minute
- Wait 60 seconds between heavy usage

#### C. Use Lighter Models
Change the default model in `frontend/src/components/AI/GenAIHub.js`:
```javascript
// Line ~229
model: 'gemini-2.0-flash-lite',  // Lightest, fastest
// OR
model: 'gemini-1.5-flash',       // Balanced
```

---

## Recommended Setup for Production 🚀

```bash
# .env file
GOOGLE_API_KEY=your_google_key     # Primary (cheap, fast)
OPENAI_API_KEY=your_openai_key     # Fallback (reliable)
ANTHROPIC_API_KEY=your_claude_key  # Fallback (best quality)
```

**Total Cost for 1000 messages**: ~$2-5/month
**Reliability**: 99.9% uptime with 3 providers

---

## Testing Your Setup

1. **Check API Keys**:
```bash
python
>>> import os
>>> from dotenv import load_dotenv
>>> load_dotenv()
>>> print(os.getenv('GOOGLE_API_KEY'))
>>> print(os.getenv('OPENAI_API_KEY'))
```

2. **Test AI Chat**:
- Send a simple message: "Hello"
- Check backend logs for retry attempts
- Should succeed within 5 retries

3. **Monitor Usage**:
- Google: https://aistudio.google.com/app/apikey
- OpenAI: https://platform.openai.com/usage
- Anthropic: https://console.anthropic.com/settings/usage

---

## Quick Fixes

### "Still getting rate limits"
→ Add OPENAI_API_KEY to .env and restart backend

### "Want completely unlimited"
→ Upgrade Google AI to paid tier ($0.0005/1K tokens)

### "Need it working NOW"
→ Wait 2-3 minutes, system will auto-retry with exponential backoff

---

## Current Improvements Applied ✅
1. ✅ Increased retries: 3 → 5 attempts
2. ✅ Longer delays: 2s → 3s base (up to 48s max)
3. ✅ Added 503 UNAVAILABLE handling
4. ✅ Better error messages
5. ✅ Automatic model fallback chain

**Your AI Chat will now automatically retry and succeed in most cases!**

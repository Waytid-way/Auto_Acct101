# Gemini API Troubleshooting Guide

## Problem Summary
All Gemini model requests return **404 Not Found** errors, indicating the API key is not properly configured.

## Error Details
```
Error fetching from https://generativelanguage.googleapis.com/v1beta/models/...
[404 Not Found] models/gemini-... is not found for API version v1beta
```

## Root Cause
The Google Cloud project associated with this API key does **not have the Gemini API enabled**.

---

## Solution: Enable Gemini API

### Step 1: Verify API Key Source
Your API key should come from **Google AI Studio**, NOT Google Cloud Console.

**Correct Source**: https://aistudio.google.com/app/apikey  
**❌ Wrong Source**: Google Cloud Console API Keys

### Step 2: Create New API Key (Recommended)

1. **Go to Google AI Studio**:
   ```
   https://aistudio.google.com/app/apikey
   ```

2. **Click "Create API Key"**

3. **Select or Create Project**:
   - Choose "Create API key in new project" (recommended)
   - OR select existing project

4. **Copy the API Key**:
   - Format: `AIzaSy...` (starts with AIzaSy)
   - Length: ~39 characters

5. **Update `.env`**:
   ```bash
   GOOGLE_API_KEY=AIzaSy...your-new-key-here
   ```

### Step 3: Test the New Key
```bash
cd backend
bun run src/scripts/list-gemini-models.ts
```

Expected output:
```
✅ WORKS! Response: Hello!...
🎉 Use this model: "gemini-1.5-pro"
```

---

## Alternative: Verify Current API Key

If you want to keep the current API key:

### Check 1: Is it from Google AI Studio?
- ✅ API key from https://aistudio.google.com
- ❌ API key from Google Cloud Console

### Check 2: Enable Generative Language API
1. Go to: https://console.cloud.google.com/apis/library
2. Search: "Generative Language API"
3. Click "ENABLE"
4. Wait 1-2 minutes
5. Retry the test

---

## Quick Fix: Skip Gemini for Now

If you want to proceed without Gemini:

1. **Comment out Gemini API key** in `.env`:
   ```bash
   # GOOGLE_API_KEY=...
   ```

2. **System will use fallback**:
   - Manual category selection
   - Or rule-based classification

3. **Add Gemini later** when API key is ready

---

## Common Issues

### Issue 1: "Invalid API key"
**Cause**: API key format is wrong  
**Solution**: Must start with `AIzaSy` and be ~39 chars

### Issue 2: "Quota exceeded"
**Cause**: Free tier limits (15 req/min, 1500/day)  
**Solution**: Wait or upgrade to paid tier

### Issue 3: "API not enabled"
**Cause**: Generative Language API not enabled in project  
**Solution**: Enable at https://console.cloud.google.com/apis/library

---

## Current Status

✅ **Code is ready** - GeminiClassificationService fully implemented  
❌ **API key issue** - Need valid key from Google AI Studio  
⚠️ **Fallback available** - System can work without Gemini

---

## Next Steps

**Option A**: Create new API key from Google AI Studio (recommended)  
**Option B**: Enable Generative Language API in current project  
**Option C**: Skip Gemini, use manual classification

Choose ONE and let me know when ready to test again.

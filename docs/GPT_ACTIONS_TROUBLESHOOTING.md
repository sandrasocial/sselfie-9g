# GPT Actions API - Troubleshooting Guide

## Error: "unknown tool: undefined"

This error means ChatGPT isn't recognizing your tools from the OpenAPI schema. Here are the most common causes and fixes:

---

## Common Issues & Fixes

### Issue 1: Server URL Format

**Problem:** ChatGPT Codex Connector might need the server URL to be just the domain, not including `/api/gpt-actions`.

**Fix:** Use one of these formats in your OpenAPI schema:

**Option A: Server is base domain (paths include full path)**
```yaml
servers:
  - url: https://sselfie.ai

paths:
  /api/gpt-actions/read_file:
    post:
      operationId: read_file
```

**Option B: Server includes API path (paths are relative)**
```yaml
servers:
  - url: https://sselfie.ai/api/gpt-actions

paths:
  /read_file:
    post:
      operationId: read_file
```

**✅ Recommended:** Use Option A (already fixed in `docs/gpt-actions-openapi.yaml`)

---

### Issue 2: Authentication Header Not Set

**Problem:** The `x-gpt-actions-key` header isn't being sent or doesn't match your environment variable.

**Fix:**
1. **Verify API key in environment:**
   ```bash
   # Check if it's set (local)
   echo $GPT_ACTIONS_API_KEY
   
   # Or check .env.local file
   cat .env.local | grep GPT_ACTIONS_API_KEY
   ```

2. **In ChatGPT Codex Connector:**
   - Go to your Custom GPT settings
   - Find "Actions" or "API" section
   - Make sure "Authentication" is configured
   - Header name: `x-gpt-actions-key`
   - Header value: Your `GPT_ACTIONS_API_KEY` value

3. **Test the endpoint manually:**
   ```bash
   curl -X POST https://sselfie.ai/api/gpt-actions/read_file \
     -H "x-gpt-actions-key: YOUR_KEY_HERE" \
     -H "Content-Type: application/json" \
     -d '{"filePath": "package.json"}'
   ```

---

### Issue 3: Property Name Mismatch

**Problem:** Your request body uses `path` but API expects `filePath` or `directoryPath`.

**Fix:** The schema should use these property names:
- `read_file`: `filePath` ✅
- `list_files`: `directoryPath` ✅
- `file_stat`: `filePath` ✅

**Already fixed** in `docs/gpt-actions-openapi.yaml`

---

### Issue 4: ChatGPT Codex Connector Format Issues

**Problem:** ChatGPT might need a specific OpenAPI format for Codex Connector.

**Fix:** Make sure your schema:
1. Uses `openapi: 3.1.0` or `openapi: 3.0.0` (3.1.0 is better)
2. Has proper `operationId` for each path (already have this)
3. Has security scheme properly defined (already have this)
4. Uses correct HTTP methods (POST for all tools)

---

### Issue 5: JIT Plugin vs OpenAPI Schema

**Note:** ChatGPT mentioned it has access to `sselfie_ai__jit_plugin.read_file`. This suggests ChatGPT might be using a JIT (Just-In-Time) plugin system, not the OpenAPI schema directly.

**If using JIT Plugin:**
- The plugin might auto-generate from your API
- You might not need to manually configure the OpenAPI schema
- The plugin might work differently than expected

**Fix:** If JIT plugin is working, use it directly instead of OpenAPI schema.

---

## Step-by-Step Debugging

### Step 1: Verify API Key is Set

```bash
# Check environment variable (local)
echo $GPT_ACTIONS_API_KEY

# Check .env.local
cat .env.local | grep GPT_ACTIONS_API_KEY
```

**Expected:** Should show your API key (64+ character hex string)

---

### Step 2: Test API Endpoint Manually

```bash
# Test read_file endpoint
curl -X POST http://localhost:3000/api/gpt-actions/read_file \
  -H "x-gpt-actions-key: YOUR_KEY_FROM_ENV" \
  -H "Content-Type: application/json" \
  -d '{"filePath": "package.json"}'
```

**Expected:** Should return JSON with file contents:
```json
{
  "success": true,
  "filePath": "package.json",
  "content": "{...}",
  "size": 1234
}
```

**If you get 401:** API key doesn't match
**If you get 404:** File doesn't exist
**If you get 403:** Path is denied

---

### Step 3: Verify OpenAPI Schema Format

Open `docs/gpt-actions-openapi.yaml` and verify:

1. **Server URL:**
   ```yaml
   servers:
     - url: https://sselfie.ai  # Base domain only
   ```

2. **Paths include full path:**
   ```yaml
   paths:
     /api/gpt-actions/read_file:  # Full path
   ```

3. **Operation IDs match tool names:**
   ```yaml
   operationId: read_file  # Must match exactly
   ```

4. **Security scheme:**
   ```yaml
   security:
     - GPTActionsKey: []
   
   components:
     securitySchemes:
       GPTActionsKey:
         type: apiKey
         in: header
         name: x-gpt-actions-key
   ```

---

### Step 4: Check ChatGPT Codex Connector Settings

In your Custom GPT settings:

1. **Go to "Actions" or "API" section**
2. **Import/Upload OpenAPI Schema:**
   - Upload `docs/gpt-actions-openapi.yaml`
   - Or paste the schema URL if hosted

3. **Configure Authentication:**
   - Type: API Key
   - Header name: `x-gpt-actions-key`
   - Header value: Your `GPT_ACTIONS_API_KEY`

4. **Save and Test:**
   - Try asking: "Read the package.json file"
   - Check if it recognizes the `read_file` tool

---

### Step 5: Check ChatGPT's Available Tools

Ask ChatGPT: "What tools do you have available?"

**Expected:** Should list:
- `read_file`
- `list_files`
- `file_stat`

**If it says "sselfie_ai__jit_plugin.read_file":**
- ChatGPT is using a JIT plugin (auto-generated)
- This might work differently than the OpenAPI schema
- Try using the plugin directly instead

---

## Quick Test Commands

### Test 1: Health Check (No Auth Required)
```bash
curl https://sselfie.ai/api/gpt-actions
```

**Expected:** JSON with service info and available tools

---

### Test 2: Read File (Requires Auth)
```bash
curl -X POST https://sselfie.ai/api/gpt-actions/read_file \
  -H "x-gpt-actions-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"filePath": "package.json"}'
```

**Expected:** File contents JSON

---

### Test 3: List Files (Requires Auth)
```bash
curl -X POST https://sselfie.ai/api/gpt-actions/list_files \
  -H "x-gpt-actions-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"directoryPath": "app"}'
```

**Expected:** Directory listing JSON

---

## Alternative: Use JIT Plugin

If ChatGPT mentions `sselfie_ai__jit_plugin.read_file`, it might be using an auto-generated plugin:

1. **Let ChatGPT use the JIT plugin directly** (if it works)
2. **The plugin might auto-discover from your API**
3. **You might not need to manually configure OpenAPI schema**

To use JIT plugin:
- Just ask ChatGPT: "Use the sselfie_ai__jit_plugin to read package.json"
- It should work if the plugin is available

---

## Summary Checklist

✅ **API Key Generated:** 64+ character hex string  
✅ **API Key in `.env.local`:** `GPT_ACTIONS_API_KEY=your-key`  
✅ **API Key in Vercel:** Added to environment variables  
✅ **API Key in ChatGPT:** Set as `x-gpt-actions-key` header  
✅ **OpenAPI Schema:** Using `docs/gpt-actions-openapi.yaml`  
✅ **Server URL:** `https://sselfie.ai` (base domain)  
✅ **Paths:** Include full path `/api/gpt-actions/read_file`  
✅ **Property Names:** `filePath` and `directoryPath` (not `path`)  
✅ **Security:** `GPTActionsKey` scheme defined and applied  
✅ **Test Endpoint:** Manual curl works

---

## Still Not Working?

If you've checked everything and it's still not working:

1. **Verify the endpoint works manually** (using curl)
2. **Check ChatGPT's tool list** (ask it what tools it has)
3. **Try the JIT plugin** (if ChatGPT mentions it)
4. **Check ChatGPT Codex Connector logs** (if available)
5. **Verify schema is valid** (use an OpenAPI validator)

---

**Most Common Fix:** Make sure the API key in ChatGPT Codex Connector header **exactly matches** the `GPT_ACTIONS_API_KEY` environment variable (same value, no extra spaces).


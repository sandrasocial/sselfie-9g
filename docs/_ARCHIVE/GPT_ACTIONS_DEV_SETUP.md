# GPT Actions API - Development Setup Guide

## Overview

This guide shows you how to give ChatGPT access to your **local development environment** so you can get help with development tasks, not just production.

---

## Quick Setup (3 Steps)

### Step 1: Install ngrok

**Option A: Using Homebrew (macOS)**
```bash
brew install ngrok/ngrok/ngrok
```

**Option B: Using npm**
```bash
npm install -g ngrok
```

**Option C: Download directly**
- Visit: https://ngrok.com/download
- Download for your OS
- Unzip and add to PATH

**Verify installation:**
```bash
ngrok version
```

---

### Step 2: Get ngrok Auth Token (Free)

1. **Sign up:** https://dashboard.ngrok.com/signup
2. **Get your token:** https://dashboard.ngrok.com/get-started/your-authtoken
3. **Configure:**
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

---

### Step 3: Start ngrok Tunnel

**In a separate terminal:**
```bash
ngrok http 3000
```

You'll see output like:
```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:3000
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok-free.app`)

---

## Step 4: Create Development ChatGPT Action

### Option A: Create Separate Action (Recommended)

1. **Open ChatGPT** and create a **new Custom GPT**
   - Name it: "SSELFIE Dev Helper" or "SSELFIE Development"

2. **Import OpenAPI Schema:**
   - Option 1: Upload `docs/gpt-actions-openapi.yaml` and edit server URL to your ngrok URL
   - Option 2: Use the schema from your local server (if serving it via ngrok)

3. **Set Server URL:**
   - In the schema, change:
     ```yaml
     servers:
       - url: https://YOUR-NGROK-URL.ngrok-free.app
         description: Development server (ngrok tunnel)
     ```
   - Or set it in ChatGPT Actions settings directly

4. **Configure Authentication:**
   - Header name: `x-gpt-actions-key`
   - Header value: Your `GPT_ACTIONS_API_KEY` from `.env.local`
     ```bash
     # Get your key
     cat .env.local | grep GPT_ACTIONS_API_KEY
     ```

5. **Save and Test:**
   - Ask: "Read the README.md file"
   - Should work with your local development server!

---

### Option B: Use Same Action, Switch Servers

You can manually switch the server URL in your existing ChatGPT Action:
- **Production:** `https://sselfie.ai`
- **Development:** `https://your-ngrok-url.ngrok-free.app`

**Note:** You'll need to update it each time ngrok restarts (URL changes).

---

## Helper Scripts

### Start Dev Server + ngrok

Create `scripts/start-dev-with-ngrok.sh`:

```bash
#!/bin/bash
# Start dev server and ngrok in parallel

echo "🚀 Starting development server..."
npm run dev &
DEV_PID=$!

echo "⏳ Waiting for server to start..."
sleep 5

echo "🌐 Starting ngrok tunnel..."
ngrok http 3000 &
NGROK_PID=$!

echo "✅ Development server: http://localhost:3000"
echo "✅ ngrok tunnel: Check terminal for URL"
echo ""
echo "Press Ctrl+C to stop both"

# Wait for interrupt
trap "kill $DEV_PID $NGROK_PID; exit" INT
wait
```

**Make it executable:**
```bash
chmod +x scripts/start-dev-with-ngrok.sh
```

**Run:**
```bash
./scripts/start-dev-with-ngrok.sh
```

---

### Get ngrok URL Automatically

Create `scripts/get-ngrok-url.sh`:

```bash
#!/bin/bash
# Get the current ngrok URL (if ngrok is running)

curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | head -1 | grep -o 'https://[^"]*'
```

**Usage:**
```bash
./scripts/get-ngrok-url.sh
# Output: https://abc123.ngrok-free.app
```

---

## Using Development vs Production

### When to Use Development Action

✅ **Use Development Action when:**
- You're actively coding and need help
- Testing new features before deploying
- Debugging local issues
- Want to test changes immediately

### When to Use Production Action

✅ **Use Production Action when:**
- Getting help with deployed features
- Checking production codebase state
- Troubleshooting production issues
- Showing production examples

---

## Tips & Best Practices

### 1. Keep ngrok Running

Keep the ngrok terminal running while developing. If you close it, you'll need to:
- Restart ngrok
- Update ChatGPT Action with new URL

### 2. Use Static Domain (Optional)

ngrok paid plans offer static domains (e.g., `your-dev.ngrok.io`):
- URL stays the same
- No need to update ChatGPT config
- Better for long-term development

### 3. Environment Variables

Make sure your `.env.local` has:
```bash
GPT_ACTIONS_API_KEY=your-key-here
```

This should match what you set in ChatGPT Actions.

### 4. Schema Server URL

If you update the schema, make sure the server URL points to your ngrok URL:
```yaml
servers:
  - url: https://YOUR-NGROK-URL.ngrok-free.app
    description: Development server
```

---

## Troubleshooting

### ngrok URL changes every restart

**Solution:** Use ngrok's static domain feature (paid) or update ChatGPT config manually.

### ChatGPT can't connect

**Check:**
1. ngrok is running: `curl http://localhost:4040/api/tunnels`
2. Dev server is running: `curl http://localhost:3000/api/gpt-actions`
3. ngrok URL is correct in ChatGPT config
4. API key matches `.env.local`

### "Tunnel not found" error

**Cause:** ngrok tunnel expired or restarted.

**Solution:** 
1. Restart ngrok
2. Get new URL
3. Update ChatGPT Action server URL

---

## Quick Reference

### Start Development
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Start ngrok
ngrok http 3000
```

### Get ngrok URL
```bash
# From ngrok dashboard (web): https://dashboard.ngrok.com/cloud-edge/tunnels
# Or use API: curl http://localhost:4040/api/tunnels
```

### Update ChatGPT Action
1. Go to ChatGPT Custom GPT settings
2. Find Actions section
3. Update server URL to new ngrok URL
4. Save

---

## Summary

✅ **Development Setup Complete!**

Now you have:
- ✅ Production Action → Deployed app (`https://sselfie.ai`)
- ✅ Development Action → Local server via ngrok (`https://your-ngrok-url`)

**Use the right one for the right task!**


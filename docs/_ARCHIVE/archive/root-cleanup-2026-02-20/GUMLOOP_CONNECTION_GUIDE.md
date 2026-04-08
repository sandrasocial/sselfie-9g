# 🔌 GUMLOOP CONNECTION GUIDE
**Connect Your Admin to Gumloop Agents**
**Date:** January 31, 2026

---

## ✅ STEP 1: GET YOUR GUMLOOP FLOW IDs

### 1.1 Go to Gumloop Dashboard
1. Open https://app.gumloop.com
2. Sign in to your account
3. You should see your list of flows (agents)

### 1.2 Find Each Flow ID
For each of your 4 existing agents, you need to get the **Flow ID**:

1. Click on the flow (agent) name
2. Look at the URL in your browser
3. The URL will be: `https://app.gumloop.com/flow/{FLOW_ID}`
4. Copy the `{FLOW_ID}` part

**Example:**
- URL: `https://app.gumloop.com/flow/abc123def456`
- Flow ID: `abc123def456`

### 1.3 Copy Your 4 Flow IDs

Fill in these Flow IDs from your Gumloop dashboard:

```
Agent 1 (Content Writer):
Flow ID: _________________

Agent 2 (Competitor Research):
Flow ID: _________________

Agent 3 (Audience Analyst Instagram):
Flow ID: _________________

Agent 4 (Content Strategist):
Flow ID: _________________
```

---

## ✅ STEP 2: UPDATE YOUR ADMIN CODE

Once you have the Flow IDs, I'll update your `/app/admin/agents/page.tsx` file with them.

**Just tell me the 4 Flow IDs and I'll update the code!**

---

## ✅ STEP 3: TEST THE CONNECTION

After I update the code:

### 3.1 Start Your Dev Server
```bash
npm run dev
```

### 3.2 Open Agent Control Center
Navigate to: http://localhost:3000/admin/agents

### 3.3 Test Agent 1 (Content Writer)
1. Click on "Content Writer" agent
2. Type a test message: "Write a caption about coffee"
3. Click "Send"
4. You should see a real response from your Gumloop agent!

### 3.4 Check for Errors
If you see an error, check:
1. **Browser console** (F12 → Console tab) - look for error messages
2. **Terminal** where `npm run dev` is running - look for API errors
3. **Gumloop dashboard** - check if the flow ran (you'll see a run history)

---

## 🐛 TROUBLESHOOTING

### Error: "Gumloop API key not configured"
- Make sure `GUMLOOP_API_KEY` is in your `.env.local` file
- Restart your dev server after adding the key

### Error: "Gumloop API error: 404"
- Your Flow ID is incorrect
- Double-check the Flow ID from the URL in Gumloop dashboard

### Error: "Gumloop API error: 401"
- Your API key is invalid or expired
- Go to https://app.gumloop.com/settings and generate a new key

### Error: "Failed to chat with agent"
- Check your internet connection
- Check if Gumloop is down: https://status.gumloop.com
- Look at terminal logs for more details

### Response is empty or weird
- Check your Gumloop flow's output configuration
- Make sure your flow returns a field called `response` or `message`
- Check the flow run in Gumloop dashboard to see what it actually returned

---

## 📋 GUMLOOP FLOW OUTPUT FORMAT

Your Gumloop flows should return data in this format:

```json
{
  "response": "Your agent's response text here..."
}
```

OR

```json
{
  "message": "Your agent's response text here..."
}
```

If your flow returns a different format, let me know and I'll update the code to handle it!

---

## 🚀 STEP 4: BUILD THE 6 NEW AGENTS

Once your 4 existing agents are connected and working, we'll build the 6 new ones:

### Agents 5-10 (To Be Built):
- **Agent 5:** Email Campaign Automation (replaces 16 cron jobs!)
- **Agent 6:** Lead Qualification
- **Agent 7:** Mission Control (system monitoring)
- **Agent 8:** DM Auto-Responder
- **Agent 9:** Analytics Reporter
- **Agent 10:** Customer Success

See `GUMLOOP_AGENT_SETUP_GUIDE.md` for detailed build instructions!

---

## ✅ NEXT STEPS

1. **Get your 4 Flow IDs** from Gumloop dashboard
2. **Tell me the Flow IDs** and I'll update the code
3. **Test the connection** at `/admin/agents`
4. **Build Agent 5** to replace those 25 cron jobs!

---

**Ready?** Tell me your 4 Flow IDs! 🎯

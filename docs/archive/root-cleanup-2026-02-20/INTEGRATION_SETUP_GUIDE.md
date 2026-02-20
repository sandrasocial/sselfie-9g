# INTEGRATION SETUP GUIDE
**All the API keys and credentials you'll need**

---

## 🔑 WHAT YOU'LL NEED

When building your Gumloop flows, you'll need to connect various services. Here's exactly where to get each credential.

---

## 1. INSTAGRAM GRAPH API

**What it's for:** Fetching your Instagram posts, engagement data, analytics

**How to get it:**

### Option A: Instagram Graph API (Free, More Complex)
1. Go to developers.facebook.com
2. Click "My Apps" → "Create App"
3. Select "Business" type
4. Name it: "Sandra Brand Engine"
5. Add Instagram Graph API product
6. Go to Tools → Graph API Explorer
7. Select your Instagram Business Account
8. Generate Access Token with these permissions:
   - `instagram_basic`
   - `instagram_manage_insights`
   - `pages_show_list`
   - `pages_read_engagement`
8. Copy the Access Token
9. Paste into Gumloop Instagram integration

**Requirements:**
- Instagram must be Business or Creator account (not Personal)
- Must be linked to Facebook Page

### Option B: Apify Instagram Scraper (Easier, ~$5/month)
1. Go to apify.com
2. Sign up for free account
3. Find "Instagram Scraper" actor
4. Get API token from Settings → Integrations
5. Use in Gumloop as HTTP request instead of Instagram integration

### Option C: Manual for Now (Simplest)
- Skip Instagram integration for Flow 1
- Use "Manual Input" node where you paste recent post summary
- Automate later once other flows are working

**Recommended:** Start with Option C, upgrade to Option A or B later.

---

## 2. SLACK WORKSPACE

**What it's for:** Receiving content ideas, email drafts, lead reports

**How to set it up:**

1. Go to slack.com (you probably already have this)
2. Create these channels:
   - `#content-approvals` (for Flow 1)
   - `#email-approvals` (for Flow 4)
   - `#hot-leads` (for Flow 5)
   - `#weekly-strategy` (for Flow 2)
   - `#high-priority-dms` (for Flow 3)

3. In Gumloop:
   - Click "Connect Slack"
   - Select your workspace
   - Authorize Gumloop app
   - Select the channel for each flow

**No API key needed** - just OAuth connection.

---

## 3. RESEND (EMAIL)

**What it's for:** Sending newsletters, tracking email opens/clicks

**How to get API key:**

1. Go to resend.com
2. Log in with your account
3. Click "API Keys" in sidebar
4. Click "Create API Key"
5. Name it: "Gumloop Automation"
6. Copy the key (starts with `re_`)
7. Paste into Gumloop Resend integration

**Your current setup:**
- You already have Resend account
- You have 3,193 subscribers
- Sequences are running
- Just need to connect API to Gumloop

---

## 4. NEON DATABASE (SSELFIE Data)

**What it's for:** Getting SSELFIE user activity for lead scoring

**How to get connection string:**

1. Go to neon.tech
2. Log into your account
3. Select your SSELFIE project
4. Click "Connection Details"
5. Copy the connection string (looks like: `postgresql://user:pass@host/db`)
6. Paste into Gumloop database integration

**Alternatively:**
- Use Neon API key instead
- Settings → API Keys → Create new key
- Use in HTTP requests to Neon API

**For Flow 5 (Lead Scoring):**
- You'll query: User credits used, login frequency, features tried
- SQL query example:
```sql
SELECT
  user_id,
  email,
  credits_used,
  last_login_at,
  created_at
FROM users
WHERE credits_used > 0
ORDER BY last_login_at DESC
LIMIT 100
```

---

## 5. CLAUDE API (AI Brain)

**What it's for:** Powering your AI agents (Content Writer, Analyst, etc.)

**How to get API key:**

1. Go to console.anthropic.com
2. Log in (or create account)
3. Click "API Keys" in sidebar
4. Click "Create Key"
5. Name it: "Gumloop Agents"
6. Copy the key (starts with `sk-ant-`)
7. Paste into Gumloop Claude integration

**Cost:** ~$50/month for all your automations

**Your existing agents:**
- You already have Content Writer, Competitor Research, Audience Analyst agents in Gumloop
- These already use Claude API
- You just need to connect them to your flows

---

## 6. GOOGLE DOCS (For Flow 2)

**What it's for:** Archiving weekly strategy reports

**How to set it up:**

1. In Gumloop, add "Google Docs" integration
2. Click "Connect Google Account"
3. Authorize Gumloop
4. Select folder where you want reports saved
5. Flow will auto-create new doc each week

**No API key needed** - just OAuth.

---

## 7. CALENDLY (For Intensive Bookings)

**What it's for:** Booking links for DM auto-responder

**How to get it:**

1. Go to calendly.com
2. Log in (or create account)
3. Create event type: "Brand Engine Intensive Discovery Call"
   - Duration: 30 minutes
   - Buffer: 15 min before/after
   - Questions: Name, Instagram handle, biggest challenge
4. Copy your booking link (calendly.com/sandra/intensive)
5. Use this link in Flow 3 (DM responder) when keyword = "ENGINE"

**No integration needed** - just use the link in your auto-response.

---

## 8. STRIPE (Payments)

**What it's for:** Processing payments, tracking revenue

**You already have this set up:**
- Stripe account connected to SSELFIE
- Products created ($97/mo, $49 one-time, etc.)
- Webhooks configured

**For future automation:**
- You can use Stripe API to track revenue in analytics flows
- Get API key from Stripe Dashboard → Developers → API Keys
- Use "Restricted Key" with read-only permissions for safety

**Not needed immediately** - focus on content/lead flows first.

---

## 🔒 SECURITY BEST PRACTICES

**Storing API Keys:**
- Never share API keys publicly
- Never commit them to GitHub
- Store in Gumloop securely (they encrypt)
- Use restricted/read-only keys when possible

**Revoking Keys:**
- If you accidentally expose a key, revoke it immediately
- Create a new one
- Update in Gumloop

**Testing:**
- Use test mode APIs when available (Stripe has test mode)
- Test flows with small data sets first
- Don't blast your entire email list on first test

---

## 📊 WHAT YOU NEED FOR EACH FLOW

### Flow 1: Daily Content Creation
✅ Instagram API (or manual input)
✅ Slack workspace
✅ Your existing Gumloop agents

### Flow 2: Weekly Strategy
✅ Instagram API
✅ Slack workspace
✅ Google Docs
✅ Your existing Gumloop agents

### Flow 3: DM Auto-Responder
✅ Instagram webhook (complex - consider Manychat instead)
✅ Slack workspace
✅ Calendly link
✅ Your Blueprint link
✅ Your SSELFIE signup link

### Flow 4: Weekly Email Campaign
✅ Instagram API
✅ Resend API key
✅ Slack workspace
✅ Your existing Gumloop agents

### Flow 5: Lead Scoring
✅ Resend API key
✅ Instagram API
✅ Neon database connection (optional for now)
✅ Slack workspace
✅ Your existing Gumloop agents

---

## 🚀 QUICK START PRIORITY

**Start with Flow 1 using:**
1. Manual input (skip Instagram API for now)
2. Slack (easy OAuth setup)
3. Your existing agents (already configured)

**This gets you working automation TODAY.**

Then add integrations one by one as you build other flows.

---

## 💡 TIPS

**Don't get stuck on perfect integration setup:**
- Use manual inputs to start
- Test flows with simplified versions
- Add complex integrations later
- Focus on getting ONE flow working first

**If integration fails:**
- Check credentials are correct
- Make sure account permissions are granted
- Try disconnecting and reconnecting
- Use test data first

**Most common issue:**
- Instagram API - skip for now, use manual
- Webhook setup - use Manychat instead
- Database queries - simplify to just email data first

---

## ❓ WHEN TO ASK FOR HELP

**Ask me if:**
- API key isn't working after double-checking
- You're stuck on Instagram integration (I can help find easier path)
- Database query syntax is confusing
- Not sure which integration to use for a flow

**Don't spend more than 15 minutes stuck:**
- There's usually a simpler workaround
- I can help you bypass complex setups
- Most flows can work with simplified integrations first

---

**Ready?** Start with Flow 1 using the simplest setup possible. You can always upgrade integrations later.

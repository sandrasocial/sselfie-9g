# 🔌 GUMLOOP EMAIL NEWSLETTER INTEGRATION PLAN
**Date:** January 31, 2026
**Status:** READY FOR IMPLEMENTATION

---

## 📊 AUDIT FINDINGS SUMMARY

### ✅ What You Already Have

#### 1. **Email Templates (43 Total)**
Located in: `lib/email/marketing-template-catalog.ts`

**Template Categories:**
- **Welcome Sequence:** Day 0, 3, 7 (3 templates)
- **Nurture Sequence:** Day 1, 3, 7, 10 (4 templates)
- **Onboarding:** Day 0, 2, 7 (3 templates)
- **Blueprint Discovery:** Days 1-5 (5 templates)
- **Blueprint Followup:** Day 3, 7, 14 (3 templates)
- **Cold Education:** Day 1, 3, 7 (3 templates)
- **Reengagement:** Day 0, 7, 14 (3 templates)
- **Reactivation:** Day 0-25 (6 templates)
- **Upsell:** Day 10, Freebie Membership (2 templates)
- **Win-Back:** Offer (1 template)
- **Plus:** Enhanced conversion, social proof sequences (10+ templates)

**Template Features:**
- Dynamic placeholders: `{{{FIRST_NAME|friend}}}`, `{{{EMAIL}}}`
- HTML & plain text versions available
- Brand voice consistent across all templates
- Professional copywriting with CTAs

#### 2. **Email Sending Infrastructure**
Located in: `lib/email/send-email.ts`

**Capabilities:**
- ✅ Resend API integration with retry logic (3 attempts)
- ✅ Rate limiting protection
- ✅ Test mode & kill switches
- ✅ Database logging to `email_logs` table
- ✅ Campaign tracking via campaign_id
- ✅ Click/open tracking for marketing emails
- ✅ Exponential backoff (2s, 4s, 8s delays)
- ✅ Email type differentiation (transactional vs marketing)

#### 3. **Resend Dashboard Setup**

**Current Usage (Last 15 days):**
- 7,460 emails sent from sselfie.ai
- 91.86% deliverability rate
- Active sending with spike on Jan 26 (4,000 emails)

**Broadcasts:**
- ✅ Active broadcast campaigns:
  - "Paid to Member" sequence (Emails 1-3)
  - "Freebie to Paid" sequence (Emails 1-3)
  - "Reintro Campaign Jan 27"
  - "Selfie Content Strategy"
  - Multiple recent campaigns

**Templates:**
- 3 empty draft templates (unused)
- **Real templates are in your code** (43 templates in marketing-template-catalog.ts)

**Audience & Segmentation:**
- **3,194 total contacts**
- **3,116 subscribers** (active)
- **78 unsubscribers**
- **59 segments** actively tracked including:
  - Main Audience
  - Brand Blueprint Freebie
  - Cold Users
  - Sequence-based segments (Welcome Day 7, Nurture Day 10, Discovery Day 0, etc.)
  - All 59 segments align with your 43 email templates

#### 4. **Database Schema**

**Tables:**

**`admin_email_campaigns`** - Campaign management
```sql
- id, campaign_name, campaign_type
- subject_line, preview_text
- body_html, body_text
- status (draft, scheduled, sending, sent, failed)
- approval_status (pending, approved, rejected)
- target_audience (JSONB)
- scheduled_for, sent_at
- resend_broadcast_id ← Links to Resend broadcasts!
- Metrics: total_recipients, total_opened, total_clicked, total_converted
- metrics (JSONB for detailed tracking)
- image_urls (TEXT[])
- Approval: approved_by, approved_at
- Testing: test_email_sent_to, test_email_sent_at
- Audit: created_by, created_at, updated_at
```

**`email_logs`** - Individual email tracking
```sql
- id, user_email, email_type, status
- resend_message_id
- campaign_id (FK to admin_email_campaigns)
- error_message, sent_at
- Engagement tracking:
  - opened, opened_at
  - clicked, clicked_at
  - converted, converted_at
```

**`welcome_back_sequence`** - Multi-day sequence tracking
```sql
- User progression through Day 0, 7, 14 emails
- Conversion tracking per sequence
- Campaign ID linking
```

---

## 🎯 INTEGRATION STRATEGY

### ANSWER: Should templates be built inside Resend?

**NO.** Keep templates in code because:

1. **You already have 43 professional templates** in `marketing-template-catalog.ts`
2. **Version control** - Templates are tracked in Git
3. **Dynamic content** - Easier to use placeholders and logic in code
4. **Your system is designed for code templates** - send-email.ts expects templates from code
5. **Resend templates are currently empty/unused** - No need to duplicate effort

**RECOMMENDATION:** Continue using code-based templates. Gumloop should generate content that uses these existing templates.

---

### ANSWER: How to connect to your email marketing workflow?

**HYBRID APPROACH - Gumloop + Existing Infrastructure**

#### Option A: Newsletter Content Generation Only (RECOMMENDED FOR PHASE 1)

**What Gumloop Does:**
1. Analyzes Instagram performance (Audience Analyst agent)
2. Creates content strategy (Content Strategist agent)
3. Generates newsletter content (Content Writer agent)
4. **Outputs:** Subject line + Email body (HTML)

**What Your Existing System Does:**
1. Receives Gumloop output via API endpoint
2. Stores in `admin_email_campaigns` table
3. Uses existing send-email.ts infrastructure
4. Sends via Resend Broadcasts
5. Tracks opens/clicks/conversions in database
6. Manages segments and audiences

**Flow:**
```
Gumloop Flow (Instagram → Agents → Content)
    ↓
API Endpoint: /api/admin/agent/email-campaigns/create
    ↓
Store in admin_email_campaigns table
    ↓
Your existing send-email.ts system
    ↓
Resend API → Broadcasts
    ↓
Database tracking (email_logs + conversions)
```

**Advantages:**
- ✅ Uses your proven email infrastructure
- ✅ Maintains tracking & analytics
- ✅ Keeps templates centralized
- ✅ No need to rebuild sending logic
- ✅ Resend segments work as-is

#### Option B: Full Automation (PHASE 2 - Future)

Add to Gumloop flow:
1. Schedule trigger (Monday 9am)
2. Resend sending step
3. But still log to your database via webhook

---

### ANSWER: How to ensure voice consistency?

**3-LAYER VOICE CONSISTENCY SYSTEM:**

#### Layer 1: Train Gumloop Agents

**Content Writer Agent Prompt Enhancement:**
```
BRAND VOICE GUIDELINES:
- Tone: Authentic, empowering, strategic
- POV: First-person ("I" not "we")
- Style: Direct, actionable, no fluff
- Avoid: Corporate jargon, passive voice, excessive adjectives
- Key phrases: "Here's the truth", "Let me show you", "This changes everything"

WRITING RULES:
- Short paragraphs (2-3 sentences max)
- Bullet points for lists
- Clear CTAs (one per email)
- Personal stories > generic advice
- Data-backed insights

EXAMPLE GOOD:
"I analyzed 1,000 Instagram posts. Here's what actually works..."

EXAMPLE BAD:
"We're excited to share some amazing insights about Instagram..."
```

**How to Implement:**
1. Go to Gumloop → Content Writer Agent → Edit
2. Add "System Prompt" section with brand voice guidelines
3. Include 3-5 example emails from your best performers
4. Reference specific templates from your catalog as examples

#### Layer 2: Use Your Existing Templates as Framework

**Don't generate entire emails from scratch.** Instead:

**Gumloop Outputs:**
- Headline/Hook
- Main content sections (2-3 key points)
- CTA text
- P.S. line (optional)

**Your Code Merges Into Template:**
```typescript
// Example: Use your nurture-day-3 template structure
const emailHTML = renderTemplate('nurture-day-3', {
  FIRST_NAME: user.firstName,
  HEADLINE: gumloopOutput.headline,
  MAIN_CONTENT: gumloopOutput.content,
  CTA_TEXT: gumloopOutput.cta,
  PS: gumloopOutput.ps
});
```

This ensures:
- ✅ Consistent layout & design
- ✅ Brand colors, fonts, formatting
- ✅ Header/footer remain unchanged
- ✅ Only content varies (in your voice)

#### Layer 3: Post-Generation Review System

**Add approval workflow:**

1. **Gumloop generates → Saves to database as `status: draft`**
2. **You review in /admin/email-campaigns (or new dashboard)**
3. **Approve/Edit → Status changes to `approved`**
4. **Only approved emails get scheduled/sent**

**Database already supports this:**
- `admin_email_campaigns.approval_status` (pending → approved → rejected)
- `approved_by`, `approved_at` columns

**Optional:** Add AI voice checker
- Compare generated content to your best templates
- Flag significant voice deviations
- Score: 0-100 voice match

---

### ANSWER: How to ensure all links are correct & tracked?

**LINK MANAGEMENT STRATEGY:**

#### Step 1: Define Standard Links

**Create link library in code:**
```typescript
// lib/email/link-library.ts
export const EMAIL_LINKS = {
  // Main CTAs
  blueprint: 'https://sselfie.ai/blueprint?utm_source=email&utm_campaign={{CAMPAIGN_ID}}',
  membership: 'https://sselfie.ai/membership?utm_source=email&utm_campaign={{CAMPAIGN_ID}}',

  // Content
  instagramGuide: 'https://sselfie.ai/guides/instagram?utm_source=email&utm_campaign={{CAMPAIGN_ID}}',
  contentStrategy: 'https://sselfie.ai/strategy?utm_source=email&utm_campaign={{CAMPAIGN_ID}}',

  // Settings
  unsubscribe: 'https://sselfie.ai/unsubscribe?email={{EMAIL}}',
  preferences: 'https://sselfie.ai/email-preferences?email={{EMAIL}}'
}
```

#### Step 2: Gumloop Agent Instructions

**Add to Content Writer prompt:**
```
REQUIRED LINKS:
- Main CTA: Use [link_blueprint] or [link_membership]
- Footer: Always include [link_unsubscribe] and [link_preferences]

DO NOT write full URLs. Use placeholder tags like:
[link_blueprint] → System will replace with tracked URL

Example:
"Ready to build your brand? [link_blueprint]Click here to get started[/link_blueprint]"
```

#### Step 3: Link Processor (Your Code)

```typescript
// lib/email/process-gumloop-content.ts
function replaceLinksWithTracked(content: string, campaignId: number, userEmail: string) {
  let processed = content;

  // Replace link placeholders with tracked URLs
  processed = processed.replace(
    /\[link_blueprint\](.*?)\[\/link_blueprint\]/g,
    `<a href="${EMAIL_LINKS.blueprint
      .replace('{{CAMPAIGN_ID}}', campaignId.toString())
      .replace('{{EMAIL}}', userEmail)}">$1</a>`
  );

  // Add more link replacements...

  return processed;
}
```

#### Step 4: Resend Tracking

**Your existing system already has:**
- Click tracking enabled for marketing emails (in send-email.ts)
- Database columns: `clicked`, `clicked_at` in email_logs
- Webhook handling in `/api/webhooks/resend/route.ts`

**Ensure:**
1. All marketing emails have `trackClicks: true` (already set in send-email.ts)
2. Webhook endpoint receives & logs click events
3. Links use UTM parameters for Google Analytics

#### Step 5: Validation System

**Before sending, validate:**
```typescript
// Automated checks
function validateEmailLinks(emailHTML: string) {
  const issues = [];

  // Check: All required links present
  if (!emailHTML.includes('unsubscribe')) issues.push('Missing unsubscribe link');
  if (!emailHTML.includes('utm_campaign=')) issues.push('Missing UTM tracking');

  // Check: No broken placeholders
  if (emailHTML.includes('[link_')) issues.push('Unprocessed link placeholders');
  if (emailHTML.includes('{{')) issues.push('Unprocessed variables');

  // Check: Valid URLs
  const urlRegex = /href="([^"]+)"/g;
  const urls = [...emailHTML.matchAll(urlRegex)].map(m => m[1]);
  urls.forEach(url => {
    try { new URL(url); }
    catch { issues.push(`Invalid URL: ${url}`); }
  });

  return issues;
}
```

---

### ANSWER: How to monitor & track everything?

**TRACKING ARCHITECTURE:**

#### What Gets Tracked Where:

**1. Gumloop Flow Execution**
- **Where:** Gumloop's own run history (accessible in Gumloop dashboard)
- **What:** Agent outputs, run time, success/failure
- **Access:** https://app.gumloop.com/flow/ducD69JPVArQsmnCtPjTsJ

**2. Email Campaign Creation**
- **Where:** `admin_email_campaigns` table in your database
- **What:**
  - Campaign metadata (name, type, subject, body)
  - Status progression (draft → scheduled → sent)
  - Approval tracking (who approved, when)
  - Test email tracking
- **Dashboard:** `/admin/email-campaigns` (existing or create new)

**3. Individual Email Delivery**
- **Where:** `email_logs` table
- **What:**
  - Every send attempt (success/failure)
  - Resend message ID
  - Error messages
  - Campaign linkage
- **Dashboard:** `/admin/email-logs` or `/check-email-logs`

**4. Email Engagement**
- **Where:** `email_logs` table (same row as delivery)
- **What:**
  - Opens (opened, opened_at)
  - Clicks (clicked, clicked_at)
  - Conversions (converted, converted_at)
- **Source:** Resend webhooks → `/api/webhooks/resend`

**5. Campaign Performance**
- **Where:** `admin_email_campaigns` table (aggregate metrics)
- **What:**
  - total_recipients
  - total_opened (% open rate)
  - total_clicked (% click rate)
  - total_converted (% conversion rate)
- **Dashboard:** `/admin/email-analytics` (existing)

**6. Sequence Progression**
- **Where:** `welcome_back_sequence` table (and similar for other sequences)
- **What:**
  - User progression through multi-day sequences
  - Day 0, 7, 14 send tracking
  - Sequence-level conversion tracking

**7. Audience Segments**
- **Where:** Resend dashboard
- **What:** 59 segments tracking user progression
- **Sync:** `/api/cron/sync-audience-segments` (runs regularly)

#### Monitoring Dashboard (Build This)

**Create:** `/admin/gumloop-email-monitor`

**Display:**
```
┌─────────────────────────────────────────┐
│  📧 GUMLOOP EMAIL AUTOMATION STATUS     │
├─────────────────────────────────────────┤
│  Last Run: Mon Jan 31, 9:00 AM         │
│  Status: ✅ Success                     │
│  Duration: 2m 34s                       │
│                                         │
│  📊 This Week's Performance:           │
│  • 4 newsletters generated              │
│  • 12,450 emails sent                   │
│  • 32.5% open rate                      │
│  • 4.2% click rate                      │
│  • 12 conversions                       │
│                                         │
│  📝 Latest Campaign:                    │
│  Subject: "The Instagram Algorithm..."  │
│  Status: Sent (Jan 29, 9:15 AM)        │
│  Recipients: 3,116                      │
│  Opens: 1,013 (32.5%)                   │
│  Clicks: 131 (4.2%)                     │
│                                         │
│  🔗 Quick Actions:                      │
│  [View in Gumloop] [View Analytics]    │
│  [Approve Draft] [Test Send]           │
└─────────────────────────────────────────┘
```

**Data Sources:**
- Gumloop API (flow run status)
- Your database (`admin_email_campaigns`, `email_logs`)
- Resend API (real-time delivery status)

---

### ANSWER: Should you send as Broadcasts or Sequences?

**HYBRID APPROACH (Use Both):**

#### Use **Broadcasts** for:
✅ **Weekly newsletters** (Gumloop-generated content)
- One-time sends to entire list or segment
- Time-sensitive content
- What Gumloop will create

**How it works:**
1. Gumloop generates newsletter
2. Stored in `admin_email_campaigns` with `resend_broadcast_id`
3. Sent via Resend Broadcasts API
4. Tracked in `email_logs` with campaign_id

#### Use **Sequences** for:
✅ **Automated nurture flows** (Existing 43 templates)
- Welcome sequences (Day 0, 3, 7)
- Nurture sequences (Day 1, 3, 7, 10)
- Onboarding, reactivation, win-back

**How it works:**
1. Triggered by user actions (signup, purchase, etc.)
2. Tracked in `welcome_back_sequence` table
3. Cron jobs send at intervals (`/api/cron/welcome-sequence`, etc.)
4. Uses templates from `marketing-template-catalog.ts`

**Why Hybrid:**
- Broadcasts = **"What's new this week"** (Gumloop newsletters)
- Sequences = **"Welcome to the journey"** (Automated onboarding)
- Different purposes, different tracking needs
- You already have infrastructure for both

---

## 🛠️ IMPLEMENTATION ROADMAP

### Phase 1: Connect Gumloop Output to Database (Week 1)

**Goal:** Gumloop generates newsletter → Saves to your database

#### Step 1.1: Create API Endpoint

**File:** `app/api/admin/gumloop-webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { subject, body_html, metadata } = await req.json()

    // Validate
    if (!subject || !body_html) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const sql = getDb()

    // Insert into admin_email_campaigns
    const campaign = await sql`
      INSERT INTO admin_email_campaigns (
        campaign_name,
        campaign_type,
        subject_line,
        body_html,
        status,
        approval_status,
        target_audience,
        created_by,
        metrics
      ) VALUES (
        ${metadata?.campaign_name || 'Weekly Newsletter'},
        'newsletter',
        ${subject},
        ${body_html},
        'draft',
        'pending',
        ${{ segment: 'Main Audience' }}::jsonb,
        'gumloop-automation',
        ${metadata || {}}::jsonb
      )
      RETURNING id, campaign_name, status
    `

    return NextResponse.json({
      success: true,
      campaign_id: campaign[0].id,
      message: "Newsletter draft created successfully"
    })

  } catch (error) {
    console.error("[Gumloop Webhook] Error:", error)
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 })
  }
}
```

#### Step 1.2: Update Gumloop Flow

**In Gumloop Editor:**

1. After "Content Writer" agent
2. Add "HTTP Request" block:
   - **Method:** POST
   - **URL:** `https://your-domain.vercel.app/api/admin/gumloop-webhook`
   - **Headers:**
     ```json
     {
       "Content-Type": "application/json",
       "Authorization": "Bearer YOUR_WEBHOOK_SECRET"
     }
     ```
   - **Body:**
     ```json
     {
       "subject": "{{content_writer.subject}}",
       "body_html": "{{content_writer.body}}",
       "metadata": {
         "campaign_name": "Weekly Newsletter - {{date}}",
         "instagram_insights": "{{audience_analyst.output}}",
         "strategy": "{{content_strategist.output}}"
       }
     }
     ```

#### Step 1.3: Add Webhook Secret

**File:** `.env.local`
```
GUMLOOP_WEBHOOK_SECRET=your-secure-random-string-here
```

**Update API to verify:**
```typescript
// In route.ts
const authHeader = req.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.GUMLOOP_WEBHOOK_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

#### Step 1.4: Test End-to-End

1. Run Gumloop flow manually
2. Check database: `SELECT * FROM admin_email_campaigns ORDER BY created_at DESC LIMIT 1`
3. Verify: subject, body_html, status='draft', created_by='gumloop-automation'

---

### Phase 2: Review & Approval Interface (Week 1-2)

**Goal:** You review AI-generated newsletters before sending

#### Step 2.1: Build Review Dashboard

**File:** `app/admin/newsletter-review/page.tsx`

**Features:**
- List pending newsletters (status='draft', approval_status='pending')
- Preview email (render HTML)
- Side-by-side: Generated vs. Your voice examples
- Edit subject/body inline
- Approve/Reject buttons
- Send test email to yourself

**Actions:**
```typescript
// Approve
UPDATE admin_email_campaigns
SET approval_status = 'approved',
    approved_by = 'sandra@ssasocial.com',
    approved_at = NOW(),
    status = 'scheduled',
    scheduled_for = '2026-02-03 09:00:00'
WHERE id = 123

// Reject
UPDATE admin_email_campaigns
SET approval_status = 'rejected'
WHERE id = 123
```

#### Step 2.2: Add Test Email Feature

```typescript
// app/api/admin/email-campaigns/[id]/test/route.ts
export async function POST(req: NextRequest, { params }) {
  const { testEmail } = await req.json()
  const campaignId = params.id

  // Load campaign
  const campaign = await sql`SELECT * FROM admin_email_campaigns WHERE id = ${campaignId}`

  // Send test
  await sendEmail({
    to: testEmail,
    subject: `[TEST] ${campaign[0].subject_line}`,
    html: campaign[0].body_html,
    from: 'Sandra @ SSELFIE <hello@sselfie.ai>',
    emailType: 'marketing-test'
  })

  // Log test send
  await sql`
    UPDATE admin_email_campaigns
    SET test_email_sent_to = ${testEmail},
        test_email_sent_at = NOW()
    WHERE id = ${campaignId}
  `
}
```

---

### Phase 3: Automated Sending (Week 2)

**Goal:** Approved newsletters send automatically via Resend Broadcasts

#### Step 3.1: Create Broadcast Sender

**File:** `lib/email/send-newsletter-broadcast.ts`

```typescript
import { Resend } from 'resend'
import { getDb } from '@/lib/db'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendNewsletterBroadcast(campaignId: number) {
  const sql = getDb()

  // Load campaign
  const campaign = await sql`
    SELECT * FROM admin_email_campaigns
    WHERE id = ${campaignId}
    AND approval_status = 'approved'
    AND status = 'scheduled'
  `

  if (!campaign[0]) throw new Error('Campaign not found or not approved')

  // Get target audience from Resend
  const audienceId = 'YOUR_RESEND_AUDIENCE_ID' // Main Audience segment

  // Create broadcast in Resend
  const broadcast = await resend.broadcasts.create({
    audience_id: audienceId,
    from: 'Sandra @ SSELFIE <hello@sselfie.ai>',
    subject: campaign[0].subject_line,
    html: campaign[0].body_html,
    scheduled_at: campaign[0].scheduled_for
  })

  // Update campaign with broadcast ID
  await sql`
    UPDATE admin_email_campaigns
    SET resend_broadcast_id = ${broadcast.id},
        status = 'sending',
        sent_at = NOW()
    WHERE id = ${campaignId}
  `

  console.log(`✅ Broadcast created: ${broadcast.id}`)
  return broadcast.id
}
```

#### Step 3.2: Create Cron Job

**File:** `app/api/cron/send-scheduled-newsletters/route.ts`

```typescript
export async function GET(req: NextRequest) {
  const sql = getDb()

  // Find campaigns ready to send
  const campaigns = await sql`
    SELECT id FROM admin_email_campaigns
    WHERE status = 'scheduled'
    AND approval_status = 'approved'
    AND scheduled_for <= NOW()
  `

  for (const campaign of campaigns) {
    try {
      await sendNewsletterBroadcast(campaign.id)
    } catch (error) {
      console.error(`Failed to send campaign ${campaign.id}:`, error)
    }
  }

  return NextResponse.json({ sent: campaigns.length })
}
```

**Vercel Cron:** `vercel.json`
```json
{
  "crons": [{
    "path": "/api/cron/send-scheduled-newsletters",
    "schedule": "*/15 * * * *"
  }]
}
```

---

### Phase 4: Link Processing & Validation (Week 2-3)

**Goal:** All links tracked, validated, UTM-tagged

#### Step 4.1: Implement Link Processor

See "Link Management Strategy" section above.

**Key files to create:**
- `lib/email/link-library.ts` (link definitions)
- `lib/email/process-gumloop-content.ts` (link replacement)
- `lib/email/validate-email-content.ts` (validation checks)

**Add to workflow:**
```typescript
// Before saving to database
let processedHTML = content.body_html

// 1. Replace link placeholders
processedHTML = replaceLinksWithTracked(processedHTML, campaignId, 'broadcast')

// 2. Validate
const issues = validateEmailLinks(processedHTML)
if (issues.length > 0) {
  console.warn('Email validation issues:', issues)
  // Log to database or alert admin
}

// 3. Save processed version
campaign.body_html = processedHTML
```

---

### Phase 5: Voice Consistency System (Week 3)

**Goal:** AI-generated content matches your brand voice

#### Step 5.1: Train Gumloop Agents

**Extract your best emails:**
```bash
# Find your top-performing emails
SELECT subject_line, body_html,
       total_opened, total_clicked, total_converted
FROM admin_email_campaigns
WHERE total_opened > 1000
ORDER BY (total_clicked::float / total_opened) DESC
LIMIT 10
```

**Add to Content Writer agent prompt:**
- Paste 3-5 examples
- Add voice guidelines (see "Voice Consistency" section)
- Include do's and don'ts

#### Step 5.2: Template Integration

**Create template wrapper:**
```typescript
// lib/email/wrap-in-template.ts
export function wrapGumloopContent(content: string, templateId: string) {
  const template = MARKETING_TEMPLATE_CATALOG.find(t => t.id === templateId)

  return template.htmlContent
    .replace('{{HEADLINE}}', extractHeadline(content))
    .replace('{{MAIN_CONTENT}}', content)
    .replace('{{FOOTER}}', template.footer)
}
```

**Update Gumloop webhook:**
```typescript
// Process content through template
const wrappedHTML = wrapGumloopContent(
  body_html,
  'newsletter-base-template'
)

// Save wrapped version
campaign.body_html = wrappedHTML
```

#### Step 5.3: Voice Checker (Optional)

**AI-based validation:**
```typescript
// Use OpenAI to compare voice
async function checkVoiceConsistency(generatedText: string, exampleTexts: string[]) {
  const prompt = `
    Compare this generated email to examples of our brand voice.
    Score from 0-100 how well it matches.

    Generated:
    ${generatedText}

    Brand examples:
    ${exampleTexts.join('\n\n')}

    Return JSON: { score: number, issues: string[], suggestions: string[] }
  `

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  })

  return JSON.parse(response.choices[0].message.content)
}
```

---

### Phase 6: Monitoring & Analytics (Week 3-4)

**Goal:** Real-time tracking of Gumloop automation performance

#### Step 6.1: Build Monitor Dashboard

**File:** `app/admin/gumloop-monitor/page.tsx`

**Data fetching:**
```typescript
// Server component
async function getGumloopStatus() {
  const sql = getDb()

  // Latest campaigns
  const recentCampaigns = await sql`
    SELECT * FROM admin_email_campaigns
    WHERE created_by = 'gumloop-automation'
    ORDER BY created_at DESC
    LIMIT 10
  `

  // This week's performance
  const weekStats = await sql`
    SELECT
      COUNT(*) as total_campaigns,
      SUM(total_recipients) as total_sent,
      SUM(total_opened) as total_opens,
      SUM(total_clicked) as total_clicks,
      SUM(total_converted) as total_conversions
    FROM admin_email_campaigns
    WHERE created_by = 'gumloop-automation'
    AND created_at >= NOW() - INTERVAL '7 days'
  `

  // Gumloop flow status (via API)
  const gumloopStatus = await fetch(
    `https://api.gumloop.com/api/v1/flow/ducD69JPVArQsmnCtPjTsJ/runs?limit=5`,
    { headers: { 'Authorization': `Bearer ${process.env.GUMLOOP_API_KEY}` }}
  ).then(r => r.json())

  return { recentCampaigns, weekStats, gumloopStatus }
}
```

#### Step 6.2: Add Alerts

**Create:** `lib/monitoring/gumloop-alerts.ts`

**Alert triggers:**
- Gumloop flow fails
- Newsletter not generated by Monday 10am
- Open rate < 20% (below threshold)
- No emails sent in 7 days
- Database save fails

**Notification methods:**
- Email alert to you
- Slack notification (if integrated)
- Dashboard banner

---

## 📋 FINAL RECOMMENDATIONS

### 1. **Start with Phase 1-2 (This Week)**
- Connect Gumloop → Your database
- Build review/approval interface
- Test with 1-2 newsletters manually

### 2. **Templates: Keep in Code**
- Don't rebuild in Resend
- Use your 43 existing templates
- Gumloop generates content, not design

### 3. **Sending: Use Broadcasts for Newsletters**
- Weekly Gumloop newsletters → Resend Broadcasts
- Existing sequences stay as-is (cron jobs)
- Leverage `resend_broadcast_id` in database

### 4. **Voice: 3-Layer System**
- Train Gumloop agents with examples
- Wrap content in your templates
- Manual review before sending (initially)

### 5. **Links: Centralize & Validate**
- Create link library
- Replace placeholders in code
- Validate before sending
- UTM tracking on all links

### 6. **Tracking: Everything in Your Database**
- Gumloop saves to `admin_email_campaigns`
- send-email.ts logs to `email_logs`
- Resend webhooks update engagement
- Monitor dashboard shows all metrics

### 7. **Testing Protocol**
```
1. Gumloop generates → Saves as draft
2. Review in /admin/newsletter-review
3. Send test email to yourself
4. Approve → Status = scheduled
5. Cron job sends via Broadcast
6. Monitor engagement in real-time
```

---

## 🎯 SUCCESS METRICS

**Week 1:**
- ✅ Gumloop → Database connection working
- ✅ Review dashboard built
- ✅ 1 test newsletter sent successfully

**Week 2:**
- ✅ Automated sending via broadcasts
- ✅ Link tracking functional
- ✅ Voice consistency checks in place

**Week 3:**
- ✅ Monitoring dashboard live
- ✅ Alerts configured
- ✅ 2-3 newsletters sent automatically

**Month 1:**
- ✅ 4 newsletters generated & sent
- ✅ Open rate: >25%
- ✅ Click rate: >3%
- ✅ Zero broken links
- ✅ 95%+ voice consistency score

---

## 🚀 NEXT STEPS

1. **Review this plan** - Does it align with your vision?
2. **Choose starting point** - Phase 1 (connect to database) or full implementation?
3. **Set up Gumloop agents** - Add voice guidelines to Content Writer
4. **Create API endpoint** - Build `/api/admin/gumloop-webhook`
5. **Test integration** - Run Gumloop → Check database
6. **Build review UI** - Approve/reject interface
7. **Launch!** - Send first automated newsletter

**Need help with any step? I can:**
- Write the API endpoint code
- Create the review dashboard
- Build the monitoring interface
- Set up link processing
- Configure Gumloop flow settings

Let me know where you want to start! 🎉

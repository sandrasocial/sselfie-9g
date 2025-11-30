# Email Infrastructure Diagnostic Report
**Date:** Generated for SSELFIE Studio  
**Scope:** Complete audit of email system for 2600 subscribers  
**Status:** 🔴 CRITICAL ISSUES FOUND

---

## EXECUTIVE SUMMARY

Your email system has **multiple critical blockers** preventing emails from reaching your 2600 subscribers:

1. ❌ **No automated email queue processor** - Emails are queued but never sent
2. ❌ **Resend clients initialized at module scope** - Can cause initialization failures
3. ❌ **No bulk import of existing subscribers** - 2600 subscribers may not be in Resend
4. ❌ **Missing cron job** - `checkEmailQueue()` exists but is never called
5. ⚠️ **Inconsistent sender addresses** - Multiple "from" addresses used
6. ⚠️ **Domain verification unknown** - Need to verify `sselfie.ai` domain in Resend

---

## 1. RESEND API USAGE AUDIT

### 1.1 Files Importing/Using Resend

**Total: 15+ files using Resend**

#### Module-Scope Initialization (❌ NOT LAZY - CRITICAL ISSUE)

1. **`lib/email/resend.ts:3`**
   ```typescript
   const resend = new Resend(process.env.RESEND_API_KEY)
   ```
   - **Issue:** Initialized at module load, not lazy
   - **Impact:** If `RESEND_API_KEY` is undefined at build time, client fails silently

2. **`lib/email/send-email.ts:15`**
   ```typescript
   const resend = new Resend(process.env.RESEND_API_KEY)
   ```
   - **Issue:** Same module-scope initialization
   - **Used by:** Bulk email sending, retry logic

3. **`lib/resend/manage-contact.ts:4`**
   ```typescript
   const resend = new Resend(process.env.RESEND_API_KEY)
   const audienceId = process.env.RESEND_AUDIENCE_ID!
   ```
   - **Issue:** Module-scope + non-null assertion on env var
   - **Used by:** Subscriber sync to Resend audience

4. **`agents/tools/emailTools.ts:9`**
   ```typescript
   const resend = new Resend(process.env.RESEND_API_KEY)
   ```
   - **Issue:** Module-scope initialization
   - **Used by:** AI agent email tools

#### Route-Level Initialization (✅ BETTER, but inconsistent)

5. **`app/api/freebie/subscribe/route.ts:7`**
   ```typescript
   const resend = new Resend(process.env.RESEND_API_KEY!)
   ```
   - Uses non-null assertion

6. **`app/api/blueprint/subscribe/route.ts:6`**
   ```typescript
   const resend = new Resend(process.env.RESEND_API_KEY!)
   ```

7. **`app/api/admin/email/send-launch-campaign/route.ts:4`**
   ```typescript
   const resend = new Resend(process.env.RESEND_API_KEY!)
   ```

8. **`app/api/test/resend/route.ts:10`**
   ```typescript
   const resend = new Resend(process.env.RESEND_API_KEY)
   ```

9. **`app/api/blueprint/email-concepts/route.ts:5`**
   ```typescript
   const resend = new Resend(process.env.RESEND_API_KEY)
   ```

10. **`agents/workflows/blueprintFollowUpWorkflow.tsx:16`**
    ```typescript
    const resend = new Resend(process.env.RESEND_API_KEY)
    ```

### 1.2 Environment Variable Usage

**Required Variables:**
- `RESEND_API_KEY` - Used in 15+ files
- `RESEND_AUDIENCE_ID` - Used in 8+ files
- `RESEND_BETA_SEGMENT_ID` - Optional, used in 3 files

**Issues Found:**
- ❌ No validation that env vars exist before initialization
- ❌ Non-null assertions (`!`) used without checks
- ❌ Some files check for env vars, others don't

### 1.3 Resend Client Initialization Pattern

**Current Pattern (WRONG):**
```typescript
// Module scope - BAD
const resend = new Resend(process.env.RESEND_API_KEY)
```

**Should Be (LAZY):**
```typescript
// Lazy initialization - GOOD
function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not configured")
  }
  return new Resend(process.env.RESEND_API_KEY)
}
```

---

## 2. NEWSLETTER SUBSCRIBER FLOW

### 2.1 Subscriber Storage Locations

**Neon Database Tables:**
1. **`freebie_subscribers`** - Selfie guide subscribers
   - Location: `scripts/create-freebie-subscribers-table.sql`
   - Fields: `email`, `name`, `resend_contact_id`, `guide_access_email_sent`
   - Count: Unknown (check via `/api/admin/email/subscriber-count`)

2. **`blueprint_subscribers`** - Brand blueprint subscribers
   - Location: `scripts/create-blueprint-subscribers-table.sql`
   - Fields: `email`, `name`, `resend_contact_id`, `welcome_email_sent`
   - Count: Unknown

**Resend Audience:**
- Stored in Resend's audience system
- Synced via `addOrUpdateResendContact()` function
- **CRITICAL:** No bulk import script found for existing 2600 subscribers

### 2.2 Subscription Routes

#### `/api/freebie/subscribe` (✅ WORKING)
- **File:** `app/api/freebie/subscribe/route.ts`
- **Flow:**
  1. Validates email/name
  2. Checks if subscriber exists in `freebie_subscribers`
  3. Creates new subscriber in Neon
  4. Calls `addOrUpdateResendContact()` to sync to Resend
  5. Sends welcome email via Resend
  6. Updates `guide_access_email_sent` flag

**Issues:**
- ✅ Properly syncs to Resend on signup
- ⚠️ Only syncs NEW subscribers, not existing ones

#### `/api/blueprint/subscribe` (✅ WORKING)
- **File:** `app/api/blueprint/subscribe/route.ts`
- **Flow:** Similar to freebie route
- **Issues:** Same - only syncs new subscribers

### 2.3 Subscriber Count Endpoint

**Route:** `/api/admin/email/subscriber-count`
- **File:** `app/api/admin/email/subscriber-count/route.ts`
- **Logic:**
  1. If `RESEND_AUDIENCE_ID` exists → fetches count from Resend API
  2. Else → counts `freebie_subscribers` table
- **Issue:** Only counts `freebie_subscribers`, ignores `blueprint_subscribers`

### 2.4 Missing: Bulk Import Script

**CRITICAL GAP:** No script to import existing 2600 subscribers from Neon → Resend

**What's Needed:**
- Script to query all subscribers from both tables
- Batch import to Resend audience
- Update `resend_contact_id` in database

---

## 3. AUTOMATION / SEQUENCE PIPELINE

### 3.1 Marketing Email Queue System

**Table:** `marketing_email_queue`
- **Schema:** `scripts/create-marketing-email-queue.sql`
- **Fields:** `id`, `user_id`, `email`, `subject`, `html`, `scheduled_for`, `status`, `sent_at`, `error_message`
- **Status Values:** `pending`, `sent`, `failed`

**Queue Processing Function:**
- **File:** `agents/marketing/marketingAutomationAgent.ts:320`
- **Function:** `checkEmailQueue()`
- **Logic:**
  1. Queries `marketing_email_queue` for `status = 'pending'` AND `scheduled_for <= NOW()`
  2. Processes up to 50 emails per run
  3. Sends via `sendEmail()` from `lib/email/resend.ts`
  4. Updates status to `sent` or `failed`
  5. Rate limits: 200ms between sends

**❌ CRITICAL ISSUE:** This function is **NEVER CALLED** by any cron job or scheduled task.

### 3.2 Email Scheduling

**Function:** `scheduleEmail()` in `agents/marketing/marketingAutomationAgent.ts:171`
- Inserts emails into `marketing_email_queue` with `status = 'pending'`
- **Problem:** Emails are queued but never processed automatically

**Used By:**
- `MarketingAutomationAgent.startBlueprintFollowUpWorkflow()`
- `agents/workflows/postBlueprintNurture.tsx`
- Manual workflow triggers

### 3.3 MarketingAutomationAgent

**File:** `agents/marketing/marketingAutomationAgent.ts`
- **Exports:** `checkEmailQueue()`, `scheduleEmail()`, `sendEmailNow()`
- **Issue:** `checkEmailQueue()` is exported but never invoked automatically

### 3.4 Workflow Integration

**Blueprint Follow-Up Workflow:**
- **File:** `agents/workflows/blueprintFollowUpWorkflow.tsx`
- **Status:** ⚠️ Workflow exists but uses direct Resend calls, not queue
- **Issue:** Bypasses queue system entirely

**Newsletter Workflow:**
- **File:** `agents/workflows/newsletterWorkflow.ts`
- **Status:** Uses `marketing_email_queue` but relies on manual processing

### 3.5 Admin Email Routes

**Queue Management:**
- **GET `/api/admin/automation/email/queue`** - Lists queue items
- **POST `/api/admin/automation/email/send`** - Manually sends queued email
- **POST `/api/admin/automation/email/approve`** - Approves email for sending

**Campaign Routes:**
- **POST `/api/admin/email/send-launch-campaign`** - Creates Resend broadcast (requires manual send)
- **POST `/api/admin/email/send-followup-campaign`** - Sends follow-up emails directly
- **POST `/api/admin/email/send-beta-testimonial`** - Creates broadcast for beta segment

### 3.6 Missing Cron Jobs

**Existing Cron Routes:**
- `/api/cron/offer-pathways` - Processes offer pathways
- `/api/cron/run-ab-evaluations` - A/B test evaluations
- `/api/cron/behavior-loop` - Behavior tracking
- `/api/automations/cron/nightly-apa` - Nightly APA sweep

**❌ MISSING:**
- No cron route to call `checkEmailQueue()`
- No scheduled processing of `marketing_email_queue`

**Required:** Create `/api/cron/process-email-queue` route

---

## 4. DELIVERABILITY BLOCKERS

### 4.1 Sender Domain Verification

**From Addresses Used:**
1. `"SSelfie <hello@sselfie.ai>"` - Most common
2. `"SSELFIE <hello@sselfie.ai>"` - Variant
3. `"Sandra @ SSELFIE <hello@sselfie.ai>"` - Campaign variant
4. `"Sandra from SSELFIE <hello@sselfie.ai>"` - Launch campaign
5. `"Sandra @ SSELFIE <noreply@sselfie.app>"` - emailTools.ts (⚠️ DIFFERENT DOMAIN)

**Issues:**
- ⚠️ Multiple "from" name variations (not critical)
- ❌ **CRITICAL:** `noreply@sselfie.app` used in `agents/tools/emailTools.ts:25` (different domain!)
- ⚠️ Domain verification status unknown

**Error Handling:**
- `app/api/freebie/subscribe/route.ts:215` checks for "domain is not verified" error
- Suggests verifying at `https://resend.com/domains`

### 4.2 DNS / DKIM Configuration

**Status:** Unknown - needs manual verification in Resend dashboard

**Action Required:**
1. Check Resend dashboard → Domains
2. Verify `sselfie.ai` domain is verified
3. Verify `sselfie.app` domain is verified (if using)
4. Check DKIM records are properly configured

### 4.3 Suppressed Emails

**No code found to:**
- Check suppressed/bounced emails
- Handle unsubscribe webhooks
- Remove suppressed contacts from sends

**Resend API Support:**
- `resend.contacts.list()` can filter by `unsubscribed` status
- `lib/resend/get-audience-contacts.ts:28` filters out unsubscribed contacts

### 4.4 Invalid "From" Email

**Issue Found:**
- `agents/tools/emailTools.ts:25` uses `noreply@sselfie.app`
- All other routes use `hello@sselfie.ai`
- **Risk:** If `sselfie.app` domain not verified, emails will fail

### 4.5 Resend Rate Limits

**Current Rate Limiting:**
- `checkEmailQueue()`: 200ms between sends (5 emails/second)
- `sendBulkEmails()`: 100ms between sends (10 emails/second)
- **Issue:** No handling of Resend API rate limit errors (429)

**Resend Limits:**
- Free tier: 100 emails/day
- Paid tiers: Varies by plan
- **Action:** Check your Resend plan limits

---

## 5. COMPREHENSIVE ISSUE LIST

### 5.1 Critical Issues (Must Fix)

1. **❌ No Email Queue Processor Cron Job**
   - **File:** Missing `/api/cron/process-email-queue/route.ts`
   - **Impact:** Emails in `marketing_email_queue` are never sent
   - **Fix:** Create cron route that calls `checkEmailQueue()`

2. **❌ No Bulk Import of Existing Subscribers**
   - **Impact:** 2600 subscribers may not be in Resend audience
   - **Fix:** Create script to import from Neon → Resend

3. **❌ Resend Clients Initialized at Module Scope**
   - **Files:** `lib/email/resend.ts`, `lib/email/send-email.ts`, `lib/resend/manage-contact.ts`, `agents/tools/emailTools.ts`
   - **Impact:** Can fail silently if env vars missing at build time
   - **Fix:** Convert to lazy initialization

4. **❌ Inconsistent Sender Domain**
   - **File:** `agents/tools/emailTools.ts:25`
   - **Issue:** Uses `noreply@sselfie.app` instead of `hello@sselfie.ai`
   - **Impact:** Emails may fail if domain not verified
   - **Fix:** Standardize to `hello@sselfie.ai`

### 5.2 High Priority Issues

5. **⚠️ Subscriber Count Only Counts One Table**
   - **File:** `app/api/admin/email/subscriber-count/route.ts:22`
   - **Issue:** Only counts `freebie_subscribers`, ignores `blueprint_subscribers`
   - **Fix:** Count both tables or use Resend API

6. **⚠️ No Error Handling for Resend Rate Limits**
   - **Files:** All email sending functions
   - **Issue:** No retry logic for 429 rate limit errors
   - **Fix:** Add exponential backoff for rate limits

7. **⚠️ Domain Verification Status Unknown**
   - **Action:** Verify `sselfie.ai` and `sselfie.app` in Resend dashboard
   - **Fix:** Add diagnostic endpoint to check domain status

### 5.3 Medium Priority Issues

8. **⚠️ Non-Null Assertions on Env Vars**
   - **Files:** Multiple route files
   - **Issue:** Uses `process.env.RESEND_API_KEY!` without validation
   - **Fix:** Add proper validation before use

9. **⚠️ Blueprint Follow-Up Workflow Bypasses Queue**
   - **File:** `agents/workflows/blueprintFollowUpWorkflow.tsx`
   - **Issue:** Sends emails directly, not via queue
   - **Fix:** Use `scheduleEmail()` instead

10. **⚠️ No Unsubscribe Webhook Handler**
    - **Issue:** No route to handle Resend unsubscribe webhooks
    - **Fix:** Create `/api/webhooks/resend/unsubscribe` route

---

## 6. RECOMMENDED FIXES

### Fix 1: Create Email Queue Processor Cron Job

**File:** `app/api/cron/process-email-queue/route.ts` (NEW)

```typescript
import { NextResponse } from "next/server"
import { checkEmailQueue } from "@/agents/marketing/marketingAutomationAgent"

export async function GET(request: Request) {
  try {
    // Verify cron secret if needed
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await checkEmailQueue()
    
    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
    })
  } catch (error) {
    console.error("[Cron] Email queue processing error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
```

**Vercel Cron Configuration:**
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/process-email-queue",
    "schedule": "*/5 * * * *"
  }]
}
```

### Fix 2: Bulk Import Existing Subscribers

**File:** `scripts/import-subscribers-to-resend.ts` (NEW)

```typescript
import { neon } from "@neondatabase/serverless"
import { addOrUpdateResendContact } from "@/lib/resend/manage-contact"

const sql = neon(process.env.DATABASE_URL!)

async function importSubscribers() {
  // Get all freebie subscribers
  const freebieSubs = await sql`
    SELECT email, name, resend_contact_id
    FROM freebie_subscribers
    WHERE resend_contact_id IS NULL
  `
  
  // Get all blueprint subscribers
  const blueprintSubs = await sql`
    SELECT email, name, resend_contact_id
    FROM blueprint_subscribers
    WHERE resend_contact_id IS NULL
  `
  
  const allSubs = [...freebieSubs, ...blueprintSubs]
  console.log(`Found ${allSubs.length} subscribers to import`)
  
  let success = 0
  let failed = 0
  
  for (const sub of allSubs) {
    try {
      const firstName = sub.name?.split(" ")[0] || sub.name || null
      const result = await addOrUpdateResendContact(email, firstName, {
        source: "legacy-import",
        status: "lead",
      })
      
      if (result.success && result.contactId) {
        // Update database with resend_contact_id
        // ... update logic
        success++
      } else {
        failed++
      }
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (error) {
      console.error(`Failed to import ${sub.email}:`, error)
      failed++
    }
  }
  
  console.log(`Import complete: ${success} success, ${failed} failed`)
}
```

### Fix 3: Lazy Resend Client Initialization

**File:** `lib/email/resend.ts` (MODIFY)

```typescript
import { Resend } from "resend"

let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured")
    }
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

export async function sendEmail(params: SendEmailParams) {
  const resend = getResendClient()
  // ... rest of function
}
```

### Fix 4: Fix Inconsistent Sender Domain

**File:** `agents/tools/emailTools.ts:25` (MODIFY)

```typescript
// Change from:
from: "Sandra @ SSELFIE <noreply@sselfie.app>",

// To:
from: "Sandra @ SSELFIE <hello@sselfie.ai>",
```

### Fix 5: Add Domain Verification Check

**File:** `app/api/diagnostics/email-config/route.ts` (NEW)

```typescript
import { Resend } from "resend"
import { NextResponse } from "next/server"

export async function GET() {
  const checks = {
    resendApiKey: !!process.env.RESEND_API_KEY,
    resendAudienceId: !!process.env.RESEND_AUDIENCE_ID,
    domainVerified: false,
  }
  
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    // Check domain verification via Resend API
    // ... implementation
  }
  
  return NextResponse.json(checks)
}
```

---

## 7. VERIFICATION CHECKLIST

### Immediate Actions Required:

- [ ] **Verify Resend Domain:** Go to https://resend.com/domains and verify `sselfie.ai` is verified
- [ ] **Check Resend Audience Count:** Verify 2600 subscribers are in your Resend audience
- [ ] **Check Email Queue:** Query `marketing_email_queue` table for pending emails
- [ ] **Verify Env Vars:** Confirm `RESEND_API_KEY` and `RESEND_AUDIENCE_ID` are set in Vercel
- [ ] **Test Email Send:** Use `/api/test/resend` to verify emails can be sent

### Database Queries to Run:

```sql
-- Count subscribers in Neon
SELECT 
  (SELECT COUNT(*) FROM freebie_subscribers) as freebie_count,
  (SELECT COUNT(*) FROM blueprint_subscribers) as blueprint_count,
  (SELECT COUNT(*) FROM freebie_subscribers WHERE resend_contact_id IS NULL) as freebie_not_synced,
  (SELECT COUNT(*) FROM blueprint_subscribers WHERE resend_contact_id IS NULL) as blueprint_not_synced;

-- Check email queue status
SELECT 
  status,
  COUNT(*) as count,
  MIN(scheduled_for) as oldest_pending,
  MAX(scheduled_for) as newest_pending
FROM marketing_email_queue
GROUP BY status;

-- Find pending emails
SELECT 
  id,
  email,
  subject,
  scheduled_for,
  created_at,
  error_message
FROM marketing_email_queue
WHERE status = 'pending'
ORDER BY scheduled_for ASC
LIMIT 50;
```

---

## 8. SUMMARY

### Why Emails Aren't Being Sent:

1. **Primary Blocker:** No cron job processes `marketing_email_queue` - emails are queued but never sent
2. **Secondary Blocker:** 2600 existing subscribers may not be in Resend audience (no bulk import)
3. **Tertiary Blocker:** Domain verification status unknown - emails may be rejected

### Recovery Plan:

1. **Immediate (Today):**
   - Verify Resend domain is verified
   - Check if 2600 subscribers are in Resend audience
   - Query `marketing_email_queue` for pending emails

2. **Short-term (This Week):**
   - Create `/api/cron/process-email-queue` route
   - Add Vercel cron configuration
   - Create bulk import script for existing subscribers
   - Fix lazy Resend client initialization

3. **Medium-term (Next Week):**
   - Fix inconsistent sender domains
   - Add rate limit error handling
   - Create unsubscribe webhook handler
   - Add domain verification diagnostic endpoint

### Expected Outcome:

After fixes:
- ✅ Email queue processes automatically every 5 minutes
- ✅ All 2600 subscribers synced to Resend
- ✅ Emails sent reliably via Resend API
- ✅ Proper error handling and logging

---

**Report Generated:** Complete audit of email infrastructure  
**Next Steps:** Review this report and prioritize fixes based on business impact


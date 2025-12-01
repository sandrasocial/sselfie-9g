# PHASE D — TESTING GUIDE

**Date:** 2025-01-27  
**Purpose:** Complete testing checklist for Phase D activation

---

## PRE-TESTING SETUP

### 1. Run Database Migrations

```bash
# Option 1: Run migration script
npx tsx scripts/run-migrations.ts

# Option 2: Run SQL files directly in Neon console
# - scripts/create-daily-drops-table.sql
# - scripts/create-hooks-library-table.sql
```

### 2. Seed Hooks Library

```bash
npx tsx scripts/seed-hooks-library.ts
```

### 3. Verify Environment Variables

```bash
# Required:
DATABASE_URL=...
RESEND_API_KEY=...
ADMIN_EMAIL=ssa@ssasocial.com

# Optional (for cron auth):
CRON_SECRET=...
```

---

## TEST 1: VERIFY ALL PIPELINES RUN FROM ADMIN DASHBOARD

### Test Location
- **URL:** `/admin/ai/agents/pipelines`
- **Method:** Use pipeline builder or API directly

### Test Each Pipeline

#### 1. Winback Pipeline
```json
POST /api/admin/pipelines/run
{
  "steps": [
    {
      "agent": "WinbackAgent",
      "input": {
        "action": "generateMessage",
        "params": {
          "userId": "test-user-id",
          "daysSinceLastActivity": 7,
          "lastActivity": "image upload"
        }
      }
    }
  ]
}
```

**Verify:**
- ✅ `result.ok === true`
- ✅ `result.steps.length === 1`
- ✅ `result.steps[0].data.subject` exists
- ✅ `result.steps[0].data.body` exists
- ✅ Metrics incremented
- ✅ Trace entries created

#### 2. Upgrade Pipeline
```json
POST /api/admin/pipelines/run
{
  "steps": [
    {
      "agent": "UpgradeAgent",
      "input": {
        "action": "detectOpportunity",
        "params": {
          "userId": "test-user-id"
        }
      }
    }
  ]
}
```

**Verify:**
- ✅ `result.ok === true`
- ✅ `result.steps[0].data.shouldUpgrade` exists

#### 3. Churn Prevention Pipeline
```json
POST /api/admin/pipelines/run
{
  "steps": [
    {
      "agent": "ChurnPreventionAgent",
      "input": {
        "action": "generateMessage",
        "params": {
          "userId": "test-user-id",
          "eventType": "renewal_upcoming"
        }
      }
    }
  ]
}
```

**Verify:**
- ✅ `result.ok === true`
- ✅ `result.steps[0].data.subject` exists

#### 4. Lead Magnet Delivery Pipeline
```json
POST /api/admin/pipelines/run
{
  "steps": [
    {
      "agent": "LeadMagnetAgent",
      "input": {
        "action": "deliver",
        "params": {
          "userId": "test-user-id",
          "magnetType": "blueprint",
          "userEmail": "test@example.com"
        }
      }
    }
  ]
}
```

**Verify:**
- ✅ `result.ok === true`
- ✅ `result.steps[0].data.success === true`

#### 5. Blueprint Follow-Up Pipeline
```json
POST /api/admin/pipelines/run
{
  "steps": [
    {
      "agent": "EmailSequenceAgent",
      "input": {
        "action": "getNextStep",
        "params": {
          "userId": null,
          "email": "test@example.com"
        }
      }
    }
  ]
}
```

**Verify:**
- ✅ `result.ok === true`
- ✅ `result.steps[0].data` is number or null

#### 6. Content Week Pipeline
```json
POST /api/admin/pipelines/run
{
  "steps": [
    {
      "agent": "DailyContentAgent",
      "input": {
        "type": "reel",
        "topic": "personal branding"
      }
    }
  ]
}
```

**Verify:**
- ✅ `result.ok === true`
- ✅ `result.steps[0].data.title` exists
- ✅ `result.steps[0].data.script` exists

#### 7. Feed Optimizer Pipeline
```json
POST /api/admin/pipelines/run
{
  "steps": [
    {
      "agent": "FeedPerformanceAgent",
      "input": {
        "feedData": {}
      }
    }
  ]
}
```

**Verify:**
- ✅ `result.ok === true`
- ✅ `result.steps[0].data` exists

#### 8. Daily Visibility Pipeline (NEW)
```json
POST /api/admin/pipelines/run
{
  "steps": [
    {
      "agent": "DailyContentAgent",
      "input": {
        "type": "reel",
        "topic": "personal branding and visibility"
      }
    },
    {
      "agent": "DailyContentAgent",
      "input": {
        "type": "caption",
        "topic": "personal branding",
        "contentType": "reel"
      }
    },
    {
      "agent": "DailyContentAgent",
      "input": {
        "type": "story"
      }
    },
    {
      "agent": "FeedDesignerAgent",
      "input": {
        "action": "generateLayoutIdeas",
        "params": {
          "count": 5,
          "style": "editorial_luxury"
        }
      }
    }
  ]
}
```

**Verify:**
- ✅ `result.ok === true`
- ✅ `result.steps.length === 4`
- ✅ `result.steps[0].data` (reel) exists
- ✅ `result.steps[1].data` (caption) exists
- ✅ `result.steps[2].data` (stories) exists
- ✅ `result.steps[3].data` (layout ideas) exists
- ✅ Content saved to `daily_drops` table (check manually)

#### 9. Revenue Recovery Pipeline (NEW)
```json
POST /api/admin/pipelines/run
{
  "steps": [
    {
      "agent": "WinbackAgent",
      "input": {
        "action": "generateMessage",
        "params": {
          "userId": "test-user-id",
          "daysSinceLastActivity": 7,
          "lastActivity": "upload"
        }
      }
    },
    {
      "agent": "EmailQueueManager",
      "input": {
        "action": "schedule",
        "params": {
          "userId": "test-user-id",
          "email": "test@example.com",
          "subject": "We miss you!",
          "html": "<p>Test email</p>",
          "scheduledFor": "2025-01-28T10:00:00Z"
        }
      }
    }
  ]
}
```

**Verify:**
- ✅ `result.ok === true`
- ✅ `result.steps.length === 2`
- ✅ Email scheduled in queue

---

## TEST 2: CONNECT DAILY VISIBILITY ENGINE TO VERCEL CRON

### Manual Trigger Test

```bash
# Test as admin (requires auth cookie)
curl -X GET http://localhost:3000/api/cron/daily-visibility \
  -H "Cookie: your-auth-cookie"

# Test as cron (requires CRON_SECRET)
curl -X GET http://localhost:3000/api/cron/daily-visibility \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Verify

1. **Pipeline Runs:**
   - ✅ Check console logs for "[DailyVisibility] Starting"
   - ✅ Check response: `{ success: true, ... }`

2. **Content Generated:**
   - ✅ `reel` object exists
   - ✅ `caption` object exists
   - ✅ `stories` object exists
   - ✅ `layoutIdeas` object exists

3. **Saved to Database:**
   ```sql
   SELECT * FROM daily_drops 
   WHERE date = CURRENT_DATE 
   ORDER BY created_at DESC LIMIT 1;
   ```
   - ✅ Row exists
   - ✅ `reel_content` is JSONB
   - ✅ `caption_content` is JSONB
   - ✅ `stories_content` is JSONB
   - ✅ `layout_ideas` is JSONB

4. **Admin Dashboard Shows Content:**
   - ✅ Visit `/admin/ai/daily-drops`
   - ✅ Today's content displays
   - ✅ All 4 cards show data

5. **Admin Email Sent:**
   - ✅ Check admin email inbox
   - ✅ Email subject: "Daily Drops Ready - [date]"
   - ✅ Email contains content preview

### Vercel Cron Configuration

**File:** `vercel.json`

**Verify:**
- ✅ Cron entry exists:
  ```json
  {
    "path": "/api/cron/daily-visibility",
    "schedule": "0 9 * * *"
  }
  ```

**Note:** Vercel cron will activate on next deployment.

---

## TEST 3: DAILY DROPS UI

### Test Location
- **URL:** `/admin/ai/daily-drops`

### Test Steps

1. **Page Load:**
   - ✅ Page loads without errors
   - ✅ Header displays "Daily Drops"
   - ✅ "Run Again" button visible

2. **Display Today's Content:**
   - ✅ If drop exists: 4 cards display (Reel, Caption, Stories, Layout)
   - ✅ If no drop: Empty state with "Generate Today's Content" button

3. **Run Again Button:**
   - ✅ Click button
   - ✅ Loading state shows
   - ✅ Pipeline runs
   - ✅ Content refreshes
   - ✅ New content displays

4. **Send to Instagram Planner:**
   - ✅ Button exists on each card
   - ✅ Click shows "Coming soon" alert (stub)

5. **Responsive Design:**
   - ✅ Mobile layout works
   - ✅ Tablet layout works
   - ✅ Desktop layout works

---

## TEST 4: HOOKS LIBRARY UI

### Test Location
- **URL:** `/admin/ai/hooks`

### Test Steps

1. **Page Load:**
   - ✅ Page loads without errors
   - ✅ Header displays "Hooks Library"
   - ✅ Search bar visible
   - ✅ "Generate 10 More Hooks" button visible

2. **Display Hooks:**
   - ✅ If hooks exist: Grid displays hooks
   - ✅ Each hook card shows: text, category, framework
   - ✅ If no hooks: Empty state with "Generate 50 Hooks" button

3. **Search Functionality:**
   - ✅ Type in search bar
   - ✅ Hooks filter in real-time
   - ✅ Search by text works
   - ✅ Search by category works
   - ✅ Search by framework works
   - ✅ Clear search shows all hooks

4. **Generate More Hooks:**
   - ✅ Click "Generate 10 More Hooks"
   - ✅ Loading state shows
   - ✅ Pipeline/agent runs
   - ✅ New hooks appear (if generation succeeds)

5. **Responsive Design:**
   - ✅ Mobile: 1 column
   - ✅ Tablet: 2 columns
   - ✅ Desktop: 3 columns

---

## TEST 5: QA SWEEP #2

### Re-test All User Flows from Phase D1

#### Authentication Flows
- [ ] Signup → Email confirmation → Login
- [ ] Magic link → Login
- [ ] Password login → Studio redirect
- [ ] Logout → Home redirect

#### Profile & Settings
- [ ] Update profile → Save → Verify update
- [ ] Upload image → Verify upload
- [ ] View profile → Verify data

#### AI Photo Generation
- [ ] Generate image → Check credits deducted
- [ ] View in gallery → Verify display
- [ ] Delete image → Verify removal

#### Credits System
- [ ] Check balance → Verify correct
- [ ] Generate image → Verify deduction
- [ ] Purchase credits → Verify addition
- [ ] View transaction history

#### Feed Planner
- [ ] Create strategy → Verify creation
- [ ] Generate feed → Verify generation
- [ ] View feed → Verify display

#### Maya Chat
- [ ] Start chat → Verify creation
- [ ] Send message → Verify response
- [ ] Generate image via Maya → Verify generation

#### Academy
- [ ] View courses → Verify list
- [ ] Open course → Verify content
- [ ] Download template → Verify download

#### Checkout & Payments
- [ ] Start checkout → Verify session
- [ ] Complete payment → Verify webhook
- [ ] Credits added → Verify balance
- [ ] PRO status → Verify upgrade
- [ ] Redirect to studio → Verify redirect

### Tech Stability Checks

#### API Errors
- [ ] No 500 errors in console
- [ ] All API calls return proper status codes
- [ ] Error messages are user-friendly

#### Silent Failures
- [ ] Credit deductions log properly
- [ ] Email sends log properly
- [ ] Database writes succeed

#### Performance
- [ ] Image generation completes in reasonable time
- [ ] Page loads are fast
- [ ] No slow queries

#### Database
- [ ] No connection errors
- [ ] Retry logic works (simulate failure)
- [ ] Health check works

#### Error Boundaries
- [ ] Trigger React error → Verify boundary catches
- [ ] Fallback UI displays
- [ ] "Try Again" button works

---

## TEST 6: INTEGRATION TESTS

### Blueprint Follow-Up Trigger

**Test:**
1. Download blueprint PDF
2. Verify pipeline triggers
3. Check email queue for scheduled emails
4. Verify user tagged as "warm lead"

**Integration Point:**
- Add to `/api/blueprint/email-concepts/route.ts`:
  ```typescript
  // After email sent successfully
  await fetch("/api/automations/blueprint-followup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscriberId: subscriber.id,
      email: email,
      name: name,
    }),
  })
  ```

### Revenue Recovery Triggers

**Winback:**
- Detect user with images but no purchase (7-14 days)
- Call: `POST /api/automations/revenue-recovery`
- Body: `{ type: "winback", userId, email, context: { daysSinceLastActivity: 7 } }`

**Upgrade:**
- Detect pricing page visit without conversion
- Call: `POST /api/automations/revenue-recovery`
- Body: `{ type: "upgrade", userId, email }`

**Abandoned Checkout:**
- In Stripe webhook, detect `checkout.session.created` but no `checkout.session.completed`
- Call: `POST /api/automations/revenue-recovery`
- Body: `{ type: "abandoned_checkout", userId, email, context: { checkoutSessionId, productType } }`

---

## SUCCESS CRITERIA CHECKLIST

### ✅ All Pipelines Run
- [ ] Winback Pipeline: `ok: true`
- [ ] Upgrade Pipeline: `ok: true`
- [ ] Churn Prevention Pipeline: `ok: true`
- [ ] Lead Magnet Pipeline: `ok: true`
- [ ] Blueprint Follow-Up Pipeline: `ok: true`
- [ ] Content Week Pipeline: `ok: true`
- [ ] Feed Optimizer Pipeline: `ok: true`
- [ ] Daily Visibility Pipeline: `ok: true`
- [ ] Revenue Recovery Pipeline: `ok: true`

### ✅ Daily Content Generated
- [ ] Pipeline runs successfully
- [ ] Content objects generated
- [ ] Saved to `daily_drops` table
- [ ] Admin dashboard shows content
- [ ] Admin email notification sent

### ✅ Hooks UI Works
- [ ] Page loads
- [ ] Hooks display
- [ ] Search works
- [ ] Generate button works

### ✅ Daily Drops UI Works
- [ ] Page loads
- [ ] Content displays
- [ ] Run Again button works
- [ ] Send to Instagram Planner button shows

### ✅ No User Features Broke
- [ ] All Phase D1 user flows still work
- [ ] No regressions
- [ ] No broken routes

### ✅ Credits System Untouched
- [ ] Credit deduction works
- [ ] Credit addition works
- [ ] Balance updates correctly

### ✅ Maya Untouched
- [ ] Maya chat works
- [ ] Maya image generation works
- [ ] No admin access to Maya

### ✅ No Runtime Exceptions
- [ ] No unhandled promise rejections
- [ ] No console errors
- [ ] All errors caught by boundaries

### ✅ Email Queue Stable
- [ ] Emails schedule correctly
- [ ] Queue processes correctly
- [ ] No email failures

### ✅ DB Retry Logic Works
- [ ] Simulate connection failure
- [ ] Verify retry activates
- [ ] Verify exponential backoff

---

## TROUBLESHOOTING

### Pipeline Fails

**Check:**
1. Agent exists in registry
2. Agent input format correct
3. Database connection working
4. Console logs for errors

**Fix:**
- Verify agent name matches registry
- Check input structure matches agent expectations
- Verify database migrations run
- Check environment variables

### Daily Visibility Not Saving

**Check:**
1. `daily_drops` table exists
2. Database connection working
3. JSON serialization working

**Fix:**
- Run migration: `scripts/create-daily-drops-table.sql`
- Check DATABASE_URL
- Verify JSON.stringify works

### Hooks Not Displaying

**Check:**
1. `hooks_library` table exists
2. Hooks seeded
3. API endpoint works

**Fix:**
- Run migration: `scripts/create-hooks-library-table.sql`
- Run seed: `npx tsx scripts/seed-hooks-library.ts`
- Check API response

### Cron Not Running

**Check:**
1. Vercel cron configured
2. CRON_SECRET set (if using)
3. Endpoint accessible

**Fix:**
- Verify `vercel.json` has cron entry
- Set CRON_SECRET in environment
- Test endpoint manually first

---

## FINAL CHECKLIST

Before marking Phase D complete:

- [ ] All 9 pipelines tested and working
- [ ] Daily visibility cron tested
- [ ] Daily Drops UI tested
- [ ] Hooks Library UI tested
- [ ] Database migrations run
- [ ] Hooks library seeded
- [ ] QA Sweep #2 completed
- [ ] No regressions found
- [ ] All success criteria met

---

**Testing Status:** Ready to Begin  
**Estimated Time:** 2-3 hours  
**Next Step:** Run migrations, then begin testing


# Loops Integration - Final Testing Checklist

## 🎯 Goal: Verify 100% Loops Migration

---

## ✅ Pre-Testing Verification

### Environment Setup
- [ ] `LOOPS_API_KEY` set in `.env.local` ✅
- [ ] Loops package installed: `pnpm list loops` ✅
- [ ] API connection working: `npx tsx scripts/test-loops-connection.ts` ✅
- [ ] Database columns exist: `loops_contact_id`, `synced_to_loops`, `loops_synced_at` ✅

### Code Status
- [ ] All email capture routes have Loops sync ✅
- [ ] All cron jobs migrated to Loops tags ✅
- [ ] Stripe webhook has Loops sync ✅
- [ ] Alex Loops tools implemented ✅
- [ ] Backfill script completed ✅

---

## 📧 Test 1: Email Capture Dual-Sync

### Test Freebie Subscribe
1. [ ] Submit freebie form with test email: `test-loops-{timestamp}@example.com`
2. [ ] **Resend Dashboard:** Check contact appears in audience ✅
3. [ ] **Loops Dashboard:** Check contact appears with tag `freebie-guide` ✅
4. [ ] **Database:** Run query:
   ```sql
   SELECT loops_contact_id, synced_to_loops, loops_synced_at 
   FROM freebie_subscribers 
   WHERE email = 'test-email@example.com';
   ```
   - [ ] `loops_contact_id` is populated ✅
   - [ ] `synced_to_loops = true` ✅
   - [ ] `loops_synced_at` has timestamp ✅

### Test Blueprint Subscribe
1. [ ] Submit blueprint form with test email
2. [ ] **Resend Dashboard:** Contact appears ✅
3. [ ] **Loops Dashboard:** Contact appears with tag `brand-blueprint` ✅
4. [ ] **Database:** All Loops columns populated ✅

### Test Prompt Guide Subscribe
1. [ ] Submit prompt guide form with test email
2. [ ] **Resend Dashboard:** Contact appears ✅
3. [ ] **Loops Dashboard:** Contact appears with tag `prompt-guide` ✅
4. [ ] **Database:** All Loops columns populated ✅

### Test Error Handling
1. [ ] Temporarily set invalid `LOOPS_API_KEY` in `.env.local`
2. [ ] Submit freebie form
3. [ ] **Verify:** Signup still succeeds (Resend sync works)
4. [ ] **Verify:** Error logged but doesn't break signup
5. [ ] Restore valid API key ✅

---

## 🤖 Test 2: Alex Loops Tools

### Test Campaign Creation
1. [ ] Ask Alex: "Create a test marketing email campaign in Loops to all subscribers. Subject: Testing Loops Integration"
2. [ ] **Verify:** Alex uses `compose_loops_email` tool ✅
3. [ ] **Verify:** Returns campaign ID or draft ID ✅
4. [ ] **Verify:** Provides Loops dashboard URL ✅
5. [ ] **Loops Dashboard:** Check if campaign exists (or draft instructions provided) ✅

### Test Sequence Creation
1. [ ] Ask Alex: "Create a 3-email welcome sequence triggered by new signups"
2. [ ] **Verify:** Alex uses `create_loops_sequence` tool ✅
3. [ ] **Verify:** Generates 3 emails with delays ✅
4. [ ] **Verify:** Provides setup instructions for Loops dashboard ✅

### Test Contact Management
1. [ ] Ask Alex: "Add test@example.com to Loops with tag 'beta-tester'"
2. [ ] **Verify:** Alex uses `add_to_loops_audience` tool ✅
3. [ ] **Loops Dashboard:** Check contact has tag `beta-tester` ✅

### Test Analytics
1. [ ] Ask Alex: "Get analytics for recent Loops campaigns"
2. [ ] **Verify:** Alex uses `get_loops_analytics` tool ✅
3. [ ] **Verify:** Returns campaign stats (or graceful error if no campaigns) ✅

---

## 🎯 Test 3: Platform Decision Logic

### Should Use Resend (Transactional)
1. [ ] Ask Alex: "Send password reset email to user@example.com"
   - [ ] **Verify:** Uses `compose_email` tool (Resend) ✅
   - [ ] **Verify:** Does NOT use `compose_loops_email` ✅

2. [ ] Ask Alex: "Send purchase receipt to customer@example.com"
   - [ ] **Verify:** Uses `compose_email` tool (Resend) ✅

3. [ ] Ask Alex: "Send login magic link to user@example.com"
   - [ ] **Verify:** Uses `compose_email` tool (Resend) ✅

### Should Use Loops (Marketing)
1. [ ] Ask Alex: "Create newsletter about Maya Pro Mode features"
   - [ ] **Verify:** Uses `compose_loops_email` tool ✅
   - [ ] **Verify:** Does NOT use `compose_email` ✅

2. [ ] Ask Alex: "Create welcome email for new Studio members"
   - [ ] **Verify:** Uses `compose_loops_email` tool ✅

3. [ ] Ask Alex: "Create promotional campaign for Black Friday"
   - [ ] **Verify:** Uses `compose_loops_email` tool ✅

---

## 💳 Test 4: Stripe Integration

### Test Purchase Flow
1. [ ] Make a test purchase (or simulate Stripe webhook)
2. [ ] **Resend Dashboard:** Check customer appears ✅
3. [ ] **Loops Dashboard:** Check customer appears with:
   - [ ] Tag `customer` ✅
   - [ ] Tag `paid` ✅
   - [ ] Tag `{product-tag}` (e.g., `studio-membership`) ✅
   - [ ] User group `paid` ✅
4. [ ] **Database:** Run query:
   ```sql
   SELECT loops_contact_id, synced_to_loops 
   FROM freebie_subscribers 
   WHERE email = 'customer-email@example.com';
   ```
   - [ ] `loops_contact_id` populated ✅
   - [ ] `synced_to_loops = true` ✅

---

## ⏰ Test 5: Cron Jobs → Loops Automations

### Test Blueprint Followups Cron
1. [ ] Manually trigger: `GET /api/cron/send-blueprint-followups` (or wait for scheduled run)
2. [ ] **Logs:** Check for "Tagged in Loops for Day X sequence" messages ✅
3. [ ] **Loops Dashboard → Contacts:** Verify tags added:
   - [ ] `blueprint-day-3` ✅
   - [ ] `blueprint-day-7` ✅
   - [ ] `blueprint-day-14` ✅
4. [ ] **Loops Dashboard → Automation Runs:** Verify emails were sent ✅
5. [ ] **Database:** Verify `day_X_email_sent = true` ✅

### Test Blueprint Sequence Cron
1. [ ] Manually trigger: `GET /api/cron/blueprint-email-sequence`
2. [ ] **Verify:** Tags added: `blueprint-upsell-day-3`, `-day-7`, `-day-10`, `-day-14` ✅
3. [ ] **Verify:** Loops automations triggered ✅

### Test Re-engagement Cron
1. [ ] Manually trigger: `GET /api/cron/reengagement-campaigns`
2. [ ] **Verify:** Tags added: `reengagement`, `reengagement-{campaign_id}` ✅
3. [ ] **Verify:** Loops automations triggered ✅

### Test Welcome Back Sequence Cron
1. [ ] Manually trigger: `GET /api/cron/welcome-back-sequence`
2. [ ] **Verify:** Tags added: `welcome-back-day-7`, `welcome-back-day-14` ✅
3. [ ] **Verify:** Loops automations triggered ✅

---

## 📊 Test 6: Database Tracking

### Verify Sync Status
1. [ ] Run query:
   ```sql
   SELECT 
     COUNT(*) as total,
     COUNT(*) FILTER (WHERE synced_to_loops = true) as synced,
     COUNT(*) FILTER (WHERE loops_contact_id IS NOT NULL) as has_id
   FROM freebie_subscribers;
   ```
   - [ ] All contacts synced ✅

2. [ ] Run query:
   ```sql
   SELECT 
     COUNT(*) as total,
     COUNT(*) FILTER (WHERE synced_to_loops = true) as synced,
     COUNT(*) FILTER (WHERE loops_contact_id IS NOT NULL) as has_id
   FROM blueprint_subscribers;
   ```
   - [ ] All contacts synced ✅

### Check for Unsynced Contacts
1. [ ] Run query:
   ```sql
   SELECT email, created_at 
   FROM freebie_subscribers 
   WHERE synced_to_loops = false OR synced_to_loops IS NULL
   LIMIT 10;
   ```
   - [ ] No unsynced contacts (or only invalid emails) ✅

---

## 🔍 Test 7: Loops Dashboard Verification

### Contacts Verification
1. [ ] Go to https://app.loops.so/contacts
2. [ ] **Verify:** Total contacts matches expected count ✅
3. [ ] **Verify:** Tags are present on contacts:
   - [ ] `freebie-guide` ✅
   - [ ] `brand-blueprint` ✅
   - [ ] `prompt-guide` ✅
   - [ ] `customer`, `paid` (for paying customers) ✅

### Automations Verification
1. [ ] Go to https://app.loops.so/loops
2. [ ] **Verify:** All required automations exist and are ACTIVE:
   - [ ] Blueprint Day 3 ✅
   - [ ] Blueprint Day 7 ✅
   - [ ] Blueprint Day 14 ✅
   - [ ] Blueprint Upsell Day 3 ✅
   - [ ] Blueprint Nurture Day 7 ✅
   - [ ] Blueprint Upsell Day 10 ✅
   - [ ] Blueprint Win Back Day 14 ✅
   - [ ] Welcome Back Day 7 ✅
   - [ ] Welcome Back Day 14 ✅
   - [ ] Re-engagement automations ✅

### Automation Runs Verification
1. [ ] Check automation run history
2. [ ] **Verify:** Emails sent when tags are added ✅
3. [ ] **Verify:** No errors in automation runs ✅

---

## ✅ Final Checklist

### Code Complete
- [x] All email capture routes dual-sync
- [x] All cron jobs migrated to Loops
- [x] Stripe webhook syncs to Loops
- [x] Alex Loops tools working
- [x] Backfill completed

### Loops Dashboard Setup
- [ ] All automations created
- [ ] All automations active
- [ ] Trigger tags match exactly
- [ ] Email content matches templates
- [ ] At least one automation tested end-to-end

### Testing Complete
- [ ] Email capture dual-sync tested
- [ ] Alex Loops tools tested
- [ ] Platform decision logic tested
- [ ] Stripe integration tested
- [ ] Cron jobs tested
- [ ] Database tracking verified
- [ ] Loops dashboard verified

---

## 🎉 Success Criteria

**Migration is 100% complete when:**
1. ✅ All code changes committed
2. ✅ All automations created in Loops dashboard
3. ✅ All tests pass
4. ✅ At least one end-to-end flow tested (signup → tag → automation → email)
5. ✅ No errors in production logs

---

**Test Date:** _____________  
**Tested By:** _____________  
**Status:** ⬜ In Progress  ⬜ Complete


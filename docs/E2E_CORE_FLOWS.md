# E2E Core Flows - Health Check Surface

**Purpose:** Define the 6 critical revenue-critical user flows that must never silently fail.

**Last Updated:** January 6, 2025

---

## Flow 1: Auth & Routing

**Path:** Login → Maya → Onboarding Modal (if new user)

**What it validates:**
- User can authenticate via Supabase
- Auth callback route processes correctly
- User mapping (Supabase → Neon) works
- Maya page loads for authenticated user
- Onboarding modal appears for new users (if applicable)

**Why it matters:**
- Blocks all user access if broken
- First touchpoint for new users
- Revenue-critical (users can't pay if they can't log in)

**Test approach:**
- Use synthetic test user
- Verify auth flow completes
- Check Maya page renders (200 status)
- Verify user exists in database

---

## Flow 2: Credits & Mode Toggle

**Path:** Read credits → Toggle Classic/Pro mode → Verify mode visibility

**What it validates:**
- Credits system is queryable
- Credit balance is numeric and readable
- Classic/Pro mode toggle is accessible
- Mode state persists correctly

**Why it matters:**
- Credits are revenue-critical
- Mode toggle affects user experience
- Billing depends on credit system

**Test approach:**
- Read credits for synthetic test user
- Verify balance is numeric (can be 0)
- Check mode toggle API responds
- Verify no errors in credit queries

---

## Flow 3: Classic Image Generation

**Path:** Concept → Replicate API → Blob Storage → Gallery

**What it validates:**
- Concept generation works
- Replicate API is reachable and configured
- Image generation completes
- Blob storage saves image
- Gallery receives generated image

**Why it matters:**
- Core revenue feature
- Users pay for image generation
- Silent failures = lost revenue

**Test approach:**
- Generate one test concept
- Trigger image generation (will consume 1 credit)
- Verify Replicate responds
- Verify image saves to blob
- Verify gallery entry created
- Mark all test artifacts clearly

---

## Flow 4: Pro Image Generation

**Path:** Reference Images → Replicate API → Blob Storage → Gallery

**What it validates:**
- Pro mode image generation works
- Reference image handling works
- Replicate API handles Pro mode requests
- Blob storage saves Pro images
- Gallery receives Pro images

**Why it matters:**
- Premium feature (higher value)
- Different code path than Classic
- Revenue-critical for Pro users

**Test approach:**
- Use synthetic reference images
- Trigger Pro mode generation (will consume credits)
- Verify Replicate responds
- Verify image saves correctly
- Mark all test artifacts clearly

---

## Flow 5: Feed Flow

**Path:** Strategy Creation → 9 Image Generation → Feed Save

**What it validates:**
- Feed strategy generation works
- Feed layout creation works
- Multiple image generation (9 posts)
- Feed save operation completes
- Feed data persists correctly

**Why it matters:**
- Complex multi-step flow
- High credit consumption (9 images)
- Revenue-critical feature
- Multiple failure points

**Test approach:**
- Generate minimal test strategy
- Generate 1-2 test images (not all 9 to save credits)
- Verify feed save completes
- Mark feed as test data
- Verify no errors in feed creation

---

## Flow 6: Cron Sanity

**Path:** Verify at least one cron job executes without error

**What it validates:**
- Cron infrastructure is working
- At least one scheduled job runs
- Cron jobs don't crash silently
- Background jobs are executing

**Why it matters:**
- Email campaigns depend on cron
- Segment refreshes depend on cron
- Silent cron failures = lost revenue

**Test approach:**
- Check cron job logs for recent execution
- Verify at least one job ran in last 24 hours
- Check for error patterns in cron logs
- Verify cron secret authentication works

---

## Test User Strategy

**Synthetic Test User:**
- Email: `e2e-test@sselfie-studio.internal`
- User ID: `e2e-test-user-00000000-0000-0000-0000-000000000000`
- Metadata flag: `is_e2e_test_user: true`
- Credits: Limited (enough for testing, not unlimited)

**Safety Rules:**
- Never triggers billing
- Never appears in analytics (filtered)
- All generated content marked as test
- Test data can be cleaned up periodically

---

## Health Check Status

**Status Levels:**
- `ok` - Flow completed successfully
- `degraded` - Flow completed with warnings or partial success
- `failed` - Flow failed completely
- `skipped` - Flow not tested (unsafe or unavailable)

**Overall Status:**
- `healthy` - All critical flows are `ok`
- `degraded` - Some flows are `degraded` but none are `failed`
- `unhealthy` - At least one critical flow is `failed`

---

## Notes

- These flows are tested daily via automated health checks
- Failures are logged but do not trigger user alerts
- Manual review required for all failures
- Test artifacts are marked and can be cleaned up


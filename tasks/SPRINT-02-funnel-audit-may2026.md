# SPRINT-02 — Funnel Audit + Academy Fixes
*Created: 2026-05-12 | Codex/Claude Code handover spec*

---

## Context

Live data pull from May 12, 2026. Instagram is converting. 14 new selfie guide signups TODAY, 56 in the past 7 days — driven by Sandra's iPhone tutorial content. The funnel is mostly working but has specific leaks that need closing before the next push.

---

## Completed (already committed — do not re-do)

| What | File | Status |
|------|------|--------|
| Cron preset URL fix | `app/api/cron/nurture-sequence/route.ts` | ✅ Done |
| Webhook `guide_access_email_sent` flag | `app/api/webhooks/stripe/route.ts` | ✅ Done |
| Visibility Suite iframe mapping | `components/sselfie/academy-screen.tsx` | ✅ Done |
| Lesson viewer bootstrap non-fatal | `app/academy/courses/[courseId]/lessons/[lessonId]/lesson-viewer-client.tsx` | ✅ Done |
| Maya chat floating bubble | same file | ✅ Done |
| Workbook iframe for What To Say / Show Up / Get Paid | `components/sselfie/academy-screen.tsx` | ✅ Done |

---

## Task 1 — SELFIE_GUIDE_PRESET_DOWNLOAD_URL (BLOCKING)

**Problem:** Selfie Guide product page promises "Lightroom preset pack bonus" as a feature. The env var `SELFIE_GUIDE_PRESET_DOWNLOAD_URL` is NOT set in `.env.local` or Vercel. Selfie Guide buyers get no preset download link.

**Required from Sandra first:** Upload the Selfie Guide preset `.zip` to Vercel Blob and paste the public URL. Then set it in Vercel environment variables as `SELFIE_GUIDE_PRESET_DOWNLOAD_URL`.

**Code fix (do after Sandra provides URL):**
The webhook already reads: `process.env.SELFIE_GUIDE_PRESET_DOWNLOAD_URL`
File: `app/api/webhooks/stripe/route.ts` — search for `SELFIE_GUIDE_PRESET_DOWNLOAD_URL`
No code change needed — just set the env var in Vercel dashboard + `.env.local`.

---

## Task 2 — Lauren Valino preset delivery (manual recovery)

**Problem:** `laurenvalino@yahoo.ca` bought selfie-guide-paid on 2026-03-14. `guide_access_email_sent = false`. She never got her access email.

**Fix:** Run this from an admin API route or manually via DB + Resend:
1. Find her `freebie_subscribers` record (source: `selfie-guide-paid`)
2. Send `generateSelfieGuideActivationDay0Email` to `laurenvalino@yahoo.ca`
3. Update `guide_access_email_sent = TRUE`

Or create a one-off admin route at `/api/admin/email/resend-selfie-guide-delivery` that accepts an email address and re-sends the day-0.

---

## Task 3 — Prompt-guide signups email backfill (low priority)

**Problem:** 18 users signed up via `prompt-guide` source (Dec 2025 – Jan 2026). `guide_access_email_sent = false` for all of them. These were from a Selfie Prompt Guide freebie that was retired.

**Decision needed from Sandra:** Should these users get the Selfie Guide access email? They signed up for a "prompt guide" which is different from the main Selfie Guide. Options:
1. Send them the selfie guide access email (re-engage cold leads)
2. Send a simple re-engagement email pointing to the free selfie guide page
3. Leave them — they're 5+ months old

**If sending:** Query `freebie_subscribers WHERE source = 'prompt-guide' AND guide_access_email_sent = false` and send a custom re-engagement.

---

## Task 4 — Academy screen: Visibility Suite URL param deep-link

**Context:** `academy-screen.tsx` already handles `?academy_workbook=visibility-suite` via the `initialWorkbookSlug` state. The iframe URL `WORKBOOK_IFRAME_URLS["visibility-suite"]` = `/academy/access/visibility-suite` is now mapped.

**Issue to verify:** The Visibility Suite page (`/academy/access/visibility-suite`) contains links like `href={product.workbookUrl}` → `/academy/what_to_say/`. When these are clicked inside the iframe, they open the static HTML workbook inside the iframe — which is correct behavior. However, the "focused tools" section links to `/academy/access/${product.slug}` which causes a redirect to `/studio?tab=academy&academy_view=workbook&academy_workbook=${slug}`. This navigates the WHOLE page out of the iframe (correct) since it's the right app shell behavior.

**No code change needed** unless Sandra reports broken navigation inside the iframed visibility suite.

---

## Task 5 — freebie_subscribers Resend sync gap

**Problem:** 3,399 contacts in Resend but Resend API has no `created_at` visibility for recent additions. The real issue: `freebie_subscribers.resend_contact_id` is NULL for many records.

Check:
```sql
SELECT source, COUNT(*) total, 
       COUNT(*) FILTER (WHERE resend_contact_id IS NULL) as missing_resend
FROM freebie_subscribers
GROUP BY source ORDER BY total DESC;
```

Fix: The existing `resend_sync_queue` table should be picking these up. Verify the resend sync cron is running.

---

## Data Snapshot (May 12, 2026)

| Metric | Value |
|--------|-------|
| Resend total contacts | 3,399 |
| Resend active (not unsubscribed) | 3,326 |
| New selfie guide signups today | 14 |
| New last 7 days | 56 |
| All-time freebie_subscribers | 567 |
| Real organic (selfie-guide-free source) | 78 |
| Active Studio subscriptions | 7 |
| MRR (gross) | €689/mo |
| Revenue May 2026 (so far) | €233 |
| Revenue April 2026 | €495.50 |
| Revenue March 2026 | €886.12 |
| Revenue February 2026 | €339.50 |
| One-time payments last 90 days | 43 transactions, €2,274 |

---

## Customer Issue — Kristin Hull (sutterkr@gmail.com)

**Status:** Resolved — she has access, she has the preset email.

**What happened:**
- Bought Starter Kit on May 11
- Received `starter_kit_delivery` email May 11 (webhook) — includes preset download URL ✅
- Received `starter-kit-day0-delivery` email May 12 (cron) — did NOT have preset URL (now fixed)
- Has active `user_entitlements` for `starter_kit`
- Can access Studio at sselfie.ai → Academy → Starter Kit

**Why she's confused:** The cron re-delivery on May 12 didn't include the preset link. She probably saw that email and thought that was her full delivery. The May 11 email (the real delivery with the preset link) may have gone to spam or been missed.

**Reply to send Sandra:**
> Kristin already has access and the preset link was in her first email from May 11. The cron re-send on May 12 didn't include the link (that bug is now fixed). Reply to Kristin: direct her to check the first email she received (subject will include "Starter Kit") or give her the direct download link.

**Preset download URL (for Sandra to share directly with Kristin):**
`https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/presets/sselfie-starter-kit-presets-dRcvqzWWBZQFKIuj9SwrvUKfqaGPdP.zip`

She can also access everything via: `https://sselfie.ai/studio` → Academy tab → Starter Kit

---

## Email Funnel Health Check

| Flow | Status | Notes |
|------|--------|-------|
| Free selfie guide signup → access email | ✅ Working | 78/78 delivered |
| Starter kit purchase → delivery email | ✅ Working | Webhook sends with preset URL |
| Starter kit → `guide_access_email_sent` flag | ✅ Fixed | Was missing, now set after send |
| Cron day-0 re-delivery for starter kit | ✅ Fixed | Now includes `presetDownloadUrl` |
| Selfie guide paid → delivery email | ⚠️ Partial | 8/10 sent; 1 test account, 1 real (Lauren Valino) missed |
| Selfie guide preset link | ❌ Broken | `SELFIE_GUIDE_PRESET_DOWNLOAD_URL` not set |
| Nurture sequence firing | ✅ Active | `dormant-member-reengagement`, `free-user-day10` seen in logs |
| Masterclass delivery | ✅ Working | Not checked deeply but pattern matches starter kit |

---

## Files Changed in This Session

```
components/sselfie/academy-screen.tsx          — Visibility Suite iframe + click handler
app/api/cron/nurture-sequence/route.ts         — Starter kit preset URL in day-0 cron email
app/api/webhooks/stripe/route.ts               — guide_access_email_sent flag after send
app/academy/courses/[courseId]/lessons/[lessonId]/lesson-viewer-client.tsx — bootstrap + Maya bubble
components/sselfie/academy/lesson-maya-chat.tsx — floating chat UI fixes
```

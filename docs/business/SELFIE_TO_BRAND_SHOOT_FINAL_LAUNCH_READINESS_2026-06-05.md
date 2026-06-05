# Selfie To Brand Shoot Final Launch Readiness

Date: 2026-06-05  
Product: Selfie to Brand Shoot System  
Verdict owner: Codex launch-readiness implementation pass

## 1. Executive Summary

Selfie to Brand Shoot has moved from warm organic launch ready to launch-controlled for warm and email audiences.

The product value is now strong enough for the $197 price point because the buyer gets a complete guided path:

- source selfie selection
- Signature Visual World decision
- Visual Consistency Code
- Maya/custom prompt pack support
- 3-image starter shoot
- Keep / Fix / Delete taste filter
- final 3-7 image selection worksheet
- 3x3 mini feed planner
- 7-day content plan
- course workbook
- Prompt Vault bridge

The sprint added the missing launch-control layer:

- Day 1 / Day 3 / Day 5 buyer activation emails
- Day 7 proof request email
- gated Selfie to Brand Shoot checkout recovery route
- product-specific launch analytics events
- admin launch monitor
- protected access route tracking
- Maya prompt pack / visual code / copy / download tracking
- manual admin preview QA checklist

Honest launch verdict:

- Warm organic launch: READY
- Email launch: READY with Sandra-approved messaging and manual monitoring
- Paid ads: NOT READY until proof capture improves and Sandra approves a safe live checkout smoke test

## 2. What Changed In This Sprint

### Activation Emails

Created a dedicated Selfie to Brand Shoot buyer sequence:

- Day 1: choose source selfie + visual world
- Day 3: create first 3-image starter shoot
- Day 5: pick best images + turn into content
- Day 7: proof/testimonial request

The sequence is wired into the existing `/api/cron/nurture-sequence` owner and gated by:

`SELFIE_TO_BRAND_SHOOT_NURTURE_ENABLED=true`

No new cron schedule was added.

### Proof Capture

Added a low-risk Day 7 proof request email. It asks buyers to reply with:

- what they created
- what surprised them
- what they used it for
- optional source/result images
- explicit permission language: “yes, you can share this”

This does not force public face/image sharing.

### Tracking

Added allowed analytics events for:

- access opened
- module started/completed
- workbook downloaded
- visual code saved
- Maya prompt pack built
- prompt copied
- final selects completed
- content plan completed
- testimonial requested
- checkout recovery sent

Course-shell actions now track buyer activation without adding persistent progress.

### Launch Monitor

Created an admin monitor:

`/admin/selfie-to-brand-shoot`

It shows:

- landing views
- checkout starts
- purchases
- revenue
- access opens
- workbook downloads
- visual code saves
- Maya prompt pack usage
- prompt copies
- final selects
- content plan completion
- buyer emails
- recovery sends
- recent purchases
- module starts/completions

### Abandoned Checkout Recovery

Created a gated recovery route:

`/api/cron/selfie-to-brand-shoot-checkout-recovery`

Gate:

`SELFIE_TO_BRAND_SHOOT_CHECKOUT_RECOVERY_ENABLED=true`

Important: this route is not added to `vercel.json`, so it is not automatically scheduled yet.

### Prompt Vault Bridge

Verified existing bridge is already present:

- Prompt Vault access page has System upgrade CTA
- Prompt Vault buyer Day 3 email positions System as the guided next step
- Vault buyer credit framing exists: $27 paid, complete System for $170
- Upgrade click tracking exists via `prompt_vault_system_upgrade_click`

## 3. Files Changed

Sprint implementation files:

- `app/admin/selfie-to-brand-shoot/page.tsx`
- `app/api/cron/selfie-to-brand-shoot-checkout-recovery/route.ts`
- `app/api/cron/nurture-sequence/route.ts`
- `app/api/selfie-to-brand-shoot/prompt-pack/route.ts`
- `app/api/selfie-to-brand-shoot/visual-code/route.ts`
- `app/access/selfie-to-brand-shoot/[token]/page.tsx`
- `app/academy/access/selfie-to-brand-shoot/page.tsx`
- `components/selfie-to-brand-shoot/copy-prompt-button.tsx`
- `components/selfie-to-brand-shoot/course-shell-v1.tsx`
- `components/selfie-to-brand-shoot/maya-prompt-concierge.tsx`
- `components/selfie-to-brand-shoot/tracked-course-link.tsx`
- `lib/analytics/event-contract.ts`
- `lib/email/get-active-sequences.ts`
- `lib/email/selfie-to-brand-shoot-email-sequence.ts`
- `lib/email/templates/selfie-to-brand-shoot-buyer-sequence.ts`
- `lib/email/templates/selfie-to-brand-shoot-checkout-recovery.ts`

Existing launch-readiness files from the prior pass still part of the ready state:

- `app/selfie-to-brand-shoot/page.tsx`
- `public/downloads/selfie-to-brand-shoot-workbook.txt`
- `docs/business/SELFIE_TO_BRAND_SHOOT_LAUNCH_READINESS_PASS_2026-06-05.md`

## 4. Product Readiness Verdict

Meta-cognitive decomposition:

| Subproblem | Result | Confidence |
|---|---:|---:|
| Course value for $197 | Strong guided workflow, not just prompts | 0.89 |
| Module completeness | Modules 1-5 have clear outputs and next steps | 0.88 |
| Buyer activation | Day 1/3/5 + Day 7 proof emails now exist, gated | 0.82 |
| Checkout/access infrastructure | Stripe price, webhook, entitlements, access routes verified in code/build | 0.90 |
| Tracking/control | Admin monitor + event coverage added | 0.84 |
| Proof readiness | Proof request exists, but proof volume is still low | 0.62 |
| Paid ads readiness | Not enough proof/observed checkout data yet | 0.58 |

Weighted combined readiness: 0.86

Reflection: the largest weakness is not the course product anymore. It is external proof, live buyer behavior data, and one approved live checkout smoke test.

## 5. Checkout / Access Smoke Result

Verified:

- `/selfie-to-brand-shoot` renders locally in production build.
- `/checkout/selfie-to-brand-shoot` renders locally in production build.
- Stripe price verified from `.env.local`:
  - id: `price_1TdYZGEVJvME7vkwUSEYulgV`
  - active: true
  - currency: `usd`
  - unit_amount: `19700`
  - type: `one_time`
  - recurring: null
- Webhook fulfillment code grants:
  - `selfie_to_brand_shoot_system`
  - `prompt_vault`
- Webhook sends `generateSelfieToBrandShootDeliveryEmail`.
- Webhook logs `selfie_to_brand_shoot_checkout_success`.
- Success page polls `/api/selfie-to-brand-shoot/access-token`.
- `/api/selfie-to-brand-shoot/access-token` resolves paid access from Stripe session.
- `/access/selfie-to-brand-shoot/[token]` renders the buyer shell for valid paid token records.
- `/academy/access/selfie-to-brand-shoot` renders for entitled users and redirects unauthenticated users to login.
- Invalid token route remains protected and shows support recovery state.

Local route checks on production server `localhost:3107`:

- `/selfie-to-brand-shoot`: 200
- `/checkout/selfie-to-brand-shoot`: 200
- `/access/selfie-to-brand-shoot/not-a-real-token`: 200 protected invalid-access screen
- `/academy/access/selfie-to-brand-shoot`: 307 to login when unauthenticated
- `/admin/selfie-to-brand-shoot`: 307 to `/404` when unauthenticated/non-admin
- `/admin/preview/selfie-to-brand-shoot`: 307 to `/404` when unauthenticated/non-admin
- `/downloads/selfie-to-brand-shoot-workbook.txt`: 200
- `/downloads/selfie-to-brand-shoot-7-day-plan.txt`: 200

Not completed:

`NEEDS_SANDRA_DECISION`: approve one safe live checkout smoke test or provide test-mode/live buyer session confirmation. I did not run a real live payment.

## 6. Activation Email Status

Templates:

- `lib/email/templates/selfie-to-brand-shoot-buyer-sequence.ts`

Sequence definitions:

- `lib/email/selfie-to-brand-shoot-email-sequence.ts`

Cron owner:

- `app/api/cron/nurture-sequence/route.ts`

Status:

- wired
- idempotent through `email_logs`
- gated by `SELFIE_TO_BRAND_SHOOT_NURTURE_ENABLED`
- not active unless env is enabled

How to test safely:

1. Create/identify one buyer record in `freebie_subscribers` tagged `selfie-to-brand-shoot-paid`.
2. Keep `SELFIE_TO_BRAND_SHOOT_NURTURE_ENABLED` off in production.
3. Run the cron in a safe environment or with a test buyer and CRON_SECRET.
4. Confirm `email_logs.email_type` records:
   - `selfie-to-brand-shoot-day1-source-and-world`
   - `selfie-to-brand-shoot-day3-first-shoot`
   - `selfie-to-brand-shoot-day5-select-and-content`
   - `selfie-to-brand-shoot-day7-proof-request`

## 7. Proof / Testimonial Workflow Status

Status: V1 ready, manual-response based.

The Day 7 proof request email asks buyers to reply. It includes privacy language and permission language. It does not force public sharing.

Tracking:

- `selfie_to_brand_shoot_testimonial_requested` logs when Day 7 proof request sends.
- `selfie_to_brand_shoot_testimonial_submitted` is reserved for a future structured form.

Risk:

Manual reply capture is enough for warm/email launch, but not enough for paid ads at scale.

## 8. Tracking / Launch Monitor Status

Status: implemented.

Admin route:

`/admin/selfie-to-brand-shoot`

Protected by the existing admin route guard behavior. Unauthenticated local route check redirects to `/404`.

Events added to the analytics contract:

- `selfie_to_brand_shoot_module_started`
- `selfie_to_brand_shoot_module_completed`
- `selfie_to_brand_shoot_workbook_downloaded`
- `selfie_to_brand_shoot_visual_code_saved`
- `selfie_to_brand_shoot_maya_prompt_pack_built`
- `selfie_to_brand_shoot_prompt_pack_copied`
- `selfie_to_brand_shoot_final_selects_completed`
- `selfie_to_brand_shoot_content_plan_completed`
- `selfie_to_brand_shoot_testimonial_requested`
- `selfie_to_brand_shoot_testimonial_submitted`
- `selfie_to_brand_shoot_checkout_recovery_sent`

Note: module start/completion is product-prefixed with `module` property instead of generic `module_1_started` names. This keeps analytics names consistent with existing SSELFIE conventions.

## 9. Prompt Vault Bridge Status

Status: verified.

Existing paths:

- Prompt Vault access page: upgrade CTA to `/checkout/selfie-to-brand-shoot`
- Prompt Vault buyer Day 3 email: “Complete the System”
- Vault buyer credit framing: `$27 paid → complete for $170`
- Tracking: `prompt_vault_system_upgrade_click`

No changes needed to avoid making Vault feel incomplete.

## 10. Recovery Flow Status

Status: built and gated, not scheduled.

Files:

- `app/api/cron/selfie-to-brand-shoot-checkout-recovery/route.ts`
- `lib/email/templates/selfie-to-brand-shoot-checkout-recovery.ts`

Gate:

`SELFIE_TO_BRAND_SHOOT_CHECKOUT_RECOVERY_ENABLED=true`

Not added to `vercel.json`.

Recommendation:

Enable manually only after Sandra approves the recovery email copy and decides whether to schedule this hourly like Prompt Vault recovery.

## 11. QA Results

Passed:

- `node scripts/verify-repo-invariants.mjs`
- direct Selfie to Brand Shoot asset/download scan: 104 refs, 0 missing
- targeted eslint on touched files: 0 errors, 14 warnings
- production build: passed
- local production route checks: passed expected status behavior
- Stripe price verification: passed

Warnings:

- eslint hardcoded-hex warnings in existing protected access inline styles and new email HTML
- eslint `Record<string, any>` warnings in lightweight analytics prop pass-through components
- baseline-browser-mapping warning from build, existing package freshness warning
- middleware deprecation warning from Next, existing project issue

Full repo typecheck:

`pnpm exec tsc --noEmit --pretty false --skipLibCheck` still fails from unrelated existing files. First observed errors include:

- `app/admin/academy/page.tsx`
- `app/admin/analytics/page.tsx`
- `app/api/ai-prompts/subscribe/route.ts`
- `app/api/feed-planner/create-from-strategy/route.ts`
- `app/api/feed/[feedId]/generate-single/route.ts`
- `app/api/maya/chat/route.ts`
- `app/api/maya/generate-image/route.ts`
- `app/api/training/progress/route.ts`
- `app/api/user/delete/route.ts`

Touched-file filtered TypeScript check after fix:

- no touched-file type errors found.

## 12. Screenshots / Preview Links

Existing screenshot files from the launch-readiness pass:

- `selfie-to-brand-shoot-launch-sales-desktop.png`
- `selfie-to-brand-shoot-launch-sales-mobile.png`

Manual protected preview URL:

- `/admin/preview/selfie-to-brand-shoot`

Admin monitor URL:

- `/admin/selfie-to-brand-shoot`

Public sales URL:

- `/selfie-to-brand-shoot`

Checkout URL:

- `/checkout/selfie-to-brand-shoot`

## 13. Known Risks

1. Live checkout completion has not been manually purchased in this sprint.
2. Buyer activation emails are wired but env-gated; Sandra must decide when to enable them.
3. Checkout recovery route exists but is not scheduled or enabled.
4. Proof capture is manual reply-based; paid ads need more proof volume and ideally a structured form.
5. Full repo typecheck remains unhealthy from unrelated debt.
6. Admin preview screenshots still require Sandra to log in manually.

## 14. Manual Sandra Checklist

Manual Admin Preview QA:

- Log in as admin.
- Open `/admin/preview/selfie-to-brand-shoot`.
- Review desktop layout.
- Review mobile layout.
- Check buyer home.
- Check quick links/sidebar.
- Check Module 1.
- Check Module 2.
- Check Module 3, including Maya Prompt Concierge.
- Check Module 4, including Keep / Fix / Delete.
- Check Module 5, including 3x3 planner and content plan.
- Download workbook.
- Download 7-day plan.
- Open Vault bridge.
- Check final resources.
- Note any visual/design issues.

Manual launch monitor QA:

- Open `/admin/selfie-to-brand-shoot`.
- Confirm metrics render.
- Confirm route is protected when not logged in.
- Confirm purchases/revenue are visible after the next buyer.

Manual checkout smoke:

- Decide whether to approve one safe live checkout test.
- If approved, purchase using a real payment method.
- Confirm delivery email arrives.
- Confirm Academy access opens.
- Confirm Prompt Vault access bridge opens.
- Confirm admin monitor counts purchase and access open.

## 15. Warm Launch Verdict

Warm organic launch: READY

Confidence: 0.90

Reasoning:

- Product is complete enough.
- Access is protected.
- Checkout route renders.
- Stripe price is correct.
- Buyer deliverables exist.
- Admin monitor exists.
- Proof capture exists.

Weakness:

- Still needs more real proof screenshots and a safe live checkout smoke.

## 16. Email Launch Verdict

Email launch: READY

Confidence: 0.84

Reasoning:

- The course can handle warm buyers.
- Delivery path exists.
- Activation sequence exists and is gated.
- Launch monitor exists.
- Prompt Vault bridge exists.

Condition:

- Sandra should approve enabling `SELFIE_TO_BRAND_SHOOT_NURTURE_ENABLED`.
- Sandra should monitor `/admin/selfie-to-brand-shoot` during the send window.

## 17. Paid Ads Verdict

Paid ads: NOT READY

Confidence: 0.74

Reasoning:

- Paid ads need stronger proof, abandonment recovery enabled/scheduled, and a fully observed live checkout smoke.
- Product is good enough, but proof/control is not yet paid-traffic mature.

## 18. Remaining Blockers Before Ads

1. Capture at least 5-10 proof/result stories.
2. Approve and run one safe live checkout smoke.
3. Enable and observe buyer activation emails.
4. Decide whether to schedule checkout recovery in `vercel.json`.
5. Add structured proof/testimonial submission form if replies become messy.
6. Watch first 20-30 buyers in the admin monitor before paid traffic.

## 19. Next 5 Business-Impact Tasks

1. Sandra manually reviews protected buyer shell on desktop/mobile.
2. Run one approved safe live checkout smoke.
3. Enable `SELFIE_TO_BRAND_SHOOT_NURTURE_ENABLED` after Sandra approval.
4. Send a warm email launch to the AI Photoshoot / Prompt Vault audience.
5. Collect proof replies from Day 7 and DMs, then update sales page proof section before paid ads.


# Selfie to Brand Shoot Launch Readiness Pass

Date: 2026-06-05
Status: Launch-readiness pass completed

## Executive Decision

Selfie to Brand Shoot is ready for warm organic launch after final visual route screenshots are reviewed.

It is not yet ads-ready at scale because proof, activation email depth, and system-specific dashboards can still improve. But the paid buyer foundation is real: the route exists, checkout price is active at $197, buyer access is protected, the course shell contains five complete modules, and the buyer now has tangible workbook/download assets.

## Meta-Cognitive Breakdown

### 1. Decompose

| Subproblem | What must be true for launch | Confidence |
| --- | --- | ---: |
| Product value | Buyer can go from selfie to AI brand shoot to usable content | 0.88 |
| Course structure | Buyer always knows the next step | 0.86 |
| Deliverables | $197 feels like a system, not a page | 0.84 |
| Access protection | Paid routes are guarded and normal buyers land in the shell | 0.89 |
| Checkout readiness | Live Stripe price exists and standard path is intact | 0.9 |
| Visual readiness | Images load and the course feels SSELFIE | 0.82 |
| Launch tracking | Enough tracking exists for warm launch | 0.72 |
| Proof/readiness for paid ads | Testimonials and case studies are still thin | 0.55 |

### 2. Solve

Implemented in this pass:

- Added a downloadable course workbook at `/downloads/selfie-to-brand-shoot-workbook.txt`.
- Added workbook access to the buyer home quick links, course sidebar quick links, Module 5, and final resource block.
- Kept the existing 7-day content plan download.
- Updated the buyer home copy to connect the system to showing up, posting clearly, and building a personal brand online.
- Updated the public sales page to frame the product as a path for knowing what to post, how to show up, and how to use visuals as a first step online.
- Added a deliverables strip to the sales page so buyers see what they actually leave with.
- Confirmed all referenced Selfie to Brand Shoot images/downloads exist.
- Confirmed the live Stripe price is active at $197 one-time.

### 3. Verify

Checks run:

- `node scripts/verify-repo-invariants.mjs` passed.
- Asset/download reference check passed: 104 references, 0 missing.
- Targeted lint passed for:
  - `app/selfie-to-brand-shoot/page.tsx`
  - `components/selfie-to-brand-shoot/course-shell-v1.tsx`
  - Result: 0 errors, 2 hardcoded-hex warnings from inline page CSS.
- Stripe live price check passed:
  - `STRIPE_PRICE_SELFIE_TO_BRAND_SHOOT_SYSTEM`
  - Active: yes
  - Currency: USD
  - Amount: 19700
  - Recurring: no
- Public sales route check passed:
  - `/selfie-to-brand-shoot` returned 200 on desktop and mobile.
  - Screenshots captured:
    - `selfie-to-brand-shoot-launch-sales-desktop.png`
    - `selfie-to-brand-shoot-launch-sales-mobile.png`
- Download checks passed:
  - `/downloads/selfie-to-brand-shoot-workbook.txt` returned 200.
  - `/downloads/selfie-to-brand-shoot-7-day-plan.txt` returned 200.
- Invalid token protection passed:
  - `/access/selfie-to-brand-shoot/not-a-real-token` returned the protected invalid-access screen.
- Full repo TypeScript check did not pass because of pre-existing unrelated errors across admin, Maya, feed planner, onboarding, and other legacy files. No reported TypeScript errors were in the Selfie to Brand Shoot files changed in this pass.
- Local admin preview route could not be visually checked without an authenticated admin session; unauthenticated local access redirects to `/404`.

### 4. Combine

Weighted launch-readiness confidence: 0.82

Warm organic launch: yes.

Paid ads launch: not yet.

### 5. Reflect

Weaknesses / remaining risks:

- Proof is still the softest part. The course has examples, but customer screenshots/results will make the sales page convert better.
- Activation emails beyond delivery are still a future revenue lift.
- Module progress is UI-only, not persistent. This is acceptable for a first warm launch but not ideal for a mature course platform.
- Maya Prompt Concierge depends on authenticated access and AI availability; it has fallback logic, but route-level QA should be included before a larger send.
- Final screenshots should still be reviewed on desktop and mobile after this pass.

## Launch Verdict

The product now clears the practical $197 standard for a warm audience:

- It teaches the right source selfie.
- It teaches a repeatable visual world.
- It helps create the first brand shoot.
- It teaches taste and likeness filtering.
- It turns selected images into posts.
- It includes the Vault.
- It includes a course workbook.
- It includes a 7-day content plan.

Next recommended move:

Run final desktop/mobile route QA screenshots, then launch softly to warm buyers and interested email/DM audiences while collecting proof.

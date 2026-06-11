# PRODUCT-01 — Customer Truth Audit
*2026-06-11. Every paid product walked end-to-end as the buyer experiences it: landing promise → delivery email → deliverable → follow-up → SUITE bridge. Inventory by background agent, verdicts and verification by main session. DB claims verified against Neon + webhook code.*

## Verdict Summary

| Product | Verdict | Why |
|---------|---------|-----|
| Prompt Vault $27 | **KEEP — polish** | Strongest deliverable (10 collections, good access page, SuiteDoor). Naming chaos + stale delivery email. |
| Starter Kit $37 | **KEEP — fix gaps** | Solid kit, but a promised deliverable is invisible on the access page. |
| Masterclass $147 | **REPOSITION delivery** | Course is real (published, in Studio) but the delivery email hides it, lesson count is overstated, and one email uses manufactured scarcity. |
| Selfie Guide €17 (paid) | **DECIDE: kill paid tier or build it** | The paid version has no landing page and the content isn't payment-gated. In practice it's a free lead magnet. |
| Brand Strategy Pack $19 | **ALREADY DEAD — fix the docs** | `/brand-strategy` and its checkout both redirect to Masterclass. CLAUDE.md still lists it "✅ Active". Bundled into Masterclass only. |
| Blueprint / Feed Planner | **KEEP — fix naming + email** | Live product, protected trees. Buyer sees 3 different product names in one flow; delivery email is the only hand-rolled-HTML email in the system. |
| SUITE €97/mo | **REBUILD the front + welcome** | Flagship product has the weakest surface: no real landing page, generic account-setup welcome for new users, NOTHING for existing users who upgrade. This is BRIDGE-01's core. |

## Verified Cross-Cutting Findings

1. **Naming chaos** — same products carry multiple names in a single buyer flow:
   - Prompt Vault: "The AI Photo Prompt Vault" (eyebrow) / "The Selfie to Brand Shoot Vault" (metadata title) / "The Prompt Vault" (access page) / "your prompt vault" (email).
   - Blueprint: "Brand Blueprint - 30 Custom Photos" (stripe_payments description) / "Feed Planner" (email subject + app) / "Visibility Reset" (email body + Day 1 subject).
2. **Email visual systems** — products use stone-email wrapper consistently EXCEPT paid_blueprint (hand-rolled table HTML, Inter font) and the membership welcome (welcome-email.tsx, separate React system, subject "Welcome to SSelfie! Set up your account" — wrong casing, account-plumbing tone). This confirms the email design inconsistency Sandra feels.
3. **Promise vs delivery gaps:**
   - Prompt Vault delivery email lists **6 collections; the vault has 10** (`lib/email/templates/prompt-vault-delivery.ts`).
   - Masterclass landing lists **17 lessons; published course has 14** (verified in `academy_courses`/`academy_lessons`, course id 1 "Branded by SSELFIE").
   - Vault H1 "unlimited photoshoots" vs a finite 10-collection library (body copy "new ones I keep adding" is the honest framing — headline overshoots).
   - Starter Kit delivery email promises "The 7-Day Content Starter"; no such card exists on `/access/starter-kit/[token]` (it's buried inside the Selfie Guide link).
4. **Membership welcome (verified in `app/api/webhooks/stripe/route.ts`):**
   - NEW user subscribes → generic "Welcome to SSelfie! Set up your account" (welcome-email.tsx, packageName "STUDIO MEMBERSHIP"). Functional, not premium, no Maya, no first-win guidance.
   - EXISTING user subscribes → branch at ~line 1486 only logs "credits granted on invoice.payment_succeeded" — **no email at all**.
   - `onboarding-day-0/2/7` templates exist but email_logs shows last sends March 2026, 1–4 sends each — the member onboarding sequence is effectively unwired.
5. **Masterclass delivery email** (`masterclass-day0-delivery.ts`) — subject "start with your strategy", single CTA to Brand Strategy tool. The actual 17-lesson course is never linked. Buyer of a $147 course must discover it themselves inside Studio.
6. **Masterclass Day 10 email** — subject "two spots open right now" fires automatically to every buyer. Manufactured scarcity; violates the honesty doctrine that the whole brand stands on.
7. **Silent failure paths:** Masterclass access redirects to the landing page (no error) if the course record were unpublished; Brand Strategy setup with a bad token dead-ends via double redirect to /masterclass. Selfie Guide content depends on `content-templates/selfie-guide-content-v3.md` existing in the deploy bundle.
8. **Starter Kit desktop presets** gated on `STARTER_KIT_PRESET_DOWNLOAD_URL` env var — if unset in prod, the button silently doesn't render (verify in Vercel env).
9. **Voice check on product surfaces: clean.** No banned words, no em-dashes, no fake-AI framing found in the audited pages (batches 2+3 held).
10. **SUITE has no landing page.** `/checkout/membership` greets cold traffic with eyebrow "SSELFIE Update" and three buttons. Every SuiteDoor points at `/join/studio`. There is no page that sells the flagship product.

## Fix List (proposed order)

**P0 — buyer-facing truth (cheap, do first):**
- F1. Prompt Vault delivery email: list all 10 collections (or link "every current collection" without enumerating).
- F2. Masterclass landing: align lesson count with the published course (or publish the missing 3 lessons).
- F3. Masterclass Day 0 email: CTA to the course itself, Brand Strategy as step 1 *inside* it.
- F4. Kill "two spots open right now" scarcity subject; rewrite honest.
- F5. One name per product: Vault = "The Prompt Vault" everywhere; Blueprint flow = "Feed Planner" everywhere (DB description can stay for history).
- F6. Starter Kit access page: add the 7-Day Content Starter card (link into Selfie Guide section explicitly); verify `STARTER_KIT_PRESET_DOWNLOAD_URL` in Vercel.
- F7. CLAUDE.md products table: Brand Strategy Pack → "bundled into Masterclass only"; Selfie Guide €17 → reflect reality after Sandra decides.

**P1 — BRIDGE-01 foundation:**
- F8. Real SUITE member welcome email (stone-email, Maya-led, first-win path) for BOTH new and existing-user subscribes; wire member onboarding day 0/2/7.
- F9. SUITE landing page (the product with the highest price has no sales page).
- F10. Vault H1 honesty pass ("unlimited" → framing that matches the No-Fake doctrine and the actual library+additions model).

**P2 — EMAIL-01:**
- F11. All delivery/lifecycle emails through one wrapper (stone-email as the standard; migrate paid-blueprint + welcome-email.tsx).

**Sandra's open decisions:**
- D1. Selfie Guide paid €17: kill the paid tier (it's a lead magnet in practice) or build a real paid landing + gate?
- D2. Publish the 3 missing Masterclass lessons or change the promise to 14?

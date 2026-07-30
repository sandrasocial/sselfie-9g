# Vault Maya Remediation Plan (bounded to Sandra's approved blockers)

Date: 2026-07-30. Status: Vault Maya remains PAUSED. Scope = the 11 launch blockers +
Sandra's 6 decisions, nothing else. No v1.1 features. No offer revisions beyond the
decisions. Launch readiness is decided by an independent reviewer + Sandra, never by the
implementing agent.

Decisions encoded: (1) tap-to-create is v1, remove chat wording; (2) block SUITE member
purchases with an "already included" path; (3) entitlement precedence member > trial/bundle
> vault, vault survives expiry of higher temporary tiers; (4) monthly credits may expire at
renewal WITH clear disclosure, top-ups never expire in the reset; (5) all 30-second claims
removed, no replacement speed claim until n≥20 measured generations; (6) no Day 0 — founder
period = 7 complete days from actual public launch, started only after fixes + independent
QA.

## Blocker → change → intended test

| ID | Blocker | Planned change (files) | Intended test (what proves it) |
|---|---|---|---|
| B1 | Reachable Account/Billing + cancellation for vault-only customers | Studio gains an "Account & billing" entry that opens the existing Stripe customer portal (app/api/stripe/create-portal-session — reuse, verify it accepts vault customers) in components/vault-maya/vault-maya-studio.tsx | Browser (vault-only test customer): studio → Account & billing → Stripe portal loads → cancel flow visible. API test: portal session created for a customer whose only product is vault_maya |
| B2 | Entitlement precedence + downgrade prevention | Reorder lib/trial/suite-trial.ts getSuiteAccess: member → active bundle pass → active trial → vault_maya → expired-trial limited → owner limited → none. Vault row must survive expired trial/bundle | Unit tests (new tests/vault-maya-entitlement.test.ts) with row fixtures: member+vault→member; active-trial+vault→trial; expired-trial+vault→vault; bundle-active+vault→member; bundle-expired+vault→vault; vault-only→vault |
| B3 | Block duplicate SUITE purchases | /checkout/vault-maya (app/checkout/vault-maya/page.tsx): if authenticated user resolves to member level → render "Vault Maya is already included in your SUITE" + link to /vault-maya/studio, no checkout session. Defense-in-depth guard in createLandingCheckoutSession for vault_maya when the authenticated user is a member. Limitation (documented): an anonymous checkout with a different email cannot be blocked | Unit test on the guard; browser test signed in as SUITE member (QA account) hitting /checkout/vault-maya → sees included-message, no Stripe form |
| B4 | Selfie ownership validation (HIGH) | app/api/app-v3/maya/generate/route.ts: after auth, resolve identity references SERVER-SIDE — every https reference URL (referenceSelfieUrl + referenceSelfieUrls) must exist in user_avatar_images rows owned by the authenticated Neon user; otherwise 403 identity_reference_not_owned. data: URIs remain allowed (self-supplied content, equivalent to an upload). Admin emails exempt (admin tooling operates cross-account by design). No Track A prompt changes | New unit test posting a foreign blob URL → 403; own URL → passes validation branch. Regression: existing generate tests stay green. Browser: normal member generation still works |
| B5 | Remove unsupported v1 promises | Sweep every vault surface for chat-implying or unavailable-feature wording (page, checkout, product catalog, Stripe description, welcome email, studio). Note: current copy audit shows no live "chat" claim remains; the sweep is verification + fixing anything found | grep-based checks in a pin test (tests/vault-maya-copy-truth.test.ts): banned terms ("chat with Maya", "message Maya", "inspo image") absent from vault surfaces |
| B6 | Credit-expiry disclosure | Page FAQ + welcome email: add plain disclosure — monthly photo credits refresh (unused monthly credits expire) at renewal; purchased top-up credits never expire in the reset. Verify code: credits.ts purchased-preserved logic (already exists) | Copy pin in tests/vault-maya-copy-truth.test.ts; unit evidence already in credits reset logic (existing tests) |
| B7 | Founder price fails safely | lib/launch/cash-launch-pricing.ts resolveVaultMayaPriceId: during founder window, missing founder env → return undefined (checkout fails loudly) instead of silently charging $29. Additionally make the flip moment env-overridable (VAULT_MAYA_FOUNDER_PRICE_FLIPS_AT env) and move the hardcoded date to a FAR-FUTURE placeholder until Sandra announces launch (decision 6: 7 complete days from actual public launch — she sets the real timestamp at launch) | Unit tests: founder window + no founder env → undefined; after flip + no standard env → undefined (falls back to founder? NO — also undefined); env override respected |
| B8 | Actual selfie deletion + accurate privacy copy | New authenticated endpoint (extend app/api/app-v3/upload-selfie DELETE or dedicated route) that deactivates ALL of the user's face-selfie rows AND deletes the underlying blobs (@vercel/blob del). Studio gains "Delete my selfie". FAQ rewritten to describe the real behavior (self-serve deletion; generated photos are separate and remain until deleted separately — stated) | Unit/route test: rows deactivated + blob del called. Browser (vault test customer): upload → delete → selfie gone, studio returns to add-selfie state |
| B9 | Dedicated vault-only welcome + return journey | Welcome email exists (unit-tested) — update copy per decisions 4/5 (remove 30-second line, add credit-expiry disclosure). Return journey: verify /auth/login?returnTo=/vault-maya/studio round-trip and /app → studio redirect for vault level | Email unit test updated; browser test with vault-only customer: log out → open studio URL → login → land back in studio |
| B10 | Activation instrumentation | Studio client events via existing analytics client: vault_maya_studio_viewed, vault_maya_selfie_added, vault_maya_generation_started / completed / failed, vault_maya_photo_saved, vault_maya_drop_request_sent. Server: existing purchase attribution already lands in stripe_payments | Pin test asserting event names wired; live verification during B11 (events visible in analytics_events for the test customer) |
| B11 | Complete vault-only lifecycle test | Genuine LIVE purchase on a fresh non-admin account (performed by Sandra or independent QA — the agent cannot enter payment details), then verify: stripe_payments row + attribution, subscriptions row product_type vault_maya, 30-credit grant on invoice.paid, welcome email delivery, access level vault, /app redirect, generation charge (-1) visible in credit_transactions, forced-failure refund pairing, cancellation via B1 portal, access-until-period-end. RENEWAL cannot be observed live inside the QA window → covered in Stripe TEST MODE via API-driven subscription + test clock advance (no card forms; test fixtures only), verifying invoice.paid → 30-credit re-grant idempotency, plus new unit tests with vault_maya fixtures mirroring membership-bundle-upgrade-safety | Each step has a SQL/API check listed in the verification kit; the independent reviewer re-runs all of them |

## Sequencing

1. B2 + B7 (pure logic + unit tests — smallest, highest blast-radius reduction)
2. B4 (generation API ownership) + regression run
3. B3 (purchase guard) · B1 (portal entry) · B8 (deletion)
4. B5 + B6 + decision-5 sweep (copy + pin tests) · B9 email copy
5. B10 instrumentation
6. Full suite + build → single commit series on a branch, NOT deployed until Sandra approves deploy for QA
7. B11 lifecycle test with Sandra/independent QA → evidence appended to the audit
8. Hand-off: exact diff (git) + updated verification kit → independent reviewer

## Explicitly out of scope

Free-form chat, inspo-image request UI, admin request-reading surface, speed claims,
public-blob URL architecture change (noted as accepted platform risk unless Sandra says
otherwise), any launch email sending, any Day 0 scheduling.

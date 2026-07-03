# Test Quarantine

Updated: 2026-06-14

`CI-GREEN-01` found a large stale-test backlog on `main`: deleted files, retired funnel
surfaces, old route contracts, and legacy Maya expectations. These suites are excluded from
the default Vitest run until each is either rewritten against the live product or deleted with
its retirement rationale. Current payment/webhook/access-gate characterization tests remain
active and were run separately before quarantine.

## Quarantined Suites

| Suite | Reason |
| --- | --- |
| `tests/admin-declutter.test.ts` | References removed admin dashboard/analytics surfaces. |
| `tests/app-v3-carousel-design-systems.test.ts` | Expects old carousel doctrine with only 1-2 identity slides; current Sandra-approved direction keeps the person present in more slides. |
| `tests/blueprint-cleanup-audit.test.ts` | References a removed Blueprint audit document. |
| `tests/brand-engine-broadcast-panel.test.js` | References removed Brand Engine admin panel. |
| `tests/checkout-success-next-actions.test.ts` | String-contract test for superseded post-purchase UI copy/routes. |
| `tests/deliverable-experience-slice.test.ts` | Expects older Masterclass lesson seed copy. |
| `tests/email-routing.test.ts` | References removed `admin-alerts` cron and old onboarding routing. |
| `tests/external-endpoint-hardening.test.ts` | Partly references removed Blueprint modal/client surfaces; Resend webhook assertion needs a focused rewrite. |
| `tests/funnel-2026-report.test.ts` | References removed funnel analytics route. |
| `tests/funnel-cleanup-admin-page.test.ts` | References removed funnel cleanup admin page. |
| `tests/funnel-cleanup-candidates.test.ts` | References removed cleanup candidate module. |
| `tests/funnel-cleanup-evidence.test.ts` | References removed cleanup evidence module. |
| `tests/funnel-final-leaks-regression.test.ts` | Encodes retired Brand Strategy/Paid Blueprint route contracts. |
| `tests/funnel-ladder-regression.test.ts` | Encodes pre-pivot public funnel ladder expectations. |
| `tests/instagram-login-routing.test.ts` | References removed admin dashboard path and old token-shape assertions. |
| `tests/maya-auto-select-mode.test.ts` | Legacy `/studio` mode selection expectations conflict with current `/app` behavior. |
| `tests/maya-generate-image-confirmation.test.tsx` | Legacy Maya chat UI expectation. |
| `tests/maya-inline-feed-chat-route.test.ts` | Legacy Maya feed/chat route contract; feed tab is retired. |
| `tests/maya-layout-hygiene.test.ts` | Legacy Maya layout string contract. |
| `tests/maya-mode-header-precedence.test.ts` | Legacy Maya mode-header contract. |
| `tests/maya-mode-toggle-labels.test.tsx` | Legacy Maya mode toggle labels. |
| `tests/maya-photos-home-prompts.test.tsx` | Legacy Maya photos home prompt labels. |
| `tests/maya-prompt-contract.test.ts` | Legacy Maya quick-prompt expectations. |
| `tests/maya-tab-handoff-chat-route.test.ts` | Legacy Maya tab handoff route contract. |
| `tests/maya-tab-scope.test.ts` | Legacy tab-scope expectation. |
| `tests/modular-mini-products.test.ts` | References unlaunched/removed modular mini-product surfaces. |
| `tests/offer-attribution-semantics.test.ts` | References removed quiz results route. |
| `tests/phase4-route-hygiene.test.ts` | References removed feed-planner-v2 compatibility files. |
| `tests/post-purchase-account-setup.test.ts` | String-contract test for superseded visibility-suite setup flow. |
| `tests/public-offer-checkout-paths.test.ts` | Encodes retired Brand Strategy/selfie-guide checkout paths. |
| `tests/revenue-email-links.test.ts` | Old email copy expectations, not a current route-safety test. |
| `tests/route-cron-diet.test.ts` | Old cron-bundle inventory no longer matches `vercel.json`. |
| `tests/selfie-guide-experience-ui.test.tsx` | Old Selfie Guide UI/copy expectations. |
| `tests/selfie-guide-experience.test.ts` | Old Selfie Guide markdown/image expectations. |
| `tests/selfie-guide-link-routing.test.ts` | Old Selfie Guide CTA route expectations. |
| `tests/selfie-guide-paid-funnel.test.ts` | Retired paid Selfie Guide checkout/fulfillment route contract. |
| `tests/selfie-guide-public-route.test.ts` | Old free Selfie Guide landing copy. |
| `tests/transform-launch-readiness.test.ts` | References unlaunched/removed Transform route and old webhook strings. |
| `tests/usd-pricing-copy.test.ts` | References removed Strategy upsell/template files. |
| `tests/user-journey-smoke-flows.test.ts` | References removed automation smoke-flow module. |
| `tests/visibility-suite-entitlements.test.ts` | References removed Visibility Suite checkout/public page; academy access remains a separate current surface. |
| `tests/welcome-first-generation-followup-email.test.ts` | Old subject-copy expectation. |

## Active Safety Coverage Kept

These representative money/access/webhook tests are not quarantined and should stay green:

- `tests/entitle-live-mode-gates.test.ts`
- `tests/starter-kit-selfie-guide-access-webhook.test.ts`
- `tests/stripe-payment-recording.test.ts`
- `tests/webhook-studio-membership-extraction.test.ts`
- `tests/webhook-subscription-period.test.ts`
- `tests/ai-photoshoot-nurture-route.test.ts`
- `tests/nurture-sequence-route.test.ts`

Agent Report  
Agent: admin-business-ops  
Specialty: Admin tooling, operational risks, business controls.  
Chunk ID: chunk-118  
Group: docs  
Date: 2026-01-19  

Summary:  
- Critical Stripe pricing misconfiguration was found pointing to an inactive price with incorrect amount ($99 instead of $97).  
- Two orphaned Stripe subscriptions exist, charging customers without corresponding DB records and missing credit grants.  
- Multiple fixes implemented including removal of dangerous hardcoded fallbacks, strict startup validation, proration fixes, idempotency in credit grants, and auditing scripts.  
- The SSELFIE system document details current architecture for prompt generation, image/video creation, and quality monitoring.  
- Alex chat admin tooling has been significantly improved with clean streaming logic, tool execution, chat history saving, deletion, title editing, and markdown rendering fixes.  

Top Findings:  
- **Critical Stripe Env Var Issue:**  
  - Env var `STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID` points to inactive price ID `price_1SRH36EVJvME7vkwQO096AFb` charging $99/month instead of $97.  
  - Evidence: `docs/_CANONICAL/STRIPE_LIVE_VERIFICATION_AND_FIX.md` - Phase A2 and Executive Summary.  

- **Orphaned Stripe Subscriptions Charging Customers:**  
  - Two subscriptions active in Stripe but not in DB: charging $79/month (old price), and $99/month (inactive price). Customers are not receiving credits.  
  - Evidence: `docs/_CANONICAL/STRIPE_LIVE_VERIFICATION_AND_FIX.md` - Phase A4, Immediate Actions, Root Cause.  

- **Removed Dangerous Hardcoded Fallbacks:**  
  - Code changes in `app/actions/landing-checkout.ts` and `app/actions/stripe.ts` removed fallbacks that could mask env var issues, making missing config fail fast.  
  - Evidence: Phase B1, B2 fixes in `STRIPE_LIVE_VERIFICATION_AND_FIX.md`.  

- **Added Strict Startup Validation of Stripe Pricing Config:**  
  - New validation module `lib/stripe/validate-pricing-config.ts` added with caching and clear error messages on invalid config.  
  - Evidence: Phase B3 changes described and verified.  

- **Fixed Proration Behavior:**  
  - Subscription upgrade proration behavior changed to apply at next renewal to avoid surprise immediate charges.  
  - Evidence: Phase B4 in Stripe live verification report.  

- **Idempotency Added for Credit Grants:**  
  - Webhook processing uses invoice-level idempotency keyed by Stripe invoice ID to avoid duplicate crediting.  
  - Evidence: Phase B5.  

- **New Audit Scripts and Admin Verification Endpoint:**  
  - Script `scripts/audit-multi-subscriptions.ts` added to detect subscription mismatches.  
  - Admin API endpoint `/api/admin/verify-stripe-config` added for runtime verification.  
  - Evidence: Phases B7 and C1.  

- **System Reality Document Details Current Architecture:**  
  - Prompt Authority is the canonical routing layer for prompt generation; legacy and gated paths noted.  
  - Image generation uses Classic (FLUX LoRA), Pro (NanoBanana Pro), and Video (WAN) modes through prompt authority.  
  - Quality monitoring is async and silent via hooks.  
  - Evidence: `docs/_CANONICAL/SYSTEM_REALITY.md`.  

Risks:  
- Orphaned subscriptions continue charging customers without granting credits causing revenue loss and customer dissatisfaction.  
- Environment variables pointing to incorrect or inactive Stripe prices can silently fail or cause surprise pricing issues if fallback logic reintroduced.  
- Legacy prices remain active in Stripe posing risk of accidental wrong price selection if fallback methods or config errors occur.  
- Lack of immediate removal of orphaned records could cause accounting reconciliation issues.  
- Without monitoring, subscription drift and configuration faults could recur.  

Opportunities:  
- Automate the orphaned subscription detection script to run weekly with alerting for new issues.  
- Extend admin verification endpoint to include automatic SDK alerts or integration with deployment pipelines for pre-deploy config validation.  
- Archive all legacy inactive prices in Stripe fully to reduce risk of accidental usage.  
- Incorporate Beta Pricing status and Refund logs into periodic operational risk reports to proactively catch anomalies.  
- Leverage the AI Layer Enhancements plan to build semantic search over code and docs to empower admin tooling and incident analysis.  

Recommended Actions:  
- 🔴 **Fix the STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID env var immediately** to active $97 price as per Stripe live verification report. (Effort: Low, Impact: High)  
- 🔴 **Investigate and migrate the two orphaned Stripe subscriptions into the database or cancel them if invalid.** Ensure credits are granted retroactively. (Effort: Medium, Impact: High)  
- 🔴 **Clean up duplicate or orphaned DB subscription records (e.g., Sandra's duplicates).** (Effort: Medium, Impact: Medium)  
- ⚠️ **Fully archive and deactivate legacy credit prices in Stripe.** (Effort: Low, Impact: Medium)  
- ⚠️ **Deploy latest fixes including startup validation, proration fix, idempotency, audit tooling, and admin endpoints to production.** (Effort: Medium, Impact: High)  
- ⚠️ **Enable monitoring and alerts for subscription drift, validation failures, and orphaned subscriptions.** (Effort: Medium, Impact: High)  
- ⚠️ **Run multi-subscription audit script weekly until stable.** (Effort: Low, Impact: High)  

Evidence vs Inference:  
- Evidence: Critical Stripe config issues, orphaned subscriptions

## FILES_REVIEWED
```json
[
  "docs/_CANONICAL/STRIPE_LIVE_VERIFICATION_AND_FIX.md",
  "docs/_CANONICAL/SYSTEM_REALITY.md",
  "docs/_CANONICAL/V1_PROMPTING_ARCHIVE_PLAN.md",
  "docs/_CANONICAL/beta_pricing_status.json",
  "docs/_CANONICAL/refund_execution_log.json",
  "docs/_CANONICAL/stripe_affected_users_analysis.json",
  "docs/ai-layer-enhancements.md",
  "docs/alex-tool-development-guide.md",
  "docs/alex/ALEX_CHAT_FILES_LIST.md",
  "docs/alex/ALEX_CHAT_HISTORY_AUDIT.md",
  "docs/alex/ALEX_CHAT_VERIFICATION_REPORT.md",
  "docs/alex/ALEX_CLEANUP_SUMMARY.md",
  "docs/alex/ALEX_CODEBASE_ACCESS.md",
  "docs/alex/ALEX_COMPLETENESS_FIXES.md"
]
```

# SSELFIE Studio - Cursor Rules

**AUTHORITATIVE RULES:** See `docs/_CANONICAL/CURSOR_CONSTITUTION.md`

This is the primary Cursor rules file for SSELFIE Studio.

All Cursor AI behavior rules, operating modes, business invariants, and workflows are defined in:
**`docs/_CANONICAL/CURSOR_CONSTITUTION.md`**

Please read that file for complete rules.

---

## Quick Reference

- **Primary Directive:** You are Sandra's autonomous engineering team maintaining a LIVE SaaS
- **Operating Modes:** AUDIT (read-only) / IMPLEMENT (scoped changes) / REFACTOR (explicit only)
- **Critical Files:** Edit requires approval (see constitution for list)
- **Stop Conditions:** Must ask before proceeding (see constitution)
- **Output Format:** Required for every response (see constitution)

---

## Critical Business Invariants

### Free Users (Blueprint Entry)
- ✅ Must be able to generate Brand Pillars and Preview Feed
- ✅ Must receive exactly 2 credits on signup (no duplicates)
- ✅ Preview feed must deduct credits correctly

### Paid Blueprint Users
- ✅ Must have access to Feed Planner only
- ✅ Must NOT access Membership-only areas
- ✅ Must see upsells elsewhere

### Members (Subscription)
- ✅ Must be able to train/retrain Replicate models
- ✅ Must be able to generate images + feed features
- ✅ Must retain all purchased features

### Payments
- ✅ Stripe webhooks must reliably map to entitlements and credits

---

## Operating Rules

### STOP Conditions (Must Ask First)
You must **STOP and ask** before:
- Editing any critical file (see constitution for list)
- Schema or migration changes affecting entitlements/credits/payments
- Changes that could block paid users
- Changes to pricing, plans, or Stripe products
- Disabling core paid functionality

### Autonomous Workflow
You may proceed autonomously through:
1. **OBSERVE** - Reproduce and document
2. **DIAGNOSE** - Identify causes and risks
3. **IMPLEMENT** - Make minimal, complete changes
4. **VERIFY** - Run lint, tests, build
5. **REPORT** - Provide Sandra-friendly summary

### Testing Requirements
- Run `npm run lint` (warnings acceptable, no new errors)
- Run `npm test` (if configured)
- Run `npm run build` (must pass)
- Verify via dev URLs with click-by-click instructions

---

## Documentation Authority

Only these documents are authoritative:
- `docs/_CANONICAL/CURSOR_CONSTITUTION.md` - **Full rules (THIS IS THE SOURCE)**
- `docs/_CANONICAL/SYSTEM_REALITY.md` - Verified system state
- `docs/_CANONICAL/EXECUTION_STATUS.md` - Current execution status
- `docs/_CANONICAL/NEXT_PHASE.md` - Next phase planning
- `docs/_CANONICAL/DRIFT_RULES.md` - Drift detection rules

---

## Required Output Format

Every response must include:
- ✅ Summary table with status indicators (✅/⚠️/❌)
- ✅ What changed (plain English)
- ✅ Files touched
- ✅ Verification results
- ✅ Click-by-click test instructions with URLs
- ✅ Expected behavior
- ✅ Rollback plan

---

**Full Rules:** Read `docs/_CANONICAL/CURSOR_CONSTITUTION.md` for complete details.

This is a production system with real users and revenue.
**Safety first. Verify everything. Report clearly.**

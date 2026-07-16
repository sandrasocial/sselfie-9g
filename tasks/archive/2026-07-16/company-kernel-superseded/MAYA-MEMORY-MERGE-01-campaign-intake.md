# MAYA-MEMORY-MERGE-01 — campaign intake becomes member memory

Status: READY for Codex 2026-07-15. Parent contract:
`docs/product/SUITE_MEMBERSHIP_VALUE_2026-07-15.md`. Small, high-leverage, builds after
CAMPAIGN-OUTCOME-01 goes live (it consumes campaign_orders intake data).

## Why

The campaign intake is the richest brand data we ever collect: what she sells, what she is
promoting, who it is for, optionally her own caption in her own voice, her platform. Today
it lives only on the order row. When a campaign buyer later becomes a member (or already
is one), Maya should already know her — first session, zero re-asking. This is the
compounding-memory moat made concrete.

## Shape

1. On campaign order intake completion AND on account link/claim (both directions —
   buyer-then-member and member-who-buys): merge intake into the member's Maya memory:
   - what she sells + audience + platform → `agent_profiles` / `user_personal_brand`
     equivalents used by App v3 persona context (follow the existing brand-profile write
     path; do NOT invent a new store).
   - voice reference caption → the voice/context field Maya's persona already reads.
   - the campaign's chosen visual direction → her style preference default (only if she has
     none yet — never overwrite an explicit member choice).
2. Merge policy: NEVER overwrite non-empty member-set values; fill blanks only; record
   provenance (`source: campaign_intake`, order id, timestamp) so support can trace it.
3. Idempotent per order (re-running a webhook or claim cannot duplicate/append twice).
4. Maya visibility: on her next session, the persona context includes it naturally (no UI
   announcement needed; Maya simply knows — that IS the feature).

## Out of scope

Any UI. Any change to the intake form. Backfilling historical guest orders without an
account link. Cross-user matching by anything other than the existing verified
email/claim-token identity paths (never guess identity).

## Acceptance

- Tests: fill-blanks-never-overwrite policy, idempotency, both directions
  (buyer→member claim, existing-member purchase), provenance recorded.
- Verify with one real flow in test mode: campaign order intake → claim → App v3 persona
  context contains what she sells (assert via the persona/context builder, not by eye).
- Full suite + type-check green.

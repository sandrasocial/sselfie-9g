# Archived Email Templates

This directory contains email templates that are no longer in active use but are kept for reference.

## Archived Templates

### `launch-email-beta.tsx`
**Status:** Archived (Beta Launch Email)  
**Reason:** Contains beta pricing ($24.50 one-time, $49.50/month) that is no longer valid  
**Current Pricing:** $49 one-time, $97/month  
**Last Used:** Beta launch period  
**Note:** Still referenced by admin test/preview endpoints for historical reference

### `launch-followup-email-beta.tsx`
**Status:** Archived (Beta Launch Follow-up)  
**Reason:** Contains beta pricing and historical references (e.g., "30 founding members")  
**Current Pricing:** $97/month  
**Last Used:** Beta launch period  
**Note:** Still referenced by admin follow-up campaign endpoint

### `vault-flash-launch.ts`
**Status:** Archived 2026-07-03 (spent one-time campaign)
**Reason:** The $27 -> $37 flash window closed 2026-06-26; copy hardcodes stale vault counts (92/145 prompts, 18 collections) which are forbidden in live emails (vault is live-counted and growing)
**Current Pricing:** Vault $37 (flipped 2026-06-26, `lib/launch/cash-launch-pricing.ts`)
**Last Used:** Flash broadcasts sent 2026-06-26

### `prompt-vault-launch-broadcast.ts`
**Status:** Archived 2026-07-03 (spent one-time campaign)
**Reason:** Original Vault launch broadcast (May 2026); price and framing are historical, no callers in code
**Last Used:** Vault launch, May 2026

## Usage

These templates are kept for:
- Historical reference
- Admin testing/preview functionality
- Potential future use if beta pricing is needed again

**Do not use these templates for new campaigns.** Use current pricing templates instead.



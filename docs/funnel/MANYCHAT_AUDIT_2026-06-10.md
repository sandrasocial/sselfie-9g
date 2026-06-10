# ManyChat Audit — Layer 1 of DM-RELIEF-01
*2026-06-10. Method: the ManyChat API exposes flow NAMES only (no content), so this audit uses
the strongest source available — 90 days of OBSERVED traffic the flows actually sent
(analytics_events, utm_medium=manychat). Sandra applies fixes in the ManyChat editor; each fix
is copy-paste ready.*

## The gold standard (your newest flow already does it right)
The VAULT keyword reply link has everything:
`/prompt-vault?utm_source=instagram&utm_medium=manychat&utm_campaign=vault_keyword&utm_content=dm_reply&cta_keyword=VAULT&source=manychat`
Every other link below should match this pattern.

## Fix list (by impact)

### 1. CRITICAL — a flow links to the bare `/checkout` error page (254 hits / 90 days)
People from the May-29 Selfie-to-Brand-Shoot DM push land on `/checkout` with no product,
which shows "We couldn't find your checkout session." 254 warm buyers hit an error screen.
**Find the link in the Selfie-to-Brand-Shoot flow (utm_content=2026-05-29-selfie-to-brand-shoot)
and replace with:**
`https://sselfie.ai/checkout/selfie-to-brand-shoot?utm_source=instagram&utm_medium=manychat&utm_campaign=selfie_to_brand_shoot&utm_content=dm_keyword&cta_keyword=SHOOT&source=manychat&buyer_stage=lead`

### 2. HIGH — your biggest flow has the weakest tracking (2,285 hits / 90 days)
The PROMPT keyword (Prompt Pack Automation) sends `/ai-prompts?utm_campaign=prompt` with no
utm_content, no cta_keyword, no source. **Replace the link with:**
`https://sselfie.ai/ai-prompts?utm_source=instagram&utm_medium=manychat&utm_campaign=prompt_keyword&utm_content=dm_reply&cta_keyword=PROMPT&source=manychat`

### 3. MEDIUM — an old Selfie Guide link sends 154 people with zero tracking
An older flow (likely "Freebie Link Dm-s", last seen May 28) links `/selfie-guide` with no
parameters at all. **Replace with:**
`https://sselfie.ai/selfie-guide?utm_source=instagram&utm_medium=manychat&utm_campaign=selfie_keyword&utm_content=dm_reply&cta_keyword=SELFIE&source=manychat`

### 4. MEDIUM — the "Visibility suite" flow points at a retired page (46 hits)
`/visibility-suite` now redirects to /masterclass, so the SUITE pitch lands on the Masterclass
page (message mismatch). **Point the flow at the real membership page:**
`https://sselfie.ai/join/studio?utm_source=instagram&utm_medium=manychat&utm_campaign=suite_keyword&utm_content=dm_reply&cta_keyword=SUITE&source=manychat`

### 5. LOW — `/checkout/prompt-vault` variants missing cta_keyword/source
Some vault checkout links carry campaign+content but not cta_keyword/source. Align with the
gold standard when you're in the editor anyway.

## Archive list (your OK required — these are live automations)
Flows: "Sign Up to Masterclass Waitlist" (2023) · everything in the "Imported from Rebecca
Adehill" folder · "Archived - Selfie Flow 18. april 2025" · the older duplicate of the two
identical "Auto-send links" flows (keep the 2025-11-13 one) · "Selfie Starter Kit Automation"
(Starter Kit is secondary now — retire or keep deliberately).
Growth tools: 16 triggers including 5 "copy"/"copy copy" duplicates — keep one per real
trigger, archive the copies (Story Reply #12 copy, Post/Reel Comments #24 copy, #12 copy,
#4 copy, #12 copy copy, #4 copy copy).
Tags: timestamped "link_clicked (...)" tags x3 are auto-generated noise — safe to delete.

## Verified non-issues
- The vault access-token URL seen 93x in manychat traffic = ONE buyer revisiting her own page
  on purchase day (2 unique visitors). No token leak, no flow misconfiguration.

---
name: daily-story-sequence-draft
description: Turn today's customer email into ready-to-copy Instagram Story text for Sandra. Never posts or contacts customers. Preserves the real source instead of inventing a sales story.
---

# Daily Story Sequence Draft

Working directory: `/Users/MD760HA/ACTIVE/sselfie-9g`.

Read `docs/brand/SSELFIE_BRAND_CONSTITUTION.md`,
`docs/business/SSELFIE_COMPANY_KERNEL_2026-07-16.md`, Source Of Truth, Voice OS, and
`scripts/daily-story-sequence-prep.ts`.

## Unattended safety

Use Read and `npx tsx scripts/daily-story-sequence-prep.ts ...` only. Never post, schedule, comment,
or send to customers. The approved script stores the text and sends one preview to Sandra.
Private and unvalidated offers stay out of this unattended public task.

## Source rule

Run `npx tsx scripts/daily-story-sequence-prep.ts data`. Use today's real email as the source. The
weekly theme may guide continuity but does not override the email. If no email exists today or the
source is too thin to repurpose honestly, stop. Do not invent a personal event, customer message,
or offer.

## Write the sequence

The storage script currently expects seven ordered roles:

1. `hook`
2. `emotional_recognition`
3. `belief_shift`
4. `personal_mirror`
5. `stuck_point`
6. `offer_bridge`
7. `cta`

Treat those roles as the transport contract, not a demand for a dramatic sales formula. Keep each
slide short. Use only the honest beats available in the source. If the email has no offer, the last
two slides may close the thought and invite a simple reply or reflection rather than manufacture a
sale.

Write beside her, not above her. Use one real detail. Keep hope honest. Do not turn the sequence
into seven lessons or generic motivational hooks.

Pipe the validated JSON into `npx tsx scripts/daily-story-sequence-prep.ts draft` with
`sourceEmailId`, `sourceSubject`, the seven `slides`, `offerLabel`, optional `offerUrl`, and optional
`notes`.

Report the source angle, all seven slide texts, whether there was an offer or no ask, and the preview
result. Never post the sequence.

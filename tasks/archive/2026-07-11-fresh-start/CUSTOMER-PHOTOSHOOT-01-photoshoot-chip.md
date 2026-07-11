# CUSTOMER-PHOTOSHOOT-01 - "Photoshoot" format for customer Maya (cohesive set)

OWNER: Codex (Sandra approves merge)

Status: ready. Source: Sandra 2026-06-15. Builds on SHOOT-TAXONOMY-01 + the admin Shoot Studio engine.

## What Sandra wants
Add a **"Photoshoot"** chip next to the existing customer formats (photo · carousel · reel-cover ·
video · story). When a member picks Photoshoot, Maya generates a **cohesive SET** — one vibe, one
outfit, same accessories/location — in sequence, instead of 6 separate concept cards. This is the
admin Shoot Studio behavior brought to the customer.

## Verified reality (don't repeat the wrong assumption)
Admin Shoot Studio does NOT chain the last generated image. It generates shots in PARALLEL, each
from the member's selfies + the shoot's inspiration images (`shoot-generator.ts:417`); cohesion
comes from shared selfies + shared reference + one coherent plan. Customers won't have inspiration
uploads, so cohesion needs a different anchor (below).

## Design
1. **New format `photoshoot`** added to the customer format type (`lib/app-v3/maya/draft-snapshot.ts`
   ServerOutputFormat) and the front-door chips (`components/app-v3/visual-front-door.tsx` /
   `maya-concierge.tsx`). Chip order: photo · photoshoot · carousel · reel-cover · video.
2. **No concept cards in photoshoot mode.** Photo mode keeps its concepts; Photoshoot instead plans
   ONE cohesive shoot: a single look (outfit, accessories, location, mood) + N shots, each assigned
   a `shotRole` from SHOOT-TAXONOMY-01 (establishing-full-body · seated-hero · profile · movement ·
   close-portrait) PLUS **1-2 faceless detail shots** that complement the set (Sandra: every
   photoshoot has 1-2 detail shots, never all-her, never more than 2 — they make it feel like a
   real shoot).
3. **Reuse the admin engine.** Drive generation through the existing shoot generator
   (`generateShotImage`) — do NOT build a parallel customer shoot system.
4. **Cohesion mechanism (safety refinement of "attach the last image"):**
   - Always attach the member's SELFIES first (identity anchor) on EVERY shot — keeps her face hers.
   - Generate the **hero shot first** from selfies; then generate the remaining shots from
     **selfies + the hero shot** as a shared style/cohesion reference (one shared anchor, not the
     immediately-previous image each time). This gives outfit/lighting continuity WITHOUT compounding
     identity drift (chaining the last-image each pass drifts likeness — the Edit Mode problem).
   - Lock the same outfit/accessories in the prompt across all shots (the plan defines one look).
5. **Outfit safety upstream** (per SHOOT-TAXONOMY-01): Maya picks a generation-safe outfit before
   rendering so the planned look == the rendered look.
6. Output = a cohesive set of finished photos saved to the member's gallery. No auto-post.

## Acceptance
- Member picks Photoshoot → gets a cohesive set (one outfit/vibe), varied shot roles, 1-2 detail
  shots, no concept cards. Identity preserved across all shots (anchored to real selfies). Outfit
  consistent. Nothing auto-posts.
- Reuses the shoot engine (no parallel system). Tests for: photoshoot format present, no concept
  cards in photoshoot mode, 1-2 detail shots, selfies attached to every shot. Build/invariants green.

## Dependencies / sequencing
- Depends on SHOOT-TAXONOMY-01 (shot roles + validation + 1-2 detail rule).
- Shares files with CONTENT-CAROUSEL-04 (customer Maya) — coordinate. Suggested order:
  CAROUSEL-04 + CAROUSEL-03-FIX → SHOOT-TAXONOMY-01 → CUSTOMER-PHOTOSHOOT-01.

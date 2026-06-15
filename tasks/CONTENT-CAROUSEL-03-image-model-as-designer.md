# CONTENT-CAROUSEL-03 - Image Model IS the Designer (corrects 01/02)

OWNER: Codex (Sandra approves merge)

Status: spec ready. CORRECTION of approach. Source: Sandra 2026-06-15, after reviewing the
CAROUSEL-01/02 output against her approved ChatGPT carousels.

## The correction (read first)
The coded next/og renderer is NOT the designer. It produced white typographic lesson cards Sandra
rejected. The correct engine is the **ChatGPT image model (gpt-image-2): it generates each finished
1080x1350 slide** from real reference images. The code only organizes references, selects frames,
calls the model with the right prompt, and saves/downloads finals.

**Reverses the earlier "never send screenshots to AI" rule.** Real screenshots ARE the visual base
and ARE sent into the model. Fidelity is handled by the prompt ("preserve the screenshot/photo
meaning and exact UI/values; redesign only the overlay") + Sandra's manual review before posting.
Therefore **CONTENT-CAROUSEL-02-FIX is OBSOLETE — do not build it** (it would block screenshots
from generation, the opposite of this).

## Target style (studied from Sandra's approved folder)
Dark, warm editorial. Taupe / charcoal / cream / deep graphite. **Never white lesson cards.**
- Serif hero typography, caps + italic mix ("Set Depth to ƒ3.5", "The EASIEST SELFIE HACK Ever…").
- Small uppercase sans labels ("STEP 04", "STUDIO LIGHT").
- Numbered steps in soft translucent cream panels integrated INTO the scene (not floating white cards).
- Real iPhone / camera UI rendered elegantly inside a styled editorial environment.
- Muted oxblood/burgundy callouts/arrows. No bright red, no green checks, no emoji, no chunky
  TikTok captions, no black-outlined text, no Canva look.
- Consistent identity across the set (same woman, often same outfit) = a cohesive shoot.

## Per-slide workflow (Sandra's, verbatim intent)
For EACH slide:
1. Select 1 main screenshot/frame from the original reel (the visual base) — from
   `content_reel_references`.
2. Add 1 approved style-reference slide from Sandra's ChatGPT carousel (style lock) — from the new
   style-reference library (see Data layer).
3. Add a face/body reference ONLY when the slide shows Sandra — from admin selfies (`listAdminSelfies`).
4. Call gpt-image-2 `images.edit` with those reference images and a slide-specific prompt:
   "Preserve the screenshot/photo meaning and Sandra's identity. Redesign ONLY the overlay, text,
   and callouts in the SSELFIE luxury editorial style [dark editorial, serif hero, minimal sans
   helper, muted oxblood callouts, no white cards/emoji/green checks/bright red]."
5. Output one finished 1080x1350 (4:5) PNG slide.
6. Repeat slide by slide.

## Code responsibilities (minimal — NOT a design engine)
- Organize reference images (reel frames + approved style library + selfies).
- Per-slide: pick the base frame, pick the closest style-ref, build the prompt, call the model.
- Save/download the finished PNGs. Maya orchestrates; Sandra reviews + posts manually. No auto-post.
- The text CONTENT (the words rendered on the slide) + caption still come from `lib/content/grounding.ts`.

## What to KEEP from 01/02 (not wasted)
- Reel-reference extractor + `content_reel_references` (the screenshots = visual base). ✓
- Burgundy token `#6E2A35`, the no-fake/voice grounding, the admin Content tab + Maya tool shell.
- Identity guards in the shoot engine (reuse for face slides).

## What to RETIRE / supersede
- The next/og renderer as the slide DESIGNER (white `Frame`/lesson-card layouts, the
  before/after coded frame, the SVG accent compositor as the primary path). Do not use white
  typographic cards as output unless Sandra explicitly asks. Keep the route only if trivially
  needed for non-image text, otherwise retire.
- The per-slide composited-callout approach is replaced by model-rendered overlays.

## Data layer
- ✅ Reel screenshots: `content_reel_references` (built, 185 refs).
- **NEW (Claude to ingest): style-reference library** from Sandra's approved ChatGPT slides
  (`~/Desktop/Selfie Tutorial Carousels ChatGPT/`). Upload to Blob (`content-kit/style-references/`)
  + a small `content_style_references` table (id, image_url, label, created_at). These are the
  style anchors for step 2.

## Build (Codex)
- Rework the tutorial generation path so each slide is a gpt-image-2 `images.edit` call with
  (base frame + style ref + optional selfie) → 1080x1350 PNG, per the workflow above.
- Slide plan (cover, mistake, step, before/after, CTA) stays as a CONTENT plan; each plan item
  becomes one image-model call, not a coded frame.
- Maya tool returns the finished PNG slides for download. No auto-post.
- Prompt must instruct: preserve screenshot meaning + identity; redesign overlays only; SSELFIE
  editorial style; the style-ref image defines the look.

## Acceptance
- Output slides look like Sandra's approved ChatGPT carousels: full-bleed dark editorial, real
  screenshots/photos as the base, serif hero + minimal sans + muted oxblood callouts, integrated
  (not white-card) step panels. 1080x1350 PNG, downloadable.
- Real screenshots' meaning/values preserved (prompt-enforced) and Sandra reviews before posting.
- Identity preserved on face slides (no drift). No white cards, no emoji/green/bright-red/Canva.
- "elevate/elevated" never appears. Nothing auto-posts.

## Open question for Sandra (confirm before Codex rebuilds)
This replaces the rendering engine we just shipped. Confirm: (a) retire the white-card renderer as
default, (b) the per-slide reference recipe above is right, (c) OK to send real screenshots into the
model (preserve-by-prompt + your manual review).

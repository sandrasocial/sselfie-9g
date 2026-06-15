# CONTENT-CAROUSEL-01 - Tutorial Carousel Mode (extend content-kit, no new system)

OWNER: Codex (Sandra approves merge)

Status: spec ready. Source: tutorial-content-engine research 2026-06-15. DO NOT start until
Sandra says go. **Phase 1 only** (on-demand tutorial carousels). Auto-pull/auto-batch/fal are
later phases, scoped at the bottom, NOT in this spec.

## Goal
Let Sandra produce premium editorial tutorial carousels (selfie / iPhone-settings / editing /
before-after / CTA) on demand, in her structure, reusing her tutorial screenshots and a freshly
generated "result" image in new worlds (location / outfit / lighting). She always posts manually
(downloads the rendered PNGs). This is the in-app version of her ChatGPT "Tutorial Carousel
Studio" workflow.

## Hard rule: extend System 1, do NOT build a parallel studio
The carousel feature lives in `lib/content-kit/*` + the next/og renderer + admin Maya. Research
confirmed ~80% already exists there. Build by extension only. Do NOT build on the member-facing
app-v3 layered-image overlay (System 2) — it's single-image, client-canvas, text-only, and has no
deck/DB/screenshot model.

## Reuse foundation (already built — verified)
- `lib/content-kit/carousel-generator.ts` `generateCarousels({sourceShootId, topic, overlayUrls,
  imageUrls})` — deck writer, already round-robins screenshots onto slides (`applyShootImages`).
- `lib/content-kit/types.ts` — `CarouselSlide` (kinds hook/step/list/quote/cta/photo/grid),
  `ContentOverlayAsset` (screenshot-on-slide with placement), `CarouselDeck`.
- `app/api/admin/content-kit/render/[id]/[slide]/route.tsx` — next/og renderer, 1080x1350,
  `Frame`/`PhotoFrame`/`GridFrame`, serif (Cormorant) + sans (Inter), `OverlayAssets` already
  draws screenshots as bordered editorial cards.
- `app/api/admin/content-kit/story/[id]/[slide]/route.tsx` — **`Squiggle`, `KeywordCircle`,
  `Arrow` SVG primitives already exist here** (take a `color` prop). These are the burgundy
  callouts. Port them, do not reinvent.
- `lib/content-kit/shoot-generator.ts` `refineShoot`/`extendShoot`/`generateShotImage` — new-world
  result images on gpt-image-2 with identity guards (same face, new location/outfit/lighting).
- Admin Maya tool `create_admin_carousel` at `app/api/app-v3/maya/chat/route.ts:601`; result card
  `CarouselCard` in `components/app-v3/admin-content-tool-card.tsx`.
- Grounding: `lib/content/grounding.ts` (CONTENT-GROUNDING-01) — voice, no-fake, proof, funnel.

## Phase 1 build items

### 1. Tutorial carousel template + generator mode
- Add a tutorial mode to `generateCarousels` (a `mode: "tutorial"` param or a sibling
  `generateTutorialCarousel`), producing Sandra's structure:
  cover/hook · bad-example (problem) · setting-stack steps (back camera / portrait / 2x / contour
  light / exposure / focus) · composition tip · pose tip · before ("from this") · after ("to
  this") · edit/preset · CTA.
- Ground the prompt in `lib/content/grounding.ts` (voice + no-fake + funnel) AND the tutorial
  brand rules from Sandra's ChatGPT brief: luxury editorial, serif hero word huge, short
  swipe-stopping text, NO red circles / green checks / emojis / Canva look, keep iPhone UI
  screenshots recognizable, don't cover the face except on an intentional "bad example" slide.
- CTA keyword per offer (her formula + the funnel): COMMENT KIT (selfie starter kit), COMMENT
  PROMPT (AI prompts / Vault), COMMENT PRESET (editing). Editorial, not loud.

### 2. Slide-count + new slide kind
- Raise the System 1 slide cap to support up to 10 tutorial slides (`SLIDE_RULES` in
  `carousel-generator.ts:23` currently "7 to 9"). (Note: app-v3's `MAX_CAROUSEL_SLIDES = 6` is
  System 2 / member-facing, leave it.)
- Add `before-after` to `CarouselSlideKind` (`types.ts`) and a `BeforeAfterFrame` in the render
  route alongside `PhotoFrame`/`GridFrame` (the renderer already switches on `slide.kind`).

### 3. Editorial callouts (the burgundy arrows/circles/underlines)
- Port `Squiggle`, `KeywordCircle`, `Arrow` from the story route into a shared
  `lib/content-kit/accents.tsx` (or into the carousel render route).
- Drive them off a new optional slide field, e.g. `accents?: { type: "circle"|"arrow"|"underline";
  target: string; color?: string }[]`. Default color = the burgundy token (below).
- Replace any "red circle / arrow" intent with these refined callouts. Never place a callout over
  the face except on a "bad example" slide.

### 4. Burgundy accent token (tutorial-only) — Sandra approved 2026-06-15
- Add ONE muted oxblood/burgundy token, used ONLY for tutorial-carousel callouts (and optionally a
  thin tutorial accent line). Do not use it anywhere else in the brand.
- **Recommended hex: `#6E2A35` (muted oxblood).** Alternatives if Sandra prefers: `#7B3B45`
  (softer) or `#5C2730` (deeper graphite-burgundy). **Sandra confirms the exact hex before merge.**
- Define it next to the existing render-route token block (`render/[id]/[slide]/route.tsx:13-19`
  and `story/[id]/[slide]/route.tsx:13-17`) and record it in `docs/SSELFIE_DESIGN_SYSTEM.md` as
  "tutorial-carousel accent only." Keep all other slides neutral (obsidian/porcelain/smoke).

### 5. Relax the image source (one result image + screenshots, no full shoot required)
- Today `resolveShootImages` throws if `< 2` approved shots. Allow a tutorial carousel to be built
  from a single "result" image + arbitrary screenshot Blob URLs via the existing `imageUrls` /
  `overlayUrls` params, without forcing a Shoot Studio shoot first. Small relaxation, not a rebuild.

### 6. New-world result image (the "same method, new fantasy")
- Let the tutorial flow optionally request the "after"/result image rendered in a new world
  (location/outfit/lighting) by chaining the existing `extendShoot`/`refineShoot` on gpt-image-2,
  identity-locked (keep face/body, change scene/outfit). This is what makes carousels feel new
  without reshooting. Reuse the shoot engine; do not add a new generator.
- The "ChatGPT turned my selfie into this" bridge = include a result/photo slide showing one
  selfie → editorial result. Already supported by the photo slide + result image.

### 7. Maya surface
- Add `create_admin_tutorial_carousel` (or a `mode:"tutorial"` arg on `create_admin_carousel`) and
  reuse `CarouselCard` rendering + per-slide download links as-is. Maya should: confirm the topic,
  propose the slide order, generate, render, return downloadable PNGs + caption. No auto-post.

## Acceptance
- Sandra can ask Maya for a tutorial carousel by topic and get a 10-slide editorial deck in her
  structure, with her screenshots composited, a fresh new-world result image, refined burgundy
  callouts (not red circles), an editorial CTA with the right keyword, and a caption in her voice.
- Output is downloadable PNGs (1080x1350 + 1080x1920 cover). Nothing auto-posts.
- No parallel system: all of it lives in `lib/content-kit/*` + the existing renderer + admin Maya.
- Burgundy token exists ONLY for tutorial callouts; rest of the brand unchanged.
- Voice/no-fake/funnel come from `lib/content/grounding.ts`; "elevate/elevated" never appears.
- Existing carousel/story tests pass; add tests for the tutorial template shape, the before-after
  kind, and the accent field. Lint + build clean.

## Dependencies / sequencing
- Depends on CONTENT-GROUNDING-01 (grounding module) for voice/proof/funnel.
- Complementary to MAYA-FIX-03 (editable overlay layer) but independent: the carousel renderer is
  System 1 (next/og, server-side), separate from the app-v3 layered-image work.
- Prerequisite for the "winners" auto-suggestions (Phase 2, below): verify the Instagram
  connection is the RIGHT account with insights scope, or the winners feed is empty. Not required
  for manual Phase 1 use.

## Out of scope (future phases — do NOT build here)
- **Phase 2 (auto-engine):** Maya proactively flags repost-due winners from `ig_media_snapshots`
  and pre-generates a weekly batch into a review queue; optional scheduled Cowork/Claude Code
  driver; optional fal.ai batch lane for cost/scale (gpt-image-2 stays the likeness anchor; A/B on
  Sandra's face before any switch; gate on skin texture per no-fake).
- **Phase 3 (old-image reuse):** add Graph API media fields (`media_url`, `children`), download to
  Blob (IG URLs expire), and a paginated backfill to reach the old catalog. Only if Sandra wants
  exact old visuals instead of regenerating.

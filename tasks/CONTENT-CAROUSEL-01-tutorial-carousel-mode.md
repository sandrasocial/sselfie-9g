# CONTENT-CAROUSEL-01 - Tutorial Carousel Mode (extend content-kit, no new system)

OWNER: Codex (Sandra approves merge)

Status: **READY FOR CODEX** (Sandra approved the build 2026-06-15). Phase 1 = on-demand tutorial
carousels. Auto-batch/fal scoped out (Phase 2).

## Division of labor
- ✅ **DONE by Claude (data layer):** the offline reel-reference extractor + the
  `content_reel_references` table, populated and verified live (see item 1). Codex reads it.
- **Codex builds (this spec):** the in-app tutorial carousel feature — generator mode, slide
  kinds, callouts, burgundy token, the render split, and the Maya tool that LISTS references from
  `content_reel_references` and feeds chosen `image_url`s into `generateCarousels`.
- One open input from Sandra: confirm the burgundy hex (`#6E2A35` recommended). Use `#6E2A35` as
  provisional if unconfirmed at build time — it's a one-line token change.

## Goal
Let Sandra produce premium editorial tutorial carousels (selfie / iPhone-settings / editing /
before-after / CTA) on demand, in her structure, WITHOUT reshooting. Reuse her best reels as
reference, keep her face via selfies, and regenerate "same method, new fantasy" (new
locations/outfits/lighting). She always posts manually (downloads the rendered slides).

## Hard rule: extend System 1, do NOT build a parallel studio
The admin carousel feature lives in `lib/content-kit/*` + the next/og renderer + admin Maya.
~80% already exists there. Build by extension only. Do NOT build on the member-facing app-v3
layered-image overlay (that's a separate, member-only surface).

---

## Sandra's locked rulings (2026-06-15)
1. **Hybrid text rendering, split by slide type** (research-backed; gpt-image-2 is now ~99%
   accurate on SHORT text but garbles long text and can corrupt real screenshots):
   - **Cover + result/transformation slides (generated scenes): gpt-image-2 renders the slide
     WITH the short headline baked in.** Looks integrated; matches; short text is reliable.
   - **Real iPhone-settings screenshots: keep the screenshot PIXEL-EXACT, composite callouts on
     top** (never let gpt-image-2 redraw a real settings screen — it can change the actual
     values and teach the wrong setting). Sandra's explicit choice.
   - **Long step text: composited** (deterministic, correctly spelled, real brand font).
2. **fal.ai = Phase 2** (future cost/scale lane). gpt-image-2 stays the generation engine now.
3. **Burgundy accent approved, tutorial-only.** Recommended hex `#6E2A35` (alts `#7B3B45`,
   `#5C2730`); Sandra confirms exact hex before merge.
4. **Reel-reference extraction runs OFFLINE (Cowork/Claude Code batch), not in the app.**

## Instagram connection: VERIFIED (no fix needed)
Live DB check 2026-06-15: active connection is `@sandra.social` (business, `instagram_manage_
insights` working, token valid to 2026-08-12). 44 reels already carry real view/save data, so the
"winners" feed has real fuel. The old "wrong account" concern is resolved. The username
auto-suggest layer (Phase 2) can rely on this.

---

## Reuse foundation (verified to exist)
- `lib/content-kit/carousel-generator.ts` `generateCarousels({sourceShootId, topic, overlayUrls,
  imageUrls})` — deck writer; already round-robins screenshots onto slides.
- `lib/content-kit/types.ts` — `CarouselSlide` kinds, `ContentOverlayAsset`, `CarouselDeck`.
- `app/api/admin/content-kit/render/[id]/[slide]/route.tsx` — next/og renderer (1080x1350),
  serif `Frame`/`PhotoFrame`/`GridFrame`, `OverlayAssets` already composites screenshots as
  bordered cards. **This is the compositor for screenshots + step text.**
- `app/api/admin/content-kit/story/[id]/[slide]/route.tsx` — `Squiggle`, `KeywordCircle`,
  `Arrow` SVG callout primitives already exist (take a `color` prop). Port these.
- `lib/content-kit/shoot-generator.ts` `generateShotImage`/`refineShoot`/`extendShoot` —
  gpt-image-2 `images.edit` with multi-reference + identity guards. **This is the engine for the
  generated scene slides and the new-world restyling.**
- Admin Maya tool `create_admin_carousel` (`app/api/app-v3/maya/chat/route.ts:601`); result card
  `CarouselCard` (`components/app-v3/admin-content-tool-card.tsx`).
- Grounding: `lib/content/grounding.ts` (CONTENT-GROUNDING-01) for voice/no-fake/proof/funnel.

---

## Phase 1 build items

### 1. Reel-reference batch + storage — ✅ DONE by Claude 2026-06-15 (data layer)
This upstream piece is built, run, and live in production. Codex does NOT need to build it; it
just READS the table below.
- `scripts/extract-reel-references.ts` — offline (ffmpeg local, not serverless). Ranks reels from
  `ig_media_snapshots` by views, excludes ChatGPT/prompt reels (`EXCLUDE_RE`), fetches each
  reel's `media_url` on demand, downloads + ffmpeg scene-extracts per-step stills, and (with
  `UPLOAD=1`) pushes them to Blob (`content-kit/reel-references/<media_id>/`) + inserts rows.
  Idempotent per `media_id`. Re-run any time: `UPLOAD=1 REELS_LIMIT=N npx tsx scripts/extract-reel-references.ts`.
- `scripts/setup-content-reel-references.ts` — creates the table (run, live).
- **Storage = `content_reel_references`** (admin-global, no user_id — same family as
  `content_shoots`/`content_carousels`). Columns: `id, media_id, permalink, hook_line, views,
  kind ('cover'|'scene'), scene_index, image_url (public Blob), label, created_at`.
- Currently populated: 15 tutorial reels, 185 refs (15 covers + 170 step stills). Verified live.
- These stills are the "keep the steps correct" layer: INPUTS to generation and the source of the
  real-screenshot slides. `image_url` values are already valid `*.public.blob.vercel-storage.com`
  URLs, so they pass `generateCarousels`' `isAllowedImageUrl` and can be fed straight into
  `imageUrls`/`overlayUrls` with no generator change.

### 2. Generation pipeline (the "same method, new fantasy" engine)
- Inputs: scene-reference screenshots (from step 1 or Sandra's uploads) + 1-3 clear face selfies.
- Use the existing `generateShotImage`/`extendShoot` (gpt-image-2 `images.edit`, multi-reference,
  ≤5 inputs, put the face first for high-fidelity identity) to recreate the look in NEW
  locations/outfits/lighting while keeping her face/body. Identity guards already exist — reuse.
- This produces the cover + result/transformation imagery for the carousel.

### 3. Tutorial carousel template + generator mode
- Add a tutorial mode to `generateCarousels` (a `mode:"tutorial"` param or sibling fn) producing
  Sandra's structure: cover/hook · bad-example · setting-stack steps · composition tip · pose tip
  · before ("from this") · after ("to this") · edit/preset · CTA.
- Ground copy in `lib/content/grounding.ts` + the tutorial brand rules (luxury editorial, serif
  hero word huge, short swipe-stopping text, NO red circles/green checks/emojis/Canva look, keep
  iPhone UI recognizable, don't cover the face except an intentional "bad example" slide).
- CTA keyword per offer/funnel: COMMENT KIT / PROMPT / PRESET. Editorial, not loud.

### 4. Rendering split by slide type (implements ruling #1)
- **Generated scene slides (cover, result/before-after):** the gpt-image-2 output IS the slide,
  with the short headline baked in via the prompt (quote the exact words, `quality:"high"`,
  `input_fidelity:"high"`, name placement). Placed full-bleed as a `photo` slide.
- **Real-screenshot slides (iPhone settings):** the untouched screenshot is the slide background
  (via `OverlayAssets`/full-bleed), and the next/og renderer composites the burgundy callouts +
  any labels ON TOP. The screenshot pixels are never sent to gpt-image-2 for redraw.
- **Step-text slides:** next/og serif `Frame` (already exists), composited, real font.

### 5. New slide kind + callouts + slide count
- Add `before-after` to `CarouselSlideKind` (`types.ts`) + a `BeforeAfterFrame` in the renderer.
- Port `Squiggle`/`KeywordCircle`/`Arrow` from the story route into shared
  `lib/content-kit/accents.tsx`, driven by a new optional slide field `accents?: {type, target,
  color?}[]`, default color = the burgundy token. Never over the face except "bad example".
- Raise the System 1 slide cap to support up to 10 tutorial slides (`SLIDE_RULES`
  `carousel-generator.ts:23` currently "7 to 9"). Leave app-v3's `MAX_CAROUSEL_SLIDES` alone.

### 6. Burgundy accent token (tutorial-only, Sandra approved)
- Add ONE muted oxblood token used ONLY for tutorial callouts. Define it next to the render-route
  token blocks and record in `docs/SSELFIE_DESIGN_SYSTEM.md` as "tutorial-carousel accent only."
  Recommended `#6E2A35`; Sandra confirms exact hex before merge. Rest of brand stays neutral.

### 7. Relax the image source
- Allow a tutorial carousel from a single result image + arbitrary screenshot Blob URLs via the
  existing `imageUrls`/`overlayUrls` params, without forcing a full Shoot Studio shoot first
  (`resolveShootImages` currently throws if `<2` approved shots). Small relaxation.

### 8. Maya surface
- Add `create_admin_tutorial_carousel` (or `mode:"tutorial"` on the existing tool); reuse
  `CarouselCard` + download links. Maya: confirm topic → propose slide order → generate (scenes
  via gpt-image-2, screenshots composited) → render → return downloadable slides + caption. No
  auto-post.

## Relationship to MAYA-FIX-03 (no duplication)
FIX-03's editable text layer is the MEMBER-facing app-v3 surface. The admin tutorial carousels use
the System-1 next/og renderer for compositing. gpt-image-2 (generated scenes + short baked text)
and the composited path (real screenshots + step text) do DIFFERENT jobs inside ONE pipeline —
complementary, not competing. Do not revert FIX-03; do not route admin carousels through it.

## Acceptance
- Sandra asks Maya for a tutorial carousel by topic and gets a ~10-slide editorial deck: cover +
  result slides generated by gpt-image-2 with clean baked headlines; real iPhone-settings
  screenshots kept pixel-exact with composited burgundy callouts; step text composited in her
  serif; an editorial CTA with the right keyword; caption in her voice (from grounding).
- New-world variations (location/outfit/lighting) generated from face selfies + scene references,
  identity preserved.
- The offline reel-reference batch can rank her reels, extract per-scene stills, and store them as
  references.
- No real screenshot is ever redrawn by AI. Nothing auto-posts. "elevate/elevated" never appears.
- All in `lib/content-kit/*` + next/og renderer + admin Maya. Tests for tutorial template shape,
  before-after kind, accent field, and the screenshot-preserve path. Lint + build clean.

## Out of scope (Phase 2+ — do NOT build here)
- Auto-engine: Maya proactively flags repost-due winners and pre-generates weekly batches into a
  review queue; scheduling. fal.ai batch lane (A/B on Sandra's face first; gate on skin texture).
- In-app (serverless) reel/video processing — keep extraction offline.

# STORY-SEQUENCE-01 — Suite Maya: full story sequence (multi-slide), with sequence/single option

**Owner:** Claude (spec) → me or Codex (build)
**Status:** Ready to build. Engine already done.
**Scope:** Suite Maya only (`app/api/app-v3/maya/*`, `lib/app-v3/*`, `components/app-v3/*`). Admin content-kit is untouched.

## Goal
Let a member generate a **story sequence** (a multi-slide set, 9:16) the same way Maya builds a carousel — one consistent person + one world across slides (hero-anchored) — and let them choose **full sequence** vs **single story slide**.

## What's already in place (do NOT rebuild)
- **Hero-anchored multi-slide generation** is live (`app/api/app-v3/maya/generate/route.ts`): any graphic set with `graphicJobs.length > 1` renders slide 1 first, uploads it, then anchors the rest to it. A story sequence automatically gets this.
- **Single-selfie identity anchor** is live (`buildAppGraphicRedesignJobs` uses `referenceUrls[0]`), so faces stay consistent.
- The carousel already produces a multi-slide plan from `brief.graphic` (`effectiveCarouselSlides`), validated by `validateCustomerCarouselBrief`.

A story sequence is, mechanically, **a carousel rendered at 9:16**. Reuse the carousel plan + pipeline; only the aspect ratio (and a few format checks) differ.

## Build steps

### 1. Format
- `components/app-v3/types.ts`: `OutputFormat` += `"story-sequence"`.
- `app/api/app-v3/maya/generate/route.ts`:
  - `VALID_FORMATS` += `"story-sequence"`.
  - `isRedesignGraphicFormat` += `"story-sequence"` (so it goes through the graphic redesign + hero-anchor path).
  - `categoryForGraphicFormat("story-sequence")` → **`"photoshoot-carousel"`** (reuse the carousel anchors + identity-scene grounding — do NOT use the `"story-sequence"` category, which carries the admin overlay-only/preserve grounding).
  - Apply the same multi-slide validation as carousel: run `validateCustomerCarouselBrief` for `format === "story-sequence"` too (rejects thin plans so Maya is asked for a fuller one).

### 2. Size (the only real engine change)
- `lib/content-kit/slide-redesign-generator.ts`: add an optional `size?: string` param to `redesignContentSlideToBuffer` (and pass-through in `redesignContentSlide`), defaulting to `category === "story-sequence" ? STORY_SIZE : CAROUSEL_SIZE`.
- In the generate route's graphic block, pass `size: format === "story-sequence" ? (process.env.APP_V3_PORTRAIT_SIZE || "1024x1536") : undefined` so story sequences render 9:16-tall while carousels stay 4:5.

### 3. Plan (multi-slide)
- `lib/app-v3/prompt-compiler.ts`: in `buildGraphicRedesignSlides`, treat `format === "story-sequence"` like `"carousel"` (use `effectiveCarouselSlides` → up to `MAX_CAROUSEL_SLIDES`). Same for `conceptOpenAISize` / `conceptRequestSize` / `compileConceptJobs` wherever they branch on `"carousel"`.
- **Graceful fallback:** if Maya only returns one slide for a story sequence, it renders as one slide (no crash).

### 4. Maya planning (the part that needs care)
- `app/api/app-v3/maya/chat/route.ts`: the creative-plan schema (`slides[]`, `slideCount`, etc.) is general. Make Maya produce a multi-slide plan when the chosen format is `"story-sequence"` (treat it like carousel for planning), and tell her story sequences are vertical 9:16 with quick, emotional beats (vs the carousel's educational arc). Keep slide count 3–7 for stories.

### 5. UI — the sequence/single choice
- `components/app-v3/visual-front-door.tsx`: the existing `"story-slide"` starter stays = **single story slide**. Add a `"story-sequence"` starter labelled **"Story sequence"** (line: "A full multi-slide story in one cohesive world."). That IS the sequence/single choice — two starters.
- Make sure the concierge → chat → generate flow passes `format: "story-sequence"` end to end (it follows the same path as `carousel`).

### 6. Tests
- Mirror `tests/app-v3-carousel-planning.test.ts`: assert `buildGraphicRedesignSlides("story-sequence", …)` returns multiple slides from the plan, and that the generate route routes `"story-sequence"` through the hero-anchored graphic path at the 9:16 size.
- Confirm carousel + single story-slide behavior is unchanged.

## Acceptance
- Member picks "Story sequence" → Maya plans 3–7 vertical beats → generates a hero-anchored 9:16 set with one consistent person + world.
- "Story" (single) still makes one slide.
- Carousel unchanged.
- A thin plan degrades to fewer slides, never an error.

## Risk notes
- Touches LIVE member generation. Test a real member carousel + single story + new sequence before/after.
- The Maya-planning step (4) is the only non-mechanical part; everything else is format plumbing the carousel already proves.

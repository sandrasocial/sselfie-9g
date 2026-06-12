# CONTENT-VISUALS-01 — Content Kit (automated content visuals, Sandra approves + posts manually)

*Approved by Sandra 2026-06-12. Owner: Claude (Cowork). Status: Phases 1+2 LIVE 2026-06-12.*

## Why

Sandra's viral DNA (docs/strategy/IG_GROWTH_OS_2026-06-11.md) needs ~5 posts/week. Her filmed
tutorials cannot and should not be automated (originality scoring + no-fake doctrine). Everything
around them can: carousels, before/after demo images, reel covers, story slides, captions.
Target: cut 60-70% of her content production time without one automated post going out
un-approved. **Nothing ever auto-posts. Sandra posts manually. This is locked.**

## Pipeline shape

Weekly content brief (exists, `analytics_reports.content_brief_weekly`)
→ Content Kit generator expands it into finished visuals
→ `/admin/content-brief` shows the kit for review
→ Sandra downloads + posts.

## Phase 1 — Carousel engine (✅ LIVE 2026-06-12, commit a3e0f584)

- `content_carousels` table: id, created_at, title, slug, caption, slides jsonb, status
  ('draft'|'approved'|'posted'), source_period_start. Setup: `scripts/setup-content-carousels.ts`.
- `lib/content-kit/types.ts` — slide schema: kind 'hook'|'step'|'list'|'quote'|'cta', eyebrow,
  title, body, items, footer.
- `lib/content-kit/carousel-generator.ts` — reads latest weekly brief payload + top
  `ig_media_snapshots` hooks, expands the brief's carousel pieces into full 7-9 slide decks.
  LLM: **OpenRouter primary** (`anthropic/claude-sonnet-4.5`, funded), direct Anthropic fallback.
  Voice: imports `SANDRA_VOICE_RULES` from `lib/content-engine/brief-generator.ts` (now exported).
- Render: `app/api/admin/content-kit/render/[id]/[slide]` — `ImageResponse` from `next/og`
  (satori, no chromium), 1080x1350 PNG, design-system tokens (porcelain/obsidian/stone),
  Cormorant Garamond display + Inter detail. Fonts committed in `assets/fonts/`.
- APIs: POST `/api/admin/content-kit/generate`, GET list + PATCH status on
  `/api/admin/content-kit`. Admin-gated (ssa@ssasocial.com session).
- UI: merged INTO `/admin/content-brief` (Admin Data Contract rule 5: no new admin page) —
  "Carousel kit" section: generate button, slide previews, per-slide download, caption copy,
  approve/posted buttons.

## Phase 2 — Demo image engine (✅ LIVE 2026-06-12, commit 18d028f5)

- Sandra's reference selfies (her `user_avatar_images` rows, same library as /app) + an editing
  prompt → gpt-image-2 (`openai.images.edit`, identical call shape to app-v3) → after image +
  1080x1350 side-by-side composite, both in Vercel Blob, rows in `content_demo_pairs`.
- Identity guard appended server-side to EVERY prompt: face stays natural/recognizable (no-fake
  doctrine cannot be bypassed by prompt wording). Setup: `scripts/setup-content-demo-pairs.ts`.
- `lib/content-kit/demo-generator.ts` · `/api/admin/content-kit/demos` (GET/POST/DELETE,
  admin session or CRON_SECRET bearer) · UI section "Before · after demos" on
  `/admin/content-brief` with selfie picker + 5 preset editing prompts (cinematic grade,
  85mm lens, warm film, outfit, location).
- Each pair doubles as: carousel slides, reel cover, story frame, and live proof of the product.

## Phase 3 — Motion + UGC-style teaching videos (RESEARCHED, NOT STARTED)

Two tracks, both on fal.ai (account exists):

1. **B-roll**: Kling 3.0 image-to-video on the best gpt-image-2 stills (multi-shot,
   consistent elements).
2. **Seedance 2.0 teaching/demo videos** — method from @byjoeym's guide
   (https://joeymulcahyguides.notion.site/Hack-UGC-w-Claude-Seedance-2-0-3662b10bd516816e8ffbf73ed0393acc):
   - Claude authors a structured multi-shot Seedance prompt: opening style line, scene,
     reference tags (@Image1 headshot · @Image2 body · @Image3 product), timecoded action
     beats, dialogue, close. One fal call returns the finished multi-shot video, no stitching.
   - Cost ~$0.30/sec at 720p (15s ≈ $4.50).
   - **Do NOT describe the product visually in the prompt** — the reference image is ground
     truth; visual descriptors cause drift.
   - **Seedance blocks realistic face uploads.** Talent features are described in text, so
     likeness is approximate. Therefore: Sandra's face stays REAL filmed footage; Seedance
     renders the OVERLAY/demo content (Maya walkthroughs, "what your brand video could look
     like" examples for her audience's products/services). This keeps the no-fake doctrine
     intact: AI makes the examples, Sandra stays Sandra.
   - Build shape: a `/seedance-demo` skill-style generator script + kit attachment. Gate on
     Phase 1+2 being used weekly first.

## Visual format doctrine (audited live vs @prompts.ig, 2026-06-12)

The AI-prompt niche is photo-first: @prompts.ig decks = full-bleed photo hook with one bold
line, pure photo proof middles (often 2x2 grids of the same character across scenes), photo
CTA slide with the comment keyword. Text-only slides have no thumb-stop power in this niche.
BUT Sandra's 45k-save tutorials prove clean numbered steps drive saves. So the locked deck
layout is a **hybrid**:

photo hook (her face, scrim, one serif line) → photo proof block (demo/before-after images,
no text) → clean teaching slides (steps/list, save-bait) → photo CTA (comment keyword).

Differentiation, do not drift: her typography (Cormorant serif on scrim), her tokens, and HER
recognizable face in every scene — "keeps your face" as visible proof, which faceless
aggregators cannot copy. Implementation: `imageUrl` on slides + `photo` kind + PhotoFrame
renderer; kit UI photo picker feeds on Phase 2 demo images + her selfies (tap order = hook →
proof → CTA).

## Hard rules

- No auto-posting, ever. Status flow ends at Sandra's hands.
- All copy obeys SANDRA_VOICE_RULES + no-fake doctrine. No em-dashes in any rendered slide.
- Design system tokens only (docs/SSELFIE_DESIGN_SYSTEM.md). No gold, no gradients on buttons.
- Money/metrics shown anywhere obey the Admin Data Contract.

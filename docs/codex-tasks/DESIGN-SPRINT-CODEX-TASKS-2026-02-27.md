# Codex Design Sprint Tasks — Feb 2026

**Generated:** 2026-02-27
**Source:** North (Project Manager) + v2 HTML design prototypes in output/design/
**Principle:** Each ticket references a specific v2 prototype. Preserve ALL credit logic, API routes, Stripe flows, and generation pipelines. Visual redesign only.

---

## Context

Context: Design sprint following UX audit + v2 prototype approval.
Last actions: North + 8 subagents produced full v2 redesign prototypes. Sandra approved.
v2 prototypes live in: output/design/v2-*.html
Activation tasks A-01 to E-03 from RESEARCH-SPRINT still in queue.
Files touched: output/design/* (design only; zero code changes so far)
Outstanding issues: Current app is light/white SaaS. Target is dark editorial glassmorphic.
Next steps: UX-01 first, then UX-02 to UX-07.
Combined order: UX-01 -> A-01 -> A-02 -> UX-02 -> UX-03 -> B-01 -> UX-04 -> UX-05 -> UX-06 -> UX-07

---

## Design System (read before every ticket)

5 colors only: Obsidian #0a0a0a | Porcelain #ffffff | Pearl #f5f5f5 | Smoke #666666 | Whisper #e5e5e5
2 fonts only: Cormorant Garamond (headers, weight 200-300, UPPERCASE) + Inter (body, 300-500)
App mode: glassmorphic. Glass card: rgba(255,255,255,0.04) + blur(20px) + rgba(255,255,255,0.08) border.
ZERO icons. ZERO emojis. Mobile-first 375px minimum.
Landing mode: editorial magazine. #0a0a0a throughout. Massive Cormorant display type.

---

## TASK UX-01: Design System Foundation

Priority: CRITICAL - do this before any other UX ticket
Visual ref: output/design/DESIGN-SYSTEM-v2.md

What to build:
1. app/globals.css: set --background #0a0a0a, --foreground #ffffff.
   Add CSS vars: --color-obsidian, --color-porcelain, --color-pearl, --color-smoke, --color-whisper,
   --glass-bg rgba(255,255,255,0.04), --glass-border rgba(255,255,255,0.08),
   --glass-input-bg rgba(255,255,255,0.06), --glass-input-border rgba(255,255,255,0.12),
   --radius-card 20px, --font-display 'Cormorant Garamond', --font-body 'Inter'.
   Add Google Fonts import: Cormorant Garamond 200/300, Inter 300/400/500.
   Add utility classes: .glass-card .glass-input .display-header .body-text .label-small

2. lib/design-tokens.ts (new file): TS constants for COLORS, GLASS, TYPOGRAPHY

3. tailwind.config.ts: extend with 5 brand color tokens. Extend only, never remove existing.

4. Run pnpm build. Zero errors required before marking Done.

Files: app/globals.css, lib/design-tokens.ts (new), tailwind.config.ts
Constraint: NO component file changes in this ticket. Tokens only.

---

## TASK UX-02: Maya Screen Redesign

Priority: High - core product
Visual ref: output/design/v3-maya.html  ← UPDATED (was v2-maya-chat.html + v2-instagram-previews.html)
Feature doc: docs/features/maya.md

UI only. Zero changes to generation logic, API routes, credit costs.

SCREENS IN PROTOTYPE (v3-maya.html):
  Screen 1: Classic Mode — Empty State (first-time activation fix: guided prompts vs blank chat)
  Screen 2: Classic Mode — Active Chat (messages + generated image card + photoshoot carousel)
  Screen 3: Pro Mode — Concept Cards (reference images strip + editable glass textarea prompts)
  Screen 4: Videos Tab (9:16 cards, "ANIMATE →" text overlay, generating state with spinner)
  Screen 5: Prompts Tab ("Inspiration" rebrand, category filters, one-click generate)
  Screen 6: Training Tab (model status, upload grid, in-progress state, membership gate)

CRITICAL DESIGN NOTE:
  Maya components are MOSTLY already dark-themed (header, tabs, input bar, quick prompts all correct).
  The main restyle targets are the generated image card, action row, concept cards, and video card shells.
  DO NOT refactor hooks, logic, or state management — CSS/className changes only.

CSS TOKENS (use these everywhere):
  --bg-base:       #0b0d10
  --glass-1:       rgba(255,255,255,0.04)
  --glass-2:       rgba(255,255,255,0.07)
  --glass-3:       rgba(255,255,255,0.10)
  --border-faint:  rgba(255,255,255,0.07)
  --border-subtle: rgba(255,255,255,0.12)
  --border-medium: rgba(255,255,255,0.18)
  --text-1: #ffffff | --text-2: rgba(255,255,255,0.75)
  --text-3: rgba(255,255,255,0.50) | --text-4: rgba(255,255,255,0.30)

DESIGN SPEC:
1. Background: #0b0d10 full bleed (update from #0a0a0a for consistency with v3 system)
2. Tab switcher (Classic/Pro/Videos/Prompts/Training/Feed-disabled):
   Inter 500 11px UPPERCASE 0.5em letter-spacing. Active: border-bottom 2px #ffffff. Inactive: text-[#666666].
   Feed tab: visible but muted/unclickable (tab-disabled opacity 0.4).
   NOTE: maya-tab-switcher.tsx is already correctly styled — no changes needed.
3. Chat messages:
   - User: right-aligned, background rgba(255,255,255,0.07), border rgba(255,255,255,0.12)
   - Maya: left, no background, text rgba(255,255,255,0.75)
   - Generated image: full-width glass card, border-radius 20px, border rgba(255,255,255,0.12)
   - Action row: text labels ONLY — "DOWNLOAD / FAVOURITE / PHOTOSHOOT" — NO icons
   - Action buttons: Inter 500 9px UPPERCASE 0.3em tracking, color rgba(255,255,255,0.50)
4. Photoshoot button: full-width block, Cormorant Garamond 200 16px UPPERCASE 0.3em tracking
   Text: "Create Photoshoot". Background glass-1, border rgba(255,255,255,0.12).
   After photoshoot: horizontal scroll 110px × 4:5 ratio photo thumbs with border-faint.
   Preserve InstagramPhotoCard/InstagramCarouselCard/InstagramReelCard logic — restyle shell only.
5. Concept cards (Pro mode):
   Card: background glass-1, border border-subtle, no border-radius (sharp edges)
   Image area: aspect-ratio 4/5, gradient placeholder
   Style name: Cormorant 200 15px UPPERCASE 0.25em tracking
   Prompt textarea: background glass-2, border border-subtle, Inter 300 12px, color text-2
   Action buttons: text-only Inter 500 9px UPPERCASE 0.3em tracking
   Reference images strip: 48×48px thumbs, border-subtle, + add button with dashed border
6. Videos tab: cards aspect-ratio 9/16, "ANIMATE →" text overlay (Inter 500 10px 0.35em),
   gradient overlay from bottom (transparent to rgba(0,0,0,0.65)), 2-column grid
   Generating state: spinner + "Animating" label, progress bar 2px height at card bottom
7. Prompts tab: rename section header to "Inspiration" (Cormorant 200)
   Add category filter chips (Inter 500 9px UPPERCASE), 2-column 4:5 card grid
   Each card: style name (Cormorant 200 12px), desc (Inter 300 10px), "Generate →" text button
   Add Academy deeplink card at bottom
8. Training tab: model status dot (green=ready, yellow=training, grey=none)
   Upload grid: 4-column 1:1 cells with + placeholder
   Progress bar: 3px height, fill #ffffff
   Membership gate card: Cormorant 200 "Membership Only", "Upgrade to Studio" glass button
9. Input bar: already correct (glass rgba(12,12,14,0.75), backdrop-blur, border-subtle, text-only send)
   Quick prompts chips: border-subtle, glass-1 background, Inter 300/400 10px
   Meta buttons (Settings / New Project / History): Inter 300 italic text-4, no border/bg

ACTIVATION FIX (Screen 1 — CRITICAL, solves 0% first-output rate):
   Replace blank chat with guided first-gen card showing 3 example prompts with emoji + text
   Add subtitle: "Your X free credits are ready."
   Keep quick-prompt chips above input as escape hatch
   Only collapse quick-prompts AFTER first image generated (current behavior: messages.length > 1 AND libraryTotalImages > 0 — already fixed in code as UX-ACT-01, confirm still in place)

PER-FILE CHANGES:

components/sselfie/maya-chat-screen.tsx:
  - Generated image rendering: wrap img + action row in glass card div (border-radius 20px)
  - Action row: remove all lucide icons, replace with text-only buttons (Download / Favourite / Photoshoot)
  - Photoshoot button: add photoshoot-btn class (Cormorant 200 uppercase glass)
  - Photo carousel: add 4:5 ratio, horizontal scroll, 110px thumb width
  - Empty state first-gen card: add guided-prompts list (3 emoji+text suggestions) above quick-prompts
  - Academy journey card: already uses glass-1 pattern — confirm correct

components/sselfie/maya/maya-tab-switcher.tsx:
  ALREADY CORRECT. border-[#ffffff] active, text-[#666666] inactive, letter-spacing 0.5em.
  No changes needed.

components/sselfie/maya/maya-header.tsx:
  ALREADY CORRECT. bg-[rgba(255,255,255,0.04)] backdrop-blur border-[rgba(255,255,255,0.08)].
  Credits pill: border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)]. No changes needed.

components/sselfie/maya/maya-unified-input.tsx:
  ALREADY CORRECT. Glass input pattern, text-only send button, no bg/border meta buttons.
  Confirm textarea: background rgba(255,255,255,0.06), border rgba(255,255,255,0.12).

components/sselfie/maya/maya-videos-tab.tsx:
  - Image/video cards: change aspect-ratio to 9/16 (from non-standard ratios)
  - "ANIMATE →" overlay: Inter 500 10px UPPERCASE 0.35em, bottom-of-card gradient overlay
  - Remove all lucide icon overlays from non-generating state (text label only)
  - Generating state: center spinner + "Animating" label + 2px progress bar at card bottom
  - Cost hint: add italic Inter 300 text below grid "3 credits · ~30–60s · Shows as Reel"

components/sselfie/maya/maya-prompts-tab.tsx:
  - Section header: rename to "Inspiration", use Cormorant 200 22px UPPERCASE
  - Add category filter row (All / Casual / Editorial / Luxury / Lifestyle / Fashion)
  - Prompt cards: 2-column grid, 4:5 aspect-ratio image, Cormorant 200 name, text-only generate btn
  - Add Academy deeplink card at bottom ("Match photo style to caption style → 3× saves")

components/sselfie/maya/maya-training-tab.tsx:
  - Status row: colored dot (green/yellow/grey) + status text Inter 500 0.35em
  - Upload grid: 4-column 1:1 cells, dashed + border for empty cells
  - Progress bar: 3px height, white fill, label text-4 italic below
  - Training CTA: Cormorant 200 uppercase glass button (disabled state opacity-40)
  - Membership gate: glass-1 card with "Membership Only" + "Upgrade to Studio" button

components/sselfie/concept-card.tsx:
  - Card background: glass-1 (rgba(255,255,255,0.04)) — remove white backgrounds
  - Image placeholder: gradient dark (linear-gradient 135deg)
  - Prompt textarea: glass-2 background, border-subtle, Inter 300 12px text-2
  - Style name: Cormorant 200 15px UPPERCASE
  - Action buttons: text-only Inter 500 9px UPPERCASE

Files NOT to touch: app/api/maya/**, lib/replicate*.ts, lib/training.ts, lib/credits.ts,
  any hooks in maya/hooks/, lib/maya/**, lib/credits.ts

---

## TASK UX-03: Academy Landing + Mini-Product Pages

Priority: High - needed before 300-member push
Visual ref: output/design/v2-academy-landing.html
Feature doc: docs/features/academy.md

UI only. Purchase flow logic unchanged.

1. app/academy/page.tsx redesign:
   Hero: Cormorant 200 display "FROM 12 EUR / TO A LIVE APP / IN 8 MONTHS."
   Products: numbered editorial list 01/02/03/04 (NOT a card grid).
   Each: large Cormorant number, Inter 500 uppercase name, Inter 300 Smoke description,
   Inter 500 Porcelain price, "Get it ->" text CTA.
   Stat block: large Cormorant numbers (180K+, 12 EUR, 8 months) with Inter 300 labels.
   Page: #0a0a0a throughout, 80px desktop padding, 24px mobile.

2. app/academy/products/[productId]/page.tsx:
   Hero: Cormorant 200 product name. What's included: Inter 300 list, no icon bullets.
   Price + purchase: glass button. Keep purchase flow EXACTLY as-is.

3. app/academy/success/page.tsx:
   Dark bg, Cormorant 200 confirmation header. Product-specific next-step CTA.

Files to touch: app/academy/page.tsx, app/academy/products/[productId]/page.tsx,
  app/academy/products/[productId]/purchase-button.tsx (styling only), app/academy/success/page.tsx
Files NOT to touch: app/api/academy/checkout/route.ts, any Stripe integration

---

## TASK UX-04: Gallery Screen Redesign

Priority: Medium
Visual ref: output/design/v2-gallery.html
Feature doc: docs/features/gallery.md

UI only. Zero API changes.

1. Background: #0a0a0a
2. Exact 4 filter tabs: Photos / Videos / Feed / Favourited. Inter 500 11px UPPERCASE.
3. Image grid: 3-col mobile, edge-to-edge thumbnails, no border-radius on cells.
4. Selection mode: semi-transparent overlay on non-selected, Porcelain checkmark text.
5. Videos tab: 9:16 proportion cards, "ANIMATE ->" text overlay.
6. Lightbox: rgba(0,0,0,0.92) overlay. Glass pill bar: "DOWNLOAD / FAVOURITE / DELETE" text only.
7. Empty states: "CREATE WITH MAYA ->" CTA.

Files to touch: components/sselfie/gallery-screen.tsx, gallery-filters.tsx, gallery-image-grid.tsx,
  gallery-selection-bar.tsx, components/sselfie/fullscreen-image-modal.tsx
Files NOT to touch: gallery/hooks/, app/api/gallery/**, app/api/images/**

---

## TASK UX-05: Feed Planner Screen Redesign

Priority: Medium - ship A-02 first or alongside
Visual ref: output/design/v3-feed-planner.html  ← UPDATED (v3 glassmorphic, 2026-02-28)
Feature doc: docs/features/feed-planner.md

UI only. Zero API or credit changes.

CRITICAL DESIGN NOTE — GLASSMORPHIC, NOT HARSH BLACK:
- Base background everywhere: #0b0d10 (dark slate-navy, NOT pure #0a0a0a)
- All glass cards: rgba(255,255,255,0.04-0.11) + backdrop-filter:blur(20-24px)
- Header: bg rgba(11,13,16,0.85) + backdrop-blur(20px) — NOT opaque #0a0a0a
- Modals: rgba(13,15,19,0.94) + backdrop-blur(40px)

FIVE SCREENS — all shown in v3-feed-planner.html:

SCREEN 1 — WelcomeWizard (welcome-wizard.tsx):
  3-step bottom sheet. Progress bar + step dots. Animated with Framer Motion.
  Step 1: 60 credits badge + "Welcome to Your Feed Studio".
  Step 2: 3 feature rows (Pick Style / Generate 9 / Download).
  Step 3: Credits bar + "Open My Feed Planner" CTA.

SCREEN 2 — Empty State (feed-view-screen.tsx, isPaidBlueprint):
  9-cell placeholder grid (ImageIcon in each cell) + "Your Feed Starts Here" card.
  "New Feed →" pill CTA opens FeedStyleModal.
  Credits card below (60 credits / 30 photos).

SCREEN 3 — Active Feed (instagram-feed-view.tsx):
  FeedHeader: glass bg, Instagram-style profile (avatar ring, stats, bio, highlights).
  Buttons: Write Bio / + New Preview / + NEW FEED → (Cormorant pill, paid only).
  FeedTabs: pill bar — Grid | Posts | Strategy | Pillars.
  Grid tab: 3x3 grid, mix of complete/generating/empty cells.
  Posts tab: post cards with thumbnail, caption preview, Enhance/Copy/Edit buttons.
  Strategy tab: posting cadence, content mix, hashtag set, engagement hooks.
  Pillars tab: 4 brand pillars with large editorial numbers (01/02/03/04).

SCREEN 4 — Free User (access.isFree):
  Tabs: Grid | Captions | Strategy | Pillars (NOT "Posts" — free gets "Captions").
  Grid: FeedSinglePlaceholder (1 post, not 9-post grid).
  Upsell card: Blueprint $47 / Studio $97 pricing.
  Captions: FeedCaptionTemplates (template library, not AI-generated).

SCREEN 5 — FeedStyleModal (feed-style-modal.tsx):
  7 style cards in 2-col grid (Dark & Moody, Beige, Light & Minimal, Luxury Future,
    Casual Bohemian, Athletic & Wellness, Coastal Aesthetics).
  Each card: 3x3 colour mini-grid + swatches + SELECT button.
  Variation picker (2-col grid, from /api/feed-planner/v2/variations?style=[x]).
  Actions: Cancel / Create Feed →

FILES TO TOUCH:
  components/feed-planner/feed-view-screen.tsx        ← bg change + empty state card
  components/feed-planner/instagram-feed-view.tsx     ← bg change + header glass
  components/feed-planner/feed-header.tsx             ← glass header, NOT opaque
  components/feed-planner/feed-tabs.tsx               ← already glass, minor tokens
  components/feed-planner/feed-grid.tsx               ← border tokens only
  components/feed-planner/feed-grid-item.tsx          ← bg tokens only
  components/feed-planner/feed-style-modal.tsx        ← bg token only (#101113 → #0b0d10 base)
  components/feed-planner/welcome-wizard.tsx          ← bg token only (#101113 → modal glass)
  components/feed-planner/feed-posts-list.tsx         ← glass card treatment
  components/feed-planner/feed-strategy.tsx           ← glass card treatment
  components/feed-planner/feed-brand-pillars.tsx      ← pillar card treatment
  app/feed-planner/feed-planner-client.tsx            ← activation CTA: light → dark glass
    (change border-stone-200 bg-white → glass-1 + border-default; text-stone-950 → text-white)
  components/onboarding/unified-onboarding-wizard.tsx ← visual wrapper only (A-02 handles logic)

FILES NOT TO TOUCH: app/api/feed/**, app/api/feed-planner/**, lib/feed-planner/**

---

## TASK UX-06: Profile / Account Screen Redesign

Priority: Medium
Visual ref: output/design/v2-profile.html
Feature doc: docs/features/profile.md

UI only. Zero Stripe or API changes.

1. Tab switcher: PROFILE | SETTINGS Inter 500 11px uppercase.
2. Profile: hero avatar circular Whisper border, Cormorant 200 name, glass stats row,
   glass Personal Brand section, 3-col Best Work grid, referral dashboard glass card.
3. Settings: Inter 500 11px uppercase section headers, glass list rows,
   full-width glass upgrade CTA in Cormorant, past_due alert banner if applicable.

Files to touch: components/sselfie/account-screen.tsx, edit-profile-dialog.tsx,
  best-work-selector.tsx, personal-brand-section.tsx,
  components/upgrade/upgrade-modal.tsx (visual wrapper only)
Files NOT to touch: app/api/profile/**, app/api/user/**, Stripe portal

---

## TASK UX-07: Academy In-App Screen Redesign

Priority: Medium-Low - ship C-01/C-02 first
Visual ref: output/design/v3-academy.html  ← UPDATED 2026-02-28
Feature doc: docs/features/academy.md

UI ONLY. Zero enrollment, download, access, or Stripe logic changes.

CRITICAL DESIGN NOTE — same glassmorphic system as Feed Planner v3:
- bg-base: #0b0d10 (NOT pure #0a0a0a)
- glass-1: rgba(255,255,255,0.04) | glass-2: rgba(255,255,255,0.07) | glass-3: rgba(255,255,255,0.10)
- border-faint: rgba(255,255,255,0.07) | border-subtle: rgba(255,255,255,0.12)
- text-1: #fff | text-2: rgba(255,255,255,0.75) | text-3: rgba(255,255,255,0.50) | text-4: rgba(255,255,255,0.30)
- CURRENT BUG: in-app academy-screen.tsx uses light stone theme (bg-white, border-stone-200, text-stone-950)
  — public /academy page.tsx is already correctly dark. In-app must match.

FIVE SCREENS in prototype:
Screen 1 — Overview (Studio Member): Hero bg + gradient overlay, stats-row glass cards, "You Have Access"
  horizontal scroll (already built — just restyle dark), featured continue-learning card, nav cards grid.
Screen 2 — Courses List: search bar dark, 2-col course cards, "Continue Learning" + "All Courses" sections.
Screen 3 — Course Detail: glass header card with thumbnail, progress bar, lesson list with ✓/○/🔒 states.
Screen 4 — Templates: 2-col category photo grid → template list → ResourceCard dark restyle.
Screen 5 — Non-Member: upgrade card, mini-products 2×2 grid, locked nav cards with 🔒 + reduced opacity.

PER-FILE CHANGES:
1. components/sselfie/academy-screen.tsx — overview render (lines 773–1055):
   - Hero div bg: replace placeholder solid dark with gradient bg + overlay
   - Stats cards: bg-white border-stone-200 → rgba(13,15,19,0.92) backdrop-blur border var(--border-subtle)
   - Access cards (.access-card): bg-glass-2 border-subtle, tag green tint already in code (keep)
   - Nav section buttons: border-stone-200 rounded-2xl bg-stone-50/bg-white → glass-1 border-faint
   - Featured course card: bg-stone-950 → glass-2 border-subtle, progress fill white
   - "Get More" mini-products section already at line 952 — just restyle grid items
   - Templates/Drops/Flatlay early-exit access gates: bg-white text-stone-950 → dark glass

2. components/academy/course-card.tsx:
   - Root: bg-white/50 backdrop-blur-xl border border-white/60 rounded-3xl → glass-1 border-faint rounded-2xl
   - Hover: bg-white/70 → glass-2 border-subtle (keep scale-[1.02])
   - Lock overlay: bg-stone-950/60 → rgba(11,13,16,0.70) (already dark — ✓)
   - Completion badge: bg-stone-950/80 border-white/20 → rgba(11,13,16,0.80) border-subtle (already dark — ✓)
   - Title/desc: text-stone-950/text-stone-600 → text-1/text-3
   - Progress bar track: bg-stone-200/60 → glass-3; fill: bg-stone-950 → rgba(255,255,255,0.55)
   - Action button: bg-stone-950 text-stone-50 → glass-2 border-faint text-2 hover:glass-3

3. components/academy/course-detail.tsx:
   - All bg-white/50 backdrop-blur-xl border border-white/60 → glass-1 border-faint
   - Title: text-stone-950 → text-1; desc: text-stone-600 → text-3
   - Progress track: bg-stone-200 → glass-3; fill: bg-stone-950 → rgba(255,255,255,0.70)
   - Lesson rows: border-stone-200 → border-faint; hover: border-stone-400 bg-white/80 → glass-2 border-subtle
   - Lock icon container: bg-stone-200 → glass-2; CheckCircle2: text-stone-950 → text-1
   - Certificate button: bg-stone-950 text-stone-50 → rgba(255,255,255,0.90) text-#0b0d10

4. components/academy/resource-card.tsx:
   - Root: bg-white border-stone-200 → glass-1 border-faint
   - Hover: border-stone-300 → border-subtle
   - thumbnail bg: bg-stone-100 → glass-2
   - Month tag: bg-stone-950 text-stone-50 → rgba(11,13,16,0.80) border-subtle text-2 (already dark — ✓)
   - Type/category text: text-stone-500 → text-4
   - Title: font-serif text-stone-950 → font-display text-1
   - Desc: text-stone-600 → text-3
   - Download button: bg-stone-950 text-stone-50 rounded-xl → glass with border rgba(255,255,255,0.08) border-subtle text-2
   - Download count: text-stone-400 → text-4

5. components/sselfie/mini-product-card.tsx:
   - Root: border-stone-200 bg-white rounded → glass-1 border-faint rounded-xl
   - Hover: border-stone-300 → border-subtle
   - Image area: bg-stone-100 → glass-2
   - Placeholder letter: text-stone-400 → text-4
   - Name: text-stone-950 → text-1
   - Price: text-stone-500 → text-3
   - CTA "Get it →": text-stone-950 border-stone-950 → text-2 no-underline style

6. components/academy/lesson-modal.tsx:
   - DialogContent: bg-stone-50 border-stone-200 → rgba(13,15,19,0.96) backdrop-blur(40px) border-subtle
   - Sticky header: bg-stone-50/95 backdrop-blur-xl border-b border-stone-200 → rgba(11,13,16,0.90) backdrop-blur(20px) border-faint
   - Lesson title/desc: text-stone-950/text-stone-600 → text-1/text-3
   - Progress card: bg-white/50 border-white/60 → glass-1 border-faint
   - Progress fill: bg-stone-950 → rgba(255,255,255,0.70)
   - Mark as done btn: bg-white border-stone-950 text-stone-950 → glass-1 border-subtle text-2
   - Next lesson btn: bg-stone-950 text-stone-50 → rgba(255,255,255,0.90) text-#0b0d10

Files NOT to touch: app/api/academy/**, access control, download tracking, enrollment logic, Stripe flows

---

## Guardrails for ALL Tickets

- NEVER touch app/api/** in design tickets
- NEVER change credit costs, generation logic, or Stripe flows
- NEVER remove existing React props or state
- ALWAYS run pnpm build - zero TypeScript errors before Done
- ALWAYS test on 375px viewport
- ALWAYS post Vercel preview link for Sandra sign-off before merging to main
- After UX-01 lands: use CSS vars - never hardcode hex values

---

Design prototypes: North + 8 design subagents | output/design/v2-*.html
Approved by Sandra: 2026-02-27

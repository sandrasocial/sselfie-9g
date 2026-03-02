# SSELFIE Clean Rebuild Plan
*Version 2 — Updated 2026-03-02 after reading all 5 feature docs*
*Source of truth: maya.md, gallery.md, feed-planner.md, academy.md, profile.md*

---

## The Decision

**Rebuild the CODE on a clean branch. Keep the DATABASE entirely intact.**

- Branch: `sprint/clean-architecture` (off main, Vercel preview auto-deploys)
- Database: All 292 Neon tables stay. All 28 paying customers unaffected.
- Scope: 5 tabs. Same user journeys as the feature docs. No new screens in Phase 1.
- Goal: Under 80 API routes (from 455). Largest file under 400 lines. Zero dead code.

**Why clean branch beats cleanup:**
- 455 routes, 342 lib files, 292 tables, 154 empty — cleanup with agents touching interdependent code risks breaking paying flows
- Fresh branch means 5 parallel agent streams building simultaneously with no merge conflicts on working code
- Stella confirmed only 8 things need to copy verbatim — everything else gets rebuilt

---

## What the App Is (5 Screens — Nothing More)

The entire SSELFIE app = 5 tabs in a bottom nav:

| Tab | Screen | Entry point | What it does |
|-----|--------|-------------|--------------|
| 1 | Maya | `/studio?tab=maya` or `/maya` | Chat (Stella) + Classic/Pro image generation + Training. The core product. |
| 2 | Gallery | `#gallery` tab | View/manage all AI images + videos. Favorites, bulk actions, lightbox, profile photo picker. |
| 3 | Feed Planner | `/feed-planner` or `#feed-planner` | Manual 9-post Instagram feed creation. Blueprint funnel (Free → Paid → Studio). |
| 4 | Academy | `#academy` tab + public `/academy` | Courses, templates, monthly drops, flatlay (Studio only). Public mini-products page. |
| 5 | Account | `#account` tab | Profile, settings, subscription, Personal Brand, demographics, referral dashboard. |

Plus public routes: `/` (landing), `/pricing`, `/checkout/membership`, `/checkout/blueprint`, `/freebie/brand-strategy`, `/strategy/[token]`, `/academy`, `/academy/products/[productId]`, `/academy/success`, `/admin/*`.

**That is the entire app. Phase 2 adds Agent V1 + Personal Pages on top of this clean base.**

---

## Copy Verbatim (Stella's confirmed list — do not rebuild)

These 8 items copy to the new branch unchanged:

1. `lib/credits.ts` — credit deduction + grant logic (all generation flows depend on this)
2. `app/api/maya/generate-video/route.ts` + `lib/maya/generate-video.ts` — WAN-2.5 video pipeline
3. `app/api/maya/b-roll-images/route.ts` — b-roll image generation
4. `app/api/user/brand-strategy/route.ts` + `lib/maya/brand-strategy.ts` — brand strategy generation
5. `app/api/user/content-pillars/route.ts` + `lib/maya/content-pillars.ts` — content pillar logic
6. `app/api/academy/my-products/route.ts` — academy product access
7. Auth flow (Supabase sessions + Neon user lookup) — do not touch
8. Stripe webhook handler (`app/api/stripe/webhook/route.ts`) — subscription + credit grants

Everything else gets rebuilt clean.

---

## Design System (Non-Negotiable)

### Colors — 5 only
```
Obsidian:  #0a0a0a  — primary text, strong headers
Porcelain: #ffffff  — backgrounds, breathing space
Pearl:     #f5f5f5  — secondary backgrounds, subtle sections
Smoke:     #666666  — body text, captions
Whisper:   #e5e5e5  — borders, dividers, subtle accents
```
No bright colors. No gradients. No other hues. Full stop.

### Fonts — 2 only
```
Cormorant Garamond  — ALL headers/titles
  Weight: 200-300 (ultra-light)
  Style: UPPERCASE
  Tracking: -0.01em
  Line-height: 1.0-1.2

Inter               — ALL body text, captions, labels
  Body: 300 weight, 16px min, line-height 1.8
  Labels: 500 weight, 10-12px, UPPERCASE, tracking 0.5em
```

### Spacing System
```
Base unit: 8px
xs: 8px  |  sm: 16px  |  md: 24px  |  lg: 48px  |  xl: 80px
Minimum padding on any container: 32px all sides (48px preferred)
Mobile: 375px minimum width, 24px horizontal padding
```

### Rules
- **No icons.** No emojis. Text and typography carry all the weight.
- **Asymmetric layouts.** Never centered/symmetrical. Editorial, magazine-style.
- **Let it breathe.** When in doubt: more white space.
- **Mobile-first always.** Every screen designed at 375px first.

---

## Screen Specs (Grounded in Feature Docs)

### Screen 1: Maya

**What it is (from maya.md):**
Conversational AI (Stella/GPT-4.1-mini) + dual-mode image generation. Classic mode uses user's custom Flux LoRA model. Pro mode uses NanoBanana Pro with reference images. Training tab for Studio members.

**User journey (exact, from maya.md):**
1. Land on Maya tab → chat loads → brand profile injected into context
2. User types a message → Stella responds → generation triggers detected
3. If `[GENERATE_CONCEPTS]` → Concept panel slides in → image generation begins
4. Credit deduct → Replicate API call → image returned → ConceptCard renders
5. If Pro mode: reference image upload → 150-200 word prompt → NanoBanana call
6. Training tab (Studio only): upload selfies → Flux LoRA training → model ready

**Layout (clean rebuild):**
```
┌─────────────────────────────────┐
│  MAYA                   [Credits]│  ← Inter 500, 10px, UPPERCASE; credits counter
├─────────────────────────────────┤
│                                 │
│  [ConceptStrip when active]     │  ← horizontal scroll, appears inline
│                                 │
│  Chat messages area             │  ← Stella messages + user messages
│  (scrollable, mobile-first)     │
│                                 │
│  Maya is thinking...            │  ← editorial progress bar: thin #e5e5e5 → #0a0a0a
│                                 │
├─────────────────────────────────┤
│  [Message input          ] [→]  │  ← 48px height, Inter 300, Whisper border
└─────────────────────────────────┘
```

**ConceptCard (horizontal strip, slides in above input):**
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│              │ │              │ │              │
│  [image]     │ │  [loading]   │ │  [image]     │  ← 200×260px cards
│              │ │  progress    │ │              │
│              │ │  bar         │ │              │
│  Save        │ │              │ │  Save        │  ← Inter 300, 12px
└──────────────┘ └──────────────┘ └──────────────┘
```
Cards are 200×260px. Horizontal scroll strip. No card title. Just image + Save action.
Loading state: editorial progress bar at bottom of card. No spinner.

**Training tab (Studio only, separate sub-tab within Maya):**
Upload selfies → progress indicator → model status → retrain CTA

**Mode selector (Classic / Pro):**
Two text buttons, Inter 500, 10px, UPPERCASE, letter-spacing 0.5em. Active = Obsidian text. Inactive = Smoke text. No background pill or highlight.

---

### Screen 2: Gallery

**What it is (from gallery.md):**
All AI-generated images + videos. Filter by type. Full-screen lightbox. Bulk actions. Profile photo picker.

**User journey (exact, from gallery.md):**
1. Gallery tab → grid loads (images, videos, feed images)
2. Filter tabs: Photos | Videos | Feed | Favorited
3. Grid → tap → fullscreen lightbox → favorite/delete
4. Long-press → selection mode → bulk: save, download, favorite, delete
5. Empty state → "Go to Maya" CTA (direct link to Maya tab with first-generation prompt)

**Layout (clean rebuild):**
```
┌─────────────────────────────────┐
│  GALLERY                        │
├─────────────────────────────────┤
│  PHOTOS  VIDEOS  FEED  FAVORITED│  ← Inter 500, 10px, UPPERCASE, 0.5em tracking
│  ─────                          │  ← Obsidian underline for active tab
├─────────────────────────────────┤
│                                 │
│  ┌───┐ ┌───┐ ┌───┐             │
│  │   │ │   │ │   │             │  ← 3-column grid, 2px Whisper gaps
│  └───┘ └───┘ └───┘             │
│  ┌───┐ ┌───┐ ┌───┐             │
│  │   │ │   │ │   │             │
│  └───┘ └───┘ └───┘             │
│                                 │
└─────────────────────────────────┘
```

**Empty state:**
```
┌─────────────────────────────────┐
│                                 │
│                                 │
│      No images yet.             │  ← Cormorant Garamond, 200 weight, UPPERCASE
│                                 │
│      Create your first image    │  ← Inter 300, 16px, Smoke
│      in Maya.                   │
│                                 │
│      [ Open Maya ]              │  ← text link, not button, Obsidian
│                                 │
└─────────────────────────────────┘
```

**Lightbox (fullscreen):**
- Image fills screen
- Top bar: back arrow (← text, not icon) + "FAVORITE" / "DELETE" text buttons
- Selection mode: thin Whisper selection bar at bottom, count + action text buttons

---

### Screen 3: Feed Planner

**What it is (from feed-planner.md):**
Manual click-and-create 9-post Instagram feed. Blueprint funnel surface (Free → Paid Blueprint → Studio). **Maya Feed tab is disabled** — this is standalone manual only.

**Critical fix in rebuild:** The wizard is a drop-off cliff. 0 activation continue clicks in 3 days. The rebuild replaces the multi-step wizard with a single, clear first-feed CTA.

**User journey (rebuilt, fixing activation drop-off):**

*First-time Free user:*
1. Feed Planner tab → skip the wizard maze
2. Direct to: "Create your first feed" with a 2-step card (choose goal → choose style)
3. Generate → 1-post preview (2 credits) → see result immediately
4. Upgrade prompt: "Generate all 9 posts — €X"

*First-time Paid Blueprint:*
1. Feed Planner tab → single welcome card: "You have 60 credits. Create your 9-post feed."
2. Click → 2-step: goal + style → Generate all 9 → done
3. Download bundle

*Returning user:*
1. Feed Planner tab → feed list → open feed → edit/regenerate

**Layout (clean rebuild):**
```
┌─────────────────────────────────┐
│  FEED PLANNER                   │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐   │  ← Feed card: Pearl bg, 1px Whisper border
│  │  My First Feed           │   │
│  │  9 posts · Mar 2         │   │
│  │                    [→]   │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │  + Create new feed       │   │  ← dashed Whisper border
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

**9-post grid (feed detail):**
```
┌───┐ ┌───┐ ┌───┐
│ 1 │ │ 2 │ │ 3 │   ← Square images, equal size
└───┘ └───┘ └───┘
┌───┐ ┌───┐ ┌───┐
│ 4 │ │ 5 │ │ 6 │
└───┘ └───┘ └───┘
┌───┐ ┌───┐ ┌───┐
│ 7 │ │ 8 │ │ 9 │
└───┘ └───┘ └───┘

[ Download all ]   [ Regenerate ]
```
Empty slots: dashed Whisper border. No placeholder images. Tap to generate individually.

---

### Screen 4: Academy

**What it is (from academy.md):**
In-app learning hub (Studio-gated). Public mini-products page. Two separate entry points that need to connect.

**User journey — in-app (Studio member):**
1. Academy tab → overview: course progress, browse courses, templates, drops, flatlay
2. Courses → lesson viewer → progress tracking
3. Templates/Drops/Flatlay → browse → download (tracked)

**User journey — public `/academy`:**
1. Mini-product grid: What To Say, Show Up, Get Paid, AI Photo Prompts
2. Purchase → Stripe checkout → `/academy/success` → deep link to app

**Critical fix in rebuild:** Mini-product buyers get a dead-end success page. Rebuild adds direct in-app deep link after purchase. Academy tab shows "You have [Product]" badge for purchased items.

**Layout — in-app Academy (clean rebuild):**
```
┌─────────────────────────────────┐
│  ACADEMY                        │
├─────────────────────────────────┤
│  COURSES  TEMPLATES  DROPS      │  ← text tabs
├─────────────────────────────────┤
│                                 │
│  In Progress                    │  ← Inter 500, 10px, UPPERCASE
│  ┌─────────────────────────┐   │
│  │  [Course title]          │   │
│  │  3 of 8 lessons          │   │
│  └─────────────────────────┘   │
│                                 │
│  Browse Courses                 │
│  ┌──────────┐ ┌──────────┐    │
│  │          │ │          │    │  ← 2-col grid
│  └──────────┘ └──────────┘    │
│                                 │
└─────────────────────────────────┘
```

---

### Screen 5: Account / Profile

**What it is (from profile.md):**
User identity hub. Two sub-tabs: Profile | Settings.

**User journey:**
1. Account tab → Profile sub-tab: avatar, name, bio, stats (Photos, Favorites), Best Work grid, Personal Brand (expandable), Referral dashboard
2. Settings sub-tab: account info, subscription (Stripe portal for Studio), upgrade CTA for non-Studio, notifications, generation preferences, privacy, Brand Assets, Model Training, demographics

**Critical fix in rebuild:** Personal Brand section is left empty by most users → Maya generates without brand context → poor results → churn. Rebuild surfaces this more prominently as "Your Brand Profile" with clear value messaging.

**Layout — Profile tab:**
```
┌─────────────────────────────────┐
│  PROFILE            SETTINGS   │  ← text tab switcher
├─────────────────────────────────┤
│                                 │
│  [Avatar]  Sandra Björk         │  ← avatar 64px circle, Cormorant 200 name
│            Studio Member        │  ← Inter 500, 10px, UPPERCASE, Smoke
│                                 │
│  ─────────────────────────────  │  ← Whisper divider
│                                 │
│  84 Photos    12 Favorites      │  ← stats, Inter 300
│                                 │
│  YOUR BRAND PROFILE             │  ← Inter 500, 10px, UPPERCASE — NOT buried
│  [expandable, filled = 3 fields]│
│                                 │
│  BEST WORK                      │
│  ┌───┐ ┌───┐ ┌───┐            │  ← 3-col grid, selectable
│  └───┘ └───┘ └───┘            │
│                                 │
└─────────────────────────────────┘
```

---

## What Gets Rebuilt Clean

### API Routes (target: under 80)

**Keep verbatim (8 items listed above)**

**Rebuild clean (essential routes only):**

Maya:
- `POST /api/maya/chat` — Stella bridge (simplified, no trigger duplication)
- `POST /api/maya/generate-classic` — Flux LoRA (replaces fragmented routes)
- `POST /api/maya/generate-pro` — NanoBanana Pro (single clean route)
- `POST /api/maya/train` — Training trigger
- `GET /api/maya/training-status` — Training polling

Gallery:
- `GET /api/images` — list with pagination (already clean per Stella)
- `GET /api/images/feed` — feed filter
- `POST /api/images/favorite` — toggle favorite
- `DELETE /api/images/delete` — delete image
- `POST /api/images/bulk-save` — bulk save
- `GET /api/maya/videos` — list videos
- `DELETE /api/maya/delete-video` — delete video

Feed Planner:
- `GET /api/feed/list` — user's feeds
- `POST /api/feed/create` — create feed
- `GET /api/feed/[feedId]` — feed detail
- `POST /api/feed/[feedId]/generate-strategy` — strategy
- `POST /api/feed/[feedId]/generate-single` — single post image
- `POST /api/feed/[feedId]/regenerate-post` — regenerate
- `POST /api/feed/[feedId]/regenerate-caption` — caption
- `GET /api/feed/[feedId]/download-bundle` — download
- `GET /api/feed-planner/access` — access level check

Academy:
- `GET /api/academy/courses` — course list + access check
- `GET /api/academy/courses/[id]` — course detail
- `POST /api/academy/enroll` — enroll
- `POST /api/academy/progress` — update progress
- `GET /api/academy/templates` — templates
- `GET /api/academy/monthly-drops` — drops
- `GET /api/academy/flatlay-images` — flatlay
- `GET /api/academy/my-products` — purchased products (copy verbatim)
- `POST /api/academy/checkout` — mini-product purchase

Profile/Account:
- `GET /api/profile/stats` — stats
- `GET /api/profile/info` — profile data
- `POST /api/profile/info` — update profile
- `POST /api/profile/best-work` — save best work
- `GET /api/user/info` — user info
- `POST /api/user/update-demographics` — demographics
- `POST /api/settings` — settings key/value
- `POST /api/stripe/create-portal-session` — Stripe portal

Auth + credits:
- `POST /api/auth/logout`
- `GET /api/user/credits`

Public/Checkout:
- `POST /api/landing/checkout` — membership checkout
- Freebie routes (existing, copy)

**Total: ~55 routes. Well under 80 target.**

### Lib Files (clean folder structure)

```
lib/
  credits.ts              ← COPY VERBATIM
  auth.ts                 ← auth helpers (clean)
  neon.ts                 ← DB client
  maya/
    chat-orchestrator.ts  ← Stella bridge (rebuild clean)
    generate-classic.ts   ← Flux LoRA pipeline (rebuild)
    generate-pro.ts       ← NanoBanana Pro pipeline (rebuild)
    get-user-context.ts   ← COPY VERBATIM (it's solid)
    mode-adapters.ts      ← COPY VERBATIM (it's solid)
    generate-video.ts     ← COPY VERBATIM
    brand-strategy.ts     ← COPY VERBATIM
    content-pillars.ts    ← COPY VERBATIM
  feed/
    access-control.ts     ← rebuild clean
    generation.ts         ← feed image generation
  academy/
    access.ts             ← COPY (lib/academy-access.ts)
    products.ts           ← COPY (lib/academy-products.ts)
  stripe/
    webhook.ts            ← COPY VERBATIM
```

### Components (clean folder structure)

```
components/
  layout/
    sselfie-app.tsx       ← tab router (rebuild lean)
    bottom-nav.tsx        ← 5-tab nav
    header.tsx            ← credit display
  maya/
    maya-screen.tsx       ← main chat+generate UI
    concept-strip.tsx     ← horizontal concept cards
    concept-card.tsx      ← single image card
    message-bubble.tsx    ← chat message
    chat-input.tsx        ← message input
    training-tab.tsx      ← training UI
    mode-selector.tsx     ← Classic/Pro switcher
  gallery/
    gallery-screen.tsx    ← main gallery UI
    image-grid.tsx        ← photo grid
    lightbox.tsx          ← fullscreen view
    filter-tabs.tsx       ← Photos/Videos/Feed/Favorited
    selection-bar.tsx     ← bulk action bar
  feed-planner/
    feed-planner-screen.tsx
    feed-list.tsx
    feed-detail.tsx       ← 9-post grid
    feed-card.tsx         ← single feed card in list
    strategy-wizard.tsx   ← simplified 2-step (replaces complex wizard)
  academy/
    academy-screen.tsx
    course-card.tsx
    course-detail.tsx
    lesson-viewer.tsx
    resource-card.tsx
  account/
    account-screen.tsx
    profile-tab.tsx
    settings-tab.tsx
    edit-profile-dialog.tsx
    best-work-selector.tsx
    brand-assets-manager.tsx
    retrain-modal.tsx
    upgrade-modal.tsx
  ui/
    editorial-loader.tsx  ← thin progress bar, no spinner
    empty-state.tsx       ← consistent empty states
    text-button.tsx       ← Inter 300/500, no icon buttons
```

---

## Execution Plan

### Phase A — Foundation (Week 1, 5 parallel streams)

**Stream 1: north-code / Chat Architecture**
- Rebuild `/api/maya/chat` as single clean Stella bridge
- Single tool registry in `lib/maya/chat-orchestrator.ts`
- Two tools to start: `generate_image` (Classic + Pro) + `get_feed_strategy`
- No trigger text hacks — clean JSON tool calls

**Stream 2: north-code / UI Shell**
- New `components/layout/sselfie-app.tsx` (5-tab router, clean)
- `bottom-nav.tsx` with brand typography (no icons)
- `header.tsx` with credit counter
- Design system tokens in `lib/design.ts`

**Stream 3: north-code / Gallery + Images**
- Rebuild gallery-screen, image-grid, lightbox, filter-tabs
- Slim API: keep `app/api/images/route.ts` as-is (it's working), rebuild frontend only
- Fix empty state → direct Maya CTA

**Stream 4: north-code / Feed Planner UX Fix**
- Rebuild strategy-wizard (2 steps only, not 5)
- Fix first-feed CTA (0 clicks currently → make it unmissable)
- Keep all feed generation APIs (they work)
- Rebuild feed-list + feed-detail components clean

**Stream 5: north-code / Account + Academy**
- Rebuild account-screen (profile-tab + settings-tab)
- Surface Personal Brand prominently ("YOUR BRAND PROFILE")
- Add "You have [Product]" badge for Academy mini-products
- Add deep link from `/academy/success` back to app

### Phase B — Activation Fix (Week 2)

- First-generation onboarding flow (Maya shows guided first-gen prompt for new users)
- Credits visible in header at all times
- Feed Planner: single "Create your first feed" card for new users
- Analytics hooks: track wizard step drop-off, first generation events

### Phase C — Agent V1 + Pages (Week 3-4, after clean base works)

- Agent V1: Website Agent tab (6th tab, €27/mo standalone)
- Personal Pages dashboard (uses existing `user_landing_pages` + `websites` tables — NOT a new table)
- Maya tool bus expansion: `publish_to_page`, `create_feed_post`

---

## Key Numbers to Hit

| Metric | Current | Target (Phase A) |
|--------|---------|-----------------|
| First-output activation rate | 0% | 25%+ (1/4 new users generate) |
| API routes | 455 | Under 80 |
| Largest component file | 800+ lines | Under 400 lines |
| Lib files | 342 | Under 100 |
| Empty DB tables | 154 | 0 (reconcile or drop) |
| Feed Planner: first feed click rate | ~0% | 40%+ |

---

## Git Branch

```bash
git checkout -b sprint/clean-architecture
git push -u origin sprint/clean-architecture
```

Vercel auto-deploys preview URL. Stella and north-code work on this branch.
Main branch stays live for 28 paying customers throughout.

---

## What Phase 1 Does NOT Include

- Agent V1 / Website Agent (Phase C)
- Personal Pages (Phase C)
- NanoBanana 2 upgrade (Phase B — needs verified model ID first)
- Scene Composer (dead, confirmed by Stella — table missing)
- B-roll interface (backend works, no UI needed in Phase A)
- Monthly drops content (table is empty — content-blocked)
- Social sharing (Phase B opportunity)

---

## Success Criteria for Phase A Done

- [ ] App loads on clean branch, all 5 tabs functional
- [ ] Maya chat works: Stella responds, generation triggers fire
- [ ] Classic generation: Flux LoRA image returns, ConceptCard renders
- [ ] Gallery loads user images, lightbox opens, delete works
- [ ] Feed Planner: create feed → strategy → generate one image → download
- [ ] Academy: courses list, templates browse, Studio gating works
- [ ] Account: profile loads, Stripe portal link works, demographics save
- [ ] 28 paying customers unaffected (all on main branch during sprint)
- [ ] Zero console errors on first load
- [ ] Lighthouse mobile score 80+

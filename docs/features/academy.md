# Academy — Feature doc

**Purpose:** Single source of truth for how the Academy feature works end-to-end. For agents, North, and product.

---

## 1. Overview

- **Feature name:** Academy
- **One-line:** In-app Academy: courses, templates, monthly drops, flatlay images; access gated by Studio membership. Separate public Academy page (`/academy`) for one-off product purchases (mini-products + Creator Studio upsell).
- **Entry points:**
  - In-app: bottom nav “Academy” in `SselfieApp` → `AcademyScreen` (courses, templates, drops, flatlays).
  - `/academy` — public/mini-product sales page (What To Say, Show Up, Get Paid, AI Photo Prompt Pack; Creator Studio upsell).
  - `/academy/products/[productId]` — product detail + purchase (e.g. HTML course viewer); `/academy/success` after purchase.
- **Who can access:** In-app Academy: Studio members get full access; others see upgrade CTA. Public `/academy`: anyone; purchase requires auth.

---

## 2. User journey (start to finish)

**In-app Academy (AcademyScreen):**
| Step | Screen / action | What user sees / does |
|------|------------------|------------------------|
| 1 | Academy tab | Overview: hero, plan/tier, completed/in-progress counts, “Browse Courses”, “Templates”, “Monthly Drops”, “Flatlay Images”, recommended/continue course. |
| 2 | Courses | List/search; click course → `CourseDetail`; lessons, progress, enroll. |
| 3 | Templates | Category grid → template list; search; download (tracked). Studio required. |
| 4 | Monthly Drops | List; search; download. Studio required. |
| 5 | Flatlay Images | List; search; download. Studio required. |
| 6 | No access | Upgrade CTA (Studio) for templates/drops/flatlays. |
| 7 | Nav menu | Side menu: Studio, Training, Maya, Gallery, Videos, Academy, Profile, Settings; credits; Sign Out. |

**Public Academy (`/academy`):**
| Step | Screen / action | What user sees / does |
|------|------------------|------------------------|
| 1 | Landing | Product grid: What To Say, Show Up, Get Paid, AI Photo Prompt Pack (prices €17–€47). |
| 2 | Buy | Click “Get it — €X” → `/api/academy/checkout` → redirect to Stripe Checkout. |
| 3 | Success | `/academy/success` after purchase; link to products. |
| 4 | Upsell | “Creator Studio €97/month” CTA → `/pricing`. |

**Product viewer (`/academy/products/[productId]`):**
| Step | Screen / action | What user sees / does |
|------|------------------|------------------------|
| 1 | Product page | Access check (`userHasAcademyAccess`); login redirect if not auth. |
| 2 | View / purchase | Content (e.g. HTML course); purchase button if not owned → checkout. |

---

## 3. Frontend

- **Routes (pages):**
  - Academy tab inside `SselfieApp` (no standalone route; hash `#academy`).
  - `app/academy/page.tsx` — public Academy landing (mini-products).
  - `app/academy/products/[productId]/page.tsx` — product detail + viewer.
  - `app/academy/products/[productId]/purchase-button.tsx` — purchase CTA.
  - `app/academy/success/page.tsx` — post-purchase success.
- **Main component(s):**
  - `components/sselfie/academy-screen.tsx` — in-app Academy: overview, courses, templates, monthly drops, flatlay images, nav menu.
  - `components/academy/course-card.tsx`, `course-detail.tsx`, `resource-card.tsx`, `lesson-viewer.tsx`, `lesson-modal.tsx`, `video-player.tsx`
- **Key UI state:** `selectedView` (overview/courses/templates/monthly-drops/flatlay-images), `selectedCourseId`, `searchQuery`, `selectedTemplateCategory`, `showNavMenu`, `creditBalance`.
- **Navigation:** In-app via hash `#academy`; internal views via state (courses, templates, etc.). Public via normal links.
- **Code paths:** `components/sselfie/academy-screen.tsx`, `components/academy/*.tsx`, `app/academy/page.tsx`, `app/academy/products/[productId]/page.tsx`, `app/academy/success/page.tsx`

---

## 4. Backend

- **API routes:**
  - Courses & access: `app/api/academy/courses/route.ts`, `app/api/academy/courses/[courseId]/route.ts`, `app/api/academy/my-courses/route.ts`, `app/api/academy/enroll/route.ts`, `app/api/academy/progress/route.ts`
  - Lessons: `app/api/academy/lessons/[lessonId]/route.ts`
  - Templates: `app/api/academy/templates/route.ts` (and download/track)
  - Monthly drops: `app/api/academy/monthly-drops/route.ts` (and download)
  - Flatlay: `app/api/academy/flatlay-images/route.ts`, `app/api/academy/flatlay-images/[id]/download/route.ts`
  - Certificates: `app/api/academy/certificates/route.ts`
  - Checkout (public): `app/api/academy/checkout/route.ts`
  - My products: `app/api/academy/my-products/route.ts`
  - Admin (content): `app/api/admin/academy/*` (courses, lessons, templates, monthly-drops, flatlay-images, grant-access)
- **Server actions:** None; all API.
- **Cron / webhooks:** None specific to Academy content; Stripe webhook may grant product access.
- **Code paths:** `app/api/academy/**/*.ts`, `app/api/admin/academy/**/*.ts`, `lib/academy-access.ts`, `lib/academy-products.ts`

---

## 5. Logic (credits, entitlements, access)

- **Credits:** Academy does not deduct credits; in-app screen shows credit balance in nav. Public products are paid one-time.
- **Entitlements / access:** In-app: `hasAccess` from `/api/academy/courses` (Studio membership); product type / user tier from user info. Public: purchase grants product access; `userHasAcademyAccess` for product pages.
- **Data flow:** Courses, lessons, templates, monthly drops, flatlays in DB; enrollment and progress; downloads tracked via API.

---

## 6. Code map (for agents)

- **Pages:** `app/academy/page.tsx`, `app/academy/products/[productId]/page.tsx`, `app/academy/success/page.tsx`
- **Components:** `components/sselfie/academy-screen.tsx`, `components/academy/*.tsx`
- **API routes:** `app/api/academy/**/*.ts`, `app/api/admin/academy/**/*.ts`
- **Lib / shared:** `lib/academy-access.ts`, `lib/academy-products.ts`

---

## 7. Current value / pain (research)

- **Current value:** Studio members get in-app access to courses, templates, monthly drops, flatlays as a unified learning hub. Public `/academy` page offers four mini-products (What To Say €17, Show Up €37, Get Paid €47, AI Photo Prompt Pack €17) as low-friction entry points; purchases are one-time and include product access + email receipt.
- **Pain / friction:**
  - **Disconnected entry points:** Academy mini products are purchasable on `/academy` but NOT surfaced inside the app. After purchase, user has no clear "next step" within the Studio to activate or use their product.
  - **No in-app upsell momentum:** Academy mini-product buyers are isolated from the in-app experience; the path from public Academy mini-product purchase → Creator Studio €97/mo subscription is broken. Funnel digest shows 0 new subscriptions in last 24h, indicating the upsell is not converting.
  - **Gated at Studio membership level:** In-app Academy tab (courses, templates, drops, flatlays) requires full Studio membership — no per-product in-app purchase. Users cannot buy and use an individual Academy product inside the app.
  - **No driver of app engagement:** Revenue audit shows 104 credit purchase transactions by 58 unique buyers (2:1 purchase-to-user ratio); credit purchasers are proven high-engagement users. Academy products should drive similar engagement, but currently do not because they lack in-app activation.
  - **Post-purchase dead end:** After buying an Academy mini-product, user receives success page (`/academy/success`) but no in-app entry point or deep link to next-best-action (e.g. "Start What To Say in Feed Planner" or "Ask Maya for caption ideas").
- **Audience evidence:** New Studio users (14 in last 24h) have full access to Academy tab; public `/academy` buyers currently bypass the in-app experience entirely. No data yet on retention or feature usage from Academy mini-product purchasers.

---

## 8. Opportunities (for rebuild / AI)

- **In-app product awareness & activation:**
  - Academy tab should surface "You have [What To Say / Show Up / Get Paid / etc.]" badges or cards for users who purchased on public `/academy`. This makes purchases visible in-app and signals they are now active features.
  - Include quick-start CTA: "Start [Product]" → deep link to relevant in-app feature (Feed Planner for caption-focused products, Gallery for image products, or Maya for strategy products).

- **Post-purchase funnel & deep linking:**
  - After checkout (`/academy/success`), offer in-app deep links (e.g. `sselfiestudio://feed-planner?product=what-to-say` or `/academy/success?next=maya`) so user lands in the right tool immediately.
  - Post-purchase email should include app link: "Open [App] → Academy tab → Start [Product]" or "Ask Maya: 'Help me use What To Say for my next week.'"

- **Maya system context injection:**
  - When Academy mini-product user opens Maya, system prompt includes: "User purchased [Product]. Offer relevant guidance: e.g. if What To Say, suggest caption planning; if Show Up, suggest brand positioning or posting strategy."
  - First message from Maya: "I see you have [Product]. Want me to help you [use / plan with / apply] it?" — conversational hook into product activation.

- **Non-member Academy tab CTA:**
  - Users without Studio membership who visit Academy tab should see mini-products grid (What To Say, Show Up, Get Paid, etc.) with prices and "Get it" buttons. This converts public `/academy` into an in-app discovery surface.
  - After non-member clicks "Get it," redirect to `/academy/products/[productId]` checkout (existing flow); post-purchase deep link back into app with product activated.

- **Gamified progress & credit incentives:**
  - Completed courses or lessons grant badge/certificate badges (visual in Academy tab). Engaged users see progress toward milestones.
  - Optional: course completion milestone (e.g. 3 lessons) grants small bonus credits (e.g. 5–10 credits), similar to welcome bonus model. This drives engagement (credit purchasers are 2:1 transaction-to-user ratio) and signals value.
  - Progress nudge: "You're 2/5 lessons through [Course]. Keep going!" or "Finish this lesson and earn a badge."

- **Constraints:**
  - Design system: Use existing SSELFIE tokens and component library; no new systems.
  - Constitution: Do not break existing Studio membership logic (Studio members keep all-access to courses/templates/drops/flatlays). Per-product purchases for non-members should layer on top.
  - No changes to payment/entitlement logic: Webhook and Stripe integration stay stable; only add in-app surface and context (tags, user_tags, system prompts).

---

## Changelog

| Date       | Change |
|------------|--------|
| 2026-02-25 | Research pass: §7 and §8 filled from funnel/support/friction digests. |
| 2026-02-25 | Initial doc from codebase audit (North). |

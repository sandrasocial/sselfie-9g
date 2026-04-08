# Gallery — Feature doc

**Purpose:** Single source of truth for how the Gallery feature works end-to-end. For agents, North, and product.

---

## 1. Overview

- **Feature name:** Gallery
- **One-line:** View, filter, search, and manage AI-generated images and videos; favorites, bulk actions (save, download, favorite, delete); profile image picker; feed filter for feed-planner images. `ai_images` is the canonical gallery store. `generated_images` is legacy Classic staging and only a fallback when a row has not been mirrored yet.
- **Entry points:**
  - `/studio?tab=gallery`
  - In-app: bottom nav “Gallery” in `SselfieApp`
- **Who can access:** All authenticated users. Images are user-scoped.

---

## 2. User journey (start to finish)

| Step | Screen / action | What user sees / does |
|------|------------------|------------------------|
| 1 | Land on Gallery tab | `GalleryScreen` loads; fetches images via `useGalleryImages` (`/api/images`), optional feed images via `useGalleryFeedImages` (`/api/images/feed`), videos via `/api/maya/videos`. |
| 2 | Filters | Tabs: Photos, Videos, Feed, Favorited; search; sort. |
| 3 | Grid | Images/videos grid; click → fullscreen lightbox; long-press → selection mode. |
| 4 | Selection mode | Multi-select; bulk save, download, favorite, delete. |
| 5 | Lightbox | Single image: favorite toggle, delete; profile image selector can be opened from header. |
| 6 | Empty states | No images → “Go to Maya”; no videos → “Go to Maya”; no feed images → “Go to Feed Planner”. |
| 7 | Pull to refresh | Pull down to revalidate images/videos/feed. |

---

## 3. Frontend

- **Routes (pages):** Gallery is a tab inside `SselfieApp`; no dedicated page. `app/studio/page.tsx` and `app/maya/page.tsx` both render `SselfieApp` which can show Gallery.
- **Main component(s):**
  - `components/sselfie/gallery-screen.tsx` — main Gallery UI: header, filters, grid, selection bar, lightbox, video preview.
  - `components/sselfie/gallery/components/gallery-header.tsx`, `gallery-filters.tsx`, `gallery-image-grid.tsx`, `gallery-selection-bar.tsx`
  - `components/sselfie/gallery/hooks/use-gallery-images.ts`, `use-gallery-feed-images.ts`, `use-gallery-filters.ts`, `use-selection-mode.ts`, `use-bulk-operations.ts`
  - `components/sselfie/fullscreen-image-modal.tsx`, `components/sselfie/instagram-reel-preview.tsx`, `components/profile-image-selector.tsx`
- **Key UI state:** `contentFilter` (photos/videos/feed/favorited), `searchQuery`, `sortBy`, `selectionMode`, `selectedImages`, `lightboxImage`, `previewVideo`, `favorites` (local set).
- **Navigation:** Tab in SselfieApp; hash `#gallery`. No sub-routes.
- **Code paths:** `components/sselfie/gallery-screen.tsx`, `components/sselfie/gallery/**/*.tsx`, `components/sselfie/fullscreen-image-modal.tsx`, `components/sselfie/instagram-reel-preview.tsx`

---

## 4. Backend

- **API routes:**
  - Images: `app/api/gallery/images/route.ts`, `app/api/images/route.ts` (list with pagination), `app/api/images/feed/route.ts`, `app/api/images/favorite/route.ts`, `app/api/images/delete/route.ts`, `app/api/images/bulk-save/route.ts`, `app/api/images/favorites/route.ts`, `app/api/images/lookup/route.ts`
  - Videos: `app/api/maya/videos/route.ts`, `app/api/maya/delete-video/route.ts`
  - User/stats: `app/api/user` (profile image), `app/api/studio/stats`
- **Server actions:** None specific to Gallery; image delete/favorite are API POST/DELETE.
- **Cron / webhooks:** Reconcile-ai-images cron may touch generation/gallery state.
- **Code paths:** `app/api/gallery/**/*.ts`, `app/api/images/**/*.ts`, `lib/data/images.ts`

---

## 5. Logic (credits, entitlements, access)

- **Credits:** Gallery does not deduct credits; it displays and manages already-generated content. Generation (Maya, Feed) consumes credits.
- **Entitlements / access:** All authenticated users see their own images only; API uses session/user id to scope queries.
- **Data flow:** User-facing gallery reads should resolve from `ai_images` first. `generated_images` remains a legacy Classic-mode staging source and only acts as a fallback for older rows that have not been mirrored into `ai_images` yet. Favorites live on canonical gallery records; feed filter uses feed-post image linkage.

---

## 6. Code map (for agents)

- **Pages:** (Gallery is a tab; no standalone page.)
- **Components:** `components/sselfie/gallery-screen.tsx`, `components/sselfie/gallery/**/*.tsx`, `components/sselfie/fullscreen-image-modal.tsx`, `components/sselfie/instagram-reel-preview.tsx`, `components/profile-image-selector.tsx`
- **API routes:** `app/api/gallery/images/route.ts`, `app/api/images/**/*.ts`, `app/api/maya/videos/route.ts`, `app/api/maya/delete-video/route.ts`
- **Lib / shared:** `lib/data/images.ts`

---

## 7. Current value / pain (research)

- **Current value:** One place to see all generated photos and videos; organize with favorites; bulk actions; set profile photo; see feed images in one filter.
- **Proof point:** Gallery is the core retention lever—seeing your AI photos validates product value. Real usage: 8421 image generation transactions across 119 paying members; 395 video animations across 42 users (Videos pipeline proven).
- **Critical pain:** Gallery is **only useful AFTER generation**. New user activation is 0% (0/14 bonus users spending credits in 24h; 0/20 matured free signups). Empty Gallery for most new users = no proof of value = early churn signal. No in-app sharing (Instagram), no download CTA visible, no album/collection grouping, Videos section may be hidden/hard to discover.
- **Secondary pains:** No onboarding milestone for "top images," no profile photo auto-suggestion from best-performing images, no social proof at sign-up.

---

## 8. Opportunities (for rebuild / AI)

- **Empty state fix:** Add "first generation" CTA in Gallery empty state linking directly to Maya (today: generic "Go to Maya"). Reduce friction—make Gallery the reward milestone after first generation (tie to onboarding flow).
- **Profile photo auto-suggestion:** Analyze image metadata (engagement, generation context) and surface "top 3 images for profile" in Gallery. Reduce friction to profile photo picker.
- **Social sharing:** Add one-tap Instagram share from fullscreen lightbox. Allow users to prove value to network (proof multiplier).
- **Album / collection grouping:** Group images by generation session, style, or user tag. Reduce clutter for power users; improve discoverability of best work.
- **Gallery → Account connection:** Surface "Your Top Work" as a Card/Module on Account/Profile page. Social proof and retention metric.
- **Onboarding milestone:** "First 5 images generated" → unlock Gallery milestone. Tie Gallery discovery to user momentum.
- **Videos discoverability:** Ensure Videos tab is prominent; consider adding video count badge on Gallery tab header.
- **Constraints:** Design system; constitution; no breaking paid flows; prioritize Gallery activation as top-of-funnel proof point.

---

## Changelog

| Date       | Change |
|------------|--------|
| 2026-02-25 | Research pass: §7 and §8 filled from funnel/support/friction digests. |
| 2026-02-25 | Initial doc from codebase audit (North). |

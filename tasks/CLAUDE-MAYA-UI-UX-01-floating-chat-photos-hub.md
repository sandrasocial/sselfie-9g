# CLAUDE-MAYA-UI-UX-01 - Floating Maya Access + App v3 Photos Hub

**Owner:** Claude for visible UI, UX, and copy. Stella/Codex owns backend contracts and data mutations called out below.

**Status:** Spec ready from Sandra request 2026-06-20. Do not ship broad redesign outside the two issues here.

**Live area:** App v3 Suite at `/app`.

Relevant files:

- `components/app-v3/app-v3-shell.tsx`
- `components/app-v3/concierge-context.tsx`
- `components/app-v3/maya-concierge.tsx`
- `components/app-v3/gallery-view.tsx`
- `components/app-v3/image-lightbox.tsx`
- `app/api/app-v3/gallery/route.ts`
- Legacy reference only: `components/sselfie/gallery-screen.tsx`, `components/sselfie/gallery/hooks/use-bulk-operations.ts`, `components/sselfie/maya/maya-videos-tab.tsx`

---

## Context

Maya is supposed to be woven through the Suite, not hidden behind one tab. Right now the App v3 shell mounts `MayaConcierge` globally, but the user can only open it by selecting a vibe/card/content action that calls `openWithAesthetic`. If she closes Maya, there is no obvious place to reopen the same conversation from Photos, Content, Library, or Account.

The Photos tab is also too thin compared to the old Studio. App v3 currently returns only:

```ts
{
  images: string[]
  videos: string[]
}
```

from `/api/app-v3/gallery`, so the UI has no stable IDs, no favorite state, no asset type, no deletion metadata, no bulk selection, no smart grouping, and videos are technically present but not integrated as first-class outputs.

Sandra wants:

1. A floating black Maya chat bubble on every Suite screen so Maya is always reachable.
2. A richer Photos tab that organizes what Maya creates: photos, photoshoots, carousels, story slides, reel covers, videos, favorites, with bulk delete/save/download and a favorites gallery.

---

## Workstream A - Floating Maya Chat Bubble

### Problem

After closing Maya, the user must click a vibe/card/action again to reopen conversation. This makes Maya feel conditional instead of always available.

### Desired UX

Add a floating black circular chat launcher in the lower right corner on every non-limited App v3 screen.

Behavior:

- Visible on Create, Photos, Content, Library, and Account.
- Hidden while the Maya drawer is already open.
- Positioned above the bottom nav and safe area. Must not overlap tab labels, modals, or the iOS keyboard.
- Tap opens Maya.
- If there is an existing session/draft, reopen that exact conversation.
- If there is no session, open a general Maya session, not a format-specific generation path.
- Do not create a new chat every time the bubble is tapped.
- Do not wipe messages or format state when reopening.
- Keep the existing handoff actions working: vibes, content ideas, Photos -> Make it move, trained model.

### Implementation guidance

Current context state:

- `ConciergeProvider` owns `session` and `isOpen`.
- It exposes `openWithAesthetic`, `resetCurrentSession`, setters, and `close`.
- It does not expose a simple `open()` for "reopen current Maya".

Recommended approach:

1. Add an `open()` or `openCurrentSession()` method to `ConciergeContextValue`.
2. Behavior for `open()`:
   - If `session` exists: `setIsOpen(true)`.
   - If no `session`: create the same general session used by `MAYA_GENERAL` in `app-v3-shell.tsx`, with `outputFormat: null`, no seed prompt, and `startedAt: Date.now()`, then open.
3. Add a small `MayaFloatingLauncher` component under `components/app-v3/`.
4. Render it in `AppV3Shell` beside `MayaConcierge`:

```tsx
{!limited && <MayaConcierge ... />}
{!limited && <MayaFloatingLauncher />}
```

5. Use a familiar chat icon. Lucide `MessageCircle`, `Sparkles`, or similar is fine. Keep visible copy minimal or none.

Claude owns visual details and microcopy. Stella owns any context API changes if needed.

### Acceptance

- User can reopen Maya from every App v3 section after closing it.
- Reopening preserves the current conversation and draft.
- Tapping the bubble with no prior session opens a blank general Maya conversation.
- Bubble is not visible when Maya drawer is open.
- Bubble does not cover the bottom nav on mobile.
- No duplicate second Maya chat system is introduced.

---

## Workstream B - Photos Tab Becomes A Smart Asset Hub

### Problem

`GalleryView` is currently a basic image grid plus a simple Videos section. It does not understand what kind of content Maya created, and it does not offer the management features users remember from old Studio.

Current behavior:

- `GET /api/app-v3/gallery` reads `ai_images`, legacy `generated_images`, and `generated_videos`.
- It returns only arrays of URLs.
- Image cards have "Make it move".
- Videos render below images, but without typed metadata or bulk management.

### Product goal

Photos should feel like the user's creative library, not a folder of URLs.

It should organize outputs by what Maya creates:

- All
- Favorites
- Photos
- Photoshoots
- Reel covers
- Carousels
- Story slides
- Videos

The exact tab/chip naming is Claude's call, but keep it compact and useful. This is an in-app work surface, not a marketing page.

### Visible UX requirements

Claude should design a polished App v3 Photos experience with:

- Smart filters or segmented controls for content type.
- Favorites view.
- Video section or Videos filter where completed Kling videos are easy to find.
- Bulk select mode.
- Bulk delete.
- Bulk download/save to device where browser-supported.
- Favorite/unfavorite.
- Per-item actions:
  - Open preview/lightbox.
  - Download.
  - Favorite.
  - Delete.
  - For images: Make it move.
  - For videos: Play, download, delete.
- Empty states per filter.
- Mobile-first ergonomics.

Keep the existing App v3 visual language:

- No card-inside-card layouts.
- No landing-page style hero.
- No new color system.
- Keep controls dense, quiet, and usable.

### Backend contract Stella should provide

Replace or extend `/api/app-v3/gallery` so Claude can build against typed assets, while preserving the old `images` and `videos` arrays until the UI migration is complete.

Recommended response shape:

```ts
type AppV3GalleryAsset = {
  id: string
  kind: "image" | "video"
  contentType:
    | "photo"
    | "photoshoot"
    | "reel-cover"
    | "carousel"
    | "story-slide"
    | "video"
    | "unknown"
  url: string
  thumbnailUrl?: string | null
  sourceImageUrl?: string | null
  createdAt: string
  isFavorite: boolean
  prompt?: string | null
  motionPrompt?: string | null
  status?: string | null
  canFavorite: boolean
  canDelete: boolean
  canDownload: boolean
  canMakeMotion: boolean
}

type AppV3GalleryResponse = {
  assets: AppV3GalleryAsset[]
  counts: {
    all: number
    favorites: number
    photos: number
    photoshoots: number
    reelCovers: number
    carousels: number
    storySlides: number
    videos: number
  }
  images: string[] // temporary backward compatibility
  videos: string[] // temporary backward compatibility
}
```

ID convention:

- `ai_123` for `ai_images`
- `gen_123` for legacy `generated_images`
- `video_123` for `generated_videos`

Data sources:

- Images:
  - Prefer `ai_images`.
  - Fall back to unreconciled legacy `generated_images`.
  - Use `is_favorite` where available.
  - Infer `contentType` from known source/category/format fields where available. If unclear, use `"unknown"` rather than guessing.
- Videos:
  - Use `generated_videos`.
  - `kind: "video"`, `contentType: "video"`.
  - `url = video_url`.
  - `sourceImageUrl = image_source`.
  - `motionPrompt = motion_prompt`.
  - `canFavorite` can start as false unless Stella adds video favorite support.

Backend mutations needed:

- `POST /api/app-v3/gallery/favorite`
  - Body: `{ assetId: string, isFavorite: boolean }`
  - Support `ai_` assets first.
  - Legacy `gen_` can return 400 if not safely supported.
  - Video favorite can be a later enhancement unless a schema field already exists.
- `DELETE /api/app-v3/gallery/assets`
  - Body: `{ assetIds: string[] }`
  - Must validate ownership.
  - Delete DB rows for `ai_`, `gen_`, `video_`.
  - For videos, mirror existing legacy behavior from `app/api/maya/delete-video/route.ts`: best-effort delete Blob, then DB.
  - For images, decide whether to delete Blob or only DB row. If Blob deletion is risky, use DB delete first and document that storage cleanup is separate.
- Optional later:
  - `POST /api/app-v3/gallery/download-archive` for real zip downloads. Do not block the first UI on this; client-side multi-download is acceptable for v1.

Important: all mutation endpoints must use the authenticated effective Neon user, including impersonation support, and must never mutate another user's assets.

### Frontend migration plan

Step 1: Stella ships typed assets while keeping old arrays.

Step 2: Claude updates `GalleryView` to consume `assets`.

Step 3: Remove old URL-only assumptions from `GalleryTile`.

Step 4: Add filter state and selection state.

Step 5: Wire per-item and bulk actions to the app-v3 gallery endpoints.

Step 6: Keep `onMakeMotion(url)` unchanged for image assets so Photos -> Video still opens Maya with the selected source image attached.

### Acceptance

- Videos created by Maya appear in Photos without needing the old Studio.
- User can filter to Videos and play/download/delete a video.
- User can favorite images and see them in Favorites.
- User can select multiple images and bulk delete them.
- User can select multiple images and download/save them.
- User can still tap "Make it move" on an image and land in Maya's video flow with that image attached.
- Empty Photos state still works for users with no assets.
- Existing legacy generated images still appear.
- No asset action can affect another user's data.
- No old `/studio` UI is imported wholesale into App v3.

---

## Stella Backend Checklist

Stella should implement before or in parallel with Claude's UI:

1. Normalize `/api/app-v3/gallery` to return typed `assets` plus backward-compatible `images`/`videos`.
2. Add tests for image/video asset normalization.
3. Add `POST /api/app-v3/gallery/favorite` for `ai_` assets.
4. Add `DELETE /api/app-v3/gallery/assets` for `ai_`, `gen_`, and `video_` assets.
5. Add ownership tests for favorite/delete endpoints.
6. Confirm generated Kling videos from `generated_videos` appear with `sourceImageUrl`, `motionPrompt`, and `createdAt`.

---

## Claude UI Checklist

Claude should implement:

1. Floating Maya launcher component.
2. Context reopen behavior if Stella has not already done it.
3. Photos tab redesign using typed assets.
4. Filters/segments for All, Favorites, Images/Photos, Videos, and other content types where data supports it.
5. Bulk selection toolbar.
6. Per-item action menus/buttons.
7. Video cards/player treatment.
8. Mobile QA at 400px width and desktop QA.

---

## Non-goals

- Do not rebuild the old `/studio` gallery.
- Do not add a separate Maya tab.
- Do not create a second chat implementation.
- Do not change Maya's generation prompts or video model.
- Do not change credit pricing.
- Do not introduce new public-facing copy without Sandra approval.

---

## Verification

Manual QA:

1. Open `/app` on Create. Close Maya. Tap floating bubble. Maya reopens.
2. Switch to Photos, Content, Library, Account. Bubble is present and opens Maya.
3. Generate a video from Photos -> Make it move. Confirm it appears in Photos -> Videos after completion.
4. Favorite an image. Confirm it appears under Favorites and survives refresh.
5. Bulk select 2+ images. Delete. Confirm they disappear and do not affect other assets.
6. Bulk download 2+ images. Confirm browser starts downloads or gives a clear browser-supported fallback.
7. Delete a video. Confirm it disappears and the request is scoped to the authenticated user.

Automated checks:

- Focused backend tests for gallery normalization and mutations.
- Focused client tests or Playwright smoke for floating launcher visibility/reopen.
- Lint clean.
- No hydration errors.

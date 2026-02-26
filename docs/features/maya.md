# Maya — Feature doc

**Purpose:** Single source of truth for how the Maya feature works end-to-end. For agents, North, and product. Use for research, proposals, and implementation.

---

## 1. Overview

- **Feature name:** Maya
- **One-line:** Conversational AI that knows the user (brand profile injected); Classic mode (custom Flux model + trigger word) and Pro mode (Nano Banana Pro + reference images); image generation, photoshoots, videos, prompts tab, and training (membership-only). **Feed tab is currently disabled.**
- **Entry points:**
  - `/studio` (default tab can be Maya via `?tab=maya`)
  - `/maya` (direct; paid-blueprint users are redirected to `/blueprint`)
  - In-app: bottom nav “Maya” / chat icon in `SselfieApp`
- **Who can access:**
  - **Studio members:** Full Maya access, including **Training tab** (custom model training).
  - **Paid blueprint only:** Redirected to `/blueprint`; no Maya.
  - **Free / one-time:** Maya access except Training (with credit gating on generation).

### Product intent (canonical)

- **Maya is a conversational AI agent** that knows the user: the **brand profile is injected into Maya** so she remembers each user’s brand and story.
- **Goal (Classic + Pro):** Users get images that look **authentic and like themselves**—not like AI or someone else. Users ask Maya for different styles; Maya creates exactly what they want. **Maya creates the prompts** so the experience is **click and create**, easy for users with little prompt knowledge.
- **Classic mode:** Uses the **user’s custom Flux model**. User uploads **10–15 selfies in the Training tab** and trains their own selfie model. Uses **shorter prompts with a trigger word**. In the chat input, **settings and toggles** let the user adjust their model if needed.
- **Pro mode:** Uses **Nano Banana Pro** (Replicate) with the user’s **reference images**. User chooses: images from **gallery** (previous generated) or **upload selfies** from device. In **concept cards, users can view and edit Maya’s prompts**. Pro uses **longer, more detailed prompts** (Classic uses shorter + trigger word).
- **After image generation:** **Photoshoot button** — user can create a **photoshoot in that exact style**: **6–9 photos**, same outfits and style, shown as an **Instagram carousel preview**.
- **Videos tab:** Shows as **image cards** (click to create videos). Sends **motion prompts to Replicate** to animate that exact image. Shows as **Instagram reel preview** for the user.
- **Prompts tab:** Intended to be **Sandra’s favourites** (best-performing prompts). **Not fully built out** — needs to be optimized and researched for best-performing prompts (Nano Banana Pro) in cool styles and fashion-forward outfits. **As of now, not many prompts are added.**
- **Training tab:** **Custom model training**; user uploads selfies and trains their custom model. **Currently only accessible for membership users.**
- **Feed tab:** **Disabled in Maya at the moment.**

---

## 2. User journey (start to finish)

| Step | Screen / action | What user sees / does |
|------|------------------|------------------------|
| 1 | Land on `/studio` or `/maya` | Auth check; credit grant for free users (once); `SselfieApp` loads with Maya tab. |
| 2 | Maya tab active | `MayaChatScreen`: header, tab strip (Classic / Pro / Videos / Prompts / Training; **Feed tab present but disabled**). Chat area, input. Brand profile is injected so Maya knows the user’s brand and story. |
| 3 | Mode: Classic | Chat; user asks for styles; Maya creates prompts (short + trigger word). User can adjust **settings/toggles in chat input** for their model. Credits checked/deducted; image generated via **user’s custom Flux model** (trained in Training tab with 10–15 selfies). |
| 4 | Mode: Pro | Concept cards; user picks **reference images** (gallery or upload). **User can view and edit Maya’s prompts** in concept cards. Longer, detailed prompts; **Nano Banana Pro** (Replicate). Credits checked/deducted. |
| 5 | After image (either mode) | **Photoshoot button** → create photoshoot in that exact style: **6–9 photos**, same outfits/style → **Instagram carousel preview**. |
| 6 | Videos tab | **Image cards** (click to create video). Motion prompts sent to Replicate to animate that image → **Instagram reel preview**. Credits (e.g. 3) checked/deducted. |
| 7 | Prompts tab | Browse prompts (intended: Sandra’s favourites; **not many prompts added yet**; needs optimization/research for best Nano Banana Pro prompts, cool/fashion-forward styles). Can open Academy from here. |
| 8 | Training tab | **Membership-only.** User uploads 10–15 selfies; trains **custom Flux model** (Replicate). Credits (e.g. 20) checked/deducted. |
| 9 | Feed tab | **Disabled** in Maya at the moment. (When enabled: would create feed from Maya; link to Feed Planner.) |
| 10 | First-time / academy | Welcome-first-generation flow and academy journey prompts can show; may deep-link to Academy tab. |
| 11 | Low/zero credits | Modals (low-credit, zero-credits upgrade); CTA to buy credits or upgrade. |

Branches: paid blueprint → redirect to `/blueprint`. No credits → upgrade/buy modals. Training tab → membership only. Admin/prompt_builder → some chat paths bypass credit check.

---

## 3. Frontend

- **Routes (pages):**
  - `app/studio/page.tsx` — main app shell; credit grant; passes `initialTab` to `SselfieApp`.
  - `app/maya/page.tsx` — direct Maya entry; access check (paid blueprint → redirect); renders `SselfieApp` with Maya context.
- **Main component(s):**
  - `components/sselfie/sselfie-app.tsx` — app shell; tab state; renders `MayaChatScreen` when tab is Maya.
  - `components/sselfie/maya-chat-screen.tsx` — Maya UI: tabs (Classic/Pro/Videos/Prompts/Training/Feed), chat, concepts, gallery strip, input.
- **Key UI state:** `activeTab` (maya/gallery/feed-planner/academy/account), `activeMayaTab` (classic/pro/videos/prompts/training/feed — **feed disabled**), chat history, selected images, concept cards, photoshoot state, brand profile (injected into Maya).
- **Navigation:** URL hash (e.g. `#maya`, `#maya/feed`, `#academy`); tab state in `SselfieApp` and `MayaChatScreen`; nav to Gallery, Feed Planner, Academy, Account from bottom nav.
- **Code paths:**
  - `components/sselfie/sselfie-app.tsx`
  - `components/sselfie/maya-chat-screen.tsx`
  - `components/sselfie/maya/` (maya-header, maya-tab-switcher, maya-chat-interface, maya-concept-cards, maya-prompts-tab, maya-training-tab, maya-videos-tab, maya-feed-tab, welcome-first-generation-flow, etc.)
  - `components/sselfie/concept-card.tsx`, `components/sselfie/image-gallery-modal.tsx`
  - `components/sselfie/pro-mode/ImageUploadFlow.tsx`

---

## 4. Backend

- **API routes (Maya) — full list:**
  - **Chat:** `app/api/maya/chat/route.ts`, `app/api/maya/pro/chat/route.ts`
  - **Chat persistence:** `app/api/maya/load-chat/route.ts`, `app/api/maya/save-chat/route.ts`, `app/api/maya/save-message/route.ts`, `app/api/maya/update-message/route.ts`, `app/api/maya/new-chat/route.ts`, `app/api/maya/delete-chat/route.ts`, `app/api/maya/chats/route.ts`
  - **Image gen:** `app/api/maya/generate-image/route.ts` (Classic), `app/api/maya/pro/generate-image/route.ts` (Pro), `app/api/maya/generate-studio-pro/route.ts`, `app/api/maya/generate-studio-pro-prompts/route.ts`
  - **Concepts:** `app/api/maya/generate-concepts/route.ts`, `app/api/maya/pro/generate-concepts/route.ts`
  - **Photoshoot:** `app/api/maya/create-photoshoot/route.ts`, `app/api/maya/get-photoshoot/route.ts`, `app/api/maya/check-photoshoot-prediction/route.ts`, `app/api/maya/pro/photoshoot/start-session/route.ts`, `app/api/maya/pro/photoshoot/generate-grid/route.ts`, `app/api/maya/pro/photoshoot/check-grid/route.ts`, `app/api/maya/pro/photoshoot/create-carousel/route.ts`, `app/api/maya/pro/photoshoot/lookup-image/route.ts`
  - **Video:** `app/api/maya/generate-video/route.ts`, `app/api/maya/generate-motion-prompt/route.ts`, `app/api/maya/check-video/route.ts`, `app/api/maya/videos/route.ts`, `app/api/maya/delete-video/route.ts`
  - **Feed (Maya; tab disabled):** `app/api/maya/feed/list/route.ts`, `app/api/maya/feed/generate-images/route.ts`, `app/api/maya/feed/[feedId]/route.ts`, `app/api/maya/feed/save-to-planner/route.ts`, `app/api/maya/feed-progress/route.ts`, `app/api/maya/feed-chat/health/route.ts`, `app/api/maya/generate-feed/route.ts`, `app/api/maya/generate-feed-prompt/route.ts`, `app/api/maya/generate-all-feed-prompts/route.ts`, `app/api/maya/pro/generate-feed/route.ts`
  - **Prompts / tips:** `app/api/maya/generate-prompt-suggestions/route.ts`, `app/api/maya/content-pillars/route.ts`, `app/api/maya/instagram-tips/route.ts`
  - **Pro library:** `app/api/maya/pro/library/get/route.ts`, `app/api/maya/pro/library/update/route.ts`, `app/api/maya/pro/library/clear/route.ts`
  - **Pro status:** `app/api/maya/check-studio-pro/route.ts`, `app/api/maya/pro/check-generation/route.ts`
  - **Other:** `app/api/maya/update-physical-preferences/route.ts`, `app/api/maya/research/route.ts`, `app/api/maya/b-roll-images/route.ts`
- **API routes (Training) — full list:**
  - `app/api/training/start/route.ts` — start training (Replicate; membership + credits); calls `lib/data/training.ts`, `lib/replicate-client.ts`, `lib/storage.ts` (createTrainingZip), `lib/credits.ts`, `lib/subscription.ts` (hasStudioMembership).
  - `app/api/training/start-training/route.ts` — alternate start entry (uses `getOrCreateTrainingModel` from `lib/data/training.ts`, `lib/replicate-client.ts`).
  - `app/api/training/status/route.ts`, `app/api/training/progress/route.ts` — status and progress polling (Maya Training tab uses these). Progress uses `lib/replicate-sync.ts` (trySyncReplicateVersionToUserModel).
  - `app/api/training/upload/route.ts`, `app/api/training/upload-images/route.ts`, `app/api/training/upload-zip/route.ts`, `app/api/training/upload-token/route.ts`, `app/api/training/save-uploads/route.ts`, `app/api/training/create-zip-from-blobs/route.ts` — image upload for training.
  - `app/api/training/cancel/route.ts`, `app/api/training/delete/route.ts`, `app/api/training/sync-version/route.ts`.
- **Prompts tab data source:** User-facing Prompts tab loads from **`GET /api/prompt-guides/items`** (tables: `prompt_guide_items`, `prompt_guides` — published/approved items). Admin can manage prompts via **`GET/POST/DELETE /api/admin/creative-content/prompts`** (table: `maya_prompt_suggestions`). So curated “Sandra’s favourites” can be delivered via prompt guides; `maya_prompt_suggestions` is an alternate/admin source.
- **Server actions:** Generation and chat are API-route driven; checkout/credits use server actions elsewhere (see Profile/credits).
- **Cron / webhooks:** Reconcile/generation jobs can touch generation state; no Maya-specific cron.
- **Lib used by Maya/Training/Video:** `app/api/maya/**/*.ts`, `lib/maya/*.ts`, `lib/maya/pro/*.ts`, `lib/data/maya.ts`, `lib/data/training.ts`, `lib/credits.ts`, `lib/replicate-helpers.ts`, `lib/replicate-client.ts`, `lib/replicate-sync.ts` (training progress), `lib/nano-banana-client.ts`, `lib/feed-planner/queue-images.ts` (feed), `lib/storage.ts` (training zip).

---

## 5. Logic (credits, entitlements, access)

- **Credits:** Checked and/or deducted in: `generate-image` (Classic), `pro/generate-image`, `generate-studio-pro`, `generate-video`, `create-photoshoot`, `pro/photoshoot/generate-grid`, `training/start`. Feed tab disabled so no feed generation from Maya currently. Admin and prompt_builder can bypass credit check in chat. Balance from `api/user/credits`.
- **Entitlements / access:** Studio → full Maya including **Training tab**. Paid blueprint only → redirect `/blueprint`. Free/one-time → Maya except **Training tab** (membership-only). **Brand profile** is injected into Maya context so she knows the user’s brand and story. Subscription from `getUserSubscription`; product_type used for feature gating.
- **Data flow:** Chats and messages in DB (maya_chats, maya_chat_messages); brand in user_personal_brand (injected into Maya); images in gallery and generation_trackers; feed data in feed/feed_planner tables when Feed tab used; training state in user_models, selfie_uploads, Replicate; prompts from prompt_guide_items + prompt_guides (and optionally maya_prompt_suggestions for admin-curated).

---

## 5a. Maya & Training pipeline map (for agents)

End-to-end flows so nothing is missed when changing or auditing Maya, Training, Video, or Prompts.

### Classic image pipeline
1. User in Maya Classic tab → chat input (with settings/toggles) → `POST /api/maya/chat` (or chat + generate in one flow).
2. Chat uses brand profile (from `lib/data/maya.ts` getUserPersonalBrand / get-user-context) and prompt logic in `lib/maya/prompt-generator.ts`, `lib/maya/prompt-authority.ts`, `lib/maya/flux-prompt-optimization.ts`, trigger word from user_models.
3. Image generation → `POST /api/maya/generate-image` → Replicate (user’s custom Flux LoRA from training). Credits: `lib/credits.ts` (check/deduct).
4. Result appears in chat/gallery; **Photoshoot** button → `create-photoshoot` or Pro photoshoot routes → 6–9 images → carousel.

### Pro image pipeline
1. User in Maya Pro tab → reference images (gallery or upload via `components/sselfie/pro-mode/ImageUploadFlow.tsx`, Pro library API).
2. Concepts → `POST /api/maya/pro/generate-concepts` or `POST /api/maya/pro/chat`; prompts visible/editable in concept cards (`ConceptCardPro`, `concept-card.tsx`).
3. Image generation → `POST /api/maya/pro/generate-image` → Nano Banana Pro (Replicate) via `lib/nano-banana-client.ts`, `lib/maya/nano-banana-prompt-builder.ts`.
4. Photoshoot → `app/api/maya/pro/photoshoot/*` (start-session → generate-grid → check-grid → create-carousel).

### Video pipeline
1. Videos tab shows image cards (from gallery / B-roll; `GET /api/maya/b-roll-images`, `GET /api/maya/videos`).
2. User clicks image → motion prompt: `POST /api/maya/generate-motion-prompt` (Claude vision; can use imageUrl) → then `POST /api/maya/generate-video` (Replicate, e.g. Wan 2.5 I2V). Credits: CREDIT_COSTS.ANIMATION.
3. Polling → `GET /api/maya/check-video` until done → display as Instagram reel preview. List/delete: `GET /api/maya/videos`, `DELETE /api/maya/delete-video`.

### Training pipeline
1. Training tab (membership-only) → `GET /api/training/status` (Maya uses this for status card). If no model or user wants to train → opens onboarding/training flow (e.g. `open-onboarding` event) where uploads happen.
2. Upload: `POST /api/training/upload` or upload-images/upload-zip/save-uploads → images in selfie_uploads; zip via `lib/storage.ts` createTrainingZip.
3. Start: `POST /api/training/start` → membership check (`hasStudioMembership`), credit check/deduct (CREDIT_COSTS.TRAINING), `lib/data/training.ts` createTrainingModel, Replicate training (fast-flux-trainer / FLUX_LORA_TRAINER), trigger word stored in user_models.
4. Polling: `GET /api/training/status`, `GET /api/training/progress?modelId=…` (Maya Training tab polls). Replicate completion updates user_models (replicate_model_id, lora_weights_url, training_status = completed).
5. Classic mode then uses this model + trigger word for `generate-image`.

### Prompts tab pipeline
1. Prompts tab UI: `components/sselfie/maya/maya-prompts-tab.tsx`.
2. Load prompts: `GET /api/prompt-guides/items` (optional `?category=`) → reads `prompt_guide_items` + `prompt_guides` (published/approved). Admin sees drafts too.
3. Generate from prompt (Classic): `POST /api/maya/generate-image`. Pro: `POST /api/maya/pro/generate-image` (with selected prompt + reference images).
4. Admin-curated prompts: `maya_prompt_suggestions` table, managed via `GET/POST/DELETE /api/admin/creative-content/prompts`; can be used for “Sandra’s favourites” once wired or synced into prompt guides.

### Key shared libs (no omissions)
- **Maya context & chat:** `lib/maya/get-user-context.ts`, `lib/data/maya.ts` (chats, messages, brand, memory), `lib/maya/pro/chat-logic.ts`, `lib/maya/mode-adapters.ts`, `lib/maya/studio-pro-system-prompt.ts`, `lib/maya/auto-select-mode.ts`.
- **Concepts & guides:** `lib/maya/concept-templates.ts`, `lib/maya/prompt-builders/guide-prompt-handler.ts`, `lib/maya/brand-library-2025.ts`; Classic concepts also use `lib/maya/lifestyle-contexts.ts`, `lib/maya/instagram-location-intelligence.ts`, `lib/maya/flux-prompting-principles.ts`, `lib/maya/fashion-knowledge-2025.ts`, `lib/maya/nano-banana-examples.ts`, `lib/maya/flux-examples.ts`, `lib/maya/nano-banana-validator.ts`.
- **Prompts (Classic):** `lib/maya/prompt-generator.ts`, `lib/maya/prompt-authority.ts`, `lib/maya/prompt-constructor.ts`, `lib/maya/flux-prompt-optimization.ts`, `lib/maya/flux-examples.ts`, `lib/maya/direct-prompt-generation.ts`.
- **Prompts (Pro):** `lib/maya/nano-banana-prompt-builder.ts`, `lib/maya/pro/category-system.ts`, `lib/maya/pro/prompt-architecture.ts`, `lib/nano-banana-client.ts`.
- **Photoshoot:** `lib/maya/pro-photoshoot-prompts.ts`, `lib/maya/pro-photoshoot-context.ts`.
- **Video:** `lib/maya/motion-libraries.ts`, `lib/maya/motion-similarity.ts`; generate-motion-prompt uses AI (Claude) for motion text.
- **Training:** `lib/data/training.ts`, `lib/replicate-client.ts` (FLUX_LORA_TRAINER, getAdaptiveTrainingParams), `lib/replicate-sync.ts` (trySyncReplicateVersionToUserModel in progress route), `lib/storage.ts` (createTrainingZip), `lib/credits.ts`, `lib/subscription.ts`.
- **Replicate (general):** `lib/replicate-helpers.ts`, `lib/replicate-client.ts`, `lib/replicate-sync.ts`, `lib/replicate-polling.ts` (if used elsewhere for image/gen polling).
- **Type guards / quality:** `lib/maya/type-guards.ts` (guardClassicModeRoute, guardProModeRoute), `lib/maya/quality-settings.ts` (MAYA_QUALITY_PRESETS — used by feed generate-single and queue-images), `lib/maya/internal-only-guard.ts` (generate-prompt-suggestions).
- **Feed (Maya feed tab):** `lib/maya/feed-generation-handler.ts` (createFeedFromStrategyHandler, FeedStrategy); feed-planner-context, feed-text-overlays as needed by handler.
- **UI tokens (Pro):** `lib/maya/pro/design-system.ts` (Typography, Colors, etc.) — used by Maya and Pro components.

---

## 6. Code map (for agents)

- **Pages:** `app/studio/page.tsx`, `app/maya/page.tsx`
- **Maya UI components:**
  - Shell: `components/sselfie/sselfie-app.tsx`, `components/sselfie/maya-chat-screen.tsx`
  - Tabs: `components/sselfie/maya/maya-tab-switcher.tsx`, `components/sselfie/maya/maya-chat-interface.tsx`, `components/sselfie/maya/maya-concept-cards.tsx`, `components/sselfie/maya/maya-prompts-tab.tsx`, `components/sselfie/maya/maya-training-tab.tsx`, `components/sselfie/maya/maya-videos-tab.tsx`, `components/sselfie/maya/maya-feed-tab.tsx` (Feed disabled)
  - Input & settings: `components/sselfie/maya/maya-unified-input.tsx`, `components/sselfie/maya/maya-settings-panel.tsx`, `components/sselfie/maya/maya-mode-toggle.tsx`, `components/sselfie/maya/maya-quick-prompts.tsx`
  - Header: `components/sselfie/maya/maya-header.tsx`, `components/sselfie/maya/maya-header-simplified.tsx`
  - Onboarding/welcome: `components/sselfie/maya/welcome-first-generation-flow.tsx`
  - Hooks: `components/sselfie/maya/hooks/use-maya-chat.ts`, `components/sselfie/maya/hooks/use-maya-images.ts`, `components/sselfie/maya/hooks/use-maya-mode.ts`, `components/sselfie/maya/hooks/use-maya-settings.ts`, `components/sselfie/maya/hooks/use-maya-shared-images.ts`
- **Pro mode:** `components/sselfie/pro-mode/ProModeChat.tsx`, `components/sselfie/pro-mode/ProModeChatHistory.tsx`, `components/sselfie/pro-mode/ProModeInput.tsx`, `components/sselfie/pro-mode/ProModeHeader.tsx`, `components/sselfie/pro-mode/ImageUploadFlow.tsx`, `components/sselfie/pro-mode/ImageLibraryModal.tsx`, `components/sselfie/pro-mode/ConceptCardPro.tsx`, `components/sselfie/pro-mode/hooks/useProModeChat.ts`, `components/sselfie/pro-mode/hooks/useImageLibrary.ts`, `components/sselfie/pro-mode/hooks/useConceptGeneration.ts`
- **Shared:** `components/sselfie/concept-card.tsx`, `components/sselfie/image-gallery-modal.tsx`, `components/sselfie/maya-chat-history.tsx`, `components/sselfie/video-player.tsx`, `components/sselfie/maya-styles-carousel.tsx`, `components/sselfie/prompt-suggestion-card.tsx`, `components/sselfie/story-highlight-card.tsx`, `components/sselfie/studio-pro-image-upload-module.tsx`.
- **Gallery / video (Maya flows):** `components/sselfie/gallery-screen.tsx` (uses `GET /api/maya/videos`, delete-video), `components/sselfie/b-roll-screen.tsx` (same video pipeline as Maya Videos tab: b-roll-images, generate-motion-prompt, generate-video, check-video, delete-video).
- **Content / tips:** `components/sselfie/content-pillar-builder.tsx` (content-pillars), `components/sselfie/feed-publishing-hub.tsx` (instagram-tips).
- **Training (outside Maya tab):** `components/sselfie/training-screen.tsx`, `components/sselfie/retrain-model-modal.tsx`; onboarding may use `components/sselfie/onboarding-wizard.tsx` or `components/onboarding/unified-onboarding-wizard.tsx` for training start (status, progress, upload-zip, cancel). Feed Planner uses `lib/maya/feed-generation-handler.ts` and may call Maya feed APIs.
- **Feed Planner (uses Maya libs):** `components/feed-planner/hooks/feed/use-feed-actions.ts`, `components/feed-planner/hooks/feed/use-feed-polling.ts`, `components/feed-planner/feed-preview-types.ts` (FeedStrategy from `lib/maya/feed-generation-handler.ts`). `components/feed-planner/feed-brand-pillars.tsx` calls `content-pillars`. `app/api/feed/[feedId]/generate-single/route.ts` uses replicate-helpers, maya/quality-settings, prompt-authority, nano-banana-client.
- **Admin:** `components/admin/pro-photoshoot-panel.tsx` calls Maya Pro photoshoot APIs (start-session, generate-grid, check-grid).
- **API routes:** See **§4 Backend** for full Maya and Training route lists.
- **Lib / shared:** `lib/maya/*.ts`, `lib/maya/pro/*.ts`, `lib/maya/prompt-templates/**`, `lib/maya/prompt-components/**`, `lib/data/maya.ts`, `lib/data/training.ts`, `lib/credits.ts`, `lib/replicate-helpers.ts`, `lib/replicate-client.ts`, `lib/replicate-sync.ts`, `lib/nano-banana-client.ts`, `lib/storage.ts`, `lib/feed-planner/queue-images.ts`. See **§5a** for pipeline-specific libs.
- **Note:** `lib/maya/prompt-generator.ts` references `/api/maya/analyze-image`; that route does **not** exist in the app (legacy/optional). Image analysis for prompts may be done elsewhere or disabled.

---

## 7. Current value / pain (research)

**Current value:**
Conversational AI that knows the user (brand profile); Classic (custom Flux + trigger word) and Pro (Nano Banana Pro + editable prompts); click-and-create images; photoshoot (6–9 images, carousel); videos (reel preview); prompts tab (limited); training (membership-only). Goal: authentic, like-themselves images. Feed tab disabled.

**Pain / friction:**
- **0% first-output activation:** 14 new users on 2026-02-25, 20 new users on 2026-02-23, 21 new users on 2026-02-22. **Not a single new user in any cohort generated an image** (0/14, 0/20, 0/21 first-output activation). Free-credit grants are handed out but never used.
- **Massive funnel drop-off:** 547 total users; only 17 active paying Studio members = **3.1% conversion**. Bonus users show 0% re-spend: 0/14, 0/20, 0/21 users who received welcome credits spent any credits across recent daily windows.
- **Tab discovery / clarity gaps:**
  - **Classic vs Pro confusion:** No evidence users understand when to use each mode or what reference images mean in Pro mode; no first-time guidance on mode selection.
  - **Prompts tab:** Not fully built; very few prompts added; users are unaware this exists or what “Sandra’s favourites” means; no curated best-of available yet.
  - **Feed tab:** Disabled; reduces perceived value and creates confusion about what “feed” means in the Maya context.
  - **Videos tab:** Underutilized (low awareness that clicking an image creates a video; cost/benefit unclear).
- **Photoshoot button discovery:** High-value feature (6–9 carousel images in exact style) but unclear where it appears post-generation or how to use it; may be missed on first successful generation.

**Audience evidence:**
- **Data source:** funnel-digest-2026-02-{25,23,22}, support-digest-2026-02-{25,24}, revenue-audit, subscription-audit.
- **Cohort:** New users (14–21/day) sign up with sselfie-studio plan, receive free welcome bonus (2 credits each), never generate any image (0 first-output activation across three daily cohorts).
- **Conversion rate:** 17 active subscriptions (sselfie_studio_membership) + 13 active paid_blueprint rows = ~30 total paying users of 547 = 5.5% paying; but only 17 are recurring Studio membership members generating images.
- **Credit spend:** 119 users have spent credits on 8,421 image generations; 528 users received bonus credits and spent nothing (0% monetization of freebie pool).

**Prompts tab (data):**
User-facing prompts come from **prompt_guide_items** + **prompt_guides** via `GET /api/prompt-guides/items`. Admin can also manage **maya_prompt_suggestions** via `/api/admin/creative-content/prompts`; “Sandra’s favourites” can be curated via either system once optimized.

---

## 8. Opportunities (for rebuild / AI)

**Ideas (prioritized by impact on activation funnel):**

1. **Guided first-time user journey (highest impact on 0% activation):**
   - Add **welcome-first-generation-flow** or inline onboarding that guides new users from signup → first image generation.
   - Suggest **Classic mode default** for first-time users (simpler: just chat, no reference images needed; lower barrier to first generation).
   - Provide **example prompts** or a "Start here" suggestion (e.g. "Ask me for a casual style photo") so users don't stare at a blank chat.
   - Track **first-output activation event** as users complete this flow; unblock faster to first image.

2. **Smarter mode guidance and defaults:**
   - **Auto-select mode** based on user funnel stage or previous training status (if trained custom model → default Classic; else → Pro with curated gallery defaults).
   - **In-chat mode explainer** at first message: "I can generate in Classic mode (your trained style) or Pro mode (with reference images you pick). Which do you prefer?" — convert confusion to intentional choice.
   - **Reference image onboarding (Pro mode):** If user chooses Pro, guide them to select reference images from gallery or upload; reduce friction around "where do reference images come from?"

3. **Optimize Prompts tab as curated entry point:**
   - **Research and load best-performing Nano Banana Pro prompts** from analytics (high engagement, good quality, fashion-forward/cool styles).
   - **Rename and reframe as "Inspiration" or "Trending styles"** (not "Prompts") to lower perceived barrier; add 3–5 category filters (e.g. casual, editorial, luxury, trends).
   - **One-click generation from Prompts tab** (click prompt → auto-generate or pop concept cards); no chat friction.
   - **Link Prompts tab to Academy:** "Bought Caption Pack? Here are captions styles that work. Try generating matching photos."

4. **Photoshoot discovery and friction:**
   - **Surface photoshoot button post-generation** with a clear tooltip: "Create 6–9 photos in this exact style (carousel preview)."
   - **Pre-populate photoshoot cost and time estimate** before user clicks (e.g. "6 photos, 15 credits, ~2 min").
   - **Highlight photoshoot in onboarding or first-time tour** to raise awareness (high-value, low-discovery).

5. **Videos tab awareness:**
   - **Rename to "Reels" or "Animations"** (more familiar term than "Videos").
   - **Surface in a carousel or gallery view post-generation** (not just as a separate tab); e.g. "Create a reel of this image" button near the photoshoot button.
   - **Show cost and preview of animation** upfront (e.g. "Animate this image as a reel, 3 credits").

6. **Re-enable Feed tab (or clarify its absence):**
   - **Clarify product decision:** If Feed in Maya will connect to Feed Planner, document the flow and re-enable with clear CTA ("Generate a week of content").
   - **If staying disabled:** Remove from tab strip entirely (not just grayed out) to reduce UI clutter and confusion.
   - **If re-enabled:** Link to Academy/Blueprint funnel (e.g. "Generate content for your brand pillars from Academy").

7. **Maya as funnel stage-aware agent (in-app journey integration):**
   - **Inject user funnel stage into Maya system context** (free / paid blueprint / member / academy buyer; what products purchased).
   - **First message adapts to stage:** e.g. free user → "You have 2 free credits. Ask me for a style, and let's make your first photo!"; member → "You have unlimited credits. What style do you want this week?"; academy buyer → "You bought Caption Pack — want me to generate captions-style photos?"
   - **Suggest next step in-app:** E.g. after generation, "Your photo is ready. Want to caption it in Feed Planner, or create more?"
   - **See:** `docs/features/IN-APP-JOURNEY-AND-ACADEMY-FUNNEL.md` for funnel stage + in-app next-step integration framework.

8. **Bonus credit incentives and re-engagement:**
   - **Track which users got bonus and never generated** (0% spend cohort); retarget with email or in-app banner: "Your 2 free credits expire in 3 days — try a quick style generation."
   - **Offer bonus-credit top-ups on first generation** (e.g. "Generate a photo and get 2 bonus credits") to drive re-engagement and second generation.

**Constraints:**
- Design system (existing tokens); constitution (no critical-file changes without approval); no breaking paid flows or credit invariants; Training stays membership-only unless product decision changes.
- **First-time flow:** Must not block existing users or disrupt paid generation flows; launch as opt-in or feature-flag-gated A/B.
- **Prompts tab optimization:** Research must validate best-performing Nano Banana Pro prompts before adding; avoid low-quality or off-brand suggestions.

---

## 9. Cleanup / unused audit (over time)

Use this section to track **lib/maya** (and related) files that are not on the documented hot path. Over time, verify each and remove only when confirmed unused. **Before deleting:** run `rg "filename" --type-add 'code:*.{ts,tsx,js,mjs}' -t code` (or grep), run tests, and check docs/scripts.

### Process

1. **Verify:** Search codebase for imports/usages of the file (app, scripts, docs).
2. **Test:** Run relevant tests after any removal to catch dynamic imports or indirect use.
3. **Remove:** Only delete when there are no references in app code (docs/scripts can be updated or left as historical).

### Candidates for verification (as of 2026-02-25)

| File / path | Status | Notes |
|-------------|--------|--------|
| `lib/maya/scene-library.ts` | No app imports found | Verify; remove if unused. |
| `lib/maya/incident-recorder.ts` | No app imports found | Verify; remove if unused. |
| `lib/maya/prompt-health-alerts.ts` | No app imports found | Verify; remove if unused. |
| `lib/maya/user-preferences.ts` | No app imports found | Verify; remove if unused. |
| `lib/maya/authentic-photography-knowledge.ts` | No app imports found | Verify; remove if unused. |
| `lib/maya/post-processing/minimal-cleanup.ts` | No app imports found | Verify; remove if unused. |
| `lib/maya/pro/smart-setting-builder.ts` | No app imports | Only imports `pro/camera-composition`; nothing imports this. Dead chain. |
| `lib/maya/pro/camera-composition.ts` | Only imported by smart-setting-builder | Part of dead chain with smart-setting-builder. |
| `lib/maya/pro/seasonal-luxury-content.ts` | No app imports found | Verify; remove if unused. |
| `lib/maya/pro/photography-styles.ts` | No app imports found | Verify; remove if unused. |
| `lib/maya/pro/influencer-outfits.ts` | No app imports found | Verify; remove if unused. |
| `lib/maya/universal-prompts/index.ts` | Doc-only reference | Referenced in `docs/maya/MAYA_FASHION_SCENERY_AUDIT.md` only. Confirm no runtime use. |
| `lib/maya/prompt-components/universal-prompts-raw.ts` | Comment-only reference | `pro/category-system.ts` has comment about integrating with it; no actual import. Verify intent. |
| `lib/maya/blueprint-photoshoot-templates.ts` | Script + docs only | Used in `scripts/qa-phase2e-feed-subject-identity.ts` and several docs. Not in app API routes. Decide: keep for script/QA or migrate and remove. |

### Verified used (do not remove without updating callers)

- `lib/maya/core-personality.ts` — imported by `mode-adapters.ts`.
- `lib/maya/prompt-audit-storage.ts` — dynamically imported by `prompt-authority.ts`.

### Optional next steps

- Audit **prompt-templates/** and **prompt-components/** subfolders: only some files are used by admin/universal-prompts-loader or concept flows; list which category files are actually imported.
- Add a line to **`docs/_CANONICAL/CLEANUP_LEDGER.md`** (or similar) when a file is removed so rollback is traceable.

---

## Changelog

| Date       | Change |
|------------|--------|
| 2026-02-25 | Initial doc; template filled from codebase audit. |
| 2026-02-25 | Canonical product intent: brand profile injection, Classic (custom Flux + trigger word), Pro (Nano Banana Pro + editable prompts), photoshoot 6–9 carousel, videos reel preview, Prompts tab (Sandra’s favourites, not fully built), Training membership-only, Feed tab disabled. |
| 2026-02-25 | Full pipeline map: §4 Backend (all Maya + Training API routes), §5a Maya & Training pipeline map (Classic, Pro, Video, Training, Prompts flows + key libs). Code map §6 expanded with full component list and Prompts data source (prompt_guides vs maya_prompt_suggestions). |
| 2026-02-25 | Completeness pass: added training/start-training, lib/replicate-sync (progress), all lib/maya files used by pipelines (concept-templates, mode-adapters, studio-pro-system-prompt, auto-select-mode, guide-prompt-handler, lifestyle-contexts, instagram-location-intelligence, type-guards, quality-settings, internal-only-guard, feed-generation-handler, pro/design-system). Added components: prompt-suggestion-card, story-highlight-card, studio-pro-image-upload-module, gallery-screen, b-roll-screen, content-pillar-builder, feed-publishing-hub; Feed Planner hooks and admin pro-photoshoot-panel. Note: /api/maya/analyze-image referenced in code but route does not exist. |
| 2026-02-25 | §9 Cleanup / unused audit: list of lib/maya candidates for verification and eventual removal (scene-library, incident-recorder, prompt-health-alerts, user-preferences, authentic-photography-knowledge, post-processing/minimal-cleanup, pro/smart-setting-builder + camera-composition, pro/seasonal-luxury, photography-styles, influencer-outfits, universal-prompts, prompt-components/universal-prompts-raw, blueprint-photoshoot-templates). Process: verify with grep, run tests, then remove. Verified used: core-personality, prompt-audit-storage. |
| 2026-02-25 | Research pass: §7 and §8 filled from funnel/support/friction digests. |

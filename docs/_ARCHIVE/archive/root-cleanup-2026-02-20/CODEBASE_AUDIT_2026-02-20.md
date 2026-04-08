# 🔍 SSELFIE CODEBASE AUDIT
**Generated:** Fri Feb 20 14:43:26 CET 2026
**Purpose:** Map what's live, dead, and half-finished

## 📊 High Level Counts

| Metric | Count |
|--------|-------|
| TypeScript files | 547 |
| API route directories | 546 |
| Cron jobs | 37 |
| Admin pages | 21 |
| Components | 221 |
| Lib files | 308 |
| Total lines of code | 269359 |

## 🖥️ Admin Pages (with line counts)

| Page | Lines | Has Content? |
|------|-------|-------------|
| /admin/academy | 1966 | ✅ Has content |
| /admin/agents | 227 | ✅ Has content |
| /admin/analytics | 727 | ✅ Has content |
| /admin/brand-engine-applications | 63 | 🟡 Minimal |
| /admin/content-engine | 13 | ⚠️ Likely placeholder |
| /admin/content-templates | 291 | ✅ Has content |
| /admin/credits | 70 | 🟡 Minimal |
| /admin/exit-impersonation | NO page.tsx | ❌ Missing entry point |
| /admin/fashion-styles | 298 | ✅ Has content |
| /admin/feed-styles-v2 | 1072 | ✅ Has content |
| /admin/feedback | 557 | ✅ Has content |
| /admin/generation | 6 | ⚠️ Likely placeholder |
| /admin/journal | 336 | ✅ Has content |
| /admin/libraries | 809 | ✅ Has content |
| /admin/login-as-user | 107 | ✅ Has content |
| /admin/marketing | 8 | ⚠️ Likely placeholder |
| /admin/maya-studio | 46 | 🟡 Minimal |
| /admin/mission-control | 299 | ✅ Has content |
| /admin/newsletter-review | 147 | ✅ Has content |
| /admin/project-tracker | 201 | ✅ Has content |
| /admin/testimonials | 748 | ✅ Has content |

## ⏰ Cron Jobs

### All cron directories in /app/api/cron:

- `admin-alerts` — 241 lines
- `arpu-churn-weekly` — 40 lines
- `backfill-resend-audience` — 33 lines
- `blueprint-discovery-funnel` — 633 lines
- `blueprint-email-sequence` — 49 lines
- `brand-engine-launch-digest` — 47 lines
- `cohort-delivery-load-weekly` — 43 lines
- `cohort-report-weekly` — 47 lines
- `cold-reeducation-sequence` — 424 lines
- `cron-health-check` — 290 lines
- `funnel-report-daily` — 41 lines
- `milestone-bonuses` — 174 lines
- `monthly-usage-recap` — 185 lines
- `nurture-sequence` — 389 lines
- `onboarding-sequence` — 343 lines
- `product-qa-daily` — 43 lines
- `reactivation-campaigns` — 785 lines
- `reconcile-ai-images` — 44 lines
- `reconcile-credits` — 422 lines
- `reconcile-feed-posts` — 44 lines
- `reconcile-generations` — 657 lines
- `reconcile-pro-photoshoot-grids` — 44 lines
- `reconcile-subscriptions` — 514 lines
- `reengagement-campaigns` — 294 lines
- `referral-rewards` — 193 lines
- `refresh-segments` — 53 lines
- `reindex-codebase` — 87 lines
- `resolve-pending-payments` — 296 lines
- `send-blueprint-followups` — 749 lines
- `send-scheduled-campaigns` — 120 lines
- `send-scheduled-newsletters` — 163 lines
- `subscription-ending-soon` — 219 lines
- `sync-audience-segments` — 523 lines
- `upsell-campaigns` — 210 lines
- `welcome-back-sequence` — 49 lines
- `welcome-sequence` — 747 lines
- `win-back-sequence` — 198 lines

### Crons registered in vercel.json:

- `/api/cron/sync-audience-segments"
- `/api/cron/refresh-segments"
- `/api/cron/send-blueprint-followups"
- `/api/cron/nurture-sequence"
- `/api/cron/reactivation-campaigns"
- `/api/cron/blueprint-discovery-funnel"
- `/api/cron/reengagement-campaigns"
- `/api/cron/send-scheduled-campaigns"
- `/api/cron/send-scheduled-newsletters"
- `/api/cron/backfill-resend-audience"
- `/api/cron/welcome-sequence"
- `/api/cron/monthly-usage-recap"
- `/api/cron/referral-rewards"
- `/api/cron/milestone-bonuses"
- `/api/cron/upsell-campaigns"
- `/api/cron/admin-alerts"
- `/api/cron/reindex-codebase"
- `/api/cron/resolve-pending-payments"
- `/api/cron/reconcile-credits"
- `/api/cron/cron-health-check"
- `/api/cron/reconcile-feed-posts"
- `/api/cron/reconcile-ai-images"
- `/api/cron/reconcile-pro-photoshoot-grids"
- `/api/cron/reconcile-generations"
- `/api/cron/reconcile-subscriptions"
- `/api/cron/funnel-report-daily"
- `/api/cron/cohort-report-weekly"
- `/api/cron/arpu-churn-weekly"
- `/api/cron/cohort-delivery-load-weekly"
- `/api/cron/brand-engine-launch-digest"

## 🔌 API Routes — Potentially Unused

Routes with no fetch() calls pointing to them in the codebase:

- `/api/settings/update`
- `/api/studio/activity`
- `/api/studio/generate`
- `/api/studio/generation/[id]`
- `/api/maya/research`
- `/api/maya/b-roll-images`
- `/api/maya/pro/chat`
- `/api/maya/pro/check-generation`
- `/api/maya/pro/library`
- `/api/maya/pro/library/update`
- `/api/maya/pro/library/get`
- `/api/maya/pro/library/clear`
- `/api/maya/pro/generate-feed`
- `/api/maya/pro/photoshoot/lookup-image`
- `/api/maya/pro/photoshoot/check-grid`
- `/api/maya/update-physical-preferences`
- `/api/maya/feed-chat`
- `/api/maya/feed-chat/health`
- `/api/maya/check-photoshoot-prediction`
- `/api/maya/check-studio-pro`
- `/api/maya/load-chat`
- `/api/maya/check-generation`
- `/api/maya/get-photoshoot`
- `/api/maya/feed-progress`
- `/api/maya/generate-feed-prompt`
- `/api/maya/generate-feed`
- `/api/maya/feed`
- `/api/maya/feed/generate-images`
- `/api/maya/feed/[feedId]`
- `/api/maya/feed/list`
- `/api/maya/feed/save-to-planner`
- `/api/maya/delete-chat`
- `/api/maya/generate-all-feed-prompts`
- `/api/maya/generate-studio-pro-prompts`
- `/api/maya/check-video`
- `/api/maya/save-chat`
- `/api/brand-brain`
- `/api/brand-brain/search-codebase`
- `/api/test/resend`
- `/api/auth/health`
- `/api/auth/auto-confirm`
- `/api/images/favorites`
- `/api/images/lookup`
- `/api/images/status`
- `/api/images/feed`
- `/api/check-email-logs`
- `/api/freebie/subscribe`
- `/api/freebie/track-engagement`
- `/api/referrals/track`
- `/api/training/start-training`
- `/api/training/progress`
- `/api/training/delete`
- `/api/training/start`
- `/api/training/create-zip-from-blobs`
- `/api/training/sync-version`
- `/api/training/upload-images`
- `/api/training/upload-token`
- `/api/training/save-uploads`
- `/api/health`
- `/api/health/e2e`
- `/api/feature-flags`
- `/api/feature-flags/paid-blueprint`
- `/api/feature-flags/blueprint-welcome`
- `/api/admin/journal`
- `/api/admin/journal/publish`
- `/api/admin/journal/current`
- `/api/admin/journal/enhance`
- `/api/admin/journal/save`
- `/api/admin/personal-knowledge`
- `/api/admin/feed-style-previews-v2/[id]`
- `/api/admin/tasks`
- `/api/admin/tasks/[id]`
- `/api/admin/testimonials/export`
- `/api/admin/email-campaigns`
- `/api/admin/email-campaigns/[id]`
- `/api/admin/email-campaigns/[id]/reject`
- `/api/admin/email-campaigns/[id]/test`
- `/api/admin/email-campaigns/[id]/approve`
- `/api/admin/email-campaigns/[id]/unreject`
- `/api/admin/training/bulk-sync`
- `/api/admin/training/sync-user`
- `/api/admin/training/sync-status`
- `/api/admin/projects`
- `/api/admin/update-high-ticket-tasks`
- `/api/admin/feed-styles-v2/[id]`
- `/api/admin/libraries/objects/[id]`
- `/api/admin/libraries/outfits/[id]`
- `/api/admin/libraries/locations/[id]`
- `/api/admin/refresh-high-ticket-tasks`
- `/api/admin/scene-prompts-v2/[id]`
- `/api/admin/scene-prompts-v2/[id]/unapprove`
- `/api/admin/scene-prompts-v2/[id]/approve`
- `/api/admin/agent/extract-audio`
- `/api/admin/agent/memory`
- `/api/admin/agent/email-campaigns`
- `/api/admin/agent/email-templates`
- `/api/admin/agent/create-campaign`
- `/api/admin/agent/email-drafts`
- `/api/admin/agent/send-email`
- `/api/admin/agent/send-test-email`
- `/api/admin/agent/upload-email-image`
- `/api/admin/agent/performance`
- `/api/admin/agent/create-calendar-post`
- `/api/admin/agent/competitors/analysis`
- `/api/admin/agent/analytics`
- `/api/admin/agent/save-message`
- `/api/admin/populate-high-ticket-tasks`
- `/api/admin/academy/monthly-drops/[dropId]`
- `/api/admin/academy/flatlay-images/[flatlayId]`
- `/api/admin/academy/courses/[courseId]`
- `/api/admin/academy/lessons/[lessonId]`
- `/api/admin/academy/templates/[templateId]`
- `/api/admin/dashboard/revenue-history`
- `/api/admin/dashboard/feedback`
- `/api/admin/dashboard/testimonials-count`
- `/api/admin/dashboard/revenue`
- `/api/admin/dashboard/stats`
- `/api/admin/verify-stripe-config`
- `/api/admin/users/search`
- `/api/admin/diagnostics`
- `/api/admin/diagnostics/schema-health`
- `/api/admin/diagnostics/create-missing-tables`
- `/api/admin/diagnostics/cron-status`
- `/api/admin/diagnostics/errors`
- `/api/admin/marketing/health`
- `/api/admin/content-engine/planner`
- `/api/admin/content-engine/planner/rewrite`
- `/api/admin/content-engine/generate-pack`
- `/api/admin/creative-content`
- `/api/admin/creative-content/captions`
- `/api/admin/creative-content/captions/[id]`
- `/api/admin/creative-content/calendars`
- `/api/admin/creative-content/calendars/[id]`
- `/api/admin/creative-content/prompts`
- `/api/admin/creative-content/prompts/[id]`
- `/api/admin/brand-engine-calendly`
- `/api/admin/gumloop-webhook`
- `/api/admin/mission-control`
- `/api/admin/mission-control/daily-check`
- `/api/admin/mission-control/complete-task`
- `/api/admin/audience`
- `/api/admin/audience/sync-segments`
- `/api/admin/audience/verify-contact`
- `/api/admin/audience/get-segment-stats`
- `/api/admin/quality-report`
- `/api/admin/setup-alert-tracking`
- `/api/admin/populate-gumloop-tasks`
- `/api/admin/verify-anthropic-key`
- `/api/admin/email`
- `/api/admin/email/subscriber-count`
- `/api/admin/email/get-subscriber-counts`
- `/api/admin/email/preview`
- `/api/admin/email/campaign-status`
- `/api/admin/fashion-styles/[id]`
- `/api/admin/segments`
- `/api/admin/segments/list`
- `/api/admin/analytics/product-qa-daily`
- `/api/admin/stripe`
- `/api/admin/stripe/backfill-customer-ids`
- `/api/admin/stripe/sync-products`
- `/api/sentry-status`
- `/api/user-by-email`
- `/api/gpt-actions`
- `/api/gpt-actions/[tool]`
- `/api/scene-composer`
- `/api/scene-composer/check-status`
- `/api/scene-composer/upload-product`
- `/api/scene-composer/create-scene`
- `/api/scene-composer/generate`
- `/api/stella`
- `/api/stella/bridge`
- `/api/academy/monthly-drops/[dropId]`
- `/api/academy/monthly-drops/[dropId]/download`
- `/api/academy/enroll`
- `/api/academy/flatlay-images/[flatlayId]`
- `/api/academy/flatlay-images/[flatlayId]/download`
- `/api/academy/certificates`
- `/api/academy/courses/[courseId]`
- `/api/academy/exercises`
- `/api/academy/exercises/submit`
- `/api/academy/lessons`
- `/api/academy/lessons/[lessonId]`
- `/api/academy/templates/[templateId]`
- `/api/academy/templates/[templateId]/download`
- `/api/test-sentry-simple`
- `/api/testing`
- `/api/testing/stripe-mock`
- `/api/content-research-strategist`
- `/api/content-research-strategist/research`
- `/api/content-research-strategist/get-research`
- `/api/agent-coordinator`
- `/api/agent-coordinator/workflow-status`
- `/api/checkout-session`
- `/api/profile/recent-work`
- `/api/feed/post`
- `/api/feed/post/[postId]`
- `/api/feed/post/[postId]/cancel`
- `/api/feed/post/[postId]/mark-failed`
- `/api/feed/add-more`
- `/api/feed/expand-for-paid`
- `/api/feed/refresh-concepts`
- `/api/feed/[feedId]`
- `/api/feed/[feedId]/highlight-image`
- `/api/feed/[feedId]/add-hashtags`
- `/api/feed/[feedId]/generate-strategy`
- `/api/feed/[feedId]/check-highlight`
- `/api/feed/[feedId]/generate-highlights`
- `/api/feed/[feedId]/replace-post-image`
- `/api/feed/[feedId]/add-row`
- `/api/feed/[feedId]/reorder`
- `/api/feed/[feedId]/save-highlight-image`
- `/api/feed/[feedId]/check-post`
- `/api/feed/[feedId]/add-strategy`
- `/api/feed/[feedId]/add-caption`
- `/api/feed/[feedId]/progress`
- `/api/feed/[feedId]/update-profile-image`
- `/api/feed/[feedId]/profile-image`
- `/api/feed/[feedId]/generate-images`
- `/api/feed/[feedId]/generate-single`
- `/api/feed/[feedId]/update-metadata`
- `/api/feed/[feedId]/update-style`
- `/api/feed/[feedId]/status`
- `/api/feed/[feedId]/generate-profile`
- `/api/feed/[feedId]/generate-bio`
- `/api/feed/[feedId]/upload-profile-image`
- `/api/feed/[feedId]/update-bio`
- `/api/feed/[feedId]/check-profile`
- `/api/feed/[feedId]/update-caption`
- `/api/feed/[feedId]/regenerate-post`
- `/api/feed/[feedId]/highlights`
- `/api/feed/[feedId]/enhance-caption`
- `/api/feed/[feedId]/download-bundle`
- `/api/feed/[feedId]/regenerate-caption`
- `/api/feed/[feedId]/generate-captions`
- `/api/feed/[feedId]/add-highlight-overlay`
- `/api/feed/[feedId]/mark-posted`
- `/api/feed/[feedId]/strategy`
- `/api/feed/clear`
- `/api/feed/create-manual`
- `/api/feed/list`
- `/api/feed/create-free-example`
- `/api/telegram`
- `/api/telegram/webhook`
- `/api/instagram-strategist`
- `/api/instagram-strategist/generate-captions`
- `/api/prompt-guides`
- `/api/prompt-guides/list`
- `/api/prompt-guides/items`
- `/api/diagnostics/test-webhook`
- `/api/feed-planner/generate-batch`
- `/api/feed-planner/delete-strategy`
- `/api/feed-planner/generate-all-images`
- `/api/feed-planner/enhance-goal`
- `/api/feed-planner/create-from-strategy`
- `/api/feed-planner/v2`
- `/api/feed-planner/v2/variations`
- `/api/feed-planner/save-to-planner`
- `/api/feed-planner/queue-all-images`
- `/api/quota`
- `/api/quota/status`
- `/api/quota/decrement`
- `/api/personal-brand-strategist`
- `/api/personal-brand-strategist/strategy`
- `/api/twin`
- `/api/twin/pipeline`
- `/api/twin/pipeline/update`
- `/api/twin/digest`
- `/api/twin/queue`
- `/api/twin/queue/submit`
- `/api/twin/queue/update`
- `/api/upload-highlight-overlay`
- `/api/webhooks`
- `/api/webhooks/resend`
- `/api/webhooks/stripe`
- `/api/webhooks/stripe/test`
- `/api/instagram`
- `/api/instagram/test-graph-api`
- `/api/instagram/callback`
- `/api/instagram/sync`
- `/api/instagram/connect`
- `/api/instagram/analytics`
- `/api/credits`
- `/api/credits/balance`
- `/api/credits/grant-free-welcome`
- `/api/email`
- `/api/email/track-click`
- `/api/blueprint/check-paid-grid`
- `/api/blueprint/get-blueprint`
- `/api/blueprint/get-paid-status`
- `/api/blueprint/email-concepts`
- `/api/blueprint/get-access-token`
- `/api/blueprint/check-image`
- `/api/blueprint/generate-concept-image`
- `/api/blueprint/track-engagement`
- `/api/cron/reindex-codebase`
- `/api/cron/cron-health-check`
- `/api/cron/cohort-report-weekly`
- `/api/cron/send-scheduled-newsletters`
- `/api/cron/monthly-usage-recap`
- `/api/cron/reconcile-credits`
- `/api/cron/product-qa-daily`
- `/api/cron/referral-rewards`
- `/api/cron/brand-engine-launch-digest`
- `/api/cron/funnel-report-daily`
- `/api/cron/upsell-campaigns`
- `/api/cron/refresh-segments`
- `/api/cron/sync-audience-segments`
- `/api/cron/reactivation-campaigns`
- `/api/cron/reengagement-campaigns`
- `/api/cron/reconcile-feed-posts`
- `/api/cron/send-blueprint-followups`
- `/api/cron/resolve-pending-payments`
- `/api/cron/onboarding-sequence`
- `/api/cron/subscription-ending-soon`
- `/api/cron/blueprint-email-sequence`
- `/api/cron/send-scheduled-campaigns`
- `/api/cron/cold-reeducation-sequence`
- `/api/cron/backfill-resend-audience`
- `/api/cron/arpu-churn-weekly`
- `/api/cron/milestone-bonuses`
- `/api/cron/reconcile-pro-photoshoot-grids`
- `/api/cron/reconcile-ai-images`
- `/api/cron/welcome-sequence`
- `/api/cron/cohort-delivery-load-weekly`
- `/api/cron/reconcile-generations`
- `/api/cron/admin-alerts`
- `/api/cron/nurture-sequence`
- `/api/cron/blueprint-discovery-funnel`
- `/api/cron/win-back-sequence`
- `/api/cron/reconcile-subscriptions`
- `/api/cron/welcome-back-sequence`
- `/api/stripe/verify-setup`
- `/api/stripe/create-checkout-session`
- `/api/stripe/create-test-coupon`
- `/api/stripe/test-checkout`
- `/api/stripe/cleanup-products`
- `/api/stripe/list-products`
- `/api/debug`
- `/api/debug/subscription-check`
- `/api/debug/check-subscription-linking`
- `/api/debug/subscription`
- `/api/debug/check-image-prompt`
- `/api/debug/find-reference-image`
- `/api/debug/campaigns`

**Total potentially unused API routes: 344**

## 📚 Lib Files (size)

| File | Lines |
|------|-------|
| admin-error-log.ts | 101 |
| admin-feature-flags.ts | 74 |
| analytics.ts | 177 |
| api-logger.ts | 126 |
| auth-helper.ts | 154 |
| cache.ts | 165 |
| credits-cached.ts | 39 |
| credits.ts | 520 |
| cron-lock.ts | 90 |
| cron-logger.ts | 201 |
| db-singleton.ts | 28 |
| db-with-rls.ts | 123 |
| db.ts | 51 |
| design-tokens.ts | 261 |
| env.ts | 20 |
| feature-flags.ts | 56 |
| feed-progress.ts | 55 |
| flodesk.ts | 323 |
| logger.ts | 103 |
| nano-banana-client.ts | 212 |
| neon.ts | 3 |
| products.ts | 102 |
| rate-limit-api.ts | 153 |
| rate-limit.ts | 272 |
| redis.ts | 75 |
| replicate-client.ts | 102 |
| replicate-error-handler.ts | 279 |
| replicate-helpers.ts | 237 |
| replicate-polling.ts | 77 |
| replicate-sync.ts | 172 |
| simple-impersonation.ts | 73 |
| start-embedded-checkout.ts | 20 |
| storage.ts | 69 |
| stripe.ts | 25 |
| subscription.ts | 372 |
| twin-auth.ts | 29 |
| twin-control-plane.ts | 102 |
| upgrade-detection.ts | 150 |
| upstash-vector.ts | 33 |
| user-mapping.ts | 226 |
| user-sync.ts | 61 |
| utils.ts | 6 |
| webhook-deduplication.ts | 21 |

## 🧩 Large Components (100+ lines)

| Component | Lines |
|-----------|-------|
| ui/dialog.tsx | 143 |
| ui/toast.tsx | 129 |
| ui/dropdown-menu.tsx | 219 |
| ui/select.tsx | 160 |
| upgrade/upgrade-modal.tsx | 130 |
| upgrade/upgrade-comparison-card.tsx | 151 |
| sselfie/video-card.tsx | 160 |
| sselfie/instagram-reel-card.tsx | 443 |
| sselfie/blueprint-welcome-wizard.tsx | 115 |
| sselfie/buy-credits-modal.tsx | 125 |
| sselfie/maya/maya-header-unified.tsx | 1044 |
| sselfie/maya/maya-feed-tab.tsx | 590 |
| sselfie/maya/maya-header.tsx | 886 |
| sselfie/maya/maya-chat-interface.tsx | 1189 |
| sselfie/maya/maya-settings-panel.tsx | 183 |
| sselfie/maya/maya-tab-switcher.tsx | 139 |
| sselfie/maya/maya-quick-prompts.tsx | 177 |
| sselfie/maya/maya-concept-cards.tsx | 248 |
| sselfie/maya/maya-unified-input.tsx | 541 |
| sselfie/maya/maya-training-tab.tsx | 279 |
| sselfie/maya/maya-header-old.tsx | 127 |
| sselfie/maya/welcome-first-generation-flow.tsx | 230 |
| sselfie/maya/maya-mode-toggle.tsx | 120 |
| sselfie/maya/maya-prompts-tab.tsx | 1589 |
| sselfie/maya/maya-videos-tab.tsx | 691 |
| sselfie/instagram-carousel-card.tsx | 276 |
| sselfie/personal-brand-section.tsx | 218 |
| sselfie/content-calendar-screen.tsx | 300 |
| sselfie/install-button.tsx | 261 |
| sselfie/pro-mode/ProModeChatHistory.tsx | 542 |
| sselfie/pro-mode/ProModeChat.tsx | 473 |
| sselfie/pro-mode/ProModeInput.tsx | 342 |
| sselfie/pro-mode/ImageUploadFlow.tsx | 1718 |
| sselfie/pro-mode/ImageLibraryModal.tsx | 519 |
| sselfie/pro-mode/ProModeHeader.tsx | 971 |
| sselfie/pro-mode/ConceptCardPro.tsx | 2002 |
| sselfie/calendar-week-view.tsx | 175 |
| sselfie/landing-page-new.tsx | 1103 |
| sselfie/image-gallery-modal.tsx | 321 |
| sselfie/concept-card.tsx | 2278 |
| sselfie/fullscreen-image-modal.tsx | 349 |
| sselfie/gallery/components/gallery-header.tsx | 133 |
| sselfie/gallery/components/gallery-image-grid.tsx | 193 |
| sselfie/gallery/components/gallery-image-card.tsx | 122 |
| sselfie/gallery/components/gallery-selection-bar.tsx | 105 |
| sselfie/instagram-photo-card.tsx | 375 |
| sselfie/buy-blueprint-modal.tsx | 186 |
| sselfie/blueprint-screen.tsx | 1012 |
| sselfie/maya-styles-carousel.tsx | 282 |
| sselfie/gallery-screen.tsx | 627 |
| sselfie/instagram-photo-preview.tsx | 250 |
| sselfie/schedule-post-modal.tsx | 198 |
| sselfie/brand-profile-wizard.tsx | 787 |
| sselfie/content-pillar-builder.tsx | 185 |
| sselfie/b-roll-screen.tsx | 755 |
| sselfie/story-highlight-card.tsx | 564 |
| sselfie/profile-screen.tsx | 540 |
| sselfie/sselfie-app.tsx | 1244 |
| sselfie/hashtag-strategy-panel.tsx | 135 |
| sselfie/brand-assets-manager.tsx | 203 |
| sselfie/interactive-pipeline-showcase.tsx | 936 |
| sselfie/landing-page.tsx | 1069 |
| sselfie/feed-publishing-hub.tsx | 572 |
| sselfie/instagram-reel-preview.tsx | 288 |
| sselfie/image-viewer-modal.tsx | 134 |
| sselfie/maya-chat-screen.tsx | 3546 |
| sselfie/edit-profile-dialog.tsx | 145 |
| sselfie/academy-screen.tsx | 957 |
| sselfie/account-screen.tsx | 1130 |
| sselfie/pro-photoshoot-panel.tsx | 196 |
| sselfie/studio-screen.tsx | 769 |
| sselfie/maya-chat-history.tsx | 423 |
| sselfie/retrain-model-modal.tsx | 706 |
| sselfie/studio-pro-image-upload-module.tsx | 781 |
| sselfie/onboarding-wizard.tsx | 761 |
| sselfie/settings-screen.tsx | 855 |
| sselfie/training-screen.tsx | 962 |
| sselfie/best-work-selector.tsx | 168 |
| sselfie/interactive-features-showcase.tsx | 326 |
| sselfie/install-prompt.tsx | 207 |
| sselfie/prompt-suggestion-card.tsx | 263 |
| sselfie/dynamic-hero-carousel.tsx | 140 |
| testimonials/testimonial-card.tsx | 152 |
| testimonials/testimonials-section.tsx | 127 |
| testimonials/testimonial-submission-form.tsx | 249 |
| referrals/referral-dashboard.tsx | 172 |
| referrals/social-share-button.tsx | 111 |
| image-lightbox.tsx | 128 |
| admin/admin-analytics-panel.tsx | 593 |
| admin/beta-countdown.tsx | 207 |
| admin/beta-program-manager.tsx | 312 |
| admin/calendar-card.tsx | 233 |
| admin/writing-assistant.tsx | 560 |
| admin/instagram-graph-api-tester.tsx | 232 |
| admin/forecast-section.tsx | 249 |
| admin/generation-health-dashboard.tsx | 499 |
| admin/marketing-health-dashboard.tsx | 493 |
| admin/gallery-image-selector.tsx | 106 |
| admin/health-check-dashboard.tsx | 313 |
| admin/brand-engine-broadcast-panel.tsx | 237 |
| admin/admin-nav.tsx | 101 |
| admin/email-preview-modal.tsx | 272 |
| admin/system-health-monitor.tsx | 383 |
| admin/shared/admin-error-state.tsx | 112 |
| admin/shared/admin-metric-card.tsx | 113 |
| admin/performance-tracker.tsx | 219 |
| admin/admin-dashboard.tsx | 499 |
| admin/content-engine-planner.tsx | 518 |
| admin/email-preview-card.tsx | 768 |
| admin/competitor-tracker.tsx | 319 |
| admin/admin-notifications.tsx | 142 |
| admin/instagram-connection-manager.tsx | 157 |
| admin/segment-selector.tsx | 101 |
| admin/writing-assistant-history.tsx | 488 |
| admin/semantic-search-panel.tsx | 190 |
| admin/maya-testing-lab.tsx | 1541 |
| admin/growth-dashboard.tsx | 485 |
| admin/pro-photoshoot-panel.tsx | 253 |
| admin/beta-testimonial-broadcast.tsx | 292 |
| admin/credit-manager.tsx | 287 |
| admin/content-analyzer.tsx | 342 |
| admin/instagram-setup-guide.tsx | 127 |
| admin/caption-card.tsx | 168 |
| paid-blueprint/paid-blueprint-landing.tsx | 493 |
| checkout/success-content.tsx | 767 |
| feedback/feedback-modal.tsx | 349 |
| academy/course-card.tsx | 140 |
| academy/course-detail.tsx | 327 |
| academy/lesson-viewer.tsx | 175 |
| academy/resource-card.tsx | 128 |
| academy/video-player.tsx | 677 |
| academy/lesson-modal.tsx | 269 |
| UpgradeOrCredits.tsx | 117 |
| profile-image-selector.tsx | 127 |
| feed/instagram-feed-card.tsx | 415 |
| prompt-guides/prompt-email-capture.tsx | 174 |
| prompt-guides/prompt-guide-page-client.tsx | 184 |
| feed-planner/feed-loading-overlay.tsx | 137 |
| feed-planner/feed-style-modal.tsx | 511 |
| feed-planner/feed-header.tsx | 761 |
| feed-planner/buy-blueprint-modal.tsx | 146 |
| feed-planner/free-mode-upsell-modal.tsx | 134 |
| feed-planner/feed-strategy-card.tsx | 114 |
| feed-planner/feed-caption-card.tsx | 151 |
| feed-planner/strategy-preview.tsx | 203 |
| feed-planner/feed-grid-item.tsx | 244 |
| feed-planner/feed-strategy.tsx | 429 |
| feed-planner/feed-posts-list.tsx | 240 |
| feed-planner/feed-view-screen.tsx | 499 |
| feed-planner/feed-grid-preview.tsx | 222 |
| feed-planner/welcome-wizard.tsx | 569 |
| feed-planner/feed-highlights-modal.tsx | 281 |
| feed-planner/instagram-feed-view.tsx | 787 |
| feed-planner/feed-preview-card.tsx | 1427 |
| feed-planner/feed-gallery-selector.tsx | 424 |
| feed-planner/feed-grid.tsx | 174 |
| feed-planner/feed-post-card.tsx | 571 |
| feed-planner/feed-modals.tsx | 142 |
| feed-planner/feed-single-placeholder.tsx | 699 |
| feed-planner/feed-brand-pillars.tsx | 298 |
| studio-pro/pro-asset-gallery.tsx | 210 |
| credits/zero-credits-upgrade-modal.tsx | 135 |
| credits/buy-credits-dialog.tsx | 174 |
| credits/credit-renewal-banner.tsx | 103 |
| credits/credit-balance.tsx | 105 |
| onboarding/blueprint-extension.tsx | 351 |
| onboarding/unified-onboarding-wizard.tsx | 981 |
| onboarding/blueprint-onboarding-wizard.tsx | 668 |
| onboarding/base-wizard.tsx | 493 |
| blueprint/blueprint-landing.tsx | 309 |
| blueprint/blueprint-concept-card.tsx | 224 |
| blueprint/blueprint-selfie-upload.tsx | 285 |
| blueprint/blueprint-email-capture.tsx | 239 |

## 🔁 Potential Duplicates (similar names)

- `buy-blueprint-modal.tsx` appears multiple times
- `client.ts` appears multiple times
- `cold-edu-day-1.tsx` appears multiple times
- `cold-edu-day-3.tsx` appears multiple times
- `cold-edu-day-7.tsx` appears multiple times
- `index.ts` appears multiple times
- `layout.tsx` appears multiple times
- `loading.tsx` appears multiple times
- `page.tsx` appears multiple times
- `personality.ts` appears multiple times
- `pro-photoshoot-panel.tsx` appears multiple times
- `route.ts` appears multiple times
- `stripe.ts` appears multiple times
- `types.ts` appears multiple times
- `video-player.tsx` appears multiple times

## 📄 Markdown Files in Root (doc bloat)

**40 markdown files in root directory**

- GUMLOOP_LINK_GUIDE.md
- FLOW_BUILD_CHECKLIST.md
- GUMLOOP_SETUP_GUIDE.md
- FINAL_ADMIN_STRUCTURE.md
- GUMLOOP_FLOW_PROMPTS.md
- ARCHITECTURE.md
- CODEBASE_AUDIT_2026-02-20.md
- BRAND-ENGINE-READY.md
- MASTER_COMMAND_CENTER.md
- DELETE_CHECKLIST.md
- GUMLOOP_EMAIL_INTEGRATION_PLAN.md
- CHANGELOG.md
- READY_TO_TEST.md
- COHORT_CTA_DISTRIBUTION_PACK_DAY1.md
- PARALLEL_EXECUTION_GUIDE.md
- BUILD_VERIFICATION_REPORT.md
- CLEANUP_COMPLETE_SUMMARY.md
- BRAND-ENGINE-STATUS.md
- DELETION_COMPLETE.md
- GUMLOOP_CONNECTION_GUIDE.md
- SIMPLE_ACTION_PLAN.md
- README.md
- SANDRA_FINANCIAL_REALITY_FEB_2026.md
- DELETE_OLD_AGENT_CODE.md
- GUMLOOP_AGENT_SETUP_GUIDE.md
- BRAND_ENGINE_LANDING_PAGE_REWRITE.md
- SYSTEM.md
- IMPLEMENTATION-NEXT-STEPS.md
- GUMLOOP_AUTOMATION_SYSTEM.md
- ADMIN_AUDIT_REPORT.md
- INTEGRATION_SETUP_GUIDE.md
- CURRENT-STATUS.md
- NEW_ADMIN_COMPLETE.md
- BUILD_AGENT_1_NOW.md
- AGENTS.md
- STRATEGIC_CLEANUP_RECOMMENDATION.md
- CLEAN_ADMIN_ARCHITECTURE.md
- FEED_LAYOUT_ARCHITECTURE.md
- LAUNCH-TODAY.md
- BRAND-ENGINE-LAUNCHED.md

---
## ✅ Audit Complete
Next step: Review this with Claude to create DECISIONS.md

# Branch Comparison Report - after-launch vs main

**Generated:** Sat Dec 13 14:29:19 CET 2025

---

## Commit History Differences

Commits in `after-launch` that are NOT in `main`:

```
5d77863 feat: update project files for beta launch
```

## File Change Statistics

```
 ADMIN-AGENT-REBUILD-PLAN.md                        |  148 -
 ADMIN-CHAT-FIXES.md                                |  189 --
 ADMIN-USER-ACCESS-RECOMMENDATIONS.md               |  408 ---
 ADVANCED-AUTOMATION-IMPLEMENTATION-SUMMARY.md      |  225 --
 ADVANCED-EMAIL-AUTOMATION-GUIDE.md                 |  461 ---
 AI-EMAIL-CAMPAIGNS-GUIDE.md                        |  270 --
 AUTOMATION-IMPLEMENTATION-STATUS.md                |  223 --
 BULK-SELECTION-BEST-PRACTICES.md                   |  133 -
 CHAT-DELETION-BEST-PRACTICES.md                    |  122 -
 COMPREHENSIVE-PROMPT-CHANGES-2-WEEKS.md            |  111 -
 CRON-SETUP.md                                      |  129 -
 DEPLOYMENT-READINESS-CHECKLIST.md                  |  175 -
 DEPLOYMENT-SAFETY-CHECKLIST.md                     |  133 -
 EMAIL-ACTIVATION-AND-TESTING-GUIDE.md              |  486 ---
 EMAIL-ANALYTICS-FIXES.md                           |  114 -
 EMAIL-AUTOMATION-ANALYSIS.md                       |  450 ---
 EMAIL-LANDING-PAGE-STRATEGY.md                     |  155 -
 EMAIL-SYSTEM-ARCHITECTURE.md                       |  251 --
 EMAIL-SYSTEM-EXPLAINED.md                          |  273 --
 EMAIL-TEMPLATES-UPDATED.md                         |  108 -
 EMAIL-TESTING-QUICK-REFERENCE.md                   |  139 -
 EMAIL-TESTING-TROUBLESHOOTING.md                   |  333 --
 EMAIL-TRACKING-AND-CONVERSION-ANALYSIS.md          |  184 --
 EMAIL-TRACKING-ANSWERS.md                          |  153 -
 FEED-PLANNER-AUDIT-AND-STRATEGY.md                 |  574 ----
 FEED-PLANNER-COMPLETE-AUDIT.md                     |  183 --
 FEED-PLANNER-GENERIC-PROMPT-FIX.md                 |  137 -
 FEED-PLANNER-PIPELINE-SUMMARY.md                   |  170 -
 FEED-PLANNER-PROMPT-AUDIT.md                       |  297 --
 FEED-PLANNER-PROMPTING-AUDIT.md                    |  337 --
 FEED-PLANNER-STRATEGY-AND-CAPTIONS-AUDIT.md        |  682 ----
 FEED-PLANNER-VS-CONCEPT-CARDS-COMPARISON.md        |  115 -
 FEED-STRATEGY-DOCUMENT-AUDIT.md                    |  104 -
 FULL-IMPERSONATION-COMPLETE.md                     |  147 -
 GA4-IMPLEMENTATION-SUMMARY.md                      |  213 --
 GIT_HISTORY_ANALYSIS.md                            |  150 -
 IMAGE-ANALYSIS-AUDIT.md                            |   97 -
 IMPERSONATION-CLEANUP-COMPLETE.md                  |   78 -
 IMPERSONATION-IMPLEMENTATION.md                    |   95 -
 LANDING-PAGE-OPTIMIZATION-SUMMARY.md               |  118 -
 LEGACY-MIGRATIONS-ARCHIVED.md                      |  104 -
 MANUAL-STEPS-ADVANCED-AUTOMATION.md                |  216 --
 MANUAL-STEPS-REQUIRED.md                           |  255 --
 MANUAL-STEPS-RESEND-WEBHOOK.md                     |  212 --
 MAYA-AUTHENTICITY-ANALYSIS.md                      |  243 --
 MAYA-AUTHENTICITY-RESTORATION-IMPLEMENTED.md       |  203 --
 MAYA-IMAGE-PROMPTING-AUDIT.md                      |  239 --
 MAYA-PROMPT-QUALITY-COMPARISON.md                  |   67 -
 MAYA-PROMPTING-FIXES-IMPLEMENTED.md                |  187 --
 MAYA-QUALITY-SETTINGS-AUDIT.md                     |  236 --
 MAYA-TRAINING-AUDIT-REPORT.md                      |  211 --
 MOTION-PROMPT-EXPRESSION-FIXES.md                  |  157 -
 PROMPT-CHANGES-COMPARISON-2-WEEKS.md               |  182 --
 PROMPT-FIXES-SUMMARY.md                            |  129 -
 PROMPTING_ANALYSIS.md                              |  231 --
 RECOMMENDED-FIXES.md                               |  187 --
 REFERENCE_IMAGE_PROMPT_SEARCH.md                   |  157 -
 RLS-IMPLEMENTATION-GUIDE.md                        |  186 --
 SAFETY-CHECK-REPORT.md                             |  143 -
 SIMPLE-ADMIN-IMPERSONATION.md                      |  129 -
 SIMPLE-ADMIN-LOGIN-PROPOSAL.md                     |   69 -
 TEST-CAMPAIGNS-SETUP.md                            |  192 --
 V0-PREVIEW-LIMITATIONS.md                          |   61 -
 VIDEO-PLAYER-DIAGNOSIS.md                          |  146 -
 WAN-2.5-AUDIT.md                                   |  330 --
 WAN-2.5-CONFIG.md                                  |  111 -
 WHATS-NEW-PAGE-REQUIREMENTS.md                     |  140 -
 app/(public)/landing/page.tsx                      |  674 ++++
 app/(public)/share-your-story/page.tsx             |   26 -
 app/actions/landing-checkout.ts                    |   63 +-
 app/actions/migrate.ts                             |  310 ++
 app/actions/stripe.ts                              |   74 +-
 app/admin/agent/page.tsx                           |    4 +-
 app/admin/beta/page.tsx                            |   45 -
 app/admin/calendar/page.tsx                        |    2 -
 app/admin/conversions/page.tsx                     |  481 ---
 app/admin/credits/page.tsx                         |   70 -
 app/admin/email-analytics/page.tsx                 |  334 --
 app/admin/email-broadcast/page.tsx                 |   18 -
 app/admin/exit-impersonation/route.ts              |   12 -
 app/admin/feedback/page.tsx                        |  492 +--
 app/admin/launch-email/page.tsx                    |   48 -
 app/admin/layout.tsx                               |   23 -
 app/admin/login-as-user/page.tsx                   |  107 -
 app/admin/page.tsx                                 |    2 -
 app/admin/test-audience-sync/page.tsx              |  428 ---
 app/admin/test-campaigns/page.tsx                  |  457 ---
 app/admin/testimonials/page.tsx                    |  748 -----
 app/api/admin/agent/analytics/route.ts             |  147 +-
 app/api/admin/agent/analyze-content/route.ts       |  170 -
 app/api/admin/agent/chat/route.ts                  |  715 +++--
 app/api/admin/agent/chats/route.ts                 |   21 +-
 app/api/admin/agent/create-campaign/route.ts       |  147 -
 app/api/admin/agent/email-campaigns/route.ts       |  159 +-
 app/api/admin/agent/extract-audio/route.ts         |   48 -
 app/api/admin/agent/gallery-images/route.ts        |   37 +-
 app/api/admin/agent/load-chat/route.ts             |   61 -
 app/api/admin/agent/new-chat/route.ts              |   41 -
 app/api/admin/agent/save-message/route.ts          |   54 -
 app/api/admin/agent/semantic-search/route.ts       |   58 +-
 app/api/admin/agent/send-email/route.ts            |   23 -
 app/api/admin/audience/get-segment-stats/route.ts  |  124 -
 app/api/admin/audience/sync-segments/route.ts      |  249 --
 app/api/admin/audience/test-cron/route.ts          |  108 -
 app/api/admin/audience/test-sync/route.ts          |  100 -
 app/api/admin/audience/verify-contact/route.ts     |   90 -
 app/api/admin/conversions/route.ts                 |  322 --
 app/api/admin/credits/add/route.ts                 |   69 -
 app/api/admin/dashboard/beta-users/route.ts        |   79 +-
 app/api/admin/dashboard/email-metrics/route.ts     |   40 +-
 app/api/admin/dashboard/revenue-history/route.ts   |   66 -
 app/api/admin/dashboard/revenue/route.ts           |  100 +-
 app/api/admin/dashboard/stats/route.ts             |   24 +-
 .../admin/dashboard/testimonials-count/route.ts    |   19 -
 app/api/admin/dashboard/webhook-health/route.ts    |   36 +-
 app/api/admin/email-analytics/route.ts             |  194 --
 app/api/admin/email/campaign-status/route.ts       |   51 -
 app/api/admin/email/create-beta-segment/route.ts   |  198 --
 app/api/admin/email/diagnose-test/route.ts         |  151 -
 app/api/admin/email/preview-campaign/route.ts      |   89 -
 app/api/admin/email/preview/route.ts               |  197 --
 .../admin/email/run-scheduled-campaigns/route.ts   |  209 --
 app/api/admin/email/send-beta-testimonial/route.ts |  120 -
 .../admin/email/send-followup-campaign/route.ts    |   91 -
 app/api/admin/email/send-launch-campaign/route.ts  |  294 +-
 app/api/admin/email/send-test-launch/route.ts      |    1 -
 app/api/admin/email/subscriber-count/route.ts      |   43 -
 .../admin/email/track-campaign-recipients/route.ts |  248 --
 app/api/admin/feedback/route.ts                    |  108 +-
 app/api/admin/knowledge/route.ts                   |   65 +-
 app/api/admin/login-as-user/route.ts               |   72 -
 app/api/admin/notifications/route.ts               |  225 --
 app/api/admin/personal-knowledge/route.ts          |  134 -
 app/api/admin/setup-alert-tracking/route.ts        |   98 -
 .../admin/stripe/backfill-customer-ids/route.ts    |  258 --
 app/api/admin/testimonials/export/route.ts         |   35 -
 app/api/admin/testimonials/route.ts                |   81 -
 app/api/admin/users/search/route.ts                |   59 -
 app/api/auth/health/route.ts                       |   38 -
 app/api/blueprint/check-image/route.ts             |   42 -
 app/api/blueprint/email-concepts/route.ts          |  172 -
 app/api/blueprint/generate-concept-image/route.ts  |   39 -
 app/api/blueprint/generate-concepts/route.ts       |  469 ---
 app/api/blueprint/subscribe/route.ts               |  160 -
 app/api/blueprint/track-engagement/route.ts        |   60 -
 app/api/cron/blueprint-email-sequence/route.ts     |  303 --
 app/api/cron/reengagement-campaigns/route.ts       |  169 -
 app/api/cron/refresh-segments/route.ts             |   43 -
 app/api/cron/send-blueprint-followups/route.ts     |  309 --
 app/api/cron/sync-audience-segments/route.ts       |  156 -
 app/api/cron/welcome-back-sequence/route.ts        |  211 --
 app/api/debug/check-image-prompt/route.ts          |   96 -
 app/api/debug/find-reference-image/route.ts        |  285 --
 app/api/email/track-click/route.ts                 |   42 -
 .../status => feed-designer/preview}/route.ts      |   55 +-
 app/api/feed-planner/create-strategy/route.ts      | 1067 -------
 app/api/feed-planner/delete-strategy/route.ts      |   40 -
 app/api/feed-planner/enhance-goal/route.ts         |  107 -
 app/api/feed-planner/generate-all-images/route.ts  |   80 -
 app/api/feed-planner/generate-batch/route.ts       |   85 -
 app/api/feed-planner/queue-all-images/route.ts     |   59 -
 app/api/feed/[feedId]/check-post/route.ts          |  101 +-
 app/api/feed/[feedId]/enhance-caption/route.ts     |  180 --
 app/api/feed/[feedId]/generate-bio/route.ts        |  193 --
 app/api/feed/[feedId]/generate-profile/route.ts    |   16 +-
 app/api/feed/[feedId]/generate-single/route.ts     |  365 +--
 app/api/feed/[feedId]/regenerate-post/route.ts     |  144 -
 app/api/feed/[feedId]/replace-post-image/route.ts  |   17 +-
 app/api/feed/[feedId]/route.ts                     |   69 +-
 .../feed/[feedId]/update-profile-image/route.ts    |   18 +-
 app/api/feed/auto-generate/route.ts                |  223 +-
 app/api/feedback/ai-response/route.ts              |  461 ---
 app/api/feedback/route.ts                          |   37 +-
 app/api/feedback/upload-image/route.ts             |   13 +-
 app/api/freebie/subscribe/route.ts                 |  256 +-
 app/api/images/bulk-save/route.ts                  |   77 -
 app/api/images/route.ts                            |   25 +-
 app/api/instagram/analytics/route.ts               |   88 -
 app/api/instagram/callback/route.ts                |  104 -
 app/api/instagram/connect/route.ts                 |   45 -
 app/api/instagram/sync/route.ts                    |   75 -
 app/api/instagram/test-graph-api/route.ts          |  122 -
 app/api/landing-stats/route.ts                     |    9 -
 app/api/maya/b-roll-images/route.ts                |  127 -
 app/api/maya/chat/route.ts                         | 1084 +++++--
 app/api/maya/chats/route.ts                        |    3 +-
 app/api/maya/check-photoshoot-prediction/route.ts  |  166 -
 app/api/maya/check-video/route.ts                  |  119 +-
 app/api/maya/create-photoshoot/route.ts            |  587 ----
 app/api/maya/delete-chat/route.ts                  |   52 -
 app/api/maya/delete-video/route.ts                 |   30 +-
 app/api/maya/feed-chat/route.ts                    |  802 +++++
 app/api/maya/generate-concepts/route.ts            |  811 -----
 app/api/maya/generate-feed-prompt/route.ts         |  754 +----
 app/api/maya/generate-image/route.ts               |   98 +-
 app/api/maya/generate-motion-prompt/route.ts       |  639 ----
 app/api/maya/generate-video/route.ts               |  122 +-
 app/api/maya/load-chat/route.ts                    |   23 +-
 app/api/maya/new-chat/route.ts                     |    3 +-
 app/api/maya/save-message/route.ts                 |    9 +-
 app/api/maya/update-physical-preferences/route.ts  |   60 -
 app/api/maya/videos/route.ts                       |   24 +-
 app/api/profile/best-work/route.ts                 |   14 +-
 app/api/profile/info/route.ts                      |    3 +-
 app/api/profile/personal-brand/route.ts            |    6 +-
 app/api/settings/route.ts                          |    6 +-
 app/api/stripe/create-checkout-session/route.ts    |   11 +-
 app/api/stripe/create-portal-session/route.ts      |   63 +-
 app/api/studio/activity/route.ts                   |    4 +-
 app/api/studio/favorites/route.ts                  |    4 +-
 app/api/studio/generate/route.ts                   |   63 +-
 app/api/testimonials/published/route.ts            |   32 -
 app/api/testimonials/submit/route.ts               |   95 -
 app/api/training/cancel/route.ts                   |  111 -
 app/api/training/create-zip-from-blobs/route.ts    |  190 --
 app/api/training/progress/route.ts                 |   89 +-
 app/api/training/start-training/route.ts           |  183 --
 app/api/training/upload-images/route.ts            |   47 -
 app/api/training/upload-token/route.ts             |   36 +-
 app/api/training/upload-zip/route.ts               |  371 +--
 app/api/training/upload/route.ts                   |   24 +-
 app/api/upload/route.ts                            |  265 +-
 app/api/user/credits/route.ts                      |    3 +-
 app/api/user/info/route.ts                         |   53 +-
 app/api/user/route.ts                              |    3 +-
 app/api/user/update-demographics/route.ts          |  118 -
 app/api/webhooks/resend/route.ts                   |  273 --
 app/api/webhooks/stripe/route.ts                   |  654 +---
 app/auth/callback/route.ts                         |   34 +-
 app/auth/confirm/route.ts                          |   44 +-
 app/auth/forgot-password/page.tsx                  |   16 +-
 app/auth/login/page.tsx                            |   82 +-
 app/auth/sign-up-success/page.tsx                  |   57 +-
 app/auth/sign-up/page.tsx                          |    9 +-
 app/bio/layout.tsx                                 |   24 -
 app/bio/page.tsx                                   |  199 --
 app/blueprint/layout.tsx                           |   34 -
 app/blueprint/page.tsx                             | 1472 ---------
 app/checkout/membership/page.tsx                   |   25 -
 app/checkout/one-time/client.tsx                   |  126 -
 app/checkout/one-time/page.tsx                     |   25 -
 app/checkout/page.tsx                              |    5 -
 app/feed-planner/page.tsx                          |   37 -
 app/freebie/selfie-guide/access/[token]/page.tsx   |   54 +
 app/freebie/selfie-guide/page.tsx                  |   25 +
 app/layout.tsx                                     |   58 +-
 app/maya/page.tsx                                  |   65 -
 app/migrate-users/page.tsx                         |   53 +
 app/migrate/page.tsx                               |    5 +
 app/page.tsx                                       |   38 +-
 app/studio/page.tsx                                |   97 +-
 app/whats-new/page.tsx                             |  529 ----
 app/why-studio/page.tsx                            |  514 ---
 components/UpgradeOrCredits.tsx                    |   83 -
 components/academy/lesson-modal.tsx                |    7 +-
 components/academy/resource-card.tsx               |   15 +-
 components/academy/video-player.tsx                |  250 +-
 components/admin/admin-agent-chat-new.tsx          |  541 ----
 components/admin/admin-agent-chat.tsx              | 1058 ++-----
 components/admin/admin-analytics-panel.tsx         |  252 +-
 components/admin/admin-dashboard.tsx               |  863 ++---
 components/admin/admin-knowledge-manager.tsx       |   33 +-
 components/admin/admin-notifications.tsx           |  142 -
 components/admin/beta-countdown.tsx                |   18 +-
 components/admin/beta-program-manager.tsx          |  312 --
 components/admin/beta-testimonial-broadcast.tsx    |  292 --
 components/admin/content-analyzer.tsx              |  340 --
 components/admin/credit-manager.tsx                |  275 --
 components/admin/email-campaign-manager.tsx        |   69 +-
 components/admin/email-preview-modal.tsx           |   67 +-
 components/admin/instagram-connection-manager.tsx  |  157 -
 components/admin/instagram-graph-api-tester.tsx    |  232 --
 components/admin/instagram-setup-guide.tsx         |  127 -
 components/admin/launch-email-sender.tsx           |   97 +-
 components/admin/personal-knowledge-manager.tsx    |  410 ---
 components/admin/semantic-search-panel.tsx         |   30 +-
 components/admin/system-health-monitor.tsx         |   84 +-
 components/blueprint/before-after-slider.tsx       |   94 -
 components/blueprint/blueprint-concept-card.tsx    |  166 -
 components/credits/buy-credits-dialog.tsx          |   42 +-
 components/credits/zero-credits-upgrade-modal.tsx  |  124 -
 .../feed-planner/bulk-generation-progress.tsx      |   61 -
 components/feed-planner/feed-grid-preview.tsx      |  140 -
 components/feed-planner/feed-planner-screen.tsx    |  823 -----
 components/feed-planner/feed-post-card.tsx         |  238 --
 .../feed-planner/feed-post-gallery-selector.tsx    |  224 --
 .../feed-planner/feed-profile-gallery-selector.tsx |  187 --
 components/feed-planner/feed-strategy-panel.tsx    |   90 -
 components/feed-planner/index.ts                   |    4 -
 components/feed-planner/instagram-feed-view.tsx    | 1879 -----------
 components/feedback/feedback-modal.tsx             |  122 +-
 .../freebie-guide-capture.tsx}                     |   49 +-
 components/freebie/freebie-guide-content.tsx       |  610 ++++
 components/migrate-users-button.tsx                |   63 +
 components/migration-dashboard.tsx                 |  222 ++
 components/sselfie/academy-screen.tsx              |   11 +-
 components/sselfie/access.ts                       |   31 -
 components/sselfie/b-roll-screen.tsx               |  699 ----
 components/sselfie/buy-credits-modal.tsx           |   12 +-
 components/sselfie/concept-card.tsx                |  678 +---
 components/sselfie/feed-designer-screen.tsx        | 2519 +++++++++++++++
 components/sselfie/feed-publishing-hub.tsx         |    4 +-
 components/sselfie/fullscreen-image-modal.tsx      |    4 +-
 components/sselfie/gallery-screen.tsx              |  299 +-
 components/sselfie/instagram-carousel-card.tsx     |  276 --
 components/sselfie/instagram-photo-card.tsx        |  117 +-
 components/sselfie/instagram-reel-card.tsx         |  283 +-
 components/sselfie/instagram-reel-preview.tsx      |   21 +-
 components/sselfie/landing-page.tsx                |  539 +---
 components/sselfie/maya-chat-history.tsx           |  298 +-
 components/sselfie/maya-chat-screen.tsx            |  918 ++----
 components/sselfie/profile-screen.tsx              |   27 +-
 components/sselfie/settings-screen-enhanced.tsx    |    9 +-
 components/sselfie/settings-screen.tsx             |  171 +-
 components/sselfie/sselfie-app.tsx                 |  153 +-
 components/sselfie/training-screen.tsx             |  358 +--
 components/sselfie/video-card.tsx                  |   13 +-
 components/sselfie/video-player.tsx                |    2 +-
 components/testimonials/testimonial-card.tsx       |  152 -
 components/testimonials/testimonial-grid.tsx       |   82 -
 .../testimonials/testimonial-submission-form.tsx   |  249 --
 components/testimonials/testimonials-section.tsx   |  127 -
 components/ui/badge.tsx                            |   46 -
 components/ui/tabs.tsx                             |   66 -
 components/ui/toast.tsx                            |  129 -
 docs/AUTH-PRODUCTION-TROUBLESHOOTING.md            |  152 -
 docs/DATABASE-ARCHITECTURE.md                      |  341 --
 docs/GALLERY-PRODUCTION-FIXES.md                   |   71 -
 docs/LORA-PROMPTING-ARCHITECTURE-RESEARCH.md       |  400 ---
 docs/MAYA-PRODUCTION-READY.md                      |  139 -
 docs/PRODUCTION-ENV-VARS-CHECK.md                  |   67 -
 docs/RLS-IMPLEMENTATION-GUIDE.md                   |  255 --
 docs/SECURITY-FIXES-APPLIED.md                     |  130 -
 docs/STRIPE-CHECKOUT-FIX.md                        |   71 -
 future-features/feed-designer-v2/README.md         |   27 +
 .../feed-designer-v2/api/feed-chat/route.ts        |    4 +
 .../feed-designer-v2/api/feed-progress/route.ts    |    4 +
 .../api/generate-feed-prompt/route.ts              |    4 +
 .../feed-designer-v2/api/preview/route.ts          |    4 +
 .../components/feed-designer-screen.tsx            |    3 +
 .../feed-designer-v2/components/feed-post-card.tsx |  475 +++
 .../components/simple-feed-editor.tsx              |  461 +++
 hooks/use-toast.ts                                 |  191 --
 lib/admin/email-campaign-helpers.tsx               |  140 -
 lib/admin/get-complete-context.ts                  |  116 +-
 lib/admin/get-personal-context.ts                  |   92 -
 lib/analytics.ts                                   |  157 -
 lib/audience/segment-sync.ts                       |  428 ---
 lib/auth-helper.ts                                 |   24 +-
 lib/cache.ts                                       |    3 -
 lib/content-research-strategist/research-logic.ts  |  329 +-
 lib/credits.ts                                     |  103 +-
 lib/data/admin-agent.ts                            |  107 -
 lib/data/images.ts                                 |   91 +-
 lib/data/maya.ts                                   |   72 +-
 lib/db-singleton.ts                                |    5 +-
 lib/db-with-rls.ts                                 |  123 -
 lib/email/ab-testing.ts                            |  304 --
 lib/email/create-beta-testimonial-campaign.ts      |  100 -
 lib/email/generate-tracked-link.ts                 |   81 -
 lib/email/run-scheduled-campaigns.ts               |  570 ----
 lib/email/segmentation.ts                          |  281 --
 lib/email/send-email.ts                            |   93 +-
 lib/email/templates/beta-testimonial-request.tsx   |  156 -
 lib/email/templates/blueprint-followup-day-0.tsx   |  140 -
 lib/email/templates/blueprint-followup-day-14.tsx  |  146 -
 lib/email/templates/blueprint-followup-day-3.tsx   |  149 -
 lib/email/templates/blueprint-followup-day-7.tsx   |  183 --
 lib/email/templates/critical-bug-alert.tsx         |  238 --
 .../templates/feedback-admin-notification.tsx      |  127 -
 lib/email/templates/feedback-reply-email.tsx       |  117 -
 lib/email/templates/freebie-guide-email.tsx        |  187 --
 lib/email/templates/launch-email.tsx               |  171 +-
 lib/email/templates/launch-followup-email.tsx      |  167 -
 lib/email/templates/newsletter-template.tsx        |  176 --
 lib/email/templates/nurture-day-1.tsx              |  123 -
 lib/email/templates/nurture-day-3.tsx              |  122 -
 lib/email/templates/nurture-day-7.tsx              |  144 -
 lib/email/templates/upsell-day-10.tsx              |  177 --
 lib/email/templates/upsell-freebie-membership.tsx  |  136 -
 lib/email/templates/welcome-back-reengagement.tsx  |  170 -
 lib/email/templates/welcome-email-params.ts        |    1 -
 lib/email/templates/welcome-email.tsx              |   44 +-
 lib/email/templates/win-back-offer.tsx             |  217 --
 lib/feed-planner/caption-writer.ts                 |  270 --
 lib/feed-planner/instagram-strategy-agent.ts       |  296 --
 lib/feed-planner/layout-strategist.ts              |  270 --
 lib/feed-planner/orchestrator.ts                   |  461 ---
 lib/feed-planner/queue-images.ts                   |  297 --
 lib/feed-planner/visual-composition-expert.ts      |  805 -----
 lib/maya/authentic-photography-knowledge.ts        |  175 -
 lib/maya/fashion-knowledge-2025.ts                 |  441 ---
 lib/maya/flux-prompt-builder.ts                    |  197 +-
 lib/maya/flux-prompt-optimization.ts               |  276 --
 lib/maya/flux-prompting-principles.ts              |  357 ---
 lib/maya/get-user-context.ts                       |   43 +-
 lib/maya/influencer-posing-knowledge.ts            |  187 --
 lib/maya/instagram-location-intelligence.ts        |  184 --
 lib/maya/instagram-loras.ts                        |  143 -
 lib/maya/lifestyle-contexts.ts                     |   98 -
 lib/maya/luxury-lifestyle-settings.ts              |  130 -
 lib/maya/motion-libraries.ts                       |  250 --
 lib/maya/motion-similarity.ts                      |  171 -
 lib/maya/personality-enhanced.ts                   |   51 +-
 lib/maya/personality.ts                            |  320 +-
 lib/maya/photoshoot-session.ts                     |  237 --
 lib/maya/quality-settings.ts                       |   62 +-
 lib/maya/storytelling-emotion-guide.ts             |  184 --
 lib/maya/user-preferences.ts                       |  159 -
 lib/products.ts                                    |   37 +-
 lib/rate-limit.ts                                  |   40 +-
 lib/replicate-client.ts                            |    8 +-
 lib/resend/get-audience-contacts.ts                |  319 --
 lib/resend/manage-contact.ts                       |  274 --
 lib/security/url-validator.ts                      |  101 -
 lib/simple-impersonation.ts                        |   73 -
 lib/stripe.ts                                      |   22 +-
 lib/supabase/client.ts                             |   18 +-
 lib/supabase/middleware.ts                         |   84 +-
 lib/supabase/server.ts                             |    9 +-
 lib/upstash-vector.ts                              |    2 -
 lib/user-mapping.ts                                |   39 +-
 middleware.ts                                      |   80 +-
 next.config.mjs                                    |   21 +-
 package.json                                       |   15 +-
 pnpm-lock.yaml                                     | 3326 +++++++-------------
 .../images/100-w8hxvehcig14xjvduygpubkahlwzcj.png  |  Bin 958581 -> 0 bytes
 public/images/2-20-281-29.png                      |  Bin 2097227 -> 0 bytes
 public/images/20-2841-29.jpeg                      |  Bin 88366 -> 0 bytes
 public/images/20-2842-29.jpeg                      |  Bin 103196 -> 0 bytes
 public/images/20-2843-29.jpeg                      |  Bin 65542 -> 0 bytes
 public/images/20-2847-29.jpeg                      |  Bin 43397 -> 0 bytes
 .../images/380-iihccjipjsnt0xfvpt7urkd4bzhtyr.png  |  Bin 1087136 -> 0 bytes
 .../images/616-nnepryg0hs2y745w8znu8twvfrgude.png  |  Bin 1549535 -> 0 bytes
 .../images/618-tvcuzvg8v6r2bput7px8v06bchrxgx.png  |  Bin 1042663 -> 0 bytes
 .../images/641-yz6rwohjtemwagcwy5xqjtsczx9lfh.png  |  Bin 1292483 -> 0 bytes
 .../images/885-brnmqkhxcplb1ff5xk1uywrrsonfvm.png  |  Bin 1257269 -> 0 bytes
 .../images/887-jhlimtqofflmpdrmabtq9dauipdtov.png  |  Bin 1115582 -> 0 bytes
 .../images/888-2pu4idax9dxr7n86jedtuqdak6kwxp.png  |  Bin 1096315 -> 0 bytes
 public/images/bio-hero.png                         |  Bin 1137506 -> 0 bytes
 public/images/diza-20demo-20ig-20grid-202.jpeg     |  Bin 302709 -> 0 bytes
 public/images/img-4128.jpeg                        |  Bin 2164355 -> 0 bytes
 public/images/img-4785.jpg                         |  Bin 414172 -> 0 bytes
 public/images/img-4801.jpg                         |  Bin 469210 -> 0 bytes
 public/images/img-6384-jpg.jpg                     |  Bin 350021 -> 0 bytes
 public/images/img-7713-jpg.jpeg                    |  Bin 1401370 -> 0 bytes
 public/images/img-8032.png                         |  Bin 1229295 -> 0 bytes
 public/images/img-8033.png                         |  Bin 1242324 -> 0 bytes
 public/images/img-8335.jpg                         |  Bin 392712 -> 0 bytes
 public/images/img-8509-202.jpg                     |  Bin 105914 -> 0 bytes
 public/images/img-8640.jpg                         |  Bin 275504 -> 0 bytes
 public/images/img-8641.png                         |  Bin 759338 -> 0 bytes
 public/images/img-8645.jpg                         |  Bin 140710 -> 0 bytes
 public/images/img-9591-jpg.jpeg                    |  Bin 1921880 -> 0 bytes
 public/images/luxury-portrait-20-281-29.png        |  Bin 933818 -> 0 bytes
 public/images/luxury-portrait.png                  |  Bin 1038267 -> 0 bytes
 ...1rme0cs07ja9mcp90-0-1756673402614-20-281-29.png |  Bin 1049104 -> 0 bytes
 .../images/nano-banana-2025-09-07t16-04-25-202.png |  Bin 1210871 -> 0 bytes
 public/images/out-0-20-2847-29.png                 |  Bin 1216323 -> 0 bytes
 public/images/skjermbilde-202025-11-13-20kl.png    |  Bin 602020 -> 0 bytes
 public/images/skjermbilde-202025-11-15-20kl.png    |  Bin 434615 -> 0 bytes
 public/images/testimonials/img-8509-2.jpg          |  Bin 105914 -> 0 bytes
 public/images/testimonials/img-8640.jpg            |  Bin 275504 -> 0 bytes
 public/images/testimonials/img-8641.png            |  Bin 759338 -> 0 bytes
 public/images/testimonials/img-8645.jpg            |  Bin 140710 -> 0 bytes
 .../skjermbilde-2025-11-15-kl-16-37-18.png         |  Bin 95259 -> 0 bytes
 .../skjermbilde-2025-11-15-kl-16-38-18.png         |  Bin 626543 -> 0 bytes
 .../skjermbilde-2025-11-15-kl-16-38-30.png         |  Bin 434615 -> 0 bytes
 public/sw.js                                       |   73 +
 scripts/08-comprehensive-rls-policies-v2.sql       |  866 -----
 scripts/08-comprehensive-rls-policies-v3-neon.sql  |  733 -----
 scripts/09-add-database-indexes.sql                |  263 --
 scripts/10-verify-rls-status.sql                   |   55 -
 scripts/11-rls-policies-corrected-neon.sql         |  592 ----
 scripts/14-migrate-with-supabase-client.ts         |  229 ++
 scripts/15-migrate-users.ts                        |   91 +
 scripts/16-add-color-theme-to-personal-brand.sql   |    6 +
 scripts/16-migrate-training.ts                     |   60 +
 scripts/17-migrate-images.ts                       |   64 +
 scripts/18-migrate-chats.ts                        |   72 +
 scripts/19-migrate-subscriptions.ts                |   51 +
 scripts/20-create-sessions-tables.sql              |   48 +
 scripts/21-create-sessions-tables.ts               |   82 +
 scripts/26-run-color-theme-migration.sql           |    6 +
 scripts/30-create-personal-knowledge-system.sql    |   81 -
 scripts/31-seed-sandra-personal-story.sql          |  140 -
 scripts/32-create-instagram-connections.sql        |   84 -
 scripts/35-create-admin-tools-tables.sql           |   37 -
 scripts/36-create-admin-tools-tables-v2.sql        |   34 -
 scripts/37-fix-admin-agent-mode-constraint.sql     |   25 -
 scripts/38-add-photoshoot-consistency-fields.sql   |   27 -
 scripts/40-create-generated-videos-table.sql       |   30 -
 scripts/CLEANUP-LIST.md                            |  126 -
 scripts/README.md                                  |   90 -
 scripts/add-blueprint-followup-columns.ts          |   95 -
 scripts/add-blueprint-followup-email-columns.sql   |   15 -
 scripts/add-credits-by-email.js                    |   64 +
 scripts/add-credits-k96jonna.js                    |   82 +
 scripts/add-credits-kuki.js                        |   89 +
 scripts/add-credits-manual.js                      |   97 +
 scripts/add-ethnicity-column.sql                   |    9 -
 scripts/add-physical-preferences-column.sql        |    6 -
 scripts/add-testimonial-image-columns.sql          |    9 -
 scripts/add-user-lora-scale.ts                     |   82 +
 scripts/analyze-database.ts                        |   58 +
 scripts/analyze-schema.ts                          |   49 +
 scripts/audit-user-models.ts                       |  124 +
 scripts/backfill-stripe-customer-ids.ts            |  282 --
 scripts/check-campaign-segment.ts                  |   19 -
 scripts/check-dabba-email.ts                       |   58 +
 scripts/check-image-prompt.ts                      |   96 -
 scripts/check-lora-weights.ts                      |   83 +
 scripts/check-magdalena-lora.ts                    |  201 ++
 scripts/check-reference-image-prompt.ts            |  192 --
 scripts/check-shannon-upload-access.ts             |   69 -
 scripts/check-tracy-trigger-word.sql               |   92 -
 scripts/check-user-stripe-status.ts                |  151 -
 scripts/check-users-lora-scale.sql                 |   23 +
 scripts/check-video-urls.ts                        |  194 --
 scripts/cleanup-test-users-production.js           |  151 +
 scripts/cleanup-test-users.sql                     |  216 ++
 scripts/cleanup-test-users.ts                      |  103 +
 scripts/create-admin-alert-tracking.sql            |   21 -
 scripts/create-admin-alert-tracking.ts             |   77 -
 scripts/create-ai-feedback-tables.sql              |   29 -
 scripts/create-blueprint-subscribers-table.sql     |   63 -
 scripts/create-email-campaign-tracking.sql         |   22 -
 scripts/create-email-discount-codes.ts             |  200 --
 scripts/create-launch-campaign-tracking.sql        |   13 -
 scripts/create-testimonials-table.sql              |  122 -
 scripts/delete-test-users.js                       |   64 +
 scripts/diagnose-email-analytics.ts                |  194 --
 scripts/diagnose-hafdis.sql                        |   39 +
 scripts/expand-feed-posts-columns.sql              |   20 -
 scripts/fix-dabba-lora-url.ts                      |   78 +
 scripts/fix-guest-customer.ts                      |  151 -
 scripts/fix-hafdisosk-lora.sql                     |   44 +
 scripts/fix-missing-monthly-credits-v2.ts          |  283 --
 scripts/fix-missing-monthly-credits-v3.ts          |  355 ---
 scripts/fix-missing-monthly-credits.ts             |  231 --
 scripts/fix-sandra-users-lora.sql                  |  118 +
 scripts/fix-shannon-lora-url.ts                    |   77 +
 scripts/list-all-models.js                         |   35 +
 scripts/list-tables.ts                             |   28 +
 scripts/remove-pre-payment-credits.ts              |  377 ---
 scripts/repair-missing-subscriptions-v2.ts         |  129 +
 scripts/repair-missing-subscriptions.ts            |   79 +
 scripts/reset-campaign-status.ts                   |   20 -
 scripts/run-email-campaign.ts                      |  186 --
 scripts/setup-advanced-email-automation.sql        |  192 --
 scripts/setup-advanced-email-automation.ts         |  255 --
 scripts/setup-email-automation-tables.sql          |   61 -
 scripts/setup-email-automation-tables.ts           |  154 -
 scripts/test-feed-prompt-generation.ts             |  214 --
 scripts/test-feed-prompt-simple.ts                 |  195 --
 scripts/test-resend-pagination.ts                  |  106 -
 scripts/test-vimeo-embed.ts                        |  107 -
 scripts/update-freebie-table-fields.sql            |   79 -
 scripts/update-launch-campaign-tracking.sql        |    9 -
 scripts/validate-email-campaign-system.ts          |  473 ---
 scripts/verify-christian-account.js                |   78 +
 tsconfig.json                                      |   24 +-
 vercel.json                                        |   29 -
 563 files changed, 15554 insertions(+), 77702 deletions(-)
```

## Changed Files List

```
ADMIN-AGENT-REBUILD-PLAN.md
ADMIN-CHAT-FIXES.md
ADMIN-USER-ACCESS-RECOMMENDATIONS.md
ADVANCED-AUTOMATION-IMPLEMENTATION-SUMMARY.md
ADVANCED-EMAIL-AUTOMATION-GUIDE.md
AI-EMAIL-CAMPAIGNS-GUIDE.md
AUTOMATION-IMPLEMENTATION-STATUS.md
BULK-SELECTION-BEST-PRACTICES.md
CHAT-DELETION-BEST-PRACTICES.md
COMPREHENSIVE-PROMPT-CHANGES-2-WEEKS.md
CRON-SETUP.md
DEPLOYMENT-READINESS-CHECKLIST.md
DEPLOYMENT-SAFETY-CHECKLIST.md
EMAIL-ACTIVATION-AND-TESTING-GUIDE.md
EMAIL-ANALYTICS-FIXES.md
EMAIL-AUTOMATION-ANALYSIS.md
EMAIL-LANDING-PAGE-STRATEGY.md
EMAIL-SYSTEM-ARCHITECTURE.md
EMAIL-SYSTEM-EXPLAINED.md
EMAIL-TEMPLATES-UPDATED.md
EMAIL-TESTING-QUICK-REFERENCE.md
EMAIL-TESTING-TROUBLESHOOTING.md
EMAIL-TRACKING-AND-CONVERSION-ANALYSIS.md
EMAIL-TRACKING-ANSWERS.md
FEED-PLANNER-AUDIT-AND-STRATEGY.md
FEED-PLANNER-COMPLETE-AUDIT.md
FEED-PLANNER-GENERIC-PROMPT-FIX.md
FEED-PLANNER-PIPELINE-SUMMARY.md
FEED-PLANNER-PROMPT-AUDIT.md
FEED-PLANNER-PROMPTING-AUDIT.md
FEED-PLANNER-STRATEGY-AND-CAPTIONS-AUDIT.md
FEED-PLANNER-VS-CONCEPT-CARDS-COMPARISON.md
FEED-STRATEGY-DOCUMENT-AUDIT.md
FULL-IMPERSONATION-COMPLETE.md
GA4-IMPLEMENTATION-SUMMARY.md
GIT_HISTORY_ANALYSIS.md
IMAGE-ANALYSIS-AUDIT.md
IMPERSONATION-CLEANUP-COMPLETE.md
IMPERSONATION-IMPLEMENTATION.md
LANDING-PAGE-OPTIMIZATION-SUMMARY.md
LEGACY-MIGRATIONS-ARCHIVED.md
MANUAL-STEPS-ADVANCED-AUTOMATION.md
MANUAL-STEPS-REQUIRED.md
MANUAL-STEPS-RESEND-WEBHOOK.md
MAYA-AUTHENTICITY-ANALYSIS.md
MAYA-AUTHENTICITY-RESTORATION-IMPLEMENTED.md
MAYA-IMAGE-PROMPTING-AUDIT.md
MAYA-PROMPT-QUALITY-COMPARISON.md
MAYA-PROMPTING-FIXES-IMPLEMENTED.md
MAYA-QUALITY-SETTINGS-AUDIT.md
MAYA-TRAINING-AUDIT-REPORT.md
MOTION-PROMPT-EXPRESSION-FIXES.md
PROMPT-CHANGES-COMPARISON-2-WEEKS.md
PROMPT-FIXES-SUMMARY.md
PROMPTING_ANALYSIS.md
RECOMMENDED-FIXES.md
REFERENCE_IMAGE_PROMPT_SEARCH.md
RLS-IMPLEMENTATION-GUIDE.md
SAFETY-CHECK-REPORT.md
SIMPLE-ADMIN-IMPERSONATION.md
SIMPLE-ADMIN-LOGIN-PROPOSAL.md
TEST-CAMPAIGNS-SETUP.md
V0-PREVIEW-LIMITATIONS.md
VIDEO-PLAYER-DIAGNOSIS.md
WAN-2.5-AUDIT.md
WAN-2.5-CONFIG.md
WHATS-NEW-PAGE-REQUIREMENTS.md
app/(public)/landing/page.tsx
app/(public)/share-your-story/page.tsx
app/actions/landing-checkout.ts
app/actions/migrate.ts
app/actions/stripe.ts
app/admin/agent/page.tsx
app/admin/beta/page.tsx
app/admin/calendar/page.tsx
app/admin/conversions/page.tsx
app/admin/credits/page.tsx
app/admin/email-analytics/page.tsx
app/admin/email-broadcast/page.tsx
app/admin/exit-impersonation/route.ts
app/admin/feedback/page.tsx
app/admin/launch-email/page.tsx
app/admin/layout.tsx
app/admin/login-as-user/page.tsx
app/admin/page.tsx
app/admin/test-audience-sync/page.tsx
app/admin/test-campaigns/page.tsx
app/admin/testimonials/page.tsx
app/api/admin/agent/analytics/route.ts
app/api/admin/agent/analyze-content/route.ts
app/api/admin/agent/chat/route.ts
app/api/admin/agent/chats/route.ts
app/api/admin/agent/create-campaign/route.ts
app/api/admin/agent/email-campaigns/route.ts
app/api/admin/agent/extract-audio/route.ts
app/api/admin/agent/gallery-images/route.ts
app/api/admin/agent/load-chat/route.ts
app/api/admin/agent/new-chat/route.ts
app/api/admin/agent/save-message/route.ts
app/api/admin/agent/semantic-search/route.ts
app/api/admin/agent/send-email/route.ts
app/api/admin/audience/get-segment-stats/route.ts
app/api/admin/audience/sync-segments/route.ts
app/api/admin/audience/test-cron/route.ts
app/api/admin/audience/test-sync/route.ts
app/api/admin/audience/verify-contact/route.ts
app/api/admin/conversions/route.ts
app/api/admin/credits/add/route.ts
app/api/admin/dashboard/beta-users/route.ts
app/api/admin/dashboard/email-metrics/route.ts
app/api/admin/dashboard/revenue-history/route.ts
app/api/admin/dashboard/revenue/route.ts
app/api/admin/dashboard/stats/route.ts
app/api/admin/dashboard/testimonials-count/route.ts
app/api/admin/dashboard/webhook-health/route.ts
app/api/admin/email-analytics/route.ts
app/api/admin/email/campaign-status/route.ts
app/api/admin/email/create-beta-segment/route.ts
app/api/admin/email/diagnose-test/route.ts
app/api/admin/email/preview-campaign/route.ts
app/api/admin/email/preview/route.ts
app/api/admin/email/run-scheduled-campaigns/route.ts
app/api/admin/email/send-beta-testimonial/route.ts
app/api/admin/email/send-followup-campaign/route.ts
app/api/admin/email/send-launch-campaign/route.ts
app/api/admin/email/send-test-launch/route.ts
app/api/admin/email/subscriber-count/route.ts
app/api/admin/email/track-campaign-recipients/route.ts
app/api/admin/feedback/route.ts
app/api/admin/knowledge/route.ts
app/api/admin/login-as-user/route.ts
app/api/admin/notifications/route.ts
app/api/admin/personal-knowledge/route.ts
app/api/admin/setup-alert-tracking/route.ts
app/api/admin/stripe/backfill-customer-ids/route.ts
app/api/admin/testimonials/export/route.ts
app/api/admin/testimonials/route.ts
app/api/admin/users/search/route.ts
app/api/auth/health/route.ts
app/api/blueprint/check-image/route.ts
app/api/blueprint/email-concepts/route.ts
app/api/blueprint/generate-concept-image/route.ts
app/api/blueprint/generate-concepts/route.ts
app/api/blueprint/subscribe/route.ts
app/api/blueprint/track-engagement/route.ts
app/api/cron/blueprint-email-sequence/route.ts
app/api/cron/reengagement-campaigns/route.ts
app/api/cron/refresh-segments/route.ts
app/api/cron/send-blueprint-followups/route.ts
app/api/cron/sync-audience-segments/route.ts
app/api/cron/welcome-back-sequence/route.ts
app/api/debug/check-image-prompt/route.ts
app/api/debug/find-reference-image/route.ts
app/api/email/track-click/route.ts
app/api/feed-designer/preview/route.ts
app/api/feed-planner/create-strategy/route.ts
app/api/feed-planner/delete-strategy/route.ts
app/api/feed-planner/enhance-goal/route.ts
app/api/feed-planner/generate-all-images/route.ts
app/api/feed-planner/generate-batch/route.ts
app/api/feed-planner/queue-all-images/route.ts
app/api/feed/[feedId]/check-post/route.ts
app/api/feed/[feedId]/enhance-caption/route.ts
app/api/feed/[feedId]/generate-bio/route.ts
app/api/feed/[feedId]/generate-profile/route.ts
app/api/feed/[feedId]/generate-single/route.ts
app/api/feed/[feedId]/regenerate-post/route.ts
app/api/feed/[feedId]/replace-post-image/route.ts
app/api/feed/[feedId]/route.ts
app/api/feed/[feedId]/update-profile-image/route.ts
app/api/feed/auto-generate/route.ts
app/api/feedback/ai-response/route.ts
app/api/feedback/route.ts
app/api/feedback/upload-image/route.ts
app/api/freebie/subscribe/route.ts
app/api/images/bulk-save/route.ts
app/api/images/route.ts
app/api/instagram/analytics/route.ts
app/api/instagram/callback/route.ts
app/api/instagram/connect/route.ts
app/api/instagram/sync/route.ts
app/api/instagram/test-graph-api/route.ts
app/api/landing-stats/route.ts
app/api/maya/b-roll-images/route.ts
app/api/maya/chat/route.ts
app/api/maya/chats/route.ts
app/api/maya/check-photoshoot-prediction/route.ts
app/api/maya/check-video/route.ts
app/api/maya/create-photoshoot/route.ts
app/api/maya/delete-chat/route.ts
app/api/maya/delete-video/route.ts
app/api/maya/feed-chat/route.ts
app/api/maya/generate-concepts/route.ts
app/api/maya/generate-feed-prompt/route.ts
app/api/maya/generate-image/route.ts
app/api/maya/generate-motion-prompt/route.ts
app/api/maya/generate-video/route.ts
app/api/maya/load-chat/route.ts
app/api/maya/new-chat/route.ts
app/api/maya/save-message/route.ts
app/api/maya/update-physical-preferences/route.ts
app/api/maya/videos/route.ts
app/api/profile/best-work/route.ts
app/api/profile/info/route.ts
app/api/profile/personal-brand/route.ts
app/api/settings/route.ts
app/api/stripe/create-checkout-session/route.ts
app/api/stripe/create-portal-session/route.ts
app/api/studio/activity/route.ts
app/api/studio/favorites/route.ts
app/api/studio/generate/route.ts
app/api/testimonials/published/route.ts
app/api/testimonials/submit/route.ts
app/api/training/cancel/route.ts
app/api/training/create-zip-from-blobs/route.ts
app/api/training/progress/route.ts
app/api/training/start-training/route.ts
app/api/training/upload-images/route.ts
app/api/training/upload-token/route.ts
app/api/training/upload-zip/route.ts
app/api/training/upload/route.ts
app/api/upload/route.ts
app/api/user/credits/route.ts
app/api/user/info/route.ts
app/api/user/route.ts
app/api/user/update-demographics/route.ts
app/api/webhooks/resend/route.ts
app/api/webhooks/stripe/route.ts
app/auth/callback/route.ts
app/auth/confirm/route.ts
app/auth/forgot-password/page.tsx
app/auth/login/page.tsx
app/auth/sign-up-success/page.tsx
app/auth/sign-up/page.tsx
app/bio/layout.tsx
app/bio/page.tsx
app/blueprint/layout.tsx
app/blueprint/page.tsx
app/checkout/membership/page.tsx
app/checkout/one-time/client.tsx
app/checkout/one-time/page.tsx
app/checkout/page.tsx
app/feed-planner/page.tsx
app/freebie/selfie-guide/access/[token]/page.tsx
app/freebie/selfie-guide/page.tsx
app/layout.tsx
app/maya/page.tsx
app/migrate-users/page.tsx
app/migrate/page.tsx
app/page.tsx
app/studio/page.tsx
app/whats-new/page.tsx
app/why-studio/page.tsx
components/UpgradeOrCredits.tsx
components/academy/lesson-modal.tsx
components/academy/resource-card.tsx
components/academy/video-player.tsx
components/admin/admin-agent-chat-new.tsx
components/admin/admin-agent-chat.tsx
components/admin/admin-analytics-panel.tsx
components/admin/admin-dashboard.tsx
components/admin/admin-knowledge-manager.tsx
components/admin/admin-notifications.tsx
components/admin/beta-countdown.tsx
components/admin/beta-program-manager.tsx
components/admin/beta-testimonial-broadcast.tsx
components/admin/content-analyzer.tsx
components/admin/credit-manager.tsx
components/admin/email-campaign-manager.tsx
components/admin/email-preview-modal.tsx
components/admin/instagram-connection-manager.tsx
components/admin/instagram-graph-api-tester.tsx
components/admin/instagram-setup-guide.tsx
components/admin/launch-email-sender.tsx
components/admin/personal-knowledge-manager.tsx
components/admin/semantic-search-panel.tsx
components/admin/system-health-monitor.tsx
components/blueprint/before-after-slider.tsx
components/blueprint/blueprint-concept-card.tsx
components/credits/buy-credits-dialog.tsx
components/credits/zero-credits-upgrade-modal.tsx
components/feed-planner/bulk-generation-progress.tsx
components/feed-planner/feed-grid-preview.tsx
components/feed-planner/feed-planner-screen.tsx
components/feed-planner/feed-post-card.tsx
components/feed-planner/feed-post-gallery-selector.tsx
components/feed-planner/feed-profile-gallery-selector.tsx
components/feed-planner/feed-strategy-panel.tsx
components/feed-planner/index.ts
components/feed-planner/instagram-feed-view.tsx
components/feedback/feedback-modal.tsx
components/freebie/freebie-guide-capture.tsx
components/freebie/freebie-guide-content.tsx
components/migrate-users-button.tsx
components/migration-dashboard.tsx
components/sselfie/academy-screen.tsx
components/sselfie/access.ts
components/sselfie/b-roll-screen.tsx
components/sselfie/buy-credits-modal.tsx
components/sselfie/concept-card.tsx
components/sselfie/feed-designer-screen.tsx
components/sselfie/feed-publishing-hub.tsx
components/sselfie/fullscreen-image-modal.tsx
components/sselfie/gallery-screen.tsx
components/sselfie/instagram-carousel-card.tsx
components/sselfie/instagram-photo-card.tsx
components/sselfie/instagram-reel-card.tsx
components/sselfie/instagram-reel-preview.tsx
components/sselfie/landing-page.tsx
components/sselfie/maya-chat-history.tsx
components/sselfie/maya-chat-screen.tsx
components/sselfie/profile-screen.tsx
components/sselfie/settings-screen-enhanced.tsx
components/sselfie/settings-screen.tsx
components/sselfie/sselfie-app.tsx
components/sselfie/training-screen.tsx
components/sselfie/video-card.tsx
components/sselfie/video-player.tsx
components/testimonials/testimonial-card.tsx
components/testimonials/testimonial-grid.tsx
components/testimonials/testimonial-submission-form.tsx
components/testimonials/testimonials-section.tsx
components/ui/badge.tsx
components/ui/tabs.tsx
components/ui/toast.tsx
docs/AUTH-PRODUCTION-TROUBLESHOOTING.md
docs/DATABASE-ARCHITECTURE.md
docs/GALLERY-PRODUCTION-FIXES.md
docs/LORA-PROMPTING-ARCHITECTURE-RESEARCH.md
docs/MAYA-PRODUCTION-READY.md
docs/PRODUCTION-ENV-VARS-CHECK.md
docs/RLS-IMPLEMENTATION-GUIDE.md
docs/SECURITY-FIXES-APPLIED.md
docs/STRIPE-CHECKOUT-FIX.md
future-features/feed-designer-v2/README.md
future-features/feed-designer-v2/api/feed-chat/route.ts
future-features/feed-designer-v2/api/feed-progress/route.ts
future-features/feed-designer-v2/api/generate-feed-prompt/route.ts
future-features/feed-designer-v2/api/preview/route.ts
future-features/feed-designer-v2/components/feed-designer-screen.tsx
future-features/feed-designer-v2/components/feed-post-card.tsx
future-features/feed-designer-v2/components/simple-feed-editor.tsx
hooks/use-toast.ts
lib/admin/email-campaign-helpers.tsx
lib/admin/get-complete-context.ts
lib/admin/get-personal-context.ts
lib/analytics.ts
lib/audience/segment-sync.ts
lib/auth-helper.ts
lib/cache.ts
lib/content-research-strategist/research-logic.ts
lib/credits.ts
lib/data/admin-agent.ts
lib/data/images.ts
lib/data/maya.ts
lib/db-singleton.ts
lib/db-with-rls.ts
lib/email/ab-testing.ts
lib/email/create-beta-testimonial-campaign.ts
lib/email/generate-tracked-link.ts
lib/email/run-scheduled-campaigns.ts
lib/email/segmentation.ts
lib/email/send-email.ts
lib/email/templates/beta-testimonial-request.tsx
lib/email/templates/blueprint-followup-day-0.tsx
lib/email/templates/blueprint-followup-day-14.tsx
lib/email/templates/blueprint-followup-day-3.tsx
lib/email/templates/blueprint-followup-day-7.tsx
lib/email/templates/critical-bug-alert.tsx
lib/email/templates/feedback-admin-notification.tsx
lib/email/templates/feedback-reply-email.tsx
lib/email/templates/freebie-guide-email.tsx
lib/email/templates/launch-email.tsx
lib/email/templates/launch-followup-email.tsx
lib/email/templates/newsletter-template.tsx
lib/email/templates/nurture-day-1.tsx
lib/email/templates/nurture-day-3.tsx
lib/email/templates/nurture-day-7.tsx
lib/email/templates/upsell-day-10.tsx
lib/email/templates/upsell-freebie-membership.tsx
lib/email/templates/welcome-back-reengagement.tsx
lib/email/templates/welcome-email-params.ts
lib/email/templates/welcome-email.tsx
lib/email/templates/win-back-offer.tsx
lib/feed-planner/caption-writer.ts
lib/feed-planner/instagram-strategy-agent.ts
lib/feed-planner/layout-strategist.ts
lib/feed-planner/orchestrator.ts
lib/feed-planner/queue-images.ts
lib/feed-planner/visual-composition-expert.ts
lib/maya/authentic-photography-knowledge.ts
lib/maya/fashion-knowledge-2025.ts
lib/maya/flux-prompt-builder.ts
lib/maya/flux-prompt-optimization.ts
lib/maya/flux-prompting-principles.ts
lib/maya/get-user-context.ts
lib/maya/influencer-posing-knowledge.ts
lib/maya/instagram-location-intelligence.ts
lib/maya/instagram-loras.ts
lib/maya/lifestyle-contexts.ts
lib/maya/luxury-lifestyle-settings.ts
lib/maya/motion-libraries.ts
lib/maya/motion-similarity.ts
lib/maya/personality-enhanced.ts
lib/maya/personality.ts
lib/maya/photoshoot-session.ts
lib/maya/quality-settings.ts
lib/maya/storytelling-emotion-guide.ts
lib/maya/user-preferences.ts
lib/products.ts
lib/rate-limit.ts
lib/replicate-client.ts
lib/resend/get-audience-contacts.ts
lib/resend/manage-contact.ts
lib/security/url-validator.ts
lib/simple-impersonation.ts
lib/stripe.ts
lib/supabase/client.ts
lib/supabase/middleware.ts
lib/supabase/server.ts
lib/upstash-vector.ts
lib/user-mapping.ts
middleware.ts
next.config.mjs
package.json
pnpm-lock.yaml
public/images/100-w8hxvehcig14xjvduygpubkahlwzcj.png
public/images/2-20-281-29.png
public/images/20-2841-29.jpeg
public/images/20-2842-29.jpeg
public/images/20-2843-29.jpeg
public/images/20-2847-29.jpeg
public/images/380-iihccjipjsnt0xfvpt7urkd4bzhtyr.png
public/images/616-nnepryg0hs2y745w8znu8twvfrgude.png
public/images/618-tvcuzvg8v6r2bput7px8v06bchrxgx.png
public/images/641-yz6rwohjtemwagcwy5xqjtsczx9lfh.png
public/images/885-brnmqkhxcplb1ff5xk1uywrrsonfvm.png
public/images/887-jhlimtqofflmpdrmabtq9dauipdtov.png
public/images/888-2pu4idax9dxr7n86jedtuqdak6kwxp.png
public/images/bio-hero.png
public/images/diza-20demo-20ig-20grid-202.jpeg
public/images/img-4128.jpeg
public/images/img-4785.jpg
public/images/img-4801.jpg
public/images/img-6384-jpg.jpg
public/images/img-7713-jpg.jpeg
public/images/img-8032.png
public/images/img-8033.png
public/images/img-8335.jpg
public/images/img-8509-202.jpg
public/images/img-8640.jpg
public/images/img-8641.png
public/images/img-8645.jpg
public/images/img-9591-jpg.jpeg
public/images/luxury-portrait-20-281-29.png
public/images/luxury-portrait.png
public/images/maya-68de145ae1rme0cs07ja9mcp90-0-1756673402614-20-281-29.png
public/images/nano-banana-2025-09-07t16-04-25-202.png
public/images/out-0-20-2847-29.png
public/images/skjermbilde-202025-11-13-20kl.png
public/images/skjermbilde-202025-11-15-20kl.png
public/images/testimonials/img-8509-2.jpg
public/images/testimonials/img-8640.jpg
public/images/testimonials/img-8641.png
public/images/testimonials/img-8645.jpg
public/images/testimonials/skjermbilde-2025-11-15-kl-16-37-18.png
public/images/testimonials/skjermbilde-2025-11-15-kl-16-38-18.png
public/images/testimonials/skjermbilde-2025-11-15-kl-16-38-30.png
public/sw.js
scripts/08-comprehensive-rls-policies-v2.sql
scripts/08-comprehensive-rls-policies-v3-neon.sql
scripts/09-add-database-indexes.sql
scripts/10-verify-rls-status.sql
scripts/11-rls-policies-corrected-neon.sql
scripts/14-migrate-with-supabase-client.ts
scripts/15-migrate-users.ts
scripts/16-add-color-theme-to-personal-brand.sql
scripts/16-migrate-training.ts
scripts/17-migrate-images.ts
scripts/18-migrate-chats.ts
scripts/19-migrate-subscriptions.ts
scripts/20-create-sessions-tables.sql
scripts/21-create-sessions-tables.ts
scripts/26-run-color-theme-migration.sql
scripts/30-create-personal-knowledge-system.sql
scripts/31-seed-sandra-personal-story.sql
scripts/32-create-instagram-connections.sql
scripts/35-create-admin-tools-tables.sql
scripts/36-create-admin-tools-tables-v2.sql
scripts/37-fix-admin-agent-mode-constraint.sql
scripts/38-add-photoshoot-consistency-fields.sql
scripts/40-create-generated-videos-table.sql
scripts/CLEANUP-LIST.md
scripts/README.md
scripts/add-blueprint-followup-columns.ts
scripts/add-blueprint-followup-email-columns.sql
scripts/add-credits-by-email.js
scripts/add-credits-k96jonna.js
scripts/add-credits-kuki.js
scripts/add-credits-manual.js
scripts/add-ethnicity-column.sql
scripts/add-physical-preferences-column.sql
scripts/add-testimonial-image-columns.sql
scripts/add-user-lora-scale.ts
scripts/analyze-database.ts
scripts/analyze-schema.ts
scripts/audit-user-models.ts
scripts/backfill-stripe-customer-ids.ts
scripts/check-campaign-segment.ts
scripts/check-dabba-email.ts
scripts/check-image-prompt.ts
scripts/check-lora-weights.ts
scripts/check-magdalena-lora.ts
scripts/check-reference-image-prompt.ts
scripts/check-shannon-upload-access.ts
scripts/check-tracy-trigger-word.sql
scripts/check-user-stripe-status.ts
scripts/check-users-lora-scale.sql
scripts/check-video-urls.ts
scripts/cleanup-test-users-production.js
scripts/cleanup-test-users.sql
scripts/cleanup-test-users.ts
scripts/create-admin-alert-tracking.sql
scripts/create-admin-alert-tracking.ts
scripts/create-ai-feedback-tables.sql
scripts/create-blueprint-subscribers-table.sql
scripts/create-email-campaign-tracking.sql
scripts/create-email-discount-codes.ts
scripts/create-launch-campaign-tracking.sql
scripts/create-testimonials-table.sql
scripts/delete-test-users.js
scripts/diagnose-email-analytics.ts
scripts/diagnose-hafdis.sql
scripts/expand-feed-posts-columns.sql
scripts/fix-dabba-lora-url.ts
scripts/fix-guest-customer.ts
scripts/fix-hafdisosk-lora.sql
scripts/fix-missing-monthly-credits-v2.ts
scripts/fix-missing-monthly-credits-v3.ts
scripts/fix-missing-monthly-credits.ts
scripts/fix-sandra-users-lora.sql
scripts/fix-shannon-lora-url.ts
scripts/list-all-models.js
scripts/list-tables.ts
scripts/remove-pre-payment-credits.ts
scripts/repair-missing-subscriptions-v2.ts
scripts/repair-missing-subscriptions.ts
scripts/reset-campaign-status.ts
scripts/run-email-campaign.ts
scripts/setup-advanced-email-automation.sql
scripts/setup-advanced-email-automation.ts
scripts/setup-email-automation-tables.sql
scripts/setup-email-automation-tables.ts
scripts/test-feed-prompt-generation.ts
scripts/test-feed-prompt-simple.ts
scripts/test-resend-pagination.ts
scripts/test-vimeo-embed.ts
scripts/update-freebie-table-fields.sql
scripts/update-launch-campaign-tracking.sql
scripts/validate-email-campaign-system.ts
scripts/verify-christian-account.js
tsconfig.json
vercel.json
```

## Critical File Analysis

### 1. app/api/maya/generate-concepts/route.ts

Checking for December 7 problematic changes...

✅ **GOOD**: Does not contain aggressive hair/feature avoidance

```diff
diff --git a/app/api/maya/generate-concepts/route.ts b/app/api/maya/generate-concepts/route.ts
deleted file mode 100644
index 3857c63..0000000
--- a/app/api/maya/generate-concepts/route.ts
+++ /dev/null
@@ -1,811 +0,0 @@
-import { type NextRequest, NextResponse } from "next/server"
-import { createServerClient } from "@/lib/supabase/server"
-import { getAuthenticatedUser } from "@/lib/auth-helper"
-import { generateText } from "ai"
-import { getFluxPromptingPrinciples } from "@/lib/maya/flux-prompting-principles"
-import { getFashionIntelligencePrinciples } from "@/lib/maya/fashion-knowledge-2025"
-import { getLifestyleContextIntelligence } from "@/lib/maya/lifestyle-contexts"
-import INFLUENCER_POSING_KNOWLEDGE from "@/lib/maya/influencer-posing-knowledge"
-
-type MayaConcept = {
-  title: string
-  description: string
-  category: string
-  fashionIntelligence: string
-  lighting: string
-  location: string
-  prompt: string
-  customSettings?: {
-    styleStrength?: number
-    promptAccuracy?: number
-    aspectRatio?: string
-    seed?: number
-  }
-  referenceImageUrl?: string
-}
-
-export async function POST(req: NextRequest) {
-  try {
-    console.log("[v0] Generate concepts API called")
-
-    // Authenticate user
-    const supabase = await createServerClient()
-    const { user: authUser, error: authError } = await getAuthenticatedUser()
-
-    if (authError || !authUser) {
-      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
-    }
-
-    // Get effective user (impersonated if admin is impersonating)
-    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
-    const effectiveUser = await getEffectiveNeonUser(authUser.id)
-    if (!effectiveUser) {
-      return NextResponse.json({ error: "User not found" }, { status: 404 })
-    }
-
-    // Parse request body
-    const body = await req.json()
-    const {
-      userRequest,
-      aesthetic,
-      context,
-      userModifications,
-      count = 6, // Changed default from 3 to 6, Maya can override
-      referenceImageUrl,
-      customSettings,
-      mode = "concept",
-      conversationContext,
-    } = body
-
-    console.log("[v0] Generating concepts:", {
-      userRequest,
-      aesthetic,
-      mode,
-      count,
-      hasConversationContext: !!conversationContext,
-    })
-
-    // Detect environment
-    const host = req.headers.get("host") || ""
-    const isProduction = host === "sselfie.ai" || host === "www.sselfie.ai"
-    const isPreview = host.includes("vercel.app") || host.includes("v0.dev") || host.includes("vusercontent.net")
-
-    console.log("[v0] Environment:", isPreview ? "Preview" : isProduction ? "Production" : "Development")
-
-    // Get user data
-    let userGender = "person"
-    let userEthnicity = null
-    let physicalPreferences = null
-    const { neon } = await import("@neondatabase/serverless")
-    const sql = neon(process.env.DATABASE_URL!)
-
-    const userDataResult = await sql`
-      SELECT u.gender, u.ethnicity, um.trigger_word, upb.physical_preferences
-      FROM users u
-      LEFT JOIN user_models um ON u.id = um.user_id AND um.training_status = 'completed'
-      LEFT JOIN user_personal_brand upb ON u.id = upb.user_id
-      WHERE u.id = ${effectiveUser.id} 
-      LIMIT 1
-    `
-
-    if (userDataResult.length > 0 && userDataResult[0].gender) {
-      const dbGender = userDataResult[0].gender.toLowerCase().trim()
-
-      if (dbGender === "woman" || dbGender === "female") {
```

### 2. lib/replicate-client.ts

Training parameter changes:

```diff
diff --git a/lib/replicate-client.ts b/lib/replicate-client.ts
index 168bcc1..7d45528 100644
--- a/lib/replicate-client.ts
+++ b/lib/replicate-client.ts
@@ -35,19 +35,19 @@ export const FLUX_LORA_TRAINER = "replicate/fast-flux-trainer"
 export const FLUX_LORA_TRAINER_VERSION = "f463fbfc97389e10a2f443a8a84b6953b1058eafbf0c9af4d84457ff07cb04db"
 
 export const DEFAULT_TRAINING_PARAMS = {
-  steps: 1400, // Original optimal settings for quality
+  steps: 1400, // Increased from 1200 for better face detail learning
   lora_rank: 48, // Increased from 16 to 48 for much better face detail capture
   optimizer: "adamw_bf16", // BFloat16 optimizer for better precision
   batch_size: 1, // Standard batch size
   resolution: "1024", // Standard resolution for training
   autocaption: true, // Auto-caption training images
   trigger_word: "", // Will be set dynamically per user
-  learning_rate: 0.00008, // Original learning rate for 1400 steps
-  num_repeats: 20, // Original optimal for face learning
+  learning_rate: 0.00008, // Lowered from 0.0001 for better photorealism and finer details
+  num_repeats: 20, // Increased from 18 for more face exposure
   caption_dropout_rate: 0.15, // Increased from 0.1 for better trigger word learning
   cache_latents_to_disk: false, // Don't cache to disk
   network_alpha: 48, // Increased to match lora_rank (common practice)
-  save_every_n_steps: 250, // Original checkpoint frequency for 1400 steps
+  save_every_n_steps: 250, // Save checkpoints
   guidance_scale_training: 1.0, // Guidance scale during training
   lr_scheduler: "constant_with_warmup", // Learning rate scheduler
 }
```

### 3. lib/maya/flux-prompting-principles.ts

```diff
diff --git a/lib/maya/flux-prompting-principles.ts b/lib/maya/flux-prompting-principles.ts
deleted file mode 100644
index eb58399..0000000
--- a/lib/maya/flux-prompting-principles.ts
+++ /dev/null
@@ -1,357 +0,0 @@
-/**
- * MAYA'S FLUX PROMPTING PRINCIPLES (FLUX-OPTIMIZED)
- *
- * Based on FLUX AI best practices:
- * - 50-80 word optimal length (better LoRA activation, accurate character representation)
- * - Natural language (not keyword stuffing)
- * - Amateur cellphone photo aesthetic (not professional)
- * - Order matters (subject → outfit → environment → lighting → technical)
- * - No prompt weights
- * - Avoid "white background"
- * - NO aesthetic enhancement words (prevents plastic look)
- */
-
-export const FLUX_PROMPTING_PRINCIPLES = `
-=== FLUX PROMPTING MASTERY (FLUX-OPTIMIZED) ===
-
-You craft prompts using NATURAL LANGUAGE as if describing to a human photographer. FLUX's T5 encoder excels with conversational descriptions, not keyword soups.
-
-## OPTIMAL PROMPT STRUCTURE FOR FLUX
-
-**FORMAT:** [TRIGGER WORD] + [Subject/Clothing Description] + [Setting/Context] + [Lighting Description] + [Camera/Technical] + [Mood/Action]
-
-**OPTIMAL LENGTH:** 50-80 words (Flux's dual-encoder system handles complex descriptions, more context = better LoRA activation)
-
-**🔴 CRITICAL FOR CHARACTER LIKENESS:**
-- **Optimal prompts (50-80 words)** = Better LoRA activation, more accurate character representation
-- **Too short (<45 words)** = May miss essential detail, risks wrong hair/body/age
-- **Too long (>85 words)** = Model may lose focus on character features
-- **Hard limit: 80 words** (aim for 60-75 sweet spot)
-- Detailed prompts = more accurate character representation with custom character/face LoRAs
-
-**WORD ORDER CRITICAL:** Place most important elements FIRST (subject → outfit → environment → lighting → technical → film grain)
-
-## STRUCTURAL ORDER (MANDATORY FOR FLUX)
-
-1. **TRIGGER + GENDER** (2-3 words) - Always first
-2. **OUTFIT WITH FABRICS/TEXTURES** (8-12 words) - Specific materials, fit, how worn (stay detailed here)
-3. **SETTING/ENVIRONMENT** (3-5 words) - Simple, one-line description (keep brief)
-4. **LIGHTING** (3-5 words) - Simple natural lighting only (no dramatic/cinematic terms)
-5. **POSE/ACTION** (3-5 words) - Natural actions only (no "striking poses")
-6. **CAMERA/TECHNICAL SPECS** (5-8 words) - Basic iPhone specs only (no complex technical details)
-
-**TOTAL TARGET:** 50-80 words for optimal LoRA activation and accurate character representation
-
-**🔴 CHARACTER LIKENESS PRESERVATION:**
-- Keep prompts concise to maintain focus on trigger word and character
-- Avoid over-describing - let the LoRA handle what it learned during training
-- Trust the trained model to preserve facial features, hair, and other fixed characteristics
-
-## KEY PRINCIPLES FOR FLUX
-
-### 1. NATURAL LANGUAGE
-Write as if describing to a human photographer, NOT keyword stuffing:
-- ✅ GOOD: "walking through sunlit street with morning coffee, warm side lighting"
-- ❌ BAD: "walk, street, sunlight, coffee, warm light, golden hour"
-
-### 2. TECHNICAL ACCURACY
-Specify ACTUAL camera types/settings rather than vague artistic terms:
-- ✅ GOOD: "shot on iPhone 15 Pro, portrait mode, f/2.8, 50mm equivalent"
-- ❌ BAD: "professional photography, high quality, DSLR"
-
-### 3. SPECIFIC DETAILS OVER GENERIC ADJECTIVES
-FLUX excels with precise descriptions:
-- ✅ GOOD: "butter-soft chocolate leather blazer with oversized boyfriend cut, sleeves pushed to elbows"
-- ❌ BAD: "beautiful luxury leather blazer, elegant style"
-
-### 4. NO PROMPT WEIGHTS
-FLUX doesn't support (word)++ syntax. Instead:
-- ✅ USE: "with emphasis on", "focus on", "prominent"
-- ❌ AVOID: (word)++, [word], {word}, (word:1.5)
-
-### 5. AVOID "WHITE BACKGROUND"
-This phrase causes blur in FLUX.1-dev:
-- ✅ GOOD: "standing in minimalist concrete space with soft grey walls"
-- ❌ BAD: "white background", "on white backdrop"
-
-## ELEMENT-SPECIFIC GUIDANCE
-
-### OUTFIT (8-15 words with fabrics/textures)
-**ALWAYS INCLUDE:**
-- Fabric/material: "butter-soft chocolate leather", "chunky cable-knit cashmere", "ribbed cotton"
-- Fit/silhouette: "oversized boyfriend cut", "high-waisted straight-leg", "fitted cropped"
-- How worn: "sleeves pushed to elbows", "draped over shoulders", "tucked into waist"
-
-**EXAMPLES:**
-- "Oversized chocolate brown cashmere turtleneck, sleeves bunched naturally, tucked loosely into high-waisted cream linen trousers"
-- "Butter-soft black leather moto jacket with asymmetric zip, worn open over white ribbed tank, black straight-leg jeans"
-- "Matching dove grey yoga set, ribbed sports bra and high-waisted leggings, oversized black wool blazer draped over shoulders"
-
-### EXPRESSION + POSE (5-8 words, natural language)
-**KEEP IT SIMPLE AND CONVERSATIONAL:**
-- ✅ GOOD: "looking away naturally, standing with weight on one leg"
-- ❌ BAD: "eyes soft hint asymmetrical smile, torso turned three-quarters"
-
```

### 4. lib/maya/flux-prompt-builder.ts

```diff
diff --git a/lib/maya/flux-prompt-builder.ts b/lib/maya/flux-prompt-builder.ts
index 3d751ea..e767128 100644
--- a/lib/maya/flux-prompt-builder.ts
+++ b/lib/maya/flux-prompt-builder.ts
@@ -1,24 +1,16 @@
-import { FASHION_TRENDS_2025 } from "./fashion-knowledge-2025"
-
 export interface FluxPromptComponents {
   trigger: string
   gender: string
   quality: string[]
   styleDescription: string
   handGuidance: string
-  instagramAesthetic: string
-  colorGrading: string
-  realismKeywords: string
 }
 
 export interface FluxPromptOptions {
   userTriggerToken: string
   userGender?: string | null
-  userEthnicity?: string | null
-  physicalPreferences?: string | null
   includeQualityHints?: boolean
   includeHandGuidance?: boolean
-  aestheticPreference?: string
 }
 
 export interface GeneratedFluxPrompt {
@@ -26,13 +18,12 @@ export interface GeneratedFluxPrompt {
   components: FluxPromptComponents
   wordCount: number
   characterCount: number
-  aestheticUsed: string
 }
 
 export class FluxPromptBuilder {
   /**
-   * Generate intelligent FLUX prompt with Instagram aesthetics
-   * Uses fashion knowledge base for trend-aware, category-specific prompting
+   * Generate FLUX prompt from concept card
+   * Now uses Maya's creative description directly without template overrides
    */
   static generateFluxPrompt(
     conceptTitle: string,
@@ -41,107 +32,42 @@ export class FluxPromptBuilder {
     options: FluxPromptOptions,
     referenceImageUrl?: string,
   ): GeneratedFluxPrompt {
-    const {
-      userTriggerToken,
-      userGender,
-      userEthnicity,
-      physicalPreferences,
-      includeQualityHints = true,
-      includeHandGuidance = true,
-      aestheticPreference,
-    } = options
-
-    console.log("[v0] Generating intelligent FLUX prompt with Instagram aesthetics")
-
-    const aesthetic = this.getInstagramAesthetic(aestheticPreference)
-
-    const colorGrading = this.getColorGrading(category)
-
-    const realismKeywords = this.getRealismKeywords()
+    const { userTriggerToken, userGender, includeQualityHints = true, includeHandGuidance = true } = options
 
-    const luxuryUrbanKeywords = this.getLuxuryUrbanKeywords()
-    const instagramPose = this.getInstagramPose(category)
-    const urbanLighting = this.getUrbanLighting()
+    console.log("[v0] Generating FLUX prompt with brand-aware styling enforcement")
+    console.log("[v0] Using Maya's creative description with brand styling priority:", {
+      hasReferenceImage: !!referenceImageUrl,
+      category,
+      descriptionLength: conceptDescription.length,
+      gender: userGender,
+    })
 
     const components: FluxPromptComponents = {
       trigger: userTriggerToken,
-      gender: this.getGenderToken(userGender, userEthnicity),
-      quality: includeQualityHints ? this.getIntelligentQualityHints() : [],
+      gender: this.getGenderToken(userGender),
+      quality: includeQualityHints ? ["professional photography", "sharp focus", "high resolution"] : [],
       styleDescription: conceptDescription,
       handGuidance: includeHandGuidance
         ? "perfect hands with five fingers, well-formed hands, anatomically correct hands"
         : "",
-      instagramAesthetic: aesthetic.keywords.join(", "),
-      colorGrading,
-      realismKeywords,
-    }
-
-    // Clean physical preferences - remove instruction phrases but preserve user intent
-    let cleanedPhysicalPreferences = ""
-    if (physicalPreferences) {
-      cleanedPhysicalPreferences = physicalPreferences
-      
-      // Remove instruction phrases but preserve descriptive content
```

### 5. lib/maya/flux-prompt-optimization.ts

```diff
diff --git a/lib/maya/flux-prompt-optimization.ts b/lib/maya/flux-prompt-optimization.ts
deleted file mode 100644
index 26ce45d..0000000
--- a/lib/maya/flux-prompt-optimization.ts
+++ /dev/null
@@ -1,276 +0,0 @@
-/**
- * FLUX AI Prompt Length Optimization & Face Preservation Guide
- *
- * Research-backed best practices for Flux models (Dev, Schnell, Pro, etc.)
- * to maximize facial likeness while maintaining creative quality
- */
-
-export const FLUX_PROMPT_OPTIMIZATION = {
-  /**
-   * TECHNICAL LIMITS
-   */
-  TECHNICAL_MAXIMUM_TOKENS: 512, // Hard limit from Flux API
-
-  /**
-   * OPTIMAL PROMPT LENGTHS FOR DIFFERENT CONTEXTS
-   *
-   * Based on research: shorter, focused prompts preserve facial likeness better
-   * Longer prompts dilute trigger word importance and cause feature drift
-   */
-  OPTIMAL_LENGTHS: {
-    // Solo portraits - focus on face
-    CLOSE_UP_PORTRAIT: {
-      min: 15,
-      optimal: 25,
-      max: 35,
-      reasoning:
-        "Close-ups need face emphasis. Keep prompts SHORT to prioritize trigger word and facial features over environmental details.",
-    },
-
-    // Half body - balance face + outfit
-    HALF_BODY_LIFESTYLE: {
-      min: 20,
-      optimal: 30,
-      max: 40,
-      reasoning:
-        "Medium shots need facial detail AND outfit context. Moderate length allows both without overwhelming the trigger.",
-    },
-
-    // Full body - more scene context
-    ENVIRONMENTAL_PORTRAIT: {
-      min: 25,
-      optimal: 35,
-      max: 45,
-      reasoning:
-        "Wide shots can handle slightly longer prompts since face is smaller. Still prioritize subject over background.",
-    },
-
-    // Action shots - movement focus
-    CLOSE_UP_ACTION: {
-      min: 20,
-      optimal: 28,
-      max: 38,
-      reasoning: "Action requires describing movement, but face must stay recognizable. Keep concise and specific.",
-    },
-
-    // Product/object focus - less face prominence
-    PRODUCT_FOCUS: {
-      min: 22,
-      optimal: 32,
-      max: 42,
-      reasoning: "Product shots allow more descriptive room, but trigger word still crucial for recognizability.",
-    },
-  },
-
-  /**
-   * FACE PRESERVATION STRATEGIES
-   *
-   * Critical techniques to maintain user likeness with trained LoRA models
-   */
-  FACE_PRESERVATION: {
-    // Trigger word must be FIRST in prompt (first 3-5 words) - CRITICAL for LoRA activation
-    TRIGGER_PLACEMENT: "FIRST",
-    TRIGGER_POSITION: "1-3", // First 1-3 words for optimal character likeness
-
-    // Use explicit face preservation phrases when needed (but avoid overusing)
-    PRESERVATION_PHRASES: [
-      "maintaining exact facial features",
-      "preserving recognizable face",
-      "same person throughout",
-      "consistent facial identity",
-    ],
-
-    // CRITICAL: Avoid overloading with facial details (LoRA handles this)
-    // The LoRA was trained on these features - it already knows them
-    // Mentioning them can confuse the model or cause conflicts with character likeness
-    AVOID_FACE_MICROMANAGEMENT: [
-      "blue eyes", // LoRA knows user's eye color
-      "brown eyes", // LoRA knows user's eye color
-      "green eyes", // LoRA knows user's eye color
-      "sharp jawline", // LoRA knows face structure
-      "high cheekbones", // Trust the trained model
-      "defined nose", // Let LoRA handle features
-      "long hair", // LoRA knows hair length/style
-      "short hair", // LoRA knows hair length/style
```

## Current Values in after-launch Branch

### Training Parameters (from lib/replicate-client.ts):

```typescript
export const DEFAULT_TRAINING_PARAMS = {
  steps: 1400, // Increased from 1200 for better face detail learning
  lora_rank: 48, // Increased from 16 to 48 for much better face detail capture
  optimizer: "adamw_bf16", // BFloat16 optimizer for better precision
  batch_size: 1, // Standard batch size
  resolution: "1024", // Standard resolution for training
  autocaption: true, // Auto-caption training images
  trigger_word: "", // Will be set dynamically per user
  learning_rate: 0.00008, // Lowered from 0.0001 for better photorealism and finer details
  num_repeats: 20, // Increased from 18 for more face exposure
  caption_dropout_rate: 0.15, // Increased from 0.1 for better trigger word learning
  cache_latents_to_disk: false, // Don't cache to disk
  network_alpha: 48, // Increased to match lora_rank (common practice)
  save_every_n_steps: 250, // Save checkpoints
  guidance_scale_training: 1.0, // Guidance scale during training
  lr_scheduler: "constant_with_warmup", // Learning rate scheduler
```

## Branch Timeline

### Main branch - Last 5 commits:
```
c2dfde6 - Sandra Sigurjonsdottir, 5 minutes ago : feat: enhance message handling in Maya chat API and UI
d2b7e73 - Sandra Sigurjonsdottir, 2 hours ago : feat: add checks to prevent duplicate and in-progress campaign sends
2ffedab - Sandra Sigurjonsdottir, 2 hours ago : feat: implement alert cooldown for admin notifications
b5d35fe - Sandra Sigurjonsdottir, 2 hours ago : fix: correct iframe reference in VideoPlayer component
5e1f630 - Sandra Sigurjonsdottir, 2 hours ago : chore: add empty lines for improved readability in multiple documentation and code files
```

### After-launch branch - Last 5 commits:
```
5d77863 - v0, 5 weeks ago : feat: update project files for beta launch
830a289 - v0, 5 weeks ago : fix: resolve Stripe webhook column error
05a63fc - v0, 5 weeks ago : fix: correct example prompt lengths for Maya
98209e8 - v0, 5 weeks ago : feat: reduce aesthetic descriptors to 2-3 per prompt
18ca633 - v0, 5 weeks ago : fix: correct prompt duplication and enhance prompt length
```

## Summary for Claude's Analysis

### Key Questions to Answer:

1. **Total commits difference:** 1 commits
2. **Total files changed:** 563 files
3. **After-launch created:** 7 weeks ago
4. **Main last updated:** 6 minutes ago
5. **After-launch last updated:** 5 weeks ago


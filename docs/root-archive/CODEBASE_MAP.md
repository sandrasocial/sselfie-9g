# SSELFIE Studio - Complete Codebase Map
*Generated: January 4, 2026*
*Total Lines of Code: 359,133*

---

## 📊 Executive Summary

### Codebase Size by File Type
- **TypeScript/React** (.ts, .tsx): 239,348 lines (66.6%)
- **Documentation** (.md): 106,854 lines (29.8%)
- **SQL/Database** (.sql): 9,461 lines (2.6%)
- **JavaScript** (.js, .jsx): 2,441 lines (0.7%)
- **Stylesheets** (.css): 603 lines (0.2%)

### Key Statistics
- **Total Screens**: 57 pages
- **Total API Routes**: 385+ endpoints
- **Database Tables**: 90+ tables
- **Backup Files**: 399 files
- **TODO/FIXME Comments**: 263 instances across 83 files
- **Exported Functions**: 777 functions across 229 files

---

## 🗺️ 1. SCREENS & PAGES MAP

### Public Pages
| Path | File | Purpose |
|------|------|---------|
| `/` | `app/page.tsx` | Landing page |
| `/share-your-story` | `app/(public)/share-your-story/page.tsx` | Public testimonial submission |
| `/privacy` | `app/privacy/page.tsx` | Privacy policy |
| `/terms` | `app/terms/page.tsx` | Terms of service |
| `/why-studio` | `app/why-studio/page.tsx` | Product benefits page |
| `/whats-new` | `app/whats-new/page.tsx` | Changelog/updates |

### Authentication Pages
| Path | File | Purpose |
|------|------|---------|
| `/auth/login` | `app/auth/login/page.tsx` | User login |
| `/auth/sign-up` | `app/auth/sign-up/page.tsx` | User registration |
| `/auth/sign-up-success` | `app/auth/sign-up-success/page.tsx` | Registration confirmation |
| `/auth/forgot-password` | `app/auth/forgot-password/page.tsx` | Password reset |
| `/auth/setup-password` | `app/auth/setup-password/page.tsx` | Initial password setup |
| `/auth/callback` | `app/auth/callback/route.ts` | OAuth callback handler |
| `/auth/confirm` | `app/auth/confirm/route.ts` | Email confirmation |
| `/auth/error` | `app/auth/error/page.tsx` | Auth error page |

### User Application Screens
| Path | File | Purpose |
|------|------|---------|
| `/studio` | `app/studio/page.tsx` | AI model training & management |
| `/maya` | `app/maya/page.tsx` | Maya AI chat interface |
| `/feed-planner` | `app/feed-planner/page.tsx` | Instagram feed planning tool |
| `/feed/[feedId]` | `app/feed/[feedId]/page.tsx` | Individual feed view |
| `/bio` | `app/bio/page.tsx` | Instagram bio generator |
| `/blueprint` | `app/blueprint/page.tsx` | Brand blueprint tool |
| `/prompt-guides` | `app/prompt-guides/page.tsx` | Prompt guide library |
| `/prompt-guides/[slug]` | `app/prompt-guides/[slug]/page.tsx` | Individual prompt guide |
| `/diagnostics` | `app/diagnostics/page.tsx` | System diagnostics |
| `/sentry-example-page` | `app/sentry-example-page/page.tsx` | Error monitoring test page |

### Checkout & Payment Pages
| Path | File | Purpose |
|------|------|---------|
| `/checkout` | `app/checkout/page.tsx` | Main checkout page |
| `/checkout/membership` | `app/checkout/membership/page.tsx` | Membership checkout |
| `/checkout/one-time` | `app/checkout/one-time/page.tsx` | One-time purchase |
| `/checkout/success` | `app/checkout/success/page.tsx` | Payment success |
| `/checkout/cancel` | `app/checkout/cancel/page.tsx` | Payment cancelled |
| `/checkout-upgrade` | `app/checkout-upgrade/page.tsx` | Upgrade checkout |

### Admin Pages (Sandra-only access)
| Path | File | Purpose |
|------|------|---------|
| `/admin` | `app/admin/page.tsx` | Admin dashboard |
| `/admin/alex` | `app/admin/alex/page.tsx` | Alex AI assistant (admin agent) |
| `/admin/agent` | `app/admin/agent/page.tsx` | Admin agent tools |
| `/admin/academy` | `app/admin/academy/page.tsx` | Academy content management |
| `/admin/automations/[id]` | `app/admin/automations/[id]/page.tsx` | Email automation editor |
| `/admin/beta` | `app/admin/beta/page.tsx` | Beta program management |
| `/admin/calendar` | `app/admin/calendar/page.tsx` | Content calendar |
| `/admin/composition-analytics` | `app/admin/composition-analytics/page.tsx` | Image composition analytics |
| `/admin/content-templates` | `app/admin/content-templates/page.tsx` | Content template library |
| `/admin/conversions` | `app/admin/conversions/page.tsx` | Conversion tracking |
| `/admin/credits` | `app/admin/credits/page.tsx` | Credit management |
| `/admin/email-analytics` | `app/admin/email-analytics/page.tsx` | Email performance metrics |
| `/admin/email-broadcast` | `app/admin/email-broadcast/page.tsx` | Email broadcast tool |
| `/admin/email-sequences` | `app/admin/email-sequences/page.tsx` | Email sequence management |
| `/admin/feedback` | `app/admin/feedback/page.tsx` | User feedback management |
| `/admin/journal` | `app/admin/journal/page.tsx` | Weekly journal/reflections |
| `/admin/knowledge` | `app/admin/knowledge/page.tsx` | Knowledge base management |
| `/admin/launch-email` | `app/admin/launch-email/page.tsx` | Launch campaign tools |
| `/admin/login-as-user` | `app/admin/login-as-user/page.tsx` | User impersonation |
| `/admin/maya-studio` | `app/admin/maya-studio/page.tsx` | Maya system controls |
| `/admin/maya-testing` | `app/admin/maya-testing/page.tsx` | Maya Testing Lab (AI quality tests) |
| `/admin/mission-control` | `app/admin/mission-control/page.tsx` | Task & project management |
| `/admin/prompt-guide-builder` | `app/admin/prompt-guide-builder/page.tsx` | Prompt guide creator |
| `/admin/prompt-guides` | `app/admin/prompt-guides/page.tsx` | Prompt guide manager |
| `/admin/test-audience-sync` | `app/admin/test-audience-sync/page.tsx` | Email audience sync testing |
| `/admin/test-broadcast` | `app/admin/test-broadcast/page.tsx` | Email broadcast testing |
| `/admin/test-campaigns` | `app/admin/test-campaigns/page.tsx` | Campaign testing |
| `/admin/testimonials` | `app/admin/testimonials/page.tsx` | Testimonial management |
| `/admin/webhook-diagnostics` | `app/admin/webhook-diagnostics/page.tsx` | Webhook monitoring |

---

## 🔌 2. API ROUTES CATALOG

### 🎨 Maya AI Routes (42 endpoints)
**Base Path**: `/api/maya`

| Endpoint | File | Purpose |
|----------|------|---------|
| `POST /api/maya/chat` | `chat/route.ts` | Main Maya chat interface with streaming |
| `POST /api/maya/load-chat` | `load-chat/route.ts` | Load chat history |
| `POST /api/maya/save-message` | `save-message/route.ts` | Save chat message |
| `POST /api/maya/update-message` | `update-message/route.ts` | Update existing message |
| `POST /api/maya/new-chat` | `new-chat/route.ts` | Create new chat session |
| `POST /api/maya/generate-concepts` | `generate-concepts/route.ts` | Generate photoshoot concepts |
| `POST /api/maya/generate-image` | `generate-image/route.ts` | Generate single image |
| `POST /api/maya/create-photoshoot` | `create-photoshoot/route.ts` | Create full photoshoot |
| `POST /api/maya/generate-all-feed-prompts` | `generate-all-feed-prompts/route.ts` | Batch feed prompt generation |
| `POST /api/maya/generate-studio-pro` | `generate-studio-pro/route.ts` | Studio Pro mode generation |
| `POST /api/maya/generate-studio-pro-prompts` | `generate-studio-pro-prompts/route.ts` | Studio Pro prompt builder |
| `POST /api/maya/generate-motion-prompt` | `generate-motion-prompt/route.ts` | Video/motion prompt generation |
| `GET /api/maya/videos` | `videos/route.ts` | Get user's generated videos |

**Maya Pro Routes** (`/api/maya/pro/`)
| Endpoint | Purpose |
|----------|---------|
| `POST /api/maya/pro/generate-concepts` | Pro mode concept generation |
| `POST /api/maya/pro/generate-image` | Pro mode image generation |
| `POST /api/maya/pro/check-generation` | Check generation status |
| `GET /api/maya/pro/library/get` | Get Pro library images |

**Maya Feed Routes** (`/api/maya/feed/`)
| Endpoint | Purpose |
|----------|---------|
| `GET /api/maya/feed/list` | List all user feeds |
| `GET /api/maya/feed/[feedId]` | Get specific feed |
| `POST /api/maya/feed/save-to-planner` | Save to feed planner |
| `POST /api/maya/feed/generate-images` | Generate feed images |

### 📸 Feed Planner Routes (35 endpoints)
**Base Path**: `/api/feed`

| Endpoint | File | Purpose |
|----------|------|---------|
| `GET /api/feed/latest` | `latest/route.ts` | Get latest feed |
| `GET /api/feed/[feedId]` | `[feedId]/route.ts` | Get specific feed |
| `POST /api/feed/[feedId]/add-caption` | `[feedId]/add-caption/route.ts` | Add caption to post |
| `POST /api/feed/[feedId]/update-caption` | `[feedId]/update-caption/route.ts` | Update post caption |
| `POST /api/feed/[feedId]/add-strategy` | `[feedId]/add-strategy/route.ts` | Add feed strategy |
| `POST /api/feed/[feedId]/generate-strategy` | `[feedId]/generate-strategy/route.ts` | Generate feed strategy |
| `POST /api/feed/[feedId]/generate-captions` | `[feedId]/generate-captions/route.ts` | Generate all captions |
| `POST /api/feed/[feedId]/generate-bio` | `[feedId]/generate-bio/route.ts` | Generate Instagram bio |
| `POST /api/feed/[feedId]/generate-single` | `[feedId]/generate-single/route.ts` | Generate single post |
| `POST /api/feed/[feedId]/regenerate-post` | `[feedId]/regenerate-post/route.ts` | Regenerate specific post |
| `POST /api/feed/[feedId]/regenerate-caption` | `[feedId]/regenerate-caption/route.ts` | Regenerate caption only |
| `POST /api/feed/[feedId]/reorder` | `[feedId]/reorder/route.ts` | Reorder posts |
| `POST /api/feed/[feedId]/replace-post-image` | `[feedId]/replace-post-image/route.ts` | Replace post image |
| `POST /api/feed/[feedId]/update-profile-image` | `[feedId]/update-profile-image/route.ts` | Update profile image |
| `POST /api/feed/[feedId]/upload-profile-image` | `[feedId]/upload-profile-image/route.ts` | Upload new profile image |
| `GET /api/feed/[feedId]/progress` | `[feedId]/progress/route.ts` | Get generation progress |
| `GET /api/feed/[feedId]/download-bundle` | `[feedId]/download-bundle/route.ts` | Download all feed content |

**Feed Planner Core** (`/api/feed-planner/`)
| Endpoint | Purpose |
|----------|---------|
| `POST /api/feed-planner/create-strategy` | Create feed strategy |
| `POST /api/feed-planner/create-from-strategy` | Generate feed from strategy |

### 🏋️ Studio & Training Routes (25 endpoints)
**Base Path**: `/api/studio` & `/api/training`

| Endpoint | File | Purpose |
|----------|------|---------|
| `POST /api/studio/generate` | `studio/generate/route.ts` | Generate image in Studio |
| `GET /api/studio/generations` | `studio/generations/route.ts` | Get generation history |
| `GET /api/studio/session` | `studio/session/route.ts` | Get active session |
| `GET /api/studio/stats` | `studio/stats/route.ts` | Get studio statistics |
| `POST /api/training/upload` | `training/upload/route.ts` | Upload training images |
| `POST /api/training/upload-images` | `training/upload-images/route.ts` | Batch upload training images |
| `POST /api/training/upload-zip` | `training/upload-zip/route.ts` | Upload training ZIP file |
| `POST /api/training/upload-token` | `training/upload-token/route.ts` | Get upload token |
| `POST /api/training/create-zip-from-blobs` | `training/create-zip-from-blobs/route.ts` | Create ZIP from blobs |
| `POST /api/training/start` | `training/start/route.ts` | Start model training |
| `POST /api/training/start-training` | `training/start-training/route.ts` | Alternative training start |
| `GET /api/training/progress` | `training/progress/route.ts` | Get training progress |
| `POST /api/training/sync-version` | `training/sync-version/route.ts` | Sync training version |
| `POST /api/training/cancel` | `training/cancel/route.ts` | Cancel training |

**Studio Pro Routes** (`/api/studio-pro/`)
| Endpoint | Purpose |
|----------|---------|
| `POST /api/studio-pro/setup` | Setup Studio Pro mode |
| `POST /api/studio-pro/generate/carousel` | Generate carousel images |
| `POST /api/studio-pro/generate/reel-cover` | Generate reel cover |
| `POST /api/studio-pro/generate/edit-reuse` | Edit and reuse image |

### 🖼️ Image & Gallery Routes
| Endpoint | File | Purpose |
|----------|------|---------|
| `GET /api/images/feed` | `images/feed/route.ts` | Get feed images |
| `GET /api/images/lookup` | `images/lookup/route.ts` | Lookup image by ID |
| `GET /api/gallery/images` | `gallery/images/route.ts` | Get gallery images |
| `POST /api/upload` | `upload/route.ts` | Upload general file |
| `POST /api/upload-image` | `upload-image/route.ts` | Upload image |
| `POST /api/upload-highlight-overlay` | `upload-highlight-overlay/route.ts` | Upload story highlight overlay |

### 👤 User & Profile Routes
| Endpoint | File | Purpose |
|----------|------|---------|
| `GET /api/user/info` | `user/info/route.ts` | Get user info |
| `GET /api/user/profile` | `user/profile/route.ts` | Get user profile |
| `POST /api/user/profile` | `user/profile/route.ts` | Update user profile |
| `POST /api/user/profile-image` | `user/profile-image/route.ts` | Update profile image |
| `GET /api/user/setup-status` | `user/setup-status/route.ts` | Get onboarding status |
| `GET /api/user-by-email` | `user-by-email/route.ts` | Lookup user by email |
| `GET /api/profile/info` | `profile/info/route.ts` | Get profile info |
| `GET /api/profile/stats` | `profile/stats/route.ts` | Get profile stats |
| `GET /api/profile/best-work` | `profile/best-work/route.ts` | Get best work gallery |
| `GET /api/profile/recent-work` | `profile/recent-work/route.ts` | Get recent work |
| `GET /api/profile/personal-brand` | `profile/personal-brand/route.ts` | Get brand profile |

### 🎓 Academy Routes
**Base Path**: `/api/academy`

| Endpoint | File | Purpose |
|----------|------|---------|
| `GET /api/academy/courses` | `courses/route.ts` | Get all courses |
| `GET /api/academy/courses/[id]` | `courses/[id]/route.ts` | Get specific course |
| `POST /api/academy/enroll` | `enroll/route.ts` | Enroll in course |
| `GET /api/academy/my-courses` | `my-courses/route.ts` | Get user's courses |
| `GET /api/academy/lessons/[id]` | `lessons/[id]/route.ts` | Get lesson content |
| `POST /api/academy/progress` | `progress/route.ts` | Update course progress |
| `GET /api/academy/exercises/[id]` | `exercises/[id]/route.ts` | Get exercise |
| `GET /api/academy/certificates` | `certificates/route.ts` | Get certificates |
| `GET /api/academy/templates` | `templates/route.ts` | Get templates |
| `GET /api/academy/monthly-drops` | `monthly-drops/route.ts` | Get monthly content drops |
| `GET /api/academy/flatlay-images` | `flatlay-images/route.ts` | Get flatlay image library |

### 💳 Stripe & Payments Routes
| Endpoint | File | Purpose |
|----------|------|---------|
| `POST /api/stripe/create-checkout-session` | `stripe/create-checkout-session/route.ts` | Create Stripe checkout |
| `POST /api/stripe/create-portal-session` | `stripe/create-portal-session/route.ts` | Create customer portal |
| `POST /api/stripe/cleanup-products` | `stripe/cleanup-products/route.ts` | Clean up test products |
| `POST /api/webhooks/stripe` | `webhooks/stripe/route.ts` | Stripe webhook handler |
| `GET /api/checkout-session` | `checkout-session/route.ts` | Get checkout session |
| `POST /api/subscription/upgrade` | `subscription/upgrade/route.ts` | Upgrade subscription |

### 💰 Credits & Quota Routes
| Endpoint | File | Purpose |
|----------|------|---------|
| `GET /api/quota/status` | `quota/status/route.ts` | Get credit status |
| `POST /api/quota/decrement` | `quota/decrement/route.ts` | Deduct credits |
| `GET /api/settings` | `settings/route.ts` | Get user settings |
| `POST /api/settings/update` | `settings/update/route.ts` | Update settings |

### 📋 Prompt Guides Routes
| Endpoint | File | Purpose |
|----------|------|---------|
| `GET /api/prompt-guides` | `prompt-guides/route.ts` | Get all prompt guides |
| `GET /api/prompt-guides/items` | `prompt-guides/items/route.ts` | Get guide items |
| `POST /api/prompt-guide/subscribe` | `prompt-guide/subscribe/route.ts` | Subscribe to guide |

### 📧 Email & Marketing Routes
| Endpoint | File | Purpose |
|----------|------|---------|
| `POST /api/email` | `email/route.ts` | Send email |
| `POST /api/webhooks/resend` | `webhooks/resend/route.ts` | Resend webhook handler |
| `POST /api/test-purchase-email` | `test-purchase-email/route.ts` | Test purchase email |
| `GET /api/check-email-logs` | `check-email-logs/route.ts` | Check email logs |

### 🎯 Blueprint & Freebie Routes
| Endpoint | File | Purpose |
|----------|------|---------|
| `POST /api/blueprint/subscribe` | `blueprint/subscribe/route.ts` | Subscribe to blueprint |
| `POST /api/freebie/subscribe` | `freebie/subscribe/route.ts` | Subscribe to freebie |
| `POST /api/waitlist` | `waitlist/route.ts` | Join waitlist |
| `POST /api/testimonials` | `testimonials/route.ts` | Submit testimonial |
| `POST /api/feedback` | `feedback/route.ts` | Submit feedback |

### 🎬 Scene Composer Routes
| Endpoint | File | Purpose |
|----------|------|---------|
| `POST /api/scene-composer/generate` | `scene-composer/generate/route.ts` | Generate scene composition |
| `POST /api/scene-composer/create-scene` | `scene-composer/create-scene/route.ts` | Create new scene |
| `POST /api/scene-composer/upload-product` | `scene-composer/upload-product/route.ts` | Upload product image |
| `GET /api/scene-composer/check-status` | `scene-composer/check-status/route.ts` | Check generation status |

### 🤖 AI Strategist Routes
| Endpoint | File | Purpose |
|----------|------|---------|
| `POST /api/instagram-strategist/strategy` | `instagram-strategist/strategy/route.ts` | Instagram strategy |
| `POST /api/content-research-strategist/research` | `content-research-strategist/research/route.ts` | Content research |
| `POST /api/personal-brand-strategist/strategy` | `personal-brand-strategist/strategy/route.ts` | Brand strategy |

### 🔧 Admin Routes (140+ endpoints)
**Base Path**: `/api/admin`

**Alex AI (Admin Assistant)**
| Endpoint | Purpose |
|----------|---------|
| `POST /api/admin/alex/chat` | Alex chat with tool execution |
| `POST /api/admin/alex/load-chat` | Load Alex chat history |

**Dashboard & Analytics**
| Endpoint | Purpose |
|----------|---------|
| `GET /api/admin/dashboard/beta-users` | Get beta user list |
| `GET /api/admin/dashboard/revenue-history` | Get revenue data |
| `GET /api/admin/conversions` | Get conversion metrics |

**Email Management**
| Endpoint | Purpose |
|----------|---------|
| `GET /api/admin/email/get-automation-sequences` | Get automation sequences |
| `GET /api/admin/email/get-automation-details` | Get sequence details |
| `POST /api/admin/email/send-launch-campaign` | Send launch campaign |
| `POST /api/admin/email/sync-photoshoot-buyers` | Sync buyer audience |
| `GET /api/admin/email/check-automation` | Check automation status |

**Agent Tools**
| Endpoint | Purpose |
|----------|---------|
| `GET /api/admin/agent/gallery-images` | Get gallery for selection |
| `GET /api/admin/agent/email-drafts` | Get email drafts |

**Maya Testing**
| Endpoint | Purpose |
|----------|---------|
| `POST /api/admin/maya-testing/run-test` | Run Maya quality test |
| `GET /api/admin/maya-testing/get-training-progress` | Get training status |
| `POST /api/admin/maya-testing/fix-completed-trainings` | Fix training records |

**Training Management**
| Endpoint | Purpose |
|----------|---------|
| `POST /api/admin/training/promote-test-model` | Promote test to production |
| `POST /api/admin/training/fix-trigger-word` | Fix trigger word |
| `POST /api/admin/training/sync-status` | Sync training status |

**User Management**
| Endpoint | Purpose |
|----------|---------|
| `POST /api/admin/login-as-user` | Impersonate user |
| `POST /api/admin/credits/add` | Add credits to user |
| `GET /api/admin/feedback` | Get user feedback |

### ⚙️ System & Utility Routes
| Endpoint | File | Purpose |
|----------|------|---------|
| `GET /api/auth/confirm` | `auth/confirm/route.ts` | Email confirmation |
| `GET /api/auth/callback` | `auth/callback/route.ts` | OAuth callback |
| `POST /api/complete-account` | `complete-account/route.ts` | Complete account setup |
| `GET /api/landing` | `landing/route.ts` | Landing page data |
| `GET /api/landing-stats` | `landing-stats/route.ts` | Landing page stats |
| `GET /api/diagnostics/sentry-status` | `diagnostics/sentry-status/route.ts` | Sentry status |
| `GET /api/diagnostics/auth-test` | `diagnostics/auth-test/route.ts` | Auth test |
| `GET /api/diagnostics/db-test` | `diagnostics/db-test/route.ts` | Database test |
| `GET /api/sentry-status` | `sentry-status/route.ts` | Sentry monitoring |
| `POST /api/sentry-test` | `sentry-test/route.ts` | Test Sentry integration |
| `POST /api/sentry-direct-test` | `sentry-direct-test/route.ts` | Direct Sentry test |
| `GET /api/test/resend` | `test/resend/route.ts` | Test Resend email |
| `POST /api/test-sentry-simple` | `test-sentry-simple/route.ts` | Simple Sentry test |
| `GET /api/sw.js` | `sw.js/route.ts` | Service worker |
| `GET /api/manifest.json` | `manifest.json/route.ts` | PWA manifest |

### ⏰ Cron Jobs & Background Tasks
**Base Path**: `/api/cron`

| Endpoint | File | Purpose |
|----------|------|---------|
| `POST /api/cron/send-blueprint-followups` | `cron/send-blueprint-followups/route.ts` | Send blueprint emails |
| `POST /api/cron/reengagement-campaigns` | `cron/reengagement-campaigns/route.ts` | Send re-engagement emails |
| `POST /api/cron/check-trainings` | `cron/check-trainings/route.ts` | Check training status |
| `POST /api/cron/sync-stripe-subscriptions` | `cron/sync-stripe-subscriptions/route.ts` | Sync subscriptions |
| `POST /api/cron/cleanup-old-data` | `cron/cleanup-old-data/route.ts` | Clean old records |

### 🔀 Agent Coordinator
| Endpoint | File | Purpose |
|----------|------|---------|
| `POST /api/agent-coordinator` | `agent-coordinator/route.ts` | Route AI agent requests |

---

## 🗄️ 3. DATABASE SCHEMA

### 👥 Core User Tables
| Table Name | Purpose | Key Columns |
|------------|---------|-------------|
| `users` | User accounts | id, email, display_name, supabase_user_id, stack_auth_id |
| `user_profiles` | Extended user data | user_id, bio, brand_statement, color_palette |
| `user_avatar_images` | Avatar library | user_id, image_url, is_primary |
| `user_best_work` | Portfolio gallery | user_id, image_url, description, category |
| `user_image_libraries` | Image collections | user_id, library_name, images |
| `user_pro_setup` | Studio Pro setup | user_id, has_uploaded_avatar, setup_completed_at |
| `user_pro_preferences` | Pro mode settings | user_id, default_style, photography_style |

### 🎨 Maya AI & Chat Tables
| Table Name | Purpose | Key Columns |
|------------|---------|-------------|
| `maya_chats` | Chat sessions | id, user_id, title, chat_type, created_at |
| `maya_messages` | Chat messages | id, chat_id, role, content, created_at |
| `maya_photoshoots` | Photoshoot sessions | id, user_id, chat_id, theme, status |
| `maya_concepts` | Generated concepts | id, photoshoot_id, prompt, image_url |
| `maya_prompt_suggestions` | Prompt library | id, prompt_text, category, season, style |
| `maya_test_results` | Quality test results | id, test_name, model_version, score |
| `maya_test_trainings` | Test training records | id, user_id, training_version, status |
| `maya_test_images` | Test image outputs | id, test_id, image_url, quality_score |
| `maya_test_comparisons` | A/B test comparisons | id, version_a, version_b, winner |
| `maya_test_configs` | Test configurations | id, config_name, parameters |

### 🏋️ Training & Model Tables
| Table Name | Purpose | Key Columns |
|------------|---------|-------------|
| `trainings` | Model training jobs | id, user_id, status, replicate_training_id |
| `training_images` | Training photos | id, training_id, image_url, processed |
| `user_models` | AI models | id, user_id, lora_url, trigger_word, version |

### 📸 Studio & Generation Tables
| Table Name | Purpose | Key Columns |
|------------|---------|-------------|
| `studio_sessions` | Studio sessions | id, user_id, session_type, started_at |
| `studio_generations` | Generated images | id, session_id, prompt, image_url, status |
| `pro_mode_sessions` | Pro mode sessions | id, user_id, workflow_type, settings |
| `pro_workflows` | Pro workflows | id, user_id, workflow_name, steps |
| `pro_generations` | Pro generations | id, session_id, concept_id, image_url |
| `generated_videos` | Video generations | id, user_id, video_url, thumbnail_url |
| `scene_composer_scenes` | Scene compositions | id, user_id, scene_data, product_images |

### 📱 Feed Planner Tables
| Table Name | Purpose | Key Columns |
|------------|---------|-------------|
| `instagram_feeds` | Feed layouts | id, user_id, title, layout_data, created_at |
| `feed_posts` | Individual posts | id, feed_id, position, image_url, caption |
| `feed_strategy` | Feed strategies | id, feed_id, strategy_text, created_at |
| `instagram_bios` | Bio variations | id, user_id, bio_text, created_at |
| `instagram_highlights` | Story highlights | id, user_id, title, cover_image, stories |
| `instagram_captions` | Caption library | id, caption_text, caption_type, hashtags |

### 📅 Content & Calendar Tables
| Table Name | Purpose | Key Columns |
|------------|---------|-------------|
| `content_calendars` | Content plans | id, user_id, title, duration, calendar_data |
| `content_research` | Research notes | id, user_id, topic, insights, sources |

### 🎓 Academy Tables
| Table Name | Purpose | Key Columns |
|------------|---------|-------------|
| `academy_courses` | Course catalog | id, title, description, price, status |
| `academy_lessons` | Lesson content | id, course_id, order_index, content, duration_seconds |
| `academy_exercises` | Course exercises | id, lesson_id, exercise_type, content |
| `academy_enrollments` | User enrollments | id, user_id, course_id, enrolled_at |
| `academy_progress` | Progress tracking | id, enrollment_id, lesson_id, completed |
| `academy_certificates` | Certificates | id, user_id, course_id, issued_at |
| `academy_templates` | Template library | id, template_name, category, file_url |
| `academy_monthly_drops` | Monthly content | id, month, year, content_type, files |
| `academy_flatlay_images` | Flatlay library | id, image_url, category, tags |
| `user_resource_downloads` | Download tracking | id, user_id, resource_id, downloaded_at |

### 💳 Payment & Subscription Tables
| Table Name | Purpose | Key Columns |
|------------|---------|-------------|
| `subscriptions` | Active subscriptions | id, user_id, stripe_subscription_id, status |
| `credit_transactions` | Credit history | id, user_id, amount, transaction_type, product_type |
| `purchases` | Purchase history | id, user_id, product_id, amount_cents, created_at |

### 📧 Email & Marketing Tables
| Table Name | Purpose | Key Columns |
|------------|---------|-------------|
| `email_logs` | Email send logs | id, user_id, subject, status, sent_at |
| `email_sends` | Email tracking | id, email_log_id, opens, clicks, bounced |
| `admin_email_campaigns` | Campaign management | id, campaign_name, status, sent_at |
| `email_campaign_clicks` | Click tracking | id, campaign_id, user_id, clicked_at |
| `launch_campaign_sends` | Launch campaign | id, user_id, email_type, sent_at |
| `email_ab_tests` | A/B test configs | id, test_name, variant_a, variant_b |
| `email_ab_test_results` | A/B test results | id, test_id, variant, opens, clicks |
| `email_segments` | Email segments | id, segment_name, criteria |
| `email_segment_members` | Segment membership | id, segment_id, user_id |
| `reengagement_campaigns` | Re-engagement | id, campaign_name, trigger_days |
| `reengagement_sends` | Re-engagement sends | id, campaign_id, user_id, sent_at |
| `email_previews` | Email previews | id, subject, preview_text, html_body |
| `welcome_back_sequence` | Welcome sequence | id, email_number, subject, content |
| `admin_email_drafts` | Draft emails | id, subject, content, created_at |
| `admin_email_templates_ai` | AI templates | id, template_name, prompt, generated_content |

### 📋 Admin Tools Tables
| Table Name | Purpose | Key Columns |
|------------|---------|-------------|
| `admin_agent_chats` | Alex chat sessions | id, title, agent_mode, created_at |
| `admin_agent_messages` | Alex messages | id, chat_id, role, content, tool_calls |
| `admin_memory` | Admin memory system | id, memory_type, content, metadata |
| `admin_knowledge_base` | Knowledge articles | id, title, content, category |
| `admin_context_guidelines` | Context rules | id, guideline_name, content |
| `admin_personal_story` | Sandra's story | id, story_section, content |
| `admin_writing_samples` | Writing samples | id, sample_type, content |
| `admin_agent_feedback` | Agent feedback | id, interaction_id, rating, notes |
| `admin_automation_triggers` | Automation rules | id, trigger_name, conditions, action |
| `admin_automation_rules` | Business rules | id, rule_name, logic |
| `admin_business_insights` | Business data | id, insight_type, data, created_at |
| `admin_content_performance` | Content metrics | id, content_type, views, engagement |
| `admin_alert_sent` | Alert tracking | id, alert_type, sent_at |
| `admin_testimonials` | Testimonials | id, user_name, content, approved |

### 🌐 Instagram Integration Tables
| Table Name | Purpose | Key Columns |
|------------|---------|-------------|
| `instagram_connections` | IG account links | id, user_id, instagram_user_id, access_token |
| `instagram_insights` | IG analytics | id, connection_id, metric_name, value, date |
| `instagram_posts` | IG post tracking | id, connection_id, post_id, media_url |
| `instagram_platform_metrics` | Platform stats | id, date, total_posts, engagement_rate |

### 📊 Analytics & Tracking Tables
| Table Name | Purpose | Key Columns |
|------------|---------|-------------|
| `content_performance_history` | Content metrics | id, content_id, views, engagement, date |
| `user_milestones` | Achievement tracking | id, user_id, milestone_type, achieved_at |
| `brand_evolution` | Brand changes | id, user_id, change_type, before, after |
| `competitors` | Competitor tracking | id, admin_id, name, url, notes |
| `competitor_content_analysis` | Competitor data | id, competitor_id, content_type, analysis |
| `competitor_snapshots` | Historical data | id, competitor_id, snapshot_data, date |
| `admin_competitor_analyses` | Analysis reports | id, competitor_name, strengths, weaknesses |
| `admin_competitor_analyses_ai` | AI analysis | id, competitor_id, ai_insights |

### 📝 Prompt Guide Tables
| Table Name | Purpose | Key Columns |
|------------|---------|-------------|
| `prompt_guides` | Guide catalog | id, title, description, category, is_public |
| `prompt_guide_items` | Guide prompts | id, guide_id, prompt_text, order_index |
| `prompt_pages` | Guide pages | id, guide_id, page_number, content |
| `writing_assistant_outputs` | Generated content | id, user_id, output_text, created_at |

### 🐛 Feedback & Testing Tables
| Table Name | Purpose | Key Columns |
|------------|---------|-------------|
| `feedback` | User feedback | id, user_id, feedback_type, message, images |
| `feedback_ai_responses` | AI-generated responses | id, feedback_id, response_text |
| `feedback_bug_analysis` | Bug analysis | id, feedback_id, severity, root_cause |

### 🎁 Lead Generation Tables
| Table Name | Purpose | Key Columns |
|------------|---------|-------------|
| `blueprint_subscribers` | Blueprint leads | id, email, subscribed_at, followup_sent |
| `freebie_subscribers` | Freebie leads | id, email, freebie_type, download_url |
| `waitlist` | Waitlist signups | id, email, source, joined_at |
| `beta_settings` | Beta program | id, is_beta_active, max_users, current_count |

### 📅 Mission Control Tables
| Table Name | Purpose | Key Columns |
|------------|---------|-------------|
| `mission_control_tasks` | Task management | id, title, status, priority, due_date |
| `weekly_journal` | Weekly reflections | id, week_start_date, wins, challenges, learnings |
| `daily_captures` | Daily notes | id, date, note_type, content |
| `alex_suggestion_history` | Alex suggestions | id, suggestion_type, content, accepted |

### 🎯 Brand Assets Tables
| Table Name | Purpose | Key Columns |
|------------|---------|-------------|
| `brand_assets` | Brand files | id, user_id, asset_type, file_url |
| `brand_kits` | Brand kit packages | id, user_id, kit_name, assets, color_palette |

### 🔄 System Tables
| Table Name | Purpose | Key Columns |
|------------|---------|-------------|
| `webhook_errors` | Webhook failures | id, webhook_type, error_message, payload |
| `schema_migrations` | Migration tracking | version, applied_at |

### 📦 Selfie Tables (Future Feature)
| Table Name | Purpose | Key Columns |
|------------|---------|-------------|
| `selfies` | Selfie uploads | id, user_id, image_url, is_public |
| `selfie_versions` | Selfie variations | id, selfie_id, version_type, image_url |
| `selfie_versions_metadata` | Version metadata | id, version_id, metadata_json |
| `selfie_versions_metadata_audit` | Audit trail | id, version_id, changed_by, changed_at |

---

## 🔄 4. DUPLICATE CODE PATTERNS

### High-Priority Duplicates (Same logic in multiple places)

#### 1. **User Authentication & ID Retrieval**
**Pattern**: Getting user ID from Supabase session
**Found in**: 50+ files
**Files**:
- `lib/user-mapping.ts` - `getUserId()` (canonical)
- `lib/auth-helper.ts` - `getAuthenticatedUser()`
- Duplicated inline in many API routes

**Impact**: Authentication logic scattered across codebase
**Recommendation**: Standardize on `lib/auth-helper.ts` helper

#### 2. **Credit Checking & Deduction**
**Pattern**: Check credits before operation, deduct after
**Found in**: 15+ API routes
**Files**:
- `app/api/maya/generate-concepts/route.ts`
- `app/api/maya/generate-image/route.ts`
- `app/api/studio/generate/route.ts`
- `app/api/studio-pro/generate/*/route.ts`
- `app/api/feed/[feedId]/generate-*/route.ts`

**Impact**: Credit logic inconsistency risk
**Recommendation**: Create centralized credit middleware

#### 3. **Image Generation Status Polling**
**Pattern**: Poll Replicate/NanoBanana for generation status
**Found in**: 8+ files
**Files**:
- `lib/replicate-polling.ts` (canonical)
- `lib/replicate-helpers.ts` (similar logic)
- Inline polling in various API routes

**Impact**: Polling logic inconsistency
**Recommendation**: Consolidate into `lib/replicate-polling.ts`

#### 4. **Error Handling & Logging**
**Pattern**: Try-catch with console.error and NextResponse
**Found in**: 385+ API routes
**Example**:
```typescript
try {
  // operation
} catch (error: any) {
  console.error('[Context] Error:', error.message)
  return NextResponse.json({ error: 'Message' }, { status: 500 })
}
```

**Impact**: Inconsistent error format
**Recommendation**: Create error handling middleware

#### 5. **Prompt Construction for Image Generation**
**Pattern**: Building prompts with user context, style, and settings
**Found in**: 12+ files
**Files**:
- `lib/maya/prompt-constructor.ts` (canonical)
- `lib/maya/prompt-constructor-enhanced.ts`
- `lib/maya/prompt-constructor-integration.ts`
- `lib/maya/flux-prompt-builder.ts`
- `lib/maya/nano-banana-prompt-builder.ts`
- `lib/maya/prompt-builders/classic-prompt-builder.ts`
- `lib/maya/prompt-builders/pro-prompt-builder.ts`
- `lib/maya/prompt-builders/guide-prompt-handler.ts`

**Impact**: 8 different prompt constructors!
**Recommendation**: Unify into single prompt architecture

#### 6. **Chat Message Saving**
**Pattern**: Save user/assistant messages to database
**Found in**: Maya chat, Alex chat, Pro mode chat
**Files**:
- `lib/data/maya.ts` - `saveMayaMessage()`
- `lib/data/admin-agent.ts` - `saveChatMessage()`
- Inline saves in various routes

**Impact**: Different save patterns
**Recommendation**: Create unified chat data layer

#### 7. **Feed Image Generation**
**Pattern**: Generate 9-post Instagram feed with images
**Found in**: Multiple feed-related files
**Files**:
- `lib/feed-planner/orchestrator.ts`
- `lib/feed-planner/queue-images.ts`
- `lib/feed-planner/process-feed-posts-background.ts`
- `app/api/feed-planner/create-from-strategy/route.ts`

**Impact**: Feed generation logic split across files
**Recommendation**: Consolidate orchestration logic

#### 8. **Anthropic API Calls with Caching**
**Pattern**: Anthropic API with prompt caching headers
**Found in**: Maya chat, Alex chat, strategists
**Key Difference**: Alex uses array format, Maya uses string format
**Files**:
- `app/api/maya/chat/route.ts` (AI SDK, string system prompt)
- `app/api/admin/alex/chat/route.ts` (Direct API, array system prompt)

**CRITICAL**: These MUST remain different (see repo rules)

#### 9. **User Context Loading**
**Pattern**: Load user's profile, brand, preferences, training status
**Found in**: Multiple AI endpoints
**Files**:
- `lib/maya/get-user-context.ts` (for Maya)
- `lib/admin/get-complete-context.ts` (for Alex)
- Inline context loading in various routes

**Impact**: Context loading variations
**Recommendation**: Standardize context structure

#### 10. **Email Sending & Tracking**
**Pattern**: Send email via Resend, log to database
**Found in**: Email routes, admin routes
**Files**:
- `lib/email/send-email.ts` (canonical)
- `lib/resend/manage-contact.ts`
- Inline sending in various routes

**Impact**: Email tracking inconsistency
**Recommendation**: All emails should use centralized sender

---

## 🗑️ 5. DEPRECATED & COMMENTED CODE

### Summary
- **TODO Comments**: 263 instances across 83 files
- **Total Comment Lines**: 9,842 comment lines across 768 files
- **Backup Files**: 399 backup files (`.backup-*` pattern)

### Backup File Analysis

#### Recent Backups (Last 7 days)
**Pattern**: `.backup-{timestamp}` or `.backup-{date}`

**Hot Files** (5+ backups):
1. `components/sselfie/maya/hooks/use-maya-chat.ts` - 10 backups
2. `components/sselfie/maya/maya-feed-tab.tsx` - 7 backups  
3. `components/feed-planner/feed-preview-card.tsx` - 11 backups

**Interpretation**: Active development on Maya feed functionality

#### Legacy Backups (From Dec 30, 2024 cleanup)
**Pattern**: `.backup-1767095*` (Dec 30 timestamp)

**Count**: 350+ backup files
**Created**: During Week 1 optimization (prompt caching implementation)

**Recommendation**: Archive backups older than 30 days

### High-Priority TODOs

#### Critical TODOs (requiring immediate attention)
```typescript
// lib/maya/pro/category-system.ts
// TODO: Test these with actual generations to validate categories

// lib/subscription.ts
// TODO: Handle subscription status checks
// TODO: Add grace period logic
// TODO: Implement usage-based throttling

// lib/maya/photoshoot-session.ts
// TODO: Implement photoshoot session management
// TODO: Add session expiration
// TODO: Track session costs
```

#### Performance TODOs
```typescript
// app/api/maya/generate-concepts/route.ts
// TODO: Optimize prompt caching
// TODO: Batch image generation

// lib/feed-planner/orchestrator.ts
// TODO: Implement parallel generation
```

#### Feature TODOs
```typescript
// docs/MAYA-PRO-MODE-REMAINING-TODOS.md
// 10 remaining todos for Pro Mode completion

// docs/phases/PHASE4_IMPLEMENTATION_PLAN.md
// 13 phase 4 implementation todos
```

### Deprecated Code Patterns

#### 1. **Old Dashboard**
```typescript
// components/admin/admin-dashboard-old.tsx
// DEPRECATED: Use admin-dashboard.tsx instead
```

#### 2. **Legacy Maya Headers**
```typescript
// components/sselfie/maya/maya-header-old.tsx
// DEPRECATED: Use maya-header-unified.tsx
```

#### 3. **Unused Strategists**
Some AI strategist code appears to be incomplete:
- `lib/personal-brand-strategist/` - 1 file
- `lib/content-research-strategist/` - 2 files
- `lib/instagram-bio-strategist/` - 2 files
- `lib/instagram-strategist/` - 2 files

**Status**: Unclear if actively used

#### 4. **Test Files in Production**
```typescript
// app/api/test-purchase-email/route.ts
// app/api/test-sentry-simple/route.ts
// app/api/sentry-test/route.ts
// app/api/test/resend/route.ts
```

**Recommendation**: Move to separate test environment

#### 5. **Scene Composer** 
```typescript
// app/scene-composer/ - empty directory
// scripts/11-scene-composer-table.sql - table created
// scripts/12-rollback-scene-composer-table.sql - rollback script exists
```

**Status**: Partially implemented feature

#### 6. **Backup Directory**
```
backup-before-cleanup/
├── direct-prompt-generation.ts
├── docs/ (8 MD files)
├── generate-concepts-route.ts
└── prompt-builder.ts
```

**Recommendation**: Archive or delete

---

## 📦 6. COMPONENT ARCHITECTURE

### Core User Components (`components/sselfie/`)
**Total**: 131 files (86 .tsx, 19 .ts, 26 backups)

#### Main Screens
- `sselfie-app.tsx` - Main application wrapper
- `landing-page.tsx` - Marketing landing page
- `studio-screen.tsx` - AI training interface
- `gallery-screen.tsx` - Image gallery & management
- `maya-chat-screen.tsx` - Maya AI chat interface
- `profile-screen.tsx` - User profile & settings
- `account-screen.tsx` - Account management
- `academy-screen.tsx` - Learning platform
- `content-calendar-screen.tsx` - Content calendar
- `training-screen.tsx` - Model training flow

#### Maya AI Components (`maya/`)
- `maya-chat-interface.tsx` - Chat UI
- `maya-feed-tab.tsx` - Feed planner integration
- `maya-prompts-tab.tsx` - Prompt library
- `maya-training-tab.tsx` - Training tab
- `maya-videos-tab.tsx` - Video generation
- `maya-concept-cards.tsx` - Concept card gallery
- `maya-settings-panel.tsx` - Settings UI
- `maya-header.tsx` - Header with mode switcher
- `maya-quick-prompts.tsx` - Quick prompt buttons
- `maya-tab-switcher.tsx` - Tab navigation

**Maya Hooks** (`maya/hooks/`)
- `use-maya-chat.ts` - Chat state management (10 backups!)
- `use-maya-mode.ts` - Mode switching logic
- `use-maya-images.ts` - Image state
- `use-maya-settings.ts` - Settings state
- `use-maya-shared-images.ts` - Shared image state

#### Pro Mode Components (`pro-mode/`)
- `ProModeChat.tsx` - Pro chat interface
- `ProModeHeader.tsx` - Pro mode header
- `ProModeInput.tsx` - Pro input controls
- `ConceptCardPro.tsx` - Pro concept cards
- `ImageUploadFlow.tsx` - Avatar upload
- `ImageLibraryModal.tsx` - Library selector

#### Gallery Components (`gallery/`)
**Hooks**:
- `use-gallery-images.ts` - Image data fetching
- `use-gallery-filters.ts` - Filter state
- `use-gallery-feed-images.ts` - Feed-specific images
- `use-bulk-operations.ts` - Bulk actions

**Components**:
- `gallery-image-grid.tsx` - Grid layout
- `gallery-image-card.tsx` - Individual card
- `gallery-filters.tsx` - Filter UI
- `gallery-header.tsx` - Header controls
- `gallery-selection-bar.tsx` - Bulk action bar

**Utils**:
- `bulk-download.ts` - Download multiple images
- `image-sorters.ts` - Sort algorithms
- `image-filters.ts` - Filter logic

#### Modals & Dialogs
- `fullscreen-image-modal.tsx` - Image viewer
- `image-gallery-modal.tsx` - Gallery modal
- `image-viewer-modal.tsx` - Image viewer
- `retrain-model-modal.tsx` - Retrain flow
- `buy-credits-modal.tsx` - Credit purchase
- `edit-profile-dialog.tsx` - Profile editor

#### Content Components
- `concept-card.tsx` - Photoshoot concept card
- `instagram-photo-card.tsx` - IG photo preview
- `instagram-carousel-card.tsx` - Carousel preview
- `instagram-reel-card.tsx` - Reel preview
- `story-highlight-card.tsx` - Story highlight
- `video-card.tsx` - Video card
- `calendar-post-card.tsx` - Calendar post

#### Wizards & Onboarding
- `onboarding-wizard.tsx` - User onboarding (3 backups)
- `brand-profile-wizard.tsx` - Brand setup
- `content-pillar-builder.tsx` - Content pillars

#### Utility Components
- `loading-screen.tsx` - Loading state
- `loading-spinner.tsx` - Spinner
- `unified-loading.tsx` - Unified loader
- `loading-button.tsx` - Button with loading
- `progressive-image.tsx` - Image with progressive load
- `install-button.tsx` - PWA install
- `service-worker-provider.tsx` - SW context

### Admin Components (`components/admin/`)
**Total**: 55 files (45 .tsx, 10 backups)

#### Alex AI Components
- `alex-chat.tsx` - Alex chat interface (2 backups)
- `alex-suggestion-card.tsx` - Proactive suggestions

#### Admin Dashboard
- `admin-dashboard.tsx` - Main admin dashboard (current, used in app/admin/page.tsx)
- `admin-dashboard-old.tsx` - Old dashboard (deprecated)
- `admin-nav.tsx` - Admin navigation
- `admin-notifications.tsx` - Notification center
- `admin-analytics-panel.tsx` - Analytics widget

#### Email Management
- `email-campaign-manager.tsx` - Campaign manager (2 backups)
- `email-drafts-library.tsx` - Draft library
- `email-preview-card.tsx` - Email preview (2 backups)
- `email-preview-modal.tsx` - Email modal
- `email-quick-actions.tsx` - Quick actions
- `email-template-library.tsx` - Template library
- `launch-email-sender.tsx` - Launch sender (2 backups)

#### Maya Testing
- `maya-testing-lab.tsx` - Testing interface (2 backups)
- `maya-studio-client.tsx` - Studio controls

#### Agent Tools
- `admin-agent-chat-new.tsx` - New agent chat (2 backups)
- `gallery-image-selector.tsx` - Image picker
- `content-analyzer.tsx` - Content analysis (2 backups)

#### Prompt Guides
- `prompt-guide-builder-client.tsx` - Guide builder (2 backups)
- `prompt-guides-manager.tsx` - Guide manager
- `prompt-builder-chat.tsx` - Chat interface (2 backups)
- `prompt-card.tsx` - Prompt card
- `maya-guide-controls.tsx` - Guide controls

#### Business Tools
- `credit-manager.tsx` - Credit admin
- `beta-program-manager.tsx` - Beta management
- `beta-countdown.tsx` - Countdown timer
- `performance-tracker.tsx` - Performance metrics
- `campaign-status-cards.tsx` - Campaign status

#### Content Management
- `content-calendar-export.tsx` - Calendar export
- `calendar-card.tsx` - Calendar card
- `caption-card.tsx` - Caption editor
- `personal-knowledge-manager.tsx` - Knowledge base

#### Instagram Tools
- `instagram-connection-manager.tsx` - IG connection
- `instagram-setup-guide.tsx` - Setup guide
- `instagram-graph-api-tester.tsx` - API tester

#### System Tools
- `system-health-monitor.tsx` - Health checks
- `semantic-search-panel.tsx` - Search interface
- `writing-assistant.tsx` - Writing tool
- `writing-assistant-history.tsx` - History viewer
- `competitor-tracker.tsx` - Competitor analysis

#### Segmentation
- `segment-selector.tsx` - Email segment picker

#### Testimonials
- `beta-testimonial-broadcast.tsx` - Send testimonial requests

### Feed Planner Components (`components/feed-planner/`)
**Total**: 29 files (13 .tsx, 16 backups)

**Note**: High backup count indicates active development

#### Main Components
- `feed-planner-screen.tsx` - Main screen (2 backups)
- `feed-view-screen.tsx` - View mode
- `instagram-feed-view.tsx` - IG feed preview (2 backups)

#### Feed Components
- `feed-preview-card.tsx` - Feed preview (11 backups!)
- `feed-post-card.tsx` - Individual post card
- `feed-caption-card.tsx` - Caption editor
- `strategy-preview.tsx` - Strategy display

#### Supporting Files
- `index.ts` - Module exports

### Blueprint Components (`components/blueprint/`)
- `blueprint-concept-card.tsx` - Concept card (2 backups)
- `blueprint-email-capture.tsx` - Email form (2 backups)
- `before-after-slider.tsx` - Before/after slider

### Checkout Components (`components/checkout/`)
- `success-content.tsx` - Success page (2 backups)

### Testimonials Components (`components/testimonials/`)
- `testimonial-card.tsx` - Individual testimonial
- `testimonial-grid.tsx` - Grid layout
- `testimonial-submission-form.tsx` - Submission form
- `testimonials-section.tsx` - Section wrapper

### Credits Components (`components/credits/`)
- `credit-balance.tsx` - Credit display
- `buy-credits-dialog.tsx` - Purchase dialog
- `low-credit-modal.tsx` - Low credit warning
- `low-credit-warning.tsx` - Warning banner
- `zero-credits-upgrade-modal.tsx` - Upgrade prompt

### Feedback Components (`components/feedback/`)
- `feedback-button.tsx` - Feedback button
- `feedback-modal.tsx` - Feedback form

### Prompt Guide Components (`components/prompt-guides/`)
- `prompt-email-capture.tsx` - Email capture
- `prompt-guide-page-client.tsx` - Guide page viewer

### Upgrade Components (`components/upgrade/`)
- `upgrade-modal.tsx` - Upgrade modal (2 backups)
- `upgrade-flow.tsx` - Upgrade wizard (2 backups)
- `plan-comparison.tsx` - Plan comparison (2 backups)

### Feed Components (`components/feed/`)
- `instagram-feed-card.tsx` - Feed card

### UI Components (`components/ui/`)
**shadcn/ui** components (16 files):
- `button.tsx`
- `card.tsx`
- `dialog.tsx`
- `input.tsx`
- `select.tsx`
- `textarea.tsx`
- `tabs.tsx`
- `badge.tsx`
- `avatar.tsx`
- `dropdown-menu.tsx`
- `sheet.tsx`
- `toast.tsx`
- `toaster.tsx`
- `progress.tsx`
- `skeleton.tsx`
- `scroll-area.tsx`

### Other Components
- `image-lightbox.tsx` - Image lightbox
- `profile-image-selector.tsx` - Profile image picker
- `reset-passwords-button.tsx` - Password reset
- `theme-provider.tsx` - Theme context
- `UpgradeOrCredits.tsx` - Upgrade or credits modal

---

## 📚 7. LIBRARY ARCHITECTURE

### Core Libraries (`lib/`)
**Total**: 338 files (222 .ts, 23 .tsx, 8 .md, 85+ backups)

### Database Libraries
- `db.ts` - Neon database singleton (canonical)
- `db-singleton.ts` - Alternative singleton
- `db-with-rls.ts` - RLS-enabled client
- `neon.ts` - Neon client wrapper

### Authentication & Users
- `auth-helper.ts` - Auth helper functions (canonical)
- `user-mapping.ts` - User ID mapping (Supabase ↔ Neon)
- `simple-impersonation.ts` - User impersonation
- `user-sync.ts` - User data sync

### Supabase (`lib/supabase/`)
- `server.ts` - Server-side client
- `client.ts` - Client-side client
- `middleware.ts` - Auth middleware
- `admin.ts` - Admin client

### Credits & Billing
- `credits.ts` - Credit operations (canonical)
- `credits-cached.ts` - Cached credit checks
- `credit-packages.ts` - Package definitions
- `pricing.config.ts` - Pricing configuration (canonical)
- `subscription.ts` - Subscription management
- `products.ts` - Product catalog

### Payments
- `stripe.ts` - Stripe integration
- `start-embedded-checkout.ts` - Embedded checkout
- `upgrade-detection.ts` - Detect upgrade opportunities

### AI API Clients
- `replicate-client.ts` - Replicate API client
- `replicate-polling.ts` - Poll for generation status
- `replicate-helpers.ts` - Helper functions
- `nano-banana-client.ts` - Nano Banana API client

### Email Services
- `flodesk.ts` - Flodesk integration (4 functions)
- `resend/` - Resend email service
  - `manage-contact.ts` - Contact management (4 functions)
  - `get-audience-contacts.ts` - Fetch contacts (2 functions)
- `loops/` - Loops email service
  - `client.ts` - Loops client (3 functions)
  - `manage-contact.ts` - Contact management (6 functions)

### Email Logic (`lib/email/`)
- `send-email.ts` - Send email (canonical, 2 functions)
- `segmentation.ts` - Email segments (4 functions)
- `run-scheduled-campaigns.ts` - Campaign runner (2 functions)
- `create-beta-testimonial-campaign.ts` - Testimonial campaign
- `generate-tracked-link.ts` - Link tracking (2 functions)
- `ab-testing.ts` - A/B test logic (4 functions)

**Email Templates** (`lib/email/templates/`)
- `welcome-email.tsx` - Welcome email
- `launch-email.tsx` - Launch campaign
- `launch-followup-email.tsx` - Launch follow-up
- `welcome-sequence.ts` - Welcome sequence (3 emails)
- `nurture-sequence.ts` - Nurture sequence (3 emails)
- `reengagement-sequence.ts` - Re-engagement (3 emails)
- `beta-testimonial-request.tsx` - Request testimonials (2 functions)
- `blueprint-followup-day-*.tsx` - Blueprint follow-ups (4 emails)
- `feedback-*.tsx` - Feedback emails (2 templates)
- `freebie-guide-email.tsx` - Freebie delivery
- `newsletter-template.tsx` - Newsletter
- `nurture-day-*.tsx` - Nurture emails (3 templates)
- `upsell-*.tsx` - Upsell emails (2 templates)
- `welcome-back-reengagement.tsx` - Win-back
- `win-back-offer.tsx` - Win-back offer

### Storage & Assets
- `storage.ts` - File storage (2 functions)
- `upstash-vector.ts` - Vector storage (2 functions)
- `redis.ts` - Redis cache

### Rate Limiting
- `rate-limit.ts` - Rate limiting (6 functions)
- `rate-limit-api.ts` - API rate limits (2 functions)

### Analytics
- `analytics.ts` - Analytics tracking (2 functions)

### Feature Flags
- `feature-flags.ts` - Feature toggles

### Design System
- `design-tokens.ts` - Design tokens (9 constants)

### Utilities
- `utils.ts` - General utilities
- `utils/` - Utility folder
  - `haptics.ts` - Haptic feedback (3 functions)
- `cache.ts` - Cache utilities (4 functions)
- `env.ts` - Environment variables (2 functions)

### Security
- `security/` - Security utilities
  - `url-validator.ts` - URL validation (4 functions)

### Webhooks
- `webhook-deduplication.ts` - Deduplicate webhooks
- `webhook-monitoring.tsx` - Monitor webhooks (3 functions)

### Data Access Layer (`lib/data/`)
- `maya.ts` - Maya data operations (15 functions)
- `admin-agent.ts` - Admin agent data (8 functions)
- `training.ts` - Training data (10 functions)
- `studio.ts` - Studio data (3 functions)
- `academy.ts` - Academy data (16 functions)
- `images.ts` - Image data (3 functions)
- `sessions.ts` - Session data (5 functions)

### Maya AI System (`lib/maya/`)
**Total**: 101 files (82 .ts, 6 .md, 13 backups)

#### Core Maya Files
- `personality.ts` - Maya's personality prompt
- `personality-enhanced.ts` - Enhanced personality
- `pro-personality.ts` - Pro mode personality
- `studio-pro-system-prompt.ts` - Studio Pro prompt (3 functions)
- `get-user-context.ts` - Load user context
- `user-preferences.ts` - User preferences (3 functions)

#### Prompt Generation
- `prompt-constructor.ts` - Main prompt builder (3 functions)
- `prompt-constructor-enhanced.ts` - Enhanced constructor
- `prompt-constructor-integration.ts` - Integration example (6 functions)
- `prompt-brand-enhancer.ts` - Brand enhancement (2 functions)
- `flux-prompt-builder.ts` - Flux-specific prompts
- `flux-prompt-optimization.ts` - Flux optimization (3 functions)
- `nano-banana-prompt-builder.ts` - Nano Banana prompts (4 functions)
- `direct-prompt-generation.ts` - Direct generation (3 functions)
- `direct-prompt-generation-integration-example.ts` - Example (3 functions)
- `flux-prompting-principles.ts` - Prompting principles

#### Prompt Builders (`lib/maya/prompt-builders/`)
- `classic-prompt-builder.ts` - Classic mode (2 functions)
- `pro-prompt-builder.ts` - Pro mode
- `guide-prompt-handler.ts` - Guide mode (4 functions)
- `system-prompt-builder.ts` - System prompt builder

#### Prompt Components (`lib/maya/prompt-components/`)
- `universal-prompts-raw.ts` - Universal prompts (3 functions)
- `component-extractor.ts` - Extract components

#### Universal Prompts (`lib/maya/universal-prompts/`)
- `index.ts` - Universal prompt loader (4 functions)

#### Prompt Templates (`lib/maya/prompt-templates/`)
- `index.ts` - Template index (2 functions)
- `helpers.ts` - 112 helper functions!
- `instagram-text-rules.ts` - Text overlay rules
- `reel-cover-prompts.ts` - Reel cover templates

**High-End Brands** (`lib/maya/prompt-templates/high-end-brands/`)
- `index.ts` - Brand index (2 functions)
- `category-mapper.ts` - Category mapping
- `luxury-brands.ts` - Luxury brands (5 functions)
- `wellness-brands.ts` - Wellness brands (3 functions)
- `travel-lifestyle.ts` - Travel brands (5 functions)
- `seasonal-christmas.ts` - Christmas content (6 functions)

#### Brand Knowledge
- `brand-library-2025.ts` - Brand library (6 functions)
- `brand-aesthetics.ts` - Brand aesthetics (2 functions)
- `fashion-knowledge-2025.ts` - Fashion knowledge
- `authentic-photography-knowledge.ts` - Photography tips (2 functions)
- `instagram-loras.ts` - LoRA settings (4 functions)
- `luxury-lifestyle-settings.ts` - Lifestyle settings
- `lifestyle-contexts.ts` - Context library

#### Pro Mode (`lib/maya/pro/`)
- `category-system.ts` - Category system (5 functions)
- `prompt-architecture.ts` - Prompt architecture (5 functions)
- `photography-styles.ts` - Photography styles
- `camera-composition.ts` - Camera specs (6 functions)
- `seasonal-luxury-content.ts` - Seasonal content
- `influencer-outfits.ts` - Outfit library (4 functions)
- `smart-setting-builder.ts` - Setting builder (5 functions)
- `chat-logic.ts` - Pro chat logic (10 functions)
- `design-system.ts` - Pro design system (2 functions)

#### Feed & Planner
- `feed-generation-handler.ts` - Feed generation (9 functions)
- `feed-planner-context.ts` - Feed context
- `concept-templates.ts` - Concept templates (2 functions)

#### Photoshoots
- `photoshoot-session.ts` - Session management
- `quote-graphic-prompt-builder.ts` - Quote graphics

#### Scene Composer
- `scene-composer-template.ts` - Scene templates (2 functions)

#### Video & Motion
- `motion-similarity.ts` - Motion matching (3 functions)
- `motion-libraries.ts` - Motion templates (2 functions)

#### Post-Processing
- `post-processing/` - Post-processing
  - `minimal-cleanup.ts` - Minimal cleanup (3 functions)

#### Type Guards
- `type-guards.ts` - Type checking (6 functions)

### Feed Planner System (`lib/feed-planner/`)
**Total**: 17 files (10 .ts, 7 backups)

#### Core Files
- `orchestrator.ts` - Main orchestrator
- `mode-detection.ts` - Detect feed mode (2 functions)
- `feed-persistence.ts` - Save feeds (10 functions)
- `queue-images.ts` - Queue image generation
- `process-feed-posts-background.ts` - Background processor

#### Feed Generation
- `instagram-strategy-agent.ts` - Strategy AI
- `visual-composition-expert.ts` - Composition AI
- `layout-strategist.ts` - Layout AI
- `caption-writer.ts` - Caption AI (2 functions)
- `feed-prompt-expert.ts` - Prompt expert (7 functions)

### Feed System (`lib/feed/`)
- `fetch-feed.ts` - Fetch feed data (4 functions)
- `types.ts` - Feed types

### Feed Chat (`lib/feed-chat/`)
- `history.ts` - Chat history (6 functions)

### Feed Progress
- `feed-progress.ts` - Progress tracking (3 functions)

### Alex AI System (`lib/alex/`)
**Total**: 60+ files

#### Core Alex Files
- `constants.ts` - Alex constants
- `streaming.ts` - SSE streaming
- `proactive-suggestions.ts` - Proactive suggestions (4 functions)
- `suggestion-triggers.ts` - Suggestion triggers
- `types.ts` - Alex types

#### Handlers (`lib/alex/handlers/`)
- `tool-executor.ts` - Execute tools (3 functions)

#### Shared Utilities (`lib/alex/shared/`)
- `helpers.ts` - Helper functions (5 functions)
- `email-content-generator.ts` - Email content
- `dependencies.ts` - Strip HTML utility

#### Tools (`lib/alex/tools/`)
**Total**: 60 tool files!

**Email Tools** (`lib/alex/tools/email/`)
- `compose-email-draft.ts` - Draft composer (14 functions)
- `create-email-sequence.ts` - Sequence creator (5 functions)
- `create-email-sequence-plan.ts` - Sequence planner (4 functions)
- `create-resend-automation-sequence.ts` - Resend automation (5 functions)
- `schedule-resend-automation.ts` - Schedule automation (7 functions)
- `send-resend-email.ts` - Send email (5 functions)
- `send-broadcast-to-segment.ts` - Broadcast (13 functions)
- `get-resend-automation-status.ts` - Automation status (3 functions)
- `get-resend-audience-data.ts` - Audience data (7 functions)
- `check-campaign-status.ts` - Campaign status (10 functions)
- `recommend-send-timing.ts` - Timing recommendations
- `edit-email.ts` - Edit email (9 functions)
- `mark-email-sent.ts` - Mark as sent (4 functions)
- `record-email-analytics.ts` - Record analytics (3 functions)

**Content Tools** (`lib/alex/tools/content/`)
- `create-content-calendar.ts` - Calendar creator (8 functions)
- `create-instagram-caption.ts` - Caption creator (8 functions)
- `suggest-maya-prompts.ts` - Prompt suggestions (5 functions)
- `read-codebase-file.ts` - Read codebase (16 functions)

**Business Tools** (`lib/alex/tools/business/`)
- `get-prompt-guides.ts` - Get guides (3 functions)
- `update-prompt-guide.ts` - Update guide (6 functions)
- `get-testimonials.ts` - Get testimonials (2 functions)

**Automation Tools** (`lib/alex/tools/automation/`)
- `create-automation.ts` - Create automation (17 functions)

**Historical Tools** (`lib/alex/tools/historical/`)
- Files moved to historical (deprecated)

#### Tool Definitions
- `tools/index.ts` - Tool definitions registry

### Admin Libraries (`lib/admin/`)
- `alex-system-prompt.ts` - Alex system prompt
- `alex-backup-manager.ts` - Backup system (4 functions)
- `get-complete-context.ts` - Complete context loader
- `get-personal-context.ts` - Personal context
- `get-product-knowledge.ts` - Product knowledge
- `get-sandra-voice.ts` - Sandra's voice
- `email-brand-guidelines.ts` - Brand guidelines
- `email-campaign-helpers.tsx` - Campaign helpers (2 functions)
- `email-intelligence.ts` - Email intelligence
- `parse-content-calendar.ts` - Parse calendar (2 functions)
- `prompt-guide-utils.ts` - Prompt guide utils (5 functions)
- `universal-prompts-loader.ts` - Universal prompts (3 functions)

### Instagram Strategists
**Instagram Strategist** (`lib/instagram-strategist/`)
- `personality.ts` - Strategist personality
- `caption-logic.tsx` - Caption logic

**Bio Strategist** (`lib/instagram-bio-strategist/`)
- `personality.ts` - Bio personality
- `bio-logic.ts` - Bio logic

**Personal Brand Strategist** (`lib/personal-brand-strategist/`)
- `personality.ts` - Brand personality

**Content Research Strategist** (`lib/content-research-strategist/`)
- `personality.ts` - Research personality
- `research-logic.ts` - Research logic

### Audience Management (`lib/audience/`)
- `segment-sync.ts` - Sync segments (8 functions)

### Agent Coordinator (`lib/agent-coordinator/`)
- `workflow.ts` - Workflow coordination
- `request-router.ts` - Route requests (2 functions)

---

## 🔍 8. KEY INSIGHTS & RECOMMENDATIONS

### Architecture Strengths
1. ✅ **Well-documented**: 106K+ lines of documentation
2. ✅ **Type-safe**: TypeScript strict mode throughout
3. ✅ **Modular**: Clear separation of concerns
4. ✅ **Comprehensive**: 385+ API endpoints cover all features
5. ✅ **Safety-first**: 399 backup files show careful development

### Critical Issues
1. ⚠️ **Prompt Constructor Overload**: 8 different prompt builders
2. ⚠️ **High Backup Count**: 399 backup files need cleanup
3. ⚠️ **Duplicate Auth Logic**: User auth duplicated in 50+ files
4. ⚠️ **TODO Debt**: 263 TODOs across 83 files
5. ⚠️ **Test Files in Production**: Test endpoints should be separated

### High-Priority Refactoring Opportunities
1. **Unify Prompt Construction** (8 builders → 1 architecture)
2. **Centralize Credit Management** (15+ duplicate patterns)
3. **Standardize Error Handling** (385 routes with different patterns)
4. **Consolidate User Context Loading** (multiple loaders)
5. **Archive Old Backups** (cleanup 350+ backup files from Dec 30)

### Security Considerations
1. ✅ Authentication properly handled via Supabase
2. ✅ User impersonation safely implemented
3. ✅ Admin routes properly protected
4. ⚠️ Test endpoints accessible in production
5. ⚠️ Webhook deduplication needed

### Performance Opportunities
1. **Batch Image Generation**: Currently sequential
2. **Prompt Caching**: Already implemented (Week 1 complete)
3. **Database Indexing**: 90+ tables, verify indexes
4. **API Response Time**: Monitor long-running generations
5. **Redis Caching**: Underutilized

### Mobile Readiness
1. ✅ PWA manifest exists
2. ✅ Service worker implemented
3. ✅ Responsive design throughout
4. ⚠️ Native features need testing
5. ⚠️ Offline support incomplete

### Cost Optimization Status
1. ✅ **Week 1 Complete**: Prompt caching implemented
2. 🔄 **Week 2 Pending**: Batch operations
3. 🔄 **Week 3 Pending**: Maya Testing Lab expansion
4. 🔄 **Week 4 Pending**: Usage limits & warnings

---

## 📈 9. BUSINESS CONTEXT

### User Journey
1. **Landing** → Marketing page with testimonials
2. **Sign Up** → Supabase auth
3. **Onboarding** → Brand profile wizard
4. **Training** → Upload 10-20 selfies, train AI model
5. **Studio** → Generate first photoshoot
6. **Maya Chat** → Request styled photoshoots
7. **Gallery** → Browse, download, manage images
8. **Feed Planner** → Create 9-post Instagram feeds
9. **Academy** → Learn personal branding

### Pricing Tiers
1. **One-Time Session** ($49): 70 credits, one photoshoot
2. **Content Creator Studio** ($79/mo): 150 credits, unlimited shoots
3. **Brand Studio** ($149/mo): 300 credits, full access

### Credit Economy
- **Training**: 25 credits
- **Image Generation**: 1 credit
- **Video/Animation**: 3 credits

### Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Backend**: Next.js API Routes, Serverless
- **Database**: Neon PostgreSQL (90+ tables)
- **Auth**: Supabase Auth
- **AI**: Anthropic Claude (Sonnet 4, Haiku 4.5)
- **Image Gen**: Replicate (Flux models), Nano Banana Pro
- **Email**: Resend, Flodesk, Loops
- **Payments**: Stripe
- **Hosting**: Vercel
- **Monitoring**: Sentry
- **Testing**: Playwright (E2E), Maya Testing Lab (AI quality)

---

## 🎯 10. NEXT STEPS

### Immediate Actions
1. **Archive old backups** (350+ files from Dec 30)
2. **Review and address critical TODOs** (10 high-priority items)
3. **Remove test endpoints from production** (or gate them)
4. **Document strategist usage** (clarify which are active)

### Short-Term Improvements
1. **Unify prompt construction** (consolidate 8 builders)
2. **Create credit middleware** (eliminate 15+ duplicates)
3. **Standardize error handling** (create error middleware)
4. **Add API documentation** (OpenAPI/Swagger)

### Long-Term Enhancements
1. **Complete Week 2 optimizations** (batch operations)
2. **Expand Maya Testing Lab** (automated quality tests)
3. **Implement usage limits** (graceful degradation)
4. **Mobile app preparation** (React Native bridge)

---

*End of Codebase Map*


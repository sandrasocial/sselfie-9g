# SSELFIE API Routes Summary

**Last Generated:** Auto-generated from codebase  
**Purpose:** Consolidated reference to prevent duplicate route suggestions and verify existing endpoints

---

## 🔧 Admin Routes (`/api/admin/*`)

### Dashboard & Analytics
- `GET /api/admin/dashboard/stats` - Overall dashboard statistics
- `GET /api/admin/dashboard/revenue` - Revenue metrics
- `GET /api/admin/dashboard/revenue-history` - Revenue history
- `GET /api/admin/dashboard/beta-users` - Beta user list
- `GET /api/admin/dashboard/email-metrics` - Email performance metrics
- `GET /api/admin/dashboard/feedback` - User feedback summary
- `GET /api/admin/dashboard/testimonials-count` - Testimonials count
- `GET /api/admin/dashboard/webhook-health` - Webhook health status

### Agent & AI Tools
- `GET /api/admin/agent/analytics` - AI agent performance analytics
- `POST /api/admin/agent/analyze-content` - Content analysis
- `GET /api/admin/agent/competitors` - Competitor data
- `POST /api/admin/agent/competitors/analysis` - Competitor analysis
- `POST /api/admin/agent/create-calendar-post` - Create calendar post
- `POST /api/admin/agent/create-campaign` - Create email campaign
- `GET /api/admin/agent/email-campaigns` - List email campaigns
- `GET /api/admin/agent/email-drafts` - Email drafts
- `GET /api/admin/agent/email-templates` - Email templates
- `POST /api/admin/agent/export-calendar` - Export calendar
- `POST /api/admin/agent/extract-audio` - Extract audio from content
- `GET /api/admin/agent/gallery-images` - Gallery images
- `POST /api/admin/agent/index-content` - Index content for search
- `GET /api/admin/agent/memory` - Agent memory/context
- `GET /api/admin/agent/performance` - Performance metrics
- `POST /api/admin/agent/save-message` - Save agent message
- `POST /api/admin/agent/semantic-search` - Semantic search
- `POST /api/admin/agent/send-email` - Send email
- `POST /api/admin/agent/send-test-email` - Send test email
- `POST /api/admin/agent/upload-email-image` - Upload email image

### Alex AI Assistant
- `POST /api/admin/alex/chat` - Chat with Alex
- `GET /api/admin/alex/chats` - List chats
- `GET /api/admin/alex/chats/[chatId]` - Get specific chat
- `GET /api/admin/alex/load-chat` - Load chat history
- `POST /api/admin/alex/new-chat` - Create new chat
- `GET /api/admin/alex/suggestions` - Get suggestions
- `POST /api/admin/alex/suggestions/act-upon` - Act on suggestion
- `POST /api/admin/alex/suggestions/dismiss` - Dismiss suggestion

### Audience & Segments
- `GET /api/admin/audience/get-segment-stats` - Segment statistics
- `POST /api/admin/audience/sync-segments` - Sync audience segments
- `POST /api/admin/audience/test-cron` - Test cron job
- `POST /api/admin/audience/test-sync` - Test sync
- `POST /api/admin/audience/verify-contact` - Verify contact
- `GET /api/admin/segments/list` - List segments

### Email System
- `GET /api/admin/email-analytics` - Email analytics
- `GET /api/admin/email-control/settings` - Email settings
- `GET /api/admin/email-control/stats` - Email statistics
- `POST /api/admin/email-control/send-test` - Send test email
- `POST /api/admin/email/activate-automation` - Activate automation
- `GET /api/admin/email/campaign-status` - Campaign status
- `POST /api/admin/email/check-automation` - Check automation
- `POST /api/admin/email/create-automation-sequence` - Create automation sequence
- `POST /api/admin/email/create-beta-segment` - Create beta segment
- `POST /api/admin/email/create-photoshoot-buyers-segment` - Create photoshoot buyers segment
- `POST /api/admin/email/diagnose-test` - Diagnose email test
- `GET /api/admin/email/get-automation-details` - Get automation details
- `GET /api/admin/email/get-automation-sequences` - Get automation sequences
- `GET /api/admin/email/get-resend-segments` - Get Resend segments
- `GET /api/admin/email/get-sequence-status` - Get sequence status
- `GET /api/admin/email/get-subscriber-counts` - Get subscriber counts
- `GET /api/admin/email/preview` - Preview email
- `GET /api/admin/email/preview-campaign` - Preview campaign
- `GET /api/admin/email/preview-launch` - Preview launch email
- `POST /api/admin/email/resend-sequence-email` - Resend sequence email
- `POST /api/admin/email/run-scheduled-campaigns` - Run scheduled campaigns
- `POST /api/admin/email/send-beta-testimonial` - Send beta testimonial
- `POST /api/admin/email/send-followup-campaign` - Send followup campaign
- `POST /api/admin/email/send-launch-campaign` - Send launch campaign
- `POST /api/admin/email/send-test-launch` - Send test launch
- `GET /api/admin/email/subscriber-count` - Subscriber count
- `POST /api/admin/email/sync-all-subscribers` - Sync all subscribers
- `POST /api/admin/email/sync-photoshoot-buyers` - Sync photoshoot buyers
- `POST /api/admin/email/track-campaign-recipients` - Track campaign recipients
- `POST /api/admin/email/update-sequence-email` - Update sequence email

### Broadcast
- `POST /api/admin/broadcast/send` - Send broadcast

### Academy Management
- `GET /api/admin/academy/courses` - List courses
- `GET /api/admin/academy/courses/[courseId]` - Get course
- `GET /api/admin/academy/flatlay-images` - List flatlay images
- `GET /api/admin/academy/flatlay-images/[flatlayId]` - Get flatlay image
- `GET /api/admin/academy/lessons` - List lessons
- `GET /api/admin/academy/lessons/[lessonId]` - Get lesson
- `GET /api/admin/academy/monthly-drops` - List monthly drops
- `GET /api/admin/academy/monthly-drops/[dropId]` - Get monthly drop
- `GET /api/admin/academy/templates` - List templates
- `GET /api/admin/academy/templates/[templateId]` - Get template

### Content Management
- `GET /api/admin/content-templates` - Content templates
- `GET /api/admin/creative-content/calendars` - List calendars
- `GET /api/admin/creative-content/calendars/[id]` - Get calendar
- `GET /api/admin/creative-content/captions` - List captions
- `GET /api/admin/creative-content/captions/[id]` - Get caption
- `GET /api/admin/creative-content/prompts` - List prompts
- `GET /api/admin/creative-content/prompts/[id]` - Get prompt

### Credits Management
- `POST /api/admin/credits/add` - Add credits to user

### Diagnostics
- `POST /api/admin/diagnostics/create-missing-tables` - Create missing tables
- `GET /api/admin/diagnostics/cron-status` - Cron job status
- `GET /api/admin/diagnostics/email-status` - Email system status
- `GET /api/admin/diagnostics/errors` - Error logs
- `GET /api/admin/diagnostics/schema-health` - Schema health check
- `GET /api/admin/diagnostics/stripe-health` - Stripe health check

### Conversions
- `GET /api/admin/conversions` - Conversion analytics

### Feedback
- `GET /api/admin/feedback` - User feedback

### Guides & Knowledge
- `GET /api/admin/guides` - List guides
- `POST /api/admin/guides/save` - Save guide
- `GET /api/admin/knowledge` - Knowledge base
- `GET /api/admin/personal-knowledge` - Personal knowledge

### Health
- `GET /api/admin/health/e2e` - End-to-end health check

### Journal
- `GET /api/admin/journal/current` - Current journal entry
- `POST /api/admin/journal/enhance` - Enhance journal entry
- `POST /api/admin/journal/publish` - Publish journal entry
- `POST /api/admin/journal/save` - Save journal entry

### Login & Impersonation
- `POST /api/admin/login-as-user` - Login as user (impersonation)

### Maya Testing
- `GET /api/admin/maya-testing/check-migration` - Check migration status
- `POST /api/admin/maya-testing/create-test-user` - Create test user
- `POST /api/admin/maya-testing/fix-completed-trainings` - Fix completed trainings
- `GET /api/admin/maya-testing/get-generation-progress` - Get generation progress
- `GET /api/admin/maya-testing/get-test-images` - Get test images
- `GET /api/admin/maya-testing/get-test-users` - Get test users
- `GET /api/admin/maya-testing/get-training-progress` - Get training progress
- `GET /api/admin/maya-testing/list-results` - List test results
- `POST /api/admin/maya-testing/run-migration` - Run migration
- `POST /api/admin/maya-testing/run-test` - Run test
- `POST /api/admin/maya-testing/upload-test-images` - Upload test images

### Mission Control
- `POST /api/admin/mission-control/complete-task` - Complete task
- `GET /api/admin/mission-control/daily-check` - Daily check

### Notifications
- `GET /api/admin/notifications` - Notifications

### Prompt Guides
- `POST /api/admin/prompt-guide/approve-item` - Approve prompt guide item
- `POST /api/admin/prompt-guide/publish` - Publish prompt guide
- `POST /api/admin/prompt-guides/create` - Create prompt guide
- `DELETE /api/admin/prompt-guides/delete` - Delete prompt guide
- `GET /api/admin/prompt-guides/list` - List prompt guides
- `GET /api/admin/prompt-guides/prompts` - Get prompts
- `POST /api/admin/prompt-guides/publish` - Publish prompt guide
- `GET /api/admin/prompt-guides/stats` - Prompt guide statistics
- `POST /api/admin/run-prompt-guide-migration` - Run migration

### Stripe Management
- `POST /api/admin/stripe/backfill-customer-ids` - Backfill customer IDs
- `POST /api/admin/stripe/sync-products` - Sync products

### Testimonials
- `GET /api/admin/testimonials` - List testimonials
- `GET /api/admin/testimonials/export` - Export testimonials

### Training Management
- `POST /api/admin/training/bulk-sync` - Bulk sync trainings
- `POST /api/admin/training/fix-trigger-word` - Fix trigger word
- `POST /api/admin/training/promote-test-model` - Promote test model
- `GET /api/admin/training/sync-status` - Sync status
- `POST /api/admin/training/sync-user` - Sync user training

### User Management
- `GET /api/admin/users/search` - Search users

### Utilities
- `POST /api/admin/fix-lora` - Fix LoRA model
- `POST /api/admin/migrate-pricing` - Migrate pricing
- `POST /api/admin/setup-alert-tracking` - Setup alert tracking
- `POST /api/admin/verify-anthropic-key` - Verify Anthropic API key

### Writing Assistant
- `DELETE /api/admin/writing-assistant/delete` - Delete writing assistant entry
- `POST /api/admin/writing-assistant/generate` - Generate content
- `GET /api/admin/writing-assistant/list` - List entries
- `POST /api/admin/writing-assistant/save` - Save entry

---

## 👤 User-Facing Routes

### Academy
- `GET /api/academy/certificates` - Get certificates
- `GET /api/academy/courses` - List courses
- `GET /api/academy/courses/[courseId]` - Get course details
- `POST /api/academy/enroll` - Enroll in course
- `POST /api/academy/exercises/submit` - Submit exercise
- `GET /api/academy/flatlay-images` - List flatlay images
- `GET /api/academy/flatlay-images/[flatlayId]/download` - Download flatlay
- `GET /api/academy/lessons/[lessonId]` - Get lesson
- `GET /api/academy/monthly-drops` - List monthly drops
- `GET /api/academy/monthly-drops/[dropId]/download` - Download monthly drop
- `GET /api/academy/my-courses` - Get user's courses
- `GET /api/academy/progress` - Get progress
- `GET /api/academy/templates` - List templates
- `GET /api/academy/templates/[templateId]/download` - Download template

### Maya AI (Stylist)
- `POST /api/maya/chat` - Chat with Maya
- `GET /api/maya/chats` - List chats
- `GET /api/maya/check-generation` - Check generation status
- `GET /api/maya/check-photoshoot-prediction` - Check photoshoot prediction
- `GET /api/maya/check-studio-pro` - Check Studio Pro status
- `GET /api/maya/check-video` - Check video status
- `POST /api/maya/content-pillars` - Generate content pillars
- `POST /api/maya/create-photoshoot` - Create photoshoot
- `DELETE /api/maya/delete-chat` - Delete chat
- `DELETE /api/maya/delete-video` - Delete video
- `GET /api/maya/feed-chat/health` - Feed chat health
- `GET /api/maya/feed-progress` - Feed progress
- `GET /api/maya/feed/[feedId]` - Get feed chat
- `POST /api/maya/feed/generate-images` - Generate feed images
- `GET /api/maya/feed/list` - List feed chats
- `POST /api/maya/feed/save-to-planner` - Save to planner
- `POST /api/maya/generate-all-feed-prompts` - Generate all feed prompts
- `POST /api/maya/generate-concepts` - Generate concepts
- `POST /api/maya/generate-feed` - Generate feed
- `POST /api/maya/generate-feed-prompt` - Generate feed prompt
- `POST /api/maya/generate-image` - Generate image
- `POST /api/maya/generate-motion-prompt` - Generate motion prompt
- `POST /api/maya/generate-prompt-suggestions` - Generate prompt suggestions
- `POST /api/maya/generate-studio-pro` - Generate Studio Pro content
- `POST /api/maya/generate-studio-pro-prompts` - Generate Studio Pro prompts
- `POST /api/maya/generate-video` - Generate video
- `GET /api/maya/get-photoshoot` - Get photoshoot
- `GET /api/maya/instagram-tips` - Get Instagram tips
- `GET /api/maya/load-chat` - Load chat
- `POST /api/maya/new-chat` - Create new chat
- `POST /api/maya/research` - Research content
- `POST /api/maya/save-chat` - Save chat
- `POST /api/maya/save-message` - Save message
- `POST /api/maya/update-message` - Update message
- `POST /api/maya/update-physical-preferences` - Update physical preferences
- `GET /api/maya/videos` - List videos
- `GET /api/maya/b-roll-images` - Get B-roll images

### Maya Pro (Premium Features)
- `POST /api/maya/pro/chat` - Pro chat
- `GET /api/maya/pro/check-generation` - Check generation
- `POST /api/maya/pro/generate-concepts` - Generate concepts
- `POST /api/maya/pro/generate-feed` - Generate feed
- `POST /api/maya/pro/generate-image` - Generate image
- `GET /api/maya/pro/library/clear` - Clear library
- `GET /api/maya/pro/library/get` - Get library
- `POST /api/maya/pro/library/update` - Update library
- `GET /api/maya/pro/photoshoot/check-grid` - Check grid
- `POST /api/maya/pro/photoshoot/create-carousel` - Create carousel
- `POST /api/maya/pro/photoshoot/generate-grid` - Generate grid
- `GET /api/maya/pro/photoshoot/lookup-image` - Lookup image
- `POST /api/maya/pro/photoshoot/start-session` - Start session

### Feed Planner
- `POST /api/feed-planner/create-from-strategy` - Create from strategy
- `POST /api/feed-planner/create-strategy` - Create strategy
- `DELETE /api/feed-planner/delete-strategy` - Delete strategy
- `POST /api/feed-planner/enhance-goal` - Enhance goal
- `POST /api/feed-planner/generate-all-images` - Generate all images
- `POST /api/feed-planner/generate-batch` - Generate batch
- `POST /api/feed-planner/queue-all-images` - Queue all images
- `POST /api/feed-planner/save-to-planner` - Save to planner

### Feed Management
- `GET /api/feed/[feedId]` - Get feed
- `POST /api/feed/[feedId]/add-caption` - Add caption
- `POST /api/feed/[feedId]/add-hashtags` - Add hashtags
- `POST /api/feed/[feedId]/add-highlight-overlay` - Add highlight overlay
- `POST /api/feed/[feedId]/add-row` - Add row
- `POST /api/feed/[feedId]/add-strategy` - Add strategy
- `GET /api/feed/[feedId]/check-highlight` - Check highlight
- `GET /api/feed/[feedId]/check-post` - Check post
- `GET /api/feed/[feedId]/check-profile` - Check profile
- `GET /api/feed/[feedId]/download-bundle` - Download bundle
- `POST /api/feed/[feedId]/enhance-caption` - Enhance caption
- `POST /api/feed/[feedId]/generate-bio` - Generate bio
- `POST /api/feed/[feedId]/generate-captions` - Generate captions
- `POST /api/feed/[feedId]/generate-highlights` - Generate highlights
- `POST /api/feed/[feedId]/generate-images` - Generate images
- `POST /api/feed/[feedId]/generate-profile` - Generate profile
- `POST /api/feed/[feedId]/generate-single` - Generate single image
- `POST /api/feed/[feedId]/generate-strategy` - Generate strategy
- `POST /api/feed/[feedId]/highlight-image` - Highlight image
- `GET /api/feed/[feedId]/highlights` - Get highlights
- `POST /api/feed/[feedId]/mark-posted` - Mark as posted
- `GET /api/feed/[feedId]/profile-image` - Get profile image
- `GET /api/feed/[feedId]/progress` - Get progress
- `POST /api/feed/[feedId]/regenerate-caption` - Regenerate caption
- `POST /api/feed/[feedId]/regenerate-post` - Regenerate post
- `POST /api/feed/[feedId]/reorder` - Reorder posts
- `POST /api/feed/[feedId]/replace-post-image` - Replace post image
- `POST /api/feed/[feedId]/save-highlight-image` - Save highlight image
- `GET /api/feed/[feedId]/status` - Get status
- `GET /api/feed/[feedId]/strategy` - Get strategy
- `POST /api/feed/[feedId]/update-bio` - Update bio
- `POST /api/feed/[feedId]/update-caption` - Update caption
- `POST /api/feed/[feedId]/update-metadata` - Update metadata
- `POST /api/feed/[feedId]/update-profile-image` - Update profile image
- `POST /api/feed/[feedId]/upload-profile-image` - Upload profile image
- `POST /api/feed/add-more` - Add more posts
- `POST /api/feed/auto-generate` - Auto-generate feed
- `POST /api/feed/clear` - Clear feed
- `POST /api/feed/create-manual` - Create manual feed
- `GET /api/feed/latest` - Get latest feed
- `GET /api/feed/list` - List feeds
- `POST /api/feed/refresh-concepts` - Refresh concepts

### Training
- `POST /api/training/cancel` - Cancel training
- `POST /api/training/create-zip-from-blobs` - Create zip from blobs
- `DELETE /api/training/delete` - Delete training
- `GET /api/training/progress` - Get training progress
- `POST /api/training/save-uploads` - Save uploads
- `POST /api/training/start` - Start training
- `POST /api/training/start-training` - Start training (alternate)
- `GET /api/training/status` - Get training status
- `POST /api/training/sync-version` - Sync version
- `POST /api/training/upload` - Upload images
- `POST /api/training/upload-images` - Upload images (alternate)
- `GET /api/training/upload-token` - Get upload token
- `POST /api/training/upload-zip` - Upload zip

### Studio
- `GET /api/studio/activity` - Get activity
- `GET /api/studio/favorites` - Get favorites
- `POST /api/studio/generate` - Generate image
- `GET /api/studio/generation/[id]` - Get generation
- `GET /api/studio/generations` - List generations
- `GET /api/studio/session` - Get session
- `GET /api/studio/sessions` - List sessions
- `GET /api/studio/stats` - Get stats

### Images & Gallery
- `GET /api/images` - List images
- `POST /api/images/bulk-save` - Bulk save images
- `DELETE /api/images/delete` - Delete image
- `POST /api/images/favorite` - Favorite image
- `GET /api/images/favorites` - Get favorites
- `GET /api/images/feed` - Get feed images
- `GET /api/images/lookup` - Lookup image
- `GET /api/images/status` - Get status
- `GET /api/gallery/images` - Gallery images

### Profile
- `GET /api/profile/best-work` - Get best work
- `GET /api/profile/info` - Get profile info
- `GET /api/profile/personal-brand` - Get personal brand
- `GET /api/profile/personal-brand/status` - Get personal brand status
- `GET /api/profile/recent-work` - Get recent work
- `GET /api/profile/stats` - Get stats
- `POST /api/profile/update` - Update profile

### User
- `GET /api/user` - Get user
- `GET /api/user-by-email` - Get user by email
- `GET /api/user/credits` - Get credits
- `GET /api/user/info` - Get user info
- `GET /api/user/profile` - Get user profile
- `GET /api/user/profile-image` - Get profile image
- `GET /api/user/setup-status` - Get setup status
- `POST /api/user/update-demographics` - Update demographics

### Payments & Checkout
- `POST /api/stripe/create-checkout-session` - Create checkout session
- `POST /api/stripe/create-portal-session` - Create portal session
- `POST /api/stripe/create-test-coupon` - Create test coupon
- `GET /api/stripe/list-products` - List products
- `POST /api/stripe/test-checkout` - Test checkout
- `GET /api/stripe/verify-setup` - Verify setup
- `POST /api/stripe/cleanup-products` - Cleanup products
- `POST /api/checkout-session` - Create checkout session (alternate)
- `POST /api/subscription/upgrade` - Upgrade subscription
- `GET /api/subscription/upgrade-analytics` - Upgrade analytics
- `GET /api/subscription/upgrade-opportunities` - Upgrade opportunities

### Blueprint
- `GET /api/blueprint/check-image` - Check image
- `POST /api/blueprint/email-concepts` - Email concepts
- `POST /api/blueprint/generate-concept-image` - Generate concept image
- `POST /api/blueprint/generate-concepts` - Generate concepts
- `POST /api/blueprint/subscribe` - Subscribe
- `POST /api/blueprint/track-engagement` - Track engagement

### Calendar
- `POST /api/calendar/mark-posted` - Mark as posted
- `GET /api/calendar/posts` - Get posts
- `POST /api/calendar/schedule` - Schedule post
- `POST /api/calendar/unschedule` - Unschedule post
- `POST /api/calendar/update-pillar` - Update pillar

### Prompt Guides
- `POST /api/prompt-guide/set-access-cookie` - Set access cookie
- `POST /api/prompt-guide/subscribe` - Subscribe
- `GET /api/prompt-guides/items` - Get items
- `GET /api/prompt-guides/list` - List guides

### Scene Composer
- `GET /api/scene-composer/check-status` - Check status
- `POST /api/scene-composer/create-scene` - Create scene
- `POST /api/scene-composer/generate` - Generate scene
- `POST /api/scene-composer/upload-product` - Upload product

### Instagram
- `GET /api/instagram/analytics` - Get analytics
- `GET /api/instagram/callback` - OAuth callback
- `POST /api/instagram/connect` - Connect Instagram
- `POST /api/instagram/sync` - Sync Instagram
- `POST /api/instagram/test-graph-api` - Test Graph API

### AI Strategists
- `POST /api/instagram-strategist/generate-captions` - Generate captions
- `POST /api/content-research-strategist/get-research` - Get research
- `POST /api/content-research-strategist/research` - Research content
- `POST /api/personal-brand-strategist/strategy` - Get strategy

### Quota
- `POST /api/quota/decrement` - Decrement quota
- `GET /api/quota/status` - Get quota status

### Feedback
- `POST /api/feedback` - Submit feedback
- `POST /api/feedback/ai-response` - AI response
- `POST /api/feedback/upload-image` - Upload feedback image

### Testimonials
- `GET /api/testimonials/published` - Get published testimonials
- `POST /api/testimonials/submit` - Submit testimonial

### Brand Assets
- `GET /api/brand-assets` - Get brand assets
- `POST /api/brand-assets/upload` - Upload brand asset

### Freebie
- `POST /api/freebie/subscribe` - Subscribe to freebie
- `POST /api/freebie/track-engagement` - Track engagement

### Landing
- `POST /api/landing/checkout` - Landing checkout
- `GET /api/landing-stats` - Landing stats

### Waitlist
- `POST /api/waitlist` - Join waitlist

### Settings
- `GET /api/settings` - Get settings
- `POST /api/settings/update` - Update settings

### Complete Account
- `POST /api/complete-account` - Complete account setup

### Upload
- `POST /api/upload` - Upload file
- `POST /api/upload-image` - Upload image
- `POST /api/upload-highlight-overlay` - Upload highlight overlay

### Check Email Logs
- `GET /api/check-email-logs` - Check email logs

---

## 🔄 Webhooks

- `POST /api/webhooks/stripe` - Stripe webhook handler
- `POST /api/webhooks/stripe/test` - Stripe webhook test
- `POST /api/webhooks/resend` - Resend webhook handler

---

## ⚙️ Cron Jobs (`/api/cron/*`)

- `POST /api/cron/blueprint-email-sequence` - Blueprint email sequence
- `POST /api/cron/nurture-sequence` - Nurture sequence
- `POST /api/cron/reengagement-campaigns` - Reengagement campaigns
- `POST /api/cron/refresh-segments` - Refresh segments
- `POST /api/cron/send-blueprint-followups` - Send blueprint followups
- `POST /api/cron/send-scheduled-campaigns` - Send scheduled campaigns
- `POST /api/cron/sync-audience-segments` - Sync audience segments
- `POST /api/cron/welcome-back-sequence` - Welcome back sequence
- `POST /api/cron/welcome-sequence` - Welcome sequence

---

## 🧪 Testing & Debug

- `GET /api/health` - Health check
- `GET /api/health/e2e` - End-to-end health check
- `GET /api/auth/health` - Auth health check
- `POST /api/auth/logout` - Logout
- `GET /api/diagnostics/test-email` - Test email
- `GET /api/diagnostics/test-webhook` - Test webhook
- `GET /api/diagnostics/webhook-config` - Webhook config
- `GET /api/debug/check-image-prompt` - Check image prompt
- `GET /api/debug/check-subscription-linking` - Check subscription linking
- `GET /api/debug/find-reference-image` - Find reference image
- `GET /api/debug/subscription` - Debug subscription
- `GET /api/debug/subscription-check` - Subscription check
- `GET /api/sentry-status` - Sentry status
- `GET /api/sentry-test` - Sentry test
- `GET /api/sentry-direct-test` - Sentry direct test
- `GET /api/test-sentry-simple` - Test Sentry simple
- `POST /api/test-purchase-email` - Test purchase email
- `POST /api/test/resend` - Test Resend

---

## 🤖 Agent Coordinator

- `GET /api/agent-coordinator/workflow-status` - Workflow status

---

## 🔌 GPT Actions

- `POST /api/gpt-actions` - GPT actions handler
- `POST /api/gpt-actions/[tool]` - Specific tool handler

---

## 📧 Email Tracking

- `POST /api/email/track-click` - Track email click

---

## Route Count Summary

- **Admin Routes:** ~150 routes
- **User-Facing Routes:** ~250 routes
- **Total API Routes:** ~400 routes

---

## Notes

- All admin routes require admin authentication (email check: `ssa@ssasocial.com`)
- User routes require authentication via Supabase
- Dynamic routes use Next.js `[param]` syntax
- Most routes are POST for mutations, GET for queries
- Webhook routes handle external service callbacks
- Cron routes are triggered by Vercel Cron or external schedulers

---

**Generated from:** `/app/api/**/route.ts` files  
**Last Updated:** Auto-generated from codebase structure

# SSELFIE Code Architecture

## Core Folders Overview

### `/app` – Next.js Routes (Frontend + API)
**Purpose:** All user-facing pages and API endpoints

**User-Facing Pages:**
- `/studio` – AI model training interface
- `/maya` – AI stylist chat interface
- `/feed-planner` – Instagram feed planning tool
- `/feed/[feedId]` – Individual feed views
- `/blueprint` – Brand blueprint wizard
- `/bio` – Instagram bio generator
- `/checkout/*` – Payment flows (membership, credits, one-time)
- `/academy` – Educational content (via `/prompt-guides`)
- `/auth/*` – Authentication flows (login, signup, password reset)

**Admin Pages:**
- `/admin/*` – Admin dashboard and tools (34+ pages)

**API Routes (`/app/api`):**
- `/maya/*` – Maya AI chat endpoints (concepts, chats, research, content-pillars)
- `/training/*` – Model training endpoints
- `/feed/*` – Feed planner API (latest, [feedId], strategy)
- `/academy/*` – Academy content endpoints
- `/admin/*` – Admin-only API endpoints (analytics, email, revenue, diagnostics)
- `/webhooks/stripe` – Payment webhook handler
- `/credits/*` – Credit management endpoints
- `/profile/*` – User profile endpoints

**📋 Full API Routes Reference:** See [`docs/api-routes.md`](../docs/api-routes.md) for complete list of all ~400 API endpoints organized by category.

**Server Actions (`/app/actions`):**
- `stripe.ts` – Stripe payment actions
- `landing-checkout.ts` – Landing page checkout
- `upgrade-checkout.ts` – Membership upgrade flow
- `migrate-users.ts` – User migration utilities
- `reset-passwords.ts` – Password reset actions

---

### `/components` – React Components
**Purpose:** Reusable UI components organized by feature

**User-Facing Components:**
- `/sselfie/*` – Core SSELFIE components (106 files: galleries, training, concepts, chat)
- `/feed-planner/*` – Feed planner UI (25 files: grids, posts, strategy, highlights)
- `/academy/*` – Academy course components (6 files)
- `/credits/*` – Credit purchase UI (5 files)
- `/checkout/*` – Checkout flow components
- `/blueprint/*` – Brand blueprint components
- `/ui/*` – Shared shadcn/ui components (16 files)

**Admin Components:**
- `/admin/*` – Admin panel components (46 files)

**Shared:**
- `/testimonials/*` – Testimonial displays
- `/prompt-guides/*` – Prompt guide UI
- `/upgrade/*` – Upgrade prompts

---

### `/lib` – Core Business Logic
**Purpose:** Server-side utilities, integrations, and business rules

**Critical Systems (🔴 DO NOT TOUCH):**
- `stripe.ts` – Stripe client initialization
- `credits.ts` – Credit system logic (costs, transactions, grants)
- `subscription.ts` – Subscription management
- `user-mapping.ts` – Supabase ↔ Neon user mapping
- `db.ts` – Database connection
- `auth-helper.ts` – Authentication utilities

**AI Agents:**
- `/maya/*` – Maya AI stylist (68 files: chat, concepts, research, streaming)
- `/alex/*` – Alex AI assistant (47 files: tools, handlers, suggestions)
- `/instagram-strategist/*` – Feed strategy AI
- `/instagram-bio-strategist/*` – Bio generation AI
- `/content-research-strategist/*` – Content research AI
- `/personal-brand-strategist/*` – Brand strategy AI
- `/agent-coordinator/*` – Agent routing and workflow

**Integrations:**
- `/stripe/*` – Stripe utilities (5 files: checkout, webhooks, subscriptions)
- `/supabase/*` – Supabase client utilities (4 files)
- `replicate-client.ts` – Replicate API client
- `replicate-helpers.ts` – Image generation helpers
- `replicate-polling.ts` – Generation polling logic
- `storage.ts` – Vercel Blob storage
- `redis.ts` – Upstash Redis caching
- `upstash-vector.ts` – Vector search

**Feature Logic:**
- `/feed-planner/*` – Feed planner business logic (10 files)
- `/feed/*` – Feed data utilities
- `/feed-chat/*` – Feed chat logic
- `feed-progress.ts` – Feed completion tracking

**Admin Tools:**
- `/admin/*` – Admin utilities (12 files: analytics, error logging, feature flags)
- `admin-error-log.ts` – Error logging system
- `admin-feature-flags.ts` – Feature flag management
- `revenue/*` – Revenue analytics
- `analytics.ts` – General analytics
- **📋 Feature Flags & Cron Jobs:** See [`docs/feature-flags-and-cron.md`](../docs/feature-flags-and-cron.md) for active flags, cron schedules, and experimental features

**Email & Marketing:**
- `/email/*` – Email templates and sending (34 files: React email templates, Resend/Flodesk)
- `flodesk.ts` – Flodesk integration
- `/resend/*` – Resend email client
- **📋 Marketing Assets:** See [`docs/marketing-assets.md`](../docs/marketing-assets.md) for Instagram pipelines, email automations, landing pages, and course pages

**Utilities:**
- `logger.ts` – Logging utilities
- `api-logger.ts` – API request logging
- `cron-logger.ts` – Cron job logging
- `rate-limit.ts` – Rate limiting
- `rate-limit-api.ts` – API rate limiting
- `cache.ts` – Caching utilities
- `utils.ts` – General utilities
- `/data/*` – Data transformation utilities (7 files)
- `design-tokens.ts` – Design system tokens
- `products.ts` – Product definitions
- `webhook-deduplication.ts` – Webhook deduplication
- `webhook-monitoring.tsx` – Webhook monitoring UI
- **📋 AI Layer Enhancements:** See [`docs/ai-layer-enhancements.md`](../docs/ai-layer-enhancements.md) for optional vector memory, knowledge sync, and repo analysis features

**Security & Auth:**
- `/security/*` – Security utilities
- `simple-impersonation.ts` – Admin impersonation
- `upgrade-detection.ts` – Upgrade flow detection
- `user-sync.ts` – User synchronization

---

### `/scripts` – Maintenance & Automation
**Purpose:** Database scripts, cron jobs, migrations, utilities

**Contents:**
- 141 SQL scripts – Database migrations and queries
- 140 TypeScript scripts – Automation and maintenance
- 13 JavaScript scripts – Legacy utilities

**Common Uses:**
- Database migrations
- User data migrations
- Bulk operations
- Data cleanup
- Analytics generation

---

### `/migrations` – Database Migrations
**Purpose:** SQL migration files for schema changes

**Key Migrations:**
- `create-alex-tables.sql` – Alex AI tables
- `add-feed-planner-schema-fields.sql` – Feed planner schema
- `add-pro-mode-to-feed-posts.sql` – Pro mode features
- `migrate-strategy-to-feed-strategy-table.sql` – Strategy migration

---

### `/actions` – Server Actions
**Purpose:** Next.js server actions for form submissions and mutations

**Files:**
- `stripe.ts` – Stripe payment processing
- `landing-checkout.ts` – Landing page checkout
- `upgrade-checkout.ts` – Membership upgrades
- `migrate-users.ts` – User migration
- `reset-passwords.ts` – Password resets

---

## Interconnections

### User Flow → Core Systems

```
User Page → API Route → Lib Logic → Database
   ↓           ↓           ↓           ↓
/studio → /api/training → lib/maya → Neon DB
/maya → /api/maya/* → lib/maya/* → Neon DB
/feed-planner → /api/feed/* → lib/feed-planner/* → Neon DB
/checkout → /api/webhooks/stripe → lib/stripe.ts → Stripe API
```

### Admin Flow → Monitoring

```
Admin Page → Admin API → Admin Lib → Database/Analytics
   ↓            ↓            ↓              ↓
/admin → /api/admin/* → lib/admin/* → Neon DB + Stripe
```

### Credit System Flow

```
Action → Credits Check → Deduct → Update Balance
   ↓          ↓            ↓            ↓
Generate → lib/credits.ts → Transaction → users.credits
```

### Payment Flow

```
Checkout → Stripe → Webhook → Subscription Update
   ↓         ↓         ↓              ↓
/checkout → Stripe API → /api/webhooks/stripe → lib/subscription.ts
```

---

## User-Facing vs Admin Features

### 👤 User-Facing Features

**Core Product:**
- Studio (model training)
- Maya (AI stylist chat)
- Feed Planner (Instagram planning)
- Gallery (image management)
- Academy (educational content)
- Blueprint (brand wizard)
- Bio Generator

**Monetization:**
- Checkout flows (membership, credits, one-time)
- Credit purchase
- Upgrade prompts

**Support:**
- Authentication (login, signup, password reset)
- Profile management
- Feedback system

---

### 🔧 Admin Features

**Monitoring & Analytics:**
- `/admin/mission-control` – Dashboard overview
- `/admin/agent/analytics` – AI agent performance
- `/admin/conversions` – Conversion tracking
- `/admin/health` – System health checks
- `/admin/diagnostics` – Diagnostic tools
- `/admin/webhook-diagnostics` – Webhook monitoring

**Revenue & Payments:**
- `/admin/revenue` – Revenue analytics
- `/admin/credits` – Credit management
- `/admin/conversions` – Conversion analytics

**Email & Marketing:**
- `/admin/email-analytics` – Email performance
- `/admin/email-broadcast` – Broadcast emails
- `/admin/email-sequences` – Email sequences
- `/admin/email-control` – Email settings
- `/admin/launch-email` – Launch campaigns

**Content Management:**
- `/admin/academy` – Academy content
- `/admin/prompt-guides` – Prompt guide builder
- `/admin/content-templates` – Content templates
- `/admin/testimonials` – Testimonial management

**AI & Agents:**
- `/admin/maya-studio` – Maya testing
- `/admin/maya-testing` – Maya diagnostics
- `/admin/alex` – Alex management
- `/admin/agent` – Agent configuration
- `/admin/knowledge` – Knowledge base

**User Management:**
- `/admin/login-as-user` – User impersonation
- `/admin/beta` – Beta user management
- `/admin/feedback` – User feedback review

**Configuration:**
- `/admin/feature-flags` – Feature toggles
- `/admin/automations` – Automation rules
- `/admin/calendar` – Calendar management

---

## Key Integration Points

### Database
- **Primary:** Neon (PostgreSQL) via `lib/db.ts`
- **Auth:** Supabase Auth via `lib/supabase/*`
- **Storage:** Vercel Blob via `lib/storage.ts`
- **Cache:** Upstash Redis via `lib/redis.ts`
- **📋 Schema Reference:** See [`docs/schema.md`](../docs/schema.md) for complete database schema with all tables and columns

### External Services
- **Payments:** Stripe via `lib/stripe.ts`
- **Image Generation:** Replicate via `lib/replicate-client.ts`
- **AI Chat:** OpenAI via Vercel AI SDK
- **Email:** Resend/Flodesk via `lib/email/*`
- **Search:** Upstash Vector via `lib/upstash-vector.ts`

### Critical Files (🔴 DO NOT TOUCH)
- `app/api/webhooks/stripe/route.ts`
- `lib/credits.ts`
- `lib/stripe.ts`
- `lib/user-mapping.ts`
- `lib/subscription.ts`
- `middleware.ts`
- `lib/db.ts`
- `lib/auth-helper.ts`
- `scripts/**`
- `vercel.json`
- `next.config.mjs`

---

## File Size Limits

- **Components:** Max 300 lines
- **API Routes:** Max 400 lines
- **Lib files:** Max 200 lines
- **If larger:** Auto-split into modules

---

## Quick Reference: Where to Find Things

**User Training:** `app/studio`, `app/api/training/*`, `lib/maya/*`

**AI Chat:** `app/maya`, `app/api/maya/*`, `lib/maya/*`

**Feed Planning:** `app/feed-planner`, `app/api/feed/*`, `lib/feed-planner/*`

**Payments:** `app/checkout/*`, `app/api/webhooks/stripe`, `lib/stripe.ts`, `lib/credits.ts`

**Admin Tools:** `app/admin/*`, `app/api/admin/*`, `lib/admin/*`

**Email System:** `lib/email/*`, `app/admin/email-*`

**Database:** `lib/db.ts`, `migrations/*`, `scripts/*.sql`

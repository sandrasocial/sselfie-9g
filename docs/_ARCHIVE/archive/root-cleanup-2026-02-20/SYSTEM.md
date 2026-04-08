# SSELFIE Studio - System Overview

**Last Updated:** January 2025  
**Purpose:** Complete system architecture documentation for AI-safe development

---

## Tech Stack

| Layer | Technology | Version/Purpose |
|-------|-----------|-----------------|
| **Framework** | Next.js | 16.0.7 (App Router) |
| **UI Library** | React | 19.2.0 |
| **Language** | TypeScript | 5.x (strict mode) |
| **Styling** | Tailwind CSS | 4.1.9 |
| **Components** | shadcn/ui | Radix UI primitives |
| **Database** | Neon PostgreSQL | Serverless Postgres |
| **Auth** | Supabase | Authentication only |
| **Payments** | Stripe | Subscriptions + one-time |
| **AI Chat** | Vercel AI SDK | Claude Sonnet 4 |
| **Image Gen** | Replicate | FLUX.1 Dev models |
| **Storage** | Vercel Blob | Image/file storage |
| **Cache** | Upstash Redis | Rate limiting + cache |
| **Monitoring** | Sentry | Error tracking |
| **Deployment** | Vercel | Hosting + cron jobs |

---

## Main Subsystems/Domains

### 1. Authentication & User Management
- **Supabase Auth** (sessions, login, signup)
- **Neon user mapping** (`lib/user-mapping.ts`)
- **User sync** (`lib/user-sync.ts`)
- **Impersonation** (`lib/simple-impersonation.ts`)

### 2. Payments & Subscriptions
- **Stripe integration** (`lib/stripe.ts`)
- **Subscription management** (`lib/subscription.ts`)
- **Webhook handler** (`app/api/webhooks/stripe/route.ts` - 1,702 lines)
- **Credit system** (`lib/credits.ts`)

### 3. AI Systems
- **Maya AI Chat** (`lib/maya/`, `app/api/maya/`)
- **Image generation** (Replicate integration)
- **Feed Planner AI** (`lib/feed-planner/`)
- **Alex Admin Agent** (`lib/alex/`)

### 4. Image Generation & Training
- **Model training** (`app/api/training/`)
- **Image generation** (`app/api/images/`)
- **Gallery management**
- **Studio interface**

### 5. Feed Planner
- **Instagram feed planning**
- **Post scheduling**
- **Strategy generation**
- **Visual composition**

### 6. Email & Marketing
- **Resend integration** (`lib/resend/`)
- **Flodesk sync** (`lib/flodesk.ts`)
- **Email campaigns** (`app/api/cron/`)
- **Audience segmentation**

### 7. Admin Tools
- **Admin dashboard** (`app/admin/`)
- **Analytics** (`lib/analytics.ts`)
- **User management**
- **Content management**

---

## Entry Points

| Entry Point | Location | Purpose |
|------------|----------|---------|
| **Frontend Root** | `app/page.tsx` | Landing page |
| **Studio** | `app/studio/page.tsx` | Main user interface |
| **Maya Chat** | `app/maya/page.tsx` | AI stylist chat |
| **Gallery** | `app/gallery/` | Image gallery |
| **Feed Planner** | `app/feed-planner/` | Instagram planning |
| **API Routes** | `app/api/*/route.ts` | 383 API endpoints |
| **Middleware** | `middleware.ts` | Auth + CSP headers |
| **Cron Jobs** | `vercel.json` | 8 scheduled tasks |

---

## Global Configuration & Shared State

### Critical Singletons
- **Database connection**: `lib/db.ts` (Neon singleton)
- **Stripe client**: `lib/stripe.ts` (singleton pattern)
- **Auth cache**: `lib/auth-helper.ts` (30s TTL Map cache)
- **Credit cache**: `lib/credits-cached.ts` (Redis-backed)

### Environment Variables (30+ Required)
- **Database**: `DATABASE_URL`, `POSTGRES_URL`
- **Auth**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Payments**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **AI**: `AI_GATEWAY_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
- **Storage**: `BLOB_READ_WRITE_TOKEN`
- **Cache**: `UPSTASH_KV_REST_API_URL`, `UPSTASH_KV_REST_API_TOKEN`

---

## High-Risk Areas (Cascading Bug Potential)

| Area | Risk Level | Why |
|------|-----------|-----|
| **Stripe Webhook Handler** | 🔴 CRITICAL | 1,702 lines, handles all payments, credits, subscriptions |
| **User Mapping** | 🔴 CRITICAL | Links Supabase auth → Neon users, used everywhere |
| **Credit System** | 🔴 CRITICAL | Financial transactions, balance calculations |
| **Database Schema** | 🔴 CRITICAL | Many tables with foreign keys, cascading deletes |
| **Auth Middleware** | 🟠 HIGH | Every request goes through it, CSP headers |
| **Maya AI System** | 🟠 HIGH | Complex prompt generation, 66 files in `lib/maya/` |
| **Image Generation** | 🟠 HIGH | Replicate integration, credit deduction, storage |
| **Feed Planner** | 🟡 MEDIUM | Complex state, multiple API endpoints |

---

## AI-Safe Boundaries

### DO NOT TOUCH (Requires Explicit Approval)

| File/Folder | Reason |
|------------|--------|
| `app/api/webhooks/stripe/route.ts` | Payment processing, 1,702 lines, handles all Stripe events |
| `lib/credits.ts` | Financial calculations, credit balance logic |
| `lib/stripe.ts` | Payment client singleton |
| `lib/user-mapping.ts` | Core user identity mapping, used everywhere |
| `lib/subscription.ts` | Subscription status checks |
| `middleware.ts` | Auth + security headers, affects all requests |
| `lib/db.ts` | Database connection singleton |
| `lib/auth-helper.ts` | Authentication caching, rate limit handling |
| `scripts/` (SQL files) | Database migrations, production data |
| `vercel.json` | Cron job configuration |
| `next.config.mjs` | Build configuration, Sentry setup |

### Safe for Isolated Changes

| Area | Notes |
|------|-------|
| `components/ui/` | UI components (shadcn/ui) |
| `components/sselfie/` | Feature components (isolated) |
| `app/(public)/` | Public pages |
| `lib/email/` | Email templates (isolated) |
| `docs/` | Documentation only |
| `public/` | Static assets |

### Requires Careful Scoping

| Area | Scoping Requirements |
|------|---------------------|
| `app/api/maya/` | Changes affect AI chat, test thoroughly |
| `lib/maya/` | Complex AI system, test prompt generation |
| `app/api/feed/` | Feed planner state, test with real data |
| `lib/feed-planner/` | Multi-step workflows, test end-to-end |
| `app/api/training/` | Model training, affects user models |
| `app/api/images/` | Image generation, credit deduction |
| `components/checkout/` | Payment flow, test with Stripe test mode |
| `lib/supabase/` | Auth changes affect all authenticated routes |

---

## Tooling Status

| Tool | Status | Location | Notes |
|------|--------|----------|-------|
| **TypeScript** | ✅ Configured | `tsconfig.json` | Strict mode enabled |
| **Linting** | ✅ Configured | `.eslintrc.json` | Next.js + TypeScript rules |
| **Type Checking** | ✅ Enabled | `tsconfig.json` | `strict: true`, but `ignoreBuildErrors: true` in next.config |
| **Tests** | ✅ Configured | `vitest.config.ts` | Vitest with React Testing Library |
| **Error Tracking** | ✅ Configured | Sentry configs | `sentry.*.config.ts` files present |
| **Logging** | ✅ Available | `lib/logger.ts` | Structured logger (migration from console.log recommended) |
| **Prettier** | ✅ Configured | `.prettierrc` | Code formatting configured |

**See `docs/TOOLING.md` for usage instructions.**

---

## Project Statistics

- **Total Files**: ~1,000+ TypeScript/TSX files
- **API Routes**: 383 files in `app/api/`
- **Database Migrations**: 135+ SQL files in `scripts/`
- **Documentation**: 472 markdown files
- **Main Directories**: `app/`, `components/`, `lib/`, `scripts/`, `docs/`

---

## Development Workflow

**Every Cursor task should start with:**

> "Based on SYSTEM.md, we will only touch [specific files/areas]..."

This ensures:
- ✅ Changes are scoped to safe areas
- ✅ Critical systems are protected
- ✅ Impact is understood before modification
- ✅ AI assistants respect system boundaries

---

## Notes

- **Database Architecture**: Dual-database system (Neon for app data, Supabase for auth only)
- **Credit System**: Financial transactions require careful handling
- **Auth Flow**: Supabase → Neon user mapping is critical path
- **Payment Flow**: Stripe webhooks handle all subscription events
- **AI Systems**: Maya uses Claude Sonnet 4, complex prompt generation
- **Image Generation**: Replicate FLUX.1 Dev, credit deduction on generation

---

**⚠️ Remember: This is a production system with 100+ real users. All changes must be tested thoroughly before deployment.**


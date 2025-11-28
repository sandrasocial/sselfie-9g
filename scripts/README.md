# Scripts Directory

This directory contains essential database schema and utility scripts for the SSelfie application.

## Active Scripts

### Database Schema (Core)
- `00-create-all-tables.sql` - Master schema file with all tables
- `01-create-users-tables.sql` - User authentication and profiles
- `02-create-maya-tables.sql` - Maya AI chat and generated content
- `03-create-training-tables.sql` - Model training data
- `04-create-photo-tables.sql` - Photo generation and storage
- `05-create-brand-tables.sql` - Personal brand and strategy
- `06-seed-test-data.sql` - Test data for development
- `07-add-rls-policies.sql` - Row-level security policies
- `22-create-credit-system.sql` - Credit and subscription system
- `22-create-sessions-tables.ts` - Session management
- `30-create-personal-knowledge-system.sql` - Personal AI agent system (personal story, writing samples, learning feedback)
- `31-seed-sandra-personal-story.sql` - Sandra's personal story and voice examples
- `32-create-instagram-connections.sql` - Instagram API integration infrastructure

### Agent System Tables (Run After Core Schema)

**Purpose:** Backend automation for marketing, sales, and content workflows

**Run in this order:**
1. `create-marketing-email-queue.sql` - Email queue + marketing_email_log tables
2. `add-email-tracking-fields.sql` - Adds analytics tracking (open/click rates)
3. `create-lead-magnet-activity.sql` - Lead magnet conversion tracking
4. `create-subscription-events.sql` - Subscription lifecycle events
5. `create-sales-insights-cache.sql` - Sales analytics cache
6. `create-content-drafts.sql` - AI-generated content storage
7. `create-user-journey-messages.sql` - Personalized user journey messages
8. `create-instagram-post-queue.sql` - Instagram auto-posting queue
9. `create-feed-performance-insights.sql` - Feed performance analytics

**Note:** All agent system scripts are Neon-compatible (no RLS/auth.uid())

### Utilities
- `create-stripe-beta-coupon.ts` - Create beta program discount codes
- `sync-stripe-products.ts` - Sync products with Stripe
- `27-fix-missing-lora-url.ts` - Fix missing LoRA URLs for users

## Running Scripts

### SQL Scripts
Execute directly in your database:
\`\`\`bash
psql $DATABASE_URL -f scripts/00-create-all-tables.sql
\`\`\`

### TypeScript Scripts
Run with tsx:
\`\`\`bash
npx tsx scripts/sync-stripe-products.ts
\`\`\`

## Instagram API Integration Setup

**Script:** `32-create-instagram-connections.sql`
**Status:** ⚠️ Not yet run

### Prerequisites:
1. Add `INSTAGRAM_APP_SECRET` environment variable (from Meta Developer Console)
2. Your Meta App ID: `1210263417166165` (Selfie AI)
3. Redirect URI already configured: `{SITE_URL}/api/instagram/callback`

### Features:
- OAuth 2.0 authentication flow for Instagram Business accounts
- Long-lived access tokens (60-day expiration)
- Daily insights sync (impressions, reach, engagement, followers)
- Post-level performance tracking
- Platform-wide aggregated metrics for admin dashboard

### Tables Created:
- `instagram_connections` - User Instagram account connections
- `instagram_insights` - Historical daily metrics
- `instagram_posts` - Individual post performance
- `instagram_platform_metrics` - Aggregated platform stats

### Usage:
1. Run the SQL script: `psql $DATABASE_URL -f scripts/32-create-instagram-connections.sql`
2. Add `INSTAGRAM_APP_SECRET` to Vercel environment variables
3. Access Instagram integration via Admin Agent panel > Instagram button
4. Schedule daily sync: `POST /api/instagram/sync` (via cron job)

## Cleanup History

**Date:** 2025-01-16
**Files Removed:** 50+ obsolete scripts

### Removed Categories:
- Completed migrations (migrate-*.ts, repair-*, import-*)
- User-specific one-time fixes (fix-*, check-*, link-*)
- Test data cleanup (cleanup-test-*, delete-test-*)
- Diagnostic scripts (analyze-*, diagnose-*, audit-*)
- Duplicate schema files (old numbered versions)
- Manual credit scripts (replaced by admin UI at /admin/credits)

## Notes

- All migrations have been executed and the database schema is current
- Use the admin dashboard at `/admin/credits` to manage user credits
- **New:** Run scripts 30-31 to enable personal AI agent system that understands Sandra's story and voice
- **New:** Run script 32 to enable Instagram analytics integration with OAuth flow
- Keep only essential scripts - delete one-time fixes after execution
- Document the purpose and status of new scripts at the top of each file

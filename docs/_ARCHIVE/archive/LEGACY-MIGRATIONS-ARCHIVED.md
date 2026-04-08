# Legacy Migration Files - ARCHIVED

**Date Archived:** November 25, 2025

**Reason:** These files were designed to migrate data TO Supabase's database, which conflicts with our production architecture where Supabase is only used for authentication and all data resides in Neon PostgreSQL.

## Architecture Clarification

**Current Production Architecture:**
- **Neon PostgreSQL**: Primary database for ALL application data (users, credits, subscriptions, images, chats, etc.)
- **Supabase**: ONLY for authentication (auth.users table)
- **No data should be migrated to Supabase's database tables**

## Files Removed

### Admin Pages
- `app/migrate/page.tsx` - Migration dashboard page
- `app/migrate-users/page.tsx` - User migration page

### Components
- `components/migration-dashboard.tsx` - UI for running migrations to Supabase
- `components/migrate-users-button.tsx` - Button to trigger user migrations

### Server Actions
- `app/actions/migrate.ts` - Contains functions that query/insert into Supabase database:
  - `migrateUsers()` - Attempted to copy users to Supabase
  - `migrateTraining()` - Attempted to copy training data to Supabase
  - `migrateImages()` - Attempted to copy images to Supabase
  - `migrateChats()` - Attempted to copy chats to Supabase
  - `migrateSubscriptions()` - Attempted to copy subscriptions to Supabase
  - `checkProductionData()` - Checked Supabase database counts
  - `verifyMigration()` - Verified Supabase database migration

### Migration Scripts (Legacy)
- `scripts/14-migrate-with-supabase-client.ts`
- `scripts/15-migrate-users.ts`
- `scripts/16-migrate-training.ts`
- `scripts/17-migrate-images.ts`
- `scripts/18-migrate-chats.ts`
- `scripts/19-migrate-subscriptions.ts`

## What These Files Did (Incorrectly)

These files used `supabase.from('table_name')` to query and insert into Supabase's PostgreSQL database. This was part of an earlier architecture consideration that was later abandoned in favor of:

1. Using Neon as the primary database
2. Using Supabase only for authentication
3. Keeping all application data in Neon

## Current Data Architecture is Correct

All production API routes correctly use Neon PostgreSQL via:
\`\`\`typescript
import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL!)
\`\`\`

Supabase is correctly limited to authentication:
\`\`\`typescript
import { createServerClient } from '@supabase/ssr'
const supabase = createServerClient(...)
const { data: { user } } = await supabase.auth.getUser()
\`\`\`

## What to Do Instead

If you need to migrate data:
1. Use SQL scripts that run directly on Neon
2. Use the `@neondatabase/serverless` package
3. Never use `supabase.from()` for data operations
4. Reference existing API routes for the correct database patterns

## Kept Files (Still Useful)

These migration-related files were kept because they follow the correct architecture:

- `app/actions/migrate-users.ts` - Migrates users to Supabase Auth (not database) - CORRECT usage
- `app/actions/reset-passwords.ts` - Resets Supabase Auth passwords - CORRECT usage
- `components/reset-passwords-button.tsx` - UI for password resets - CORRECT usage
- `scripts/22-migrate-users-to-supabase-auth.ts` - Auth migration only - CORRECT usage
- `scripts/migrate-to-new-pricing.ts` - Uses Neon database - CORRECT usage

## Routes Removed

The following routes are no longer accessible:
- `/migrate` - Migration dashboard
- `/migrate-users` - User auth migration page

The user auth migration page has been removed because:
1. All users should already have Supabase Auth accounts linked
2. The reset passwords functionality is available via admin tools if needed
3. New users are automatically created in Supabase Auth during signup

## Production Readiness Status

After removing these files:
- ✅ All API routes correctly use Neon
- ✅ Supabase correctly limited to authentication
- ✅ No conflicting database access patterns
- ✅ Production architecture is clean and consistent

## Recovery

If you need to recover these files, check git history at commit before this change or contact the development team.

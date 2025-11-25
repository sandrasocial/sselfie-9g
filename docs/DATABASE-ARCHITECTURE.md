# Database Architecture Documentation

## Overview

sselfie uses a dual-database architecture with clear separation of concerns:

1. **Neon PostgreSQL** - Primary application database
2. **Supabase** - Authentication service only

## Architecture Principles

### Neon PostgreSQL (Primary Database)

**What it handles:**
- All user data (users, profiles, credits, subscriptions)
- AI-generated content (images, models, training runs)
- Application features (chats, feed, calendar, content pillars)
- Academy content (courses, lessons, progress)
- Admin data (feedback, testimonials, analytics)
- Payment transactions and credit history

**Connection:**
\`\`\`typescript
import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL!)
\`\`\`

**Environment Variables:**
- `DATABASE_URL` - Primary connection string
- `POSTGRES_URL` - Alternative connection string
- `POSTGRES_PRISMA_URL` - For ORM (if used)
- `POSTGRES_URL_NO_SSL` - For local development
- `POSTGRES_URL_NON_POOLING` - Direct connection for migrations

### Supabase (Authentication Only)

**What it handles:**
- User authentication (login, signup, sessions)
- Password management
- Email verification
- Session tokens and refresh tokens
- Auth-related redirects

**What it does NOT handle:**
- User profile data
- Application data
- File storage
- Database queries for business logic

**Connection:**
\`\`\`typescript
import { createServerClient } from '@supabase/ssr'
import { createBrowserClient } from '@supabase/ssr'

// Server-side
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { cookies }
)

// Client-side
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
\`\`\`

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Admin operations key

## User Flow

### 1. Authentication (Supabase)

\`\`\`typescript
// Sign up - creates auth user in Supabase
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin
  }
})

// The auth UID from Supabase
const supabaseUserId = data.user?.id
\`\`\`

### 2. User Creation (Neon)

\`\`\`typescript
// Create user record in Neon with Supabase auth reference
const result = await sql`
  INSERT INTO users (email, supabase_user_id, stack_user_id, created_at)
  VALUES (${email}, ${supabaseUserId}, ${legacyStackId}, NOW())
  RETURNING id
`
\`\`\`

### 3. User Mapping

The `lib/user-mapping.ts` file handles the connection between:
- Supabase Auth UID (from `supabase.auth.getUser()`)
- Neon user ID (primary key in users table)
- Legacy Stack Auth ID (for backward compatibility)

\`\`\`typescript
import { getUserIdFromSupabase } from '@/lib/user-mapping'

// In API routes
const { user } = await supabase.auth.getUser()
const userId = await getUserIdFromSupabase(user.id)

// Now query Neon with the mapped user ID
const credits = await sql`
  SELECT * FROM user_credits WHERE user_id = ${userId}
`
\`\`\`

## Database Query Patterns

### Correct Pattern (Use This)

\`\`\`typescript
import { neon } from '@neondatabase/serverless'
import { createServerClient } from '@supabase/ssr'
import { getUserIdFromSupabase } from '@/lib/user-mapping'

export async function GET(request: Request) {
  const sql = neon(process.env.DATABASE_URL!)
  const supabase = createServerClient(...)
  
  // 1. Authenticate with Supabase
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // 2. Map to Neon user ID
  const userId = await getUserIdFromSupabase(user.id)
  
  // 3. Query Neon for data
  const data = await sql`
    SELECT * FROM some_table WHERE user_id = ${userId}
  `
  
  return Response.json(data)
}
\`\`\`

### Incorrect Pattern (Never Use)

\`\`\`typescript
// ❌ WRONG - Never query Supabase database for application data
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)

// ❌ WRONG - Never insert into Supabase database tables
await supabase
  .from('user_credits')
  .insert({ user_id: userId, amount: 100 })
\`\`\`

## File Organization

### Database-related Files

**Correct Usage (Neon):**
- `lib/db.ts` - Neon connection helper
- `lib/db-with-rls.ts` - Neon with RLS context
- `lib/user-mapping.ts` - User ID mapping
- `lib/data/*.ts` - All data access layers use Neon

**Correct Usage (Supabase Auth):**
- `lib/supabase/client.ts` - Client-side auth
- `lib/supabase/server.ts` - Server-side auth
- `lib/supabase/middleware.ts` - Auth middleware
- `middleware.ts` - Session refresh

**SQL Scripts (Neon):**
- `scripts/*.sql` - All database migrations run on Neon
- `scripts/08-comprehensive-rls-policies-v3-neon.sql` - RLS for Neon
- `scripts/09-add-database-indexes.sql` - Performance indexes

## Exception: Brand Blueprint Freebie

The brand blueprint freebie (`/api/freebie/*`) uses Neon, not Supabase database:

\`\`\`typescript
// Correct implementation in app/api/freebie/subscribe/route.ts
const sql = neon(process.env.DATABASE_URL!)
await sql`INSERT INTO freebie_subscribers ...`
\`\`\`

This is correct because:
- No authentication required for freebie signup
- Data stored in Neon for consistency
- Same database as all other application data

## Common Pitfalls

### 1. Using supabase.from() for Data

**Problem:** Accidentally querying Supabase database instead of Neon
**Solution:** Always use `neon()` for data queries

### 2. Storing Data in Wrong Database

**Problem:** Creating tables in Supabase when they should be in Neon
**Solution:** All SQL migrations run on Neon only

### 3. Auth vs Data Confusion

**Problem:** Mixing authentication logic with data queries
**Solution:** 
- Auth operations: Use `supabase.auth.*`
- Data operations: Use `sql` from Neon

### 4. Not Mapping User IDs

**Problem:** Using Supabase user.id directly in Neon queries
**Solution:** Always use `getUserIdFromSupabase()` to map IDs

## Environment Variables Checklist

### Required for Production

**Neon (Database):**
- [ ] `DATABASE_URL`
- [ ] `POSTGRES_URL`
- [ ] `POSTGRES_PRISMA_URL` (if using Prisma)
- [ ] `POSTGRES_URL_NON_POOLING` (for migrations)

**Supabase (Auth Only):**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

**Other Services:**
- [ ] All AI gateway keys
- [ ] Stripe keys
- [ ] Blob storage token
- [ ] Email service keys

## Testing Your Implementation

### Quick Architecture Check

Run this checklist before deployment:

\`\`\`bash
# 1. Check for incorrect Supabase database usage
grep -r "supabase\.from\(" app/api/
# Should only find references in migration/legacy files

# 2. Check for correct Neon usage
grep -r "neon(process.env.DATABASE_URL" app/api/
# Should find ALL api routes except auth

# 3. Verify user mapping usage
grep -r "getUserIdFromSupabase" app/api/
# Should find usage in authenticated routes
\`\`\`

### Manual Testing

1. **Authentication Flow:**
   - Sign up creates Supabase auth user ✓
   - User record created in Neon with supabase_user_id ✓
   - User can log in and access authenticated routes ✓

2. **Data Operations:**
   - All CRUD operations query Neon ✓
   - No data written to Supabase database ✓
   - User ID mapping works correctly ✓

3. **Edge Cases:**
   - Legacy Stack Auth users can still log in ✓
   - New Supabase users work correctly ✓
   - Freebie signup works without auth ✓

## Migration History

### Phase 1: Stack Auth (Legacy)
- Original authentication provider
- Still supported for backward compatibility
- `stack_user_id` column in users table

### Phase 2: Supabase Migration
- Moved authentication to Supabase
- Added `supabase_user_id` column
- Kept Neon as primary database
- Created user mapping system

### Phase 3: Cleanup (Current)
- Removed incorrect Supabase database migrations
- Clarified architecture documentation
- Enforced Neon-only data storage

## Future Considerations

### Scaling

If you need to scale beyond current setup:
- Keep architecture the same (Neon + Supabase Auth)
- Use Neon's connection pooling
- Consider read replicas for Neon
- Optimize with proper indexes (already added)

### Adding Features

When adding new features:
1. Always use Neon for data storage
2. Use Supabase only for auth checks
3. Follow existing API route patterns
4. Add RLS policies for new tables

### Alternative Approaches (Not Recommended)

You could simplify by:
- Using Supabase for both auth AND database (requires full migration)
- Using Neon for both auth AND database (requires custom auth)

**But the current approach is best because:**
- Supabase auth is battle-tested and feature-rich
- Neon provides excellent PostgreSQL performance
- Clear separation of concerns
- Flexibility to switch either service independently

## Support

If you have questions about the architecture:
1. Check this document first
2. Review example API routes in `app/api/maya/`
3. Check the user mapping implementation in `lib/user-mapping.ts`
4. Reference the RLS guide in `docs/RLS-IMPLEMENTATION-GUIDE.md`

# RLS Implementation Guide for Neon Database

## Overview

This guide explains how to implement Row Level Security (RLS) with Neon PostgreSQL when using Supabase for authentication.

## Architecture

- **Authentication**: Supabase (JWT tokens, session management)
- **Data Storage**: Neon PostgreSQL
- **Security Model**: Application-level RLS with session variables

## How It Works

### 1. Helper Functions (SQL)

Two PostgreSQL functions provide the RLS security context:

\`\`\`sql
app_current_user_id() -- Returns the current user's ID from session
app_is_admin()         -- Returns whether current user is admin
\`\`\`

### 2. Session Variables

Before executing queries, your application sets session-local variables:

\`\`\`sql
SET LOCAL app.current_user_id = '123';
SET LOCAL app.is_admin = 'false';
\`\`\`

### 3. RLS Policies

Policies use these functions to restrict access:

\`\`\`sql
CREATE POLICY "Users can view own data" ON table_name
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());
\`\`\`

## Implementation Status

### ⚠️ Current Limitation

The Neon serverless driver (`@neondatabase/serverless`) **does not support `SET LOCAL` variables** in the same way as standard PostgreSQL connections. This means the RLS policies are defined but **not automatically enforced** through session variables.

### Two Approaches to Fix This

#### Option 1: Application-Level Authorization (RECOMMENDED FOR NOW)

Keep your current approach where authentication is handled in API routes:

\`\`\`typescript
// Continue using your existing pattern
const { user, error } = await getAuthenticatedUser()
if (!user) return unauthorized()

// Queries already filtered by user_id
const sql = neon(process.env.DATABASE_URL!)
const chats = await sql`
  SELECT * FROM maya_chats 
  WHERE user_id = ${dbUserId}
`
\`\`\`

**Pros:**
- Works immediately without changes
- No dependency on Neon session support
- Clear and explicit authorization

**Cons:**
- RLS acts only as a backup layer
- Must remember to filter by user_id in every query

#### Option 2: Connection Pooler with RLS (PRODUCTION RECOMMENDED)

Use Neon's connection pooler URL instead of the serverless driver:

\`\`\`typescript
import { Pool } from '@neondatabase/serverless'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_POOLER // Different URL!
})

export async function executeWithRLS<T>(
  userId: number,
  queryFn: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    // Set session variables (works with pooler!)
    await client.query('SET LOCAL app.current_user_id = $1', [userId])
    await client.query('SET LOCAL app.is_admin = $1', ['false'])
    
    // Execute queries - RLS is enforced!
    const result = await queryFn(client)
    return result
  } finally {
    client.release()
  }
}
\`\`\`

**Pros:**
- True RLS enforcement at database level
- Defense in depth - even if you forget to filter, RLS catches it
- Industry best practice

**Cons:**
- Requires connection pooler setup
- Slightly more complex code

## Current Deployment Strategy

### Phase 1: Deploy RLS Policies (DO THIS NOW)

Run the RLS script to enable policies:

\`\`\`bash
# Execute against your Neon database
psql $DATABASE_URL -f scripts/08-comprehensive-rls-policies-v3-neon.sql
\`\`\`

This provides a **security backstop** even though session variables aren't fully working yet.

### Phase 2: Choose Your Approach

**For Immediate Deployment (Safest):**
- ✅ Use Option 1 (Application-Level Authorization)
- ✅ RLS policies act as backup protection
- ✅ Audit all API routes to ensure they filter by `user_id`
- ✅ Deploy to production

**For Maximum Security (Recommended Long-Term):**
- Setup Neon connection pooler
- Implement Option 2 (Connection Pooler with RLS)
- Migrate queries to use `executeWithRLS()` helper
- Deploy after thorough testing

## Security Checklist

Before deploying to production:

- [ ] RLS enabled on all user data tables
- [ ] All API routes check authentication
- [ ] All queries filter by user_id or use executeWithRLS()
- [ ] Admin routes check for admin role
- [ ] Service role operations use executeAsAdmin()
- [ ] Database indexes created for performance
- [ ] RLS policies tested with multiple users

## Testing RLS

### Test User Isolation

\`\`\`sql
-- As User 1
SET LOCAL app.current_user_id = '1';
SELECT * FROM maya_chats; -- Should only see user 1's chats

-- As User 2
SET LOCAL app.current_user_id = '2';
SELECT * FROM maya_chats; -- Should only see user 2's chats

-- As Admin
SET LOCAL app.is_admin = 'true';
SELECT * FROM maya_chats; -- Should see all chats
\`\`\`

### Test in Application

\`\`\`typescript
// Test user can't access other user's data
const user1Chats = await executeWithRLS(1, async (sql) => {
  return await sql`SELECT * FROM maya_chats WHERE user_id = 2` // Should return empty!
})
\`\`\`

## Additional Resources

- [Neon RLS Documentation](https://neon.tech/docs/guides/row-level-security)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase + External Database Auth](https://supabase.com/docs/guides/database/connecting-to-postgres)

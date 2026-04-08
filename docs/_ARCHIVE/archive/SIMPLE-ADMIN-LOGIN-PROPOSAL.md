# Simple Admin Login-as-User Proposal

## Current Problem
- 143+ API routes need updating for impersonation
- Cookie-based impersonation is complex and error-prone
- Banner not showing, data not loading correctly
- Too many moving parts

## Proposed Simple Solution

### Create `/admin/login-as-user` page

1. **Admin enters:**
   - User email
   - Secret admin password (stored in env var: `ADMIN_SECRET_PASSWORD`)

2. **Backend:**
   - Verify admin password
   - Look up user by email
   - Create temporary Supabase session for that user
   - Redirect to `/studio` as that user

3. **Benefits:**
   - No cookie complexity
   - No need to update 143 routes
   - Works with existing authentication
   - Clear and simple
   - Easy to debug

### Implementation:

```typescript
// app/admin/login-as-user/route.ts
export async function POST(request: Request) {
  const { email, adminPassword } = await request.json()
  
  // Verify admin password
  if (adminPassword !== process.env.ADMIN_SECRET_PASSWORD) {
    return NextResponse.json({ error: "Invalid admin password" }, { status: 401 })
  }
  
  // Verify current user is admin
  const { user } = await getAuthenticatedUser()
  const adminUser = await getUserByAuthId(user.id)
  if (adminUser.email !== "ssa@ssasocial.com") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 })
  }
  
  // Find target user
  const targetUser = await getNeonUserByEmail(email)
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }
  
  // Create Supabase session for target user
  // (This requires Supabase admin API to create session)
  // Then redirect to /studio
}
```

## Recommendation

**YES - Let's simplify!** The cookie-based impersonation is too complex. The simple login-as-user approach will be:
- Faster to implement
- Easier to maintain
- More reliable
- Clearer for debugging

Should I implement this simpler approach?

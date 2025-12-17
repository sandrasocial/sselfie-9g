# Simple Admin User Impersonation

## What You Need

**Super Simple:** Search for a user → Click "View as User" → See the full app exactly as they see it.

---

## Implementation

### 1. Add to Admin Dashboard

**Simple User Search Box:**
```tsx
// In components/admin/admin-dashboard.tsx
// Add a search box at the top:

<input 
  placeholder="Search user by email..."
  onChange={(e) => searchUsers(e.target.value)}
/>

// Show results:
{searchResults.map(user => (
  <div key={user.id}>
    {user.email}
    <button onClick={() => impersonateUser(user.id)}>
      👁️ View as User
    </button>
  </div>
))}
```

### 2. Impersonation API

**Create:** `/api/admin/impersonate/route.ts`
```typescript
export async function POST(request: Request) {
  // Verify admin
  const admin = await verifyAdmin(request)
  
  const { userId } = await request.json()
  
  // Set cookie: "impersonating_user_id"
  cookies().set('impersonating_user_id', userId, {
    httpOnly: true,
    secure: true,
    maxAge: 3600 // 1 hour
  })
  
  return Response.json({ success: true })
}
```

### 3. Update Auth Helper

**Update:** `lib/auth-helper.ts`
```typescript
export async function getAuthenticatedUser() {
  // Check if admin is impersonating
  const impersonatingUserId = cookies().get('impersonating_user_id')?.value
  
  if (impersonatingUserId) {
    // Verify admin is actually admin
    const adminUser = await supabase.auth.getUser()
    const adminNeonUser = await getUserByAuthId(adminUser.data.user.id)
    
    if (adminNeonUser.email === ADMIN_EMAIL) {
      // Return impersonated user
      return await getUserByAuthId(impersonatingUserId)
    }
  }
  
  // Normal flow
  return await supabase.auth.getUser()
}
```

### 4. Show Banner When Impersonating

**In layout or main app component:**
```tsx
// Check if impersonating
const impersonatingUserId = cookies().get('impersonating_user_id')?.value

{impersonatingUserId && (
  <Banner className="bg-yellow-500 text-black">
    🎭 Viewing as {userEmail} | 
    <button onClick={exitImpersonation}>Exit</button>
  </Banner>
)}
```

### 5. Exit Impersonation

**API:** `/api/admin/impersonate/exit/route.ts`
```typescript
export async function POST() {
  cookies().delete('impersonating_user_id')
  return Response.json({ success: true })
}
```

---

## That's It!

**Flow:**
1. Admin goes to `/admin`
2. Types user email in search box
3. Clicks "View as User"
4. Redirects to `/app` (or wherever main app is)
5. Sees everything as that user
6. Yellow banner shows "Viewing as user@email.com | Exit"
7. Click Exit → Back to admin view

**No complex user detail pages needed** - just search, click, view as them, exit.

---

## Files to Create/Update

1. **Create:** `app/api/admin/impersonate/route.ts` - Start impersonation
2. **Create:** `app/api/admin/impersonate/exit/route.ts` - Stop impersonation
3. **Update:** `lib/auth-helper.ts` - Check impersonation cookie
4. **Update:** `components/admin/admin-dashboard.tsx` - Add search + "View as User" button
5. **Update:** Main app layout - Show banner when impersonating

**That's 5 files total. Super simple.**

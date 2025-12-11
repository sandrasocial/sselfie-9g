# Admin User Access & Impersonation - Recommendations

## Current State

You already have:
- ✅ Admin dashboard at `/admin`
- ✅ Admin authentication (checks for `ADMIN_EMAIL = "ssa@ssasocial.com"`)
- ✅ User search API endpoint (`/api/admin/users/search`)
- ✅ Credit management
- ✅ Various admin tools

**Missing:**
- ❌ Ability to view individual user accounts
- ❌ Ability to impersonate users (test Maya on their behalf)
- ❌ User detail view with training status, images, chats, etc.
- ❌ Ability to troubleshoot user issues from admin dashboard

---

## How Professional Apps Handle This

### 1. **User Impersonation (Most Common)**

**Examples:** Intercom, Stripe Dashboard, Shopify Admin, Vercel, Vimeo

**Approach:**
- Admin clicks "Impersonate User" button
- System creates a temporary session as that user
- Admin sees the app exactly as the user sees it
- All actions are logged as "admin impersonation"
- Clear banner shows "You are viewing as [User Email]"

**Implementation Options:**

#### Option A: Session-Based Impersonation (Recommended)
```typescript
// Store impersonation in session/cookie
{
  adminUserId: "admin-id",
  impersonatingUserId: "target-user-id",
  isImpersonating: true
}

// All API routes check:
const actualUserId = isImpersonating ? impersonatingUserId : currentUserId
```

**Pros:**
- Simple to implement
- Clear audit trail
- Easy to exit impersonation
- Works across all routes

**Cons:**
- Need to update all API routes to check impersonation
- Session management complexity

#### Option B: Query Parameter Impersonation
```typescript
// URL: /app?impersonate=user-id&admin-token=secret
// Only works in admin dashboard, not direct URLs
```

**Pros:**
- No session changes
- Easy to implement
- Easy to audit (check query params)

**Cons:**
- URL sharing issues
- Less secure (if token leaks)
- Harder to enforce across all routes

---

### 2. **User Detail View (Common Pattern)**

**Examples:** Stripe, Vercel, Linear, GitHub

**Features:**
- User profile information
- Account status (active, suspended, etc.)
- Training status and model information
- Recent activity (images generated, chats, etc.)
- Credits/subscription info
- Error logs or troubleshooting info
- Actions: Impersonate, Add Credits, Suspend Account, etc.

---

### 3. **Admin Actions While Viewing User**

**Examples:** Most SaaS platforms

**Common Actions:**
- ✅ View user's images/chats (read-only)
- ✅ Generate test images as user (impersonation)
- ✅ Add/remove credits
- ✅ View training status and retrain if needed
- ✅ View error logs
- ✅ Export user data
- ✅ Suspend/reactivate account

---

## Recommended Implementation Approach

### Phase 1: User Detail View (Start Here)

**Create:** `/admin/users/[userId]` page

**Shows:**
1. **User Info Card:**
   - Email, name, created date
   - Account status
   - Credits balance
   - Subscription status

2. **Training Status Card:**
   - Current model status (completed, training, failed)
   - Training images count
   - Last trained date
   - Trigger word
   - Training parameters used

3. **Recent Activity:**
   - Last 10 generated images (thumbnails + prompts)
   - Last 5 Maya chats (preview)
   - Recent errors/warnings

4. **Quick Actions:**
   - "Impersonate User" button
   - "Add Credits" button
   - "View Full History" link
   - "Retrain Model" button (if needed)

**API Endpoint:** `/api/admin/users/[userId]`
```typescript
GET /api/admin/users/[userId]
// Returns:
{
  user: { id, email, name, created_at, ... },
  training: { status, model_id, trigger_word, last_trained, ... },
  credits: { balance, history },
  recent_images: [...],
  recent_chats: [...],
  errors: [...]
}
```

---

### Phase 2: User Impersonation

**Implementation:**

1. **Add to session/cookie:**
```typescript
// lib/admin/impersonation.ts
export interface ImpersonationSession {
  adminUserId: string
  impersonatingUserId: string
  startedAt: Date
  reason?: string // "Troubleshooting Maya issue"
}
```

2. **Middleware to check impersonation:**
```typescript
// lib/auth-helper.ts (update existing)
export async function getAuthenticatedUser() {
  const user = await supabase.auth.getUser()
  
  // Check if admin is impersonating
  const impersonation = getImpersonationSession()
  if (impersonation && isAdmin(user.id)) {
    // Return impersonated user
    return await getUserByAuthId(impersonation.impersonatingUserId)
  }
  
  return user
}
```

3. **Admin UI:**
```tsx
// components/admin/user-detail-view.tsx
<button onClick={handleImpersonate}>
  🎭 Impersonate User
</button>

// Shows banner when impersonating:
{isImpersonating && (
  <Banner>
    You are viewing as {userEmail} | [Exit Impersonation]
  </Banner>
)}
```

4. **Audit Logging:**
```typescript
// Log all impersonation actions
await logAdminAction({
  adminId: adminUserId,
  action: "impersonate_user",
  targetUserId: impersonatingUserId,
  timestamp: Date.now(),
  reason: "Troubleshooting Maya prompt generation issue"
})
```

---

### Phase 3: Enhanced User Management

**User List View:** `/admin/users`
- Search/filter users
- Sort by: created date, credits, last active
- Quick actions: View, Impersonate, Add Credits
- Filters: Has training, No training, Active, Inactive

**User Actions:**
- Impersonate
- Add/Remove Credits
- Retrain Model
- View Full Chat History
- View All Generated Images
- Export User Data
- Suspend/Reactivate Account

---

## Security Considerations

### 1. **Impersonation Security**

✅ **Do:**
- Require admin authentication for impersonation
- Log all impersonation actions with reason
- Show clear UI indication when impersonating
- Auto-expire impersonation after X hours
- Limit impersonation to specific IPs (optional)

❌ **Don't:**
- Allow impersonation via direct URL manipulation (unless signed)
- Store impersonation in easily editable cookies
- Forget to audit log

### 2. **Access Control**

✅ **Do:**
- Verify admin status on every impersonation request
- Check admin permissions before sensitive actions
- Rate limit admin actions
- Require re-authentication for critical actions

❌ **Don't:**
- Trust client-side admin status checks
- Allow impersonation without explicit admin check
- Skip audit logging

---

## Database Schema Additions

### Admin Impersonation Logs
```sql
CREATE TABLE admin_impersonation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES users(id),
  target_user_id UUID REFERENCES users(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  actions_performed TEXT[] -- Array of actions taken
);
```

### Admin Actions Log
```sql
CREATE TABLE admin_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES users(id),
  action_type TEXT NOT NULL, -- 'impersonate', 'add_credits', 'retrain_model', etc.
  target_user_id UUID REFERENCES users(id),
  details JSONB, -- Action-specific details
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Implementation Priority

### High Priority (Do First)
1. ✅ **User Detail View** - See user info, training status, recent activity
2. ✅ **Basic Impersonation** - Test Maya as user
3. ✅ **Audit Logging** - Track all admin actions

### Medium Priority
4. **User List View** - Browse/search all users
5. **Quick Actions** - Add credits, retrain, etc. from detail view
6. **Error Logging** - Show user-specific errors

### Low Priority
7. **Advanced Filtering** - Complex user searches
8. **Bulk Actions** - Action multiple users at once
9. **User Export** - GDPR compliance tools

---

## Example User Flow

1. **Admin receives complaint:** "Maya generating wrong hair color"
2. **Admin searches user:** `/admin/users?search=user@email.com`
3. **Admin clicks user** → Opens `/admin/users/[userId]`
4. **Admin sees:**
   - User has trained model ✅
   - Physical preferences: "keep my natural hair color"
   - Recent images show wrong hair color ❌
5. **Admin clicks "Impersonate User"**
6. **Admin tests Maya:** Creates new concept, generates image
7. **Admin sees same issue** → Confirms bug
8. **Admin exits impersonation** → Returns to admin view
9. **Admin adds note:** "Issue confirmed - prompt not including hair color"
10. **Admin fixes issue** (you already did this!)
11. **Admin retrains model** or asks user to retrain

---

## Technical Recommendations

### Session Management

**Option 1: Cookie-Based (Simpler)**
```typescript
// Store in httpOnly cookie
cookies().set('impersonation', JSON.stringify({
  adminId, targetUserId, startedAt
}), { httpOnly: true, secure: true })
```

**Option 2: Database Session (More Secure)**
```typescript
// Store in database, reference via session ID
const session = await createImpersonationSession(adminId, targetUserId)
cookies().set('impersonation_session_id', session.id)
```

### API Route Pattern

```typescript
// app/api/admin/users/[userId]/route.ts
export async function GET(request, { params }) {
  // Verify admin
  const admin = await verifyAdmin(request)
  if (!admin) return unauthorized()
  
  // Get user details
  const user = await getUserDetails(params.userId)
  
  // Return user info (admin can see everything)
  return Response.json(user)
}

// app/api/admin/impersonate/route.ts
export async function POST(request) {
  const admin = await verifyAdmin(request)
  const { targetUserId, reason } = await request.json()
  
  // Create impersonation session
  const session = await createImpersonationSession(
    admin.id, 
    targetUserId,
    reason
  )
  
  // Log action
  await logAdminAction(admin.id, 'impersonate', targetUserId)
  
  return Response.json({ sessionId: session.id })
}
```

---

## UI Components Needed

1. **UserDetailView** - Main user detail page
2. **UserList** - Searchable user list
3. **ImpersonationBanner** - Shows when impersonating
4. **UserActivityTimeline** - Shows user's recent actions
5. **TrainingStatusCard** - Shows training info
6. **QuickActionsPanel** - Admin action buttons

---

## Next Steps

1. **Review this plan** - Confirm approach
2. **Start with User Detail View** - Easiest, most useful first
3. **Add basic impersonation** - Test Maya as user
4. **Iterate based on needs** - Add features as you use them

Would you like me to implement any of these? I recommend starting with the User Detail View since it's the foundation for everything else.

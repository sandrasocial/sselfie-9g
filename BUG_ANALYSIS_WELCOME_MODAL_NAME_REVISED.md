# Bug Analysis: Welcome Modal Using Email Instead of Name (REVISED)

## 🐛 Issue
The welcome modal displays the user's email prefix (e.g., "vaweissulloyoi-1121") instead of their actual name, even though the name was set during signup.

## 🔍 Root Cause Analysis

### The Signup Flow

1. **Signup Page:** `app/auth/sign-up/page.tsx` (line 112)
   ```typescript
   options: {
     data: {
       name,  // ✅ Stores as "name" in user_metadata
     },
   }
   ```
   - User enters name in signup form
   - Name is stored in Supabase auth `user_metadata.name`

2. **Immediate Sign-In:** `app/auth/sign-up/page.tsx` (line 140)
   - After signup, user is immediately signed in
   - Redirects to `/studio?tab=feed-planner`
   - **No callback route is hit** (callback is only for email confirmation links)

3. **Studio Page:** `app/studio/page.tsx` (line 65)
   ```typescript
   neonUser = await getOrCreateNeonUser(user.id, user.email, user.user_metadata?.display_name)
   ```
   - ❌ **BUG:** Looking for `user_metadata.display_name` but signup stores it as `user_metadata.name`
   - Passes `undefined` to `getOrCreateNeonUser`
   - User is created in database with `display_name = null`

4. **User Creation:** `lib/user-mapping.ts` (line 85-99)
   ```typescript
   if (existingUsers.length > 0) {
     const user = existingUsers[0] as NeonUser
     // ❌ BUG: If user exists, it returns existing user WITHOUT updating display_name
     // Even if display_name is null and we have a name from user_metadata
     return user
   }
   ```
   - If user already exists (e.g., from previous signup attempt), returns existing user
   - **Does NOT update `display_name`** even if it's null and we have a name from metadata

5. **API Response:** `app/api/user/info/route.ts` (line 99)
   ```typescript
   name: user.name || user.email?.split("@")[0]  // Falls back to email prefix
   ```
   - Since `display_name` is `null`, returns email prefix

6. **Welcome Modal:** Displays email prefix instead of name

### The Auth Callback Flow (Alternative Path)

1. **Auth Callback:** `app/auth/callback/route.ts` (line 36)
   ```typescript
   const neonUser = await syncUserWithNeon(data.user.id, data.user.email!, data.user.user_metadata?.name)
   ```
   - ✅ **CORRECT:** Extracts `user_metadata.name` (not `display_name`)
   - But this is only hit for email confirmation links, not immediate sign-in

## 🎯 The Bug Chain

```
1. User signs up with name "John"
   ↓
2. Name stored in Supabase: user_metadata.name = "John"
   ↓
3. User immediately signs in → Redirects to /studio
   ↓
4. Studio page looks for: user_metadata.display_name (❌ wrong key)
   ↓
5. Passes undefined to getOrCreateNeonUser
   ↓
6. User created with display_name = null
   ↓
7. /api/user/info returns: name = "vaweissulloyoi-1121" (email prefix)
   ↓
8. Welcome modal displays: "Hi vaweissulloyoi-1121! 👋"
```

## 🔧 Fix Strategy

### Fix 1: Correct Metadata Key (CRITICAL)
**File:** `app/studio/page.tsx` (line 65)
- **Current:** `user.user_metadata?.display_name`
- **Fix:** `user.user_metadata?.name || user.user_metadata?.display_name`
- **Rationale:** Signup stores as `name`, but some flows might use `display_name` (backward compatibility)

### Fix 2: Update Existing Users (IMPORTANT)
**File:** `lib/user-mapping.ts` (line 85-99)
- **Current:** Returns existing user without updating `display_name`
- **Fix:** If `display_name` is null and we have a name from metadata, update it
- **Rationale:** Users who signed up before fix will have null `display_name`

### Fix 3: Fix API Fallback (RECOMMENDED)
**File:** `app/api/user/info/route.ts` (line 99)
- **Current:** `name: user.name || user.email?.split("@")[0]`
- **Fix:** `name: user.name || null`
- **Rationale:** Don't use email prefix as fallback, let client handle "there" fallback

### Fix 4: Fix Client Fallback (RECOMMENDED)
**File:** `app/feed-planner/feed-planner-client.tsx` (lines 82-88)
- **Current:** Falls back to `userInfo.email.split('@')[0]`
- **Fix:** Remove email prefix fallback, use "there" instead
- **Rationale:** Email prefixes are not user-friendly names

## 📋 Files to Modify

1. **`app/studio/page.tsx`** (line 65)
   ```typescript
   // BEFORE:
   neonUser = await getOrCreateNeonUser(user.id, user.email, user.user_metadata?.display_name)
   
   // AFTER:
   neonUser = await getOrCreateNeonUser(user.id, user.email, user.user_metadata?.name || user.user_metadata?.display_name)
   ```

2. **`app/feed-planner/page.tsx`** (line 32)
   ```typescript
   // BEFORE:
   neonUser = await getOrCreateNeonUser(user.id, user.email, user.user_metadata?.display_name)
   
   // AFTER:
   neonUser = await getOrCreateNeonUser(user.id, user.email, user.user_metadata?.name || user.user_metadata?.display_name)
   ```

3. **`lib/user-mapping.ts`** (line 85-99)
   ```typescript
   // ADD: Update display_name if null and we have a name
   if (existingUsers.length > 0) {
     const user = existingUsers[0] as NeonUser
     if (!user.supabase_user_id) {
       // ... existing update logic
     }
     // NEW: Update display_name if null and we have a name
     if (!user.display_name && name) {
       await retryWithBackoff(
         () => db`
         UPDATE users 
         SET display_name = ${name}, updated_at = NOW()
         WHERE id = ${user.id}
       `,
         5,
         2000,
       )
       user.display_name = name
     }
     return user
   }
   ```

4. **`app/api/user/info/route.ts`** (line 99)
   ```typescript
   // BEFORE:
   name: user.name || user.email?.split("@")[0],
   
   // AFTER:
   name: user.name || null,
   ```

5. **`app/feed-planner/feed-planner-client.tsx`** (lines 82-88)
   ```typescript
   // BEFORE:
   const displayName = userInfo?.name && !userInfo.name.includes('@') 
     ? userInfo.name 
     : (userName && !userName.includes('@') 
       ? userName 
       : (userInfo?.email && !userInfo.email.includes('@') 
         ? userInfo.email.split('@')[0]  // ❌ Remove this
         : "there"))
   
   // AFTER:
   const displayName = userInfo?.name && !userInfo.name.includes('@') 
     ? userInfo.name 
     : (userName && !userName.includes('@') 
       ? userName 
       : "there")  // ✅ Direct fallback to "there"
   ```

## ✅ Expected Behavior After Fix

- **User signs up with name "John":**
  1. Name stored in `user_metadata.name`
  2. Studio page extracts `user_metadata.name` ✅
  3. User created/updated with `display_name = "John"` ✅
  4. API returns `name: "John"` ✅
  5. Welcome modal displays: "Hi John! 👋" ✅

- **User has no name:**
  1. `display_name = null` in database
  2. API returns `name: null` ✅
  3. Client falls back to "there" ✅
  4. Welcome modal displays: "Hi there! 👋" ✅

## 🧪 Testing Checklist

- [ ] New signup with name → Name appears in welcome modal
- [ ] New signup without name → "Hi there! 👋" appears
- [ ] Existing user with null display_name → Gets updated on next login
- [ ] Existing user with display_name → Name appears correctly
- [ ] Free blueprint funnel → Name appears correctly
- [ ] Paid blueprint funnel → Name appears correctly

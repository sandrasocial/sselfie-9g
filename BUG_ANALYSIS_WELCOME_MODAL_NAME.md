# Bug Analysis: Welcome Modal Using Email Instead of Name

## 🐛 Issue
The welcome modal displays the user's email prefix (e.g., "vaweissulloyoi-1121") instead of their actual name or "there" as a fallback.

## 📍 Location
**Component:** `components/onboarding/unified-onboarding-wizard.tsx` (line 508)
**Display Logic:** `Hi {userName && !userName.includes('@') ? userName : "there"}! 👋`

## 🔍 Root Cause Analysis

### Flow 1: Free Blueprint Funnel

1. **Entry Point:** `app/studio/page.tsx` (line 166)
   - Passes `userName={neonUser.display_name}` to `SselfieApp`
   - If `display_name` is `null` or `undefined`, `userName` prop is `null/undefined`

2. **SselfieApp:** `components/sselfie/sselfie-app.tsx` (line 990)
   - Passes `userName={userName}` to `FeedPlannerClient`
   - If `userName` is `null/undefined`, prop is passed as `null/undefined`

3. **FeedPlannerClient:** `app/feed-planner/feed-planner-client.tsx` (lines 76-88)
   ```typescript
   const { data: userInfo } = useSWR("/api/user/info", fetcher, ...)
   
   const displayName = userInfo?.name && !userInfo.name.includes('@') 
     ? userInfo.name 
     : (userName && !userName.includes('@') 
       ? userName 
       : (userInfo?.email && !userInfo.email.includes('@') 
         ? userInfo.email.split('@')[0]  // ❌ BUG: This returns email prefix
         : "there"))
   ```

4. **API Response:** `app/api/user/info/route.ts` (line 99)
   ```typescript
   name: user.name || user.email?.split("@")[0]  // ❌ BUG: Falls back to email prefix
   ```
   - If `display_name` is `null`, returns email prefix (e.g., "vaweissulloyoi-1121")
   - The check `!userInfo.name.includes('@')` passes because it's just the prefix
   - So `displayName` becomes the email prefix instead of "there"

5. **Wizard Component:** `components/onboarding/unified-onboarding-wizard.tsx` (line 380)
   - Receives `userName={displayName}` (which is the email prefix)
   - Line 508 displays it: `Hi {userName && !userName.includes('@') ? userName : "there"}!`
   - Since email prefix doesn't contain '@', it displays the email prefix

### Flow 2: Paid Blueprint Funnel

1. **Entry Point:** `app/feed-planner/page.tsx` (line 50)
   - Passes `userName={neonUser.display_name}` to `SselfieApp`
   - Same issue: if `display_name` is `null`, prop is `null/undefined`

2. **Same Flow:** Follows the same path as Free Blueprint (steps 2-5 above)

## 🎯 The Bug Chain

```
1. neonUser.display_name = null (user hasn't set a name)
   ↓
2. /api/user/info returns: name: "vaweissulloyoi-1121" (email prefix fallback)
   ↓
3. FeedPlannerClient.displayName = "vaweissulloyoi-1121" (passes !includes('@') check)
   ↓
4. UnifiedOnboardingWizard receives userName = "vaweissulloyoi-1121"
   ↓
5. Welcome modal displays: "Hi vaweissulloyoi-1121! 👋"
```

## 🔧 Fix Strategy

### Option 1: Fix API Fallback (Recommended)
**File:** `app/api/user/info/route.ts` (line 99)
- **Current:** `name: user.name || user.email?.split("@")[0]`
- **Fix:** `name: user.name || null`
- **Rationale:** Don't use email prefix as fallback. Let the client handle the fallback to "there"

### Option 2: Fix Client-Side Logic
**File:** `app/feed-planner/feed-planner-client.tsx` (lines 82-88)
- **Current:** Falls back to `userInfo.email.split('@')[0]`
- **Fix:** Remove email prefix fallback, use "there" instead
- **Rationale:** Email prefixes are not user-friendly names

### Option 3: Fix Both (Most Robust)
- Fix API to return `null` instead of email prefix
- Fix client to handle `null` and display "there"
- **Rationale:** Prevents the issue at both layers

## 📋 Files to Modify

1. **`app/api/user/info/route.ts`** (line 99)
   - Change: `name: user.name || user.email?.split("@")[0]`
   - To: `name: user.name || null`

2. **`app/feed-planner/feed-planner-client.tsx`** (lines 82-88)
   - Change: Remove email prefix fallback logic
   - To: Use "there" when name is not available

3. **`components/onboarding/unified-onboarding-wizard.tsx`** (line 508)
   - Already has correct fallback logic, but ensure it handles `null` properly

## ✅ Expected Behavior After Fix

- **User has name:** "Hi John! 👋"
- **User has no name:** "Hi there! 👋"
- **User has email prefix only:** "Hi there! 👋" (not "Hi vaweissulloyoi-1121! 👋")

## 🧪 Testing Checklist

- [ ] Free blueprint funnel: New user without name → Shows "Hi there! 👋"
- [ ] Free blueprint funnel: User with name → Shows "Hi [Name]! 👋"
- [ ] Paid blueprint funnel: New user without name → Shows "Hi there! 👋"
- [ ] Paid blueprint funnel: User with name → Shows "Hi [Name]! 👋"
- [ ] User with email prefix in database → Shows "Hi there! 👋" (not email prefix)

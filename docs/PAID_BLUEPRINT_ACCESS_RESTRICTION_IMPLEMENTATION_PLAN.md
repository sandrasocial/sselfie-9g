# Paid Blueprint Access Restriction - Implementation Plan

## Problem Statement

Users who have **only** purchased the paid blueprint should:
1. **NOT** have access to Maya screen or any Maya tabs (Photos, Videos, Prompts, Training, Feed)
2. See upgrade banners in Maya and Academy tabs
3. Have access to Feed Planner (already implemented)

## Current Implementation Analysis

### 1. Access Control (`components/sselfie/access.ts`)

**Current Logic:**
```typescript
const isMember = subscriptionStatus === "active" || subscriptionStatus === "trialing"
if (isMember) {
  return {
    isMember: true,
    canUseGenerators: true,  // ❌ This is too broad - includes paid blueprint
    showUpgradeUI: false,
  }
}
```

**Issue:** 
- `canUseGenerators` is `true` for ANY active subscription, including `paid_blueprint`
- Does not distinguish between `paid_blueprint` and `sselfie_studio_membership`

### 2. Subscription Status (`app/studio/page.tsx`)

**Current Logic:**
```typescript
const subscription = await getUserSubscription(neonUser.id)
subscriptionStatus={subscription?.status ?? null}  // Only passes status, not product_type
```

**Issue:**
- Only passes `status` to `SselfieApp`, not `product_type`
- `SselfieApp` cannot distinguish between paid blueprint and membership

### 3. Maya Screen Access (`components/sselfie/sselfie-app.tsx`)

**Current Logic:**
```typescript
{activeTab === "maya" && !access.canUseGenerators ? (
  <UpgradeOrCredits feature="Maya" />
) : (
  <MayaChatScreen ... />
)}
```

**Issue:**
- Only checks `canUseGenerators`, doesn't check if user is paid blueprint only

### 4. Academy Screen Access (`components/sselfie/sselfie-app.tsx`)

**Current Logic:**
```typescript
{activeTab === "academy" && (
  !access.canUseGenerators ? (
    <UpgradeOrCredits feature="Academy" />
  ) : (
    <AcademyScreen />
  )
)}
```

**Issue:**
- Same as Maya - only checks `canUseGenerators`

### 5. Maya Tabs (`components/sselfie/maya-chat-screen.tsx`)

**Current Logic:**
- `MayaTabSwitcher` shows all tabs without access control
- All tabs (Photos, Videos, Prompts, Training, Feed) are accessible if user can access Maya screen

**Issue:**
- No restriction for paid blueprint users

## Solution: Simple & Minimal

### Principle
**Paid blueprint users = Feed Planner only. Membership users = Full access.**

### Simple Logic
1. **Update `getAccessState`** to accept `productType` and distinguish between paid blueprint and membership
2. **Pass `productType`** from `app/studio/page.tsx` to `SselfieApp`
3. **Update `SselfieApp`** to check for paid blueprint only users
4. **Show upgrade banners** in Maya and Academy for paid blueprint users

## Implementation Plan

### Phase 1: Update Access Control Utility

**File:** `components/sselfie/access.ts`

**Changes:**
1. Add `productType` parameter to `getAccessState`
2. Add `isPaidBlueprintOnly` flag
3. Update `canUseGenerators` logic:
   - `true` for membership users
   - `false` for paid blueprint only users
   - `false` for free users

**Code:**
```typescript
export function getAccessState({
  credits,
  subscriptionStatus,
  productType,  // NEW: "paid_blueprint" | "sselfie_studio_membership" | null
}: {
  credits: number
  subscriptionStatus: string | null
  productType?: string | null  // NEW
}) {
  const isMember = subscriptionStatus === "active" || subscriptionStatus === "trialing"
  const isPaidBlueprintOnly = isMember && productType === "paid_blueprint"
  const isMembership = isMember && productType === "sselfie_studio_membership"

  if (isMembership) {
    return {
      isMember: true,
      canUseGenerators: true,  // Membership = full access
      showUpgradeUI: false,
      isPaidBlueprintOnly: false,
    }
  }

  if (isPaidBlueprintOnly) {
    return {
      isMember: false,  // Not a "member" in the traditional sense
      canUseGenerators: false,  // Paid blueprint = Feed Planner only
      showUpgradeUI: true,  // Show upgrade to membership
      isPaidBlueprintOnly: true,
    }
  }

  // Free users
  return {
    isMember: false,
    canUseGenerators: false,
    showUpgradeUI: true,
    isPaidBlueprintOnly: false,
  }
}
```

### Phase 2: Update Studio Page to Pass Product Type

**File:** `app/studio/page.tsx`

**Changes:**
1. Pass `product_type` from subscription to `SselfieApp`

**Code:**
```typescript
const subscription = await getUserSubscription(neonUser.id)

<SselfieApp
  userId={neonUser.id}
  userName={neonUser.display_name}
  userEmail={neonUser.email}
  isWelcome={isWelcome}
  shouldShowCheckout={shouldShowCheckout}
  subscriptionStatus={subscription?.status ?? null}
  productType={subscription?.product_type ?? null}  // NEW
  purchaseSuccess={purchaseSuccess}
  initialTab={initialTab}
/>
```

### Phase 3: Update SselfieApp to Accept and Use Product Type

**File:** `components/sselfie/sselfie-app.tsx`

**Changes:**
1. Add `productType` prop to `SselfieAppProps`
2. Pass `productType` to `getAccessState`
3. Use `access.isPaidBlueprintOnly` to show upgrade banners in Maya and Academy

**Code:**
```typescript
interface SselfieAppProps {
  userId: string | number
  userName: string | null
  userEmail: string | null
  isWelcome?: boolean
  shouldShowCheckout?: boolean
  subscriptionStatus?: string | null
  productType?: string | null  // NEW
  purchaseSuccess?: boolean
  initialTab?: string
}

export default function SselfieApp({
  userId,
  userName,
  userEmail,
  isWelcome = false,
  shouldShowCheckout = false,
  subscriptionStatus = null,
  productType = null,  // NEW
  purchaseSuccess = false,
  initialTab,
}: SselfieAppProps) {
  // ... existing code ...

  const access = getAccessState({
    credits: creditBalance,
    subscriptionStatus,
    productType,  // NEW
  })

  // ... existing code ...

  // Show upgrade banner for paid blueprint users in Maya and Academy
  const shouldShowUpgradeBannerForPaidBlueprint = 
    access.isPaidBlueprintOnly && 
    (activeTab === "maya" || activeTab === "academy")
```

### Phase 4: Show Upgrade Banner in Maya Screen

**File:** `components/sselfie/sselfie-app.tsx`

**Changes:**
1. Show `UpgradeOrCredits` for paid blueprint users in Maya tab
2. Keep existing logic for free users

**Code:**
```typescript
{activeTab === "maya" && (
  !access.canUseGenerators || access.isPaidBlueprintOnly ? (  // NEW: Check isPaidBlueprintOnly
    <UpgradeOrCredits feature="Maya" />
  ) : (
    <MayaChatScreen ... />
  )
)}
```

### Phase 5: Show Upgrade Banner in Academy Screen

**File:** `components/sselfie/sselfie-app.tsx`

**Changes:**
1. Show `UpgradeOrCredits` for paid blueprint users in Academy tab
2. Keep existing logic for free users

**Code:**
```typescript
{activeTab === "academy" && (
  !access.canUseGenerators || access.isPaidBlueprintOnly ? (  // NEW: Check isPaidBlueprintOnly
    <UpgradeOrCredits feature="Academy" />
  ) : (
    <AcademyScreen />
  )
)}
```

### Phase 6: Prevent Navigation to Maya Tab for Paid Blueprint Users

**File:** `components/sselfie/sselfie-app.tsx`

**Changes:**
1. Update `handleTabChange` to redirect paid blueprint users away from Maya tab
2. Update tab rendering to disable/hide Maya tab for paid blueprint users (optional - can show but redirect)

**Code:**
```typescript
const handleTabChange = (tabId: string) => {
  // Prevent paid blueprint users from accessing Maya
  if (tabId === "maya" && access.isPaidBlueprintOnly) {
    toast({
      title: "Upgrade Required",
      description: "Maya is available with Studio Membership. Upgrade to unlock all features.",
      variant: "default",
    })
    return  // Don't change tab
  }
  
  setActiveTab(tabId)
  window.history.pushState(null, "", `#${tabId}`)
}
```

### Phase 7: Update UpgradeOrCredits Component (Optional Enhancement)

**File:** `components/UpgradeOrCredits.tsx`

**Changes:**
1. Update messaging for paid blueprint users vs free users
2. Show different CTA text if user already has paid blueprint

**Code:**
```typescript
interface UpgradeOrCreditsProps {
  feature?: string
  isPaidBlueprintUser?: boolean  // NEW: Optional flag
}

export function UpgradeOrCredits({ 
  feature = "Studio",
  isPaidBlueprintUser = false,  // NEW
}: UpgradeOrCreditsProps) {
  // ... existing code ...
  
  // Update title/message based on user type
  const title = isPaidBlueprintUser 
    ? "UPGRADE TO MEMBERSHIP" 
    : "OUT OF CREDITS"
  
  const message = isPaidBlueprintUser
    ? `You have access to Feed Planner. Upgrade to Studio Membership to unlock ${feature} and all features.`
    : `You need credits to use ${feature}. Choose an option below to continue creating.`
}
```

## Implementation Checklist

- [ ] **Phase 1:** Update `getAccessState` to accept `productType` and add `isPaidBlueprintOnly` flag
- [ ] **Phase 2:** Update `app/studio/page.tsx` to pass `product_type` to `SselfieApp`
- [ ] **Phase 3:** Update `SselfieApp` to accept `productType` prop and pass to `getAccessState`
- [ ] **Phase 4:** Show `UpgradeOrCredits` for paid blueprint users in Maya tab
- [ ] **Phase 5:** Show `UpgradeOrCredits` for paid blueprint users in Academy tab
- [ ] **Phase 6:** Prevent navigation to Maya tab for paid blueprint users
- [ ] **Phase 7:** (Optional) Update `UpgradeOrCredits` messaging for paid blueprint users

## Testing Checklist

- [ ] Free user: Cannot access Maya or Academy (shows upgrade banner)
- [ ] Paid blueprint user: Cannot access Maya or Academy (shows upgrade banner)
- [ ] Paid blueprint user: Can access Feed Planner
- [ ] Membership user: Can access Maya, Academy, and Feed Planner
- [ ] Paid blueprint user: Clicking Maya tab shows toast and doesn't navigate
- [ ] Upgrade banners show correct messaging for paid blueprint vs free users

## Files to Modify

1. `components/sselfie/access.ts` - Add productType parameter and isPaidBlueprintOnly flag
2. `app/studio/page.tsx` - Pass product_type to SselfieApp
3. `components/sselfie/sselfie-app.tsx` - Accept productType, use in access control, show upgrade banners
4. `components/UpgradeOrCredits.tsx` - (Optional) Update messaging for paid blueprint users

## What's NOT Over-Engineered

✅ **Simple flag check** - `isPaidBlueprintOnly` is a single boolean flag
✅ **Reuse existing component** - `UpgradeOrCredits` already exists and works
✅ **Minimal changes** - Only 3-4 files need modification
✅ **No new APIs** - Uses existing subscription data

## What's Over-Engineered (Avoid)

❌ **Creating new access control system** - Use existing `getAccessState`
❌ **Separate upgrade banner component** - Reuse `UpgradeOrCredits`
❌ **Complex tab hiding logic** - Just prevent navigation, show banner if they get there
❌ **New API endpoints** - Subscription data already available

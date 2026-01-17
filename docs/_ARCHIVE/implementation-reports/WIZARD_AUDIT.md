# Wizard Audit - Comprehensive Analysis

## Executive Summary

**Problem**: The unified onboarding wizard is not displaying saved form data, even though the data exists in the database and is being loaded correctly.

**Root Cause**: Multiple conflicting wizard systems are running simultaneously, causing state conflicts and preventing the unified wizard from properly displaying saved data.

---

## All Wizards in Codebase

### 1. **UnifiedOnboardingWizard** (Primary - Should be used)
- **Location**: `components/onboarding/unified-onboarding-wizard.tsx`
- **Purpose**: Unified wizard that combines brand profile and blueprint wizard functionality
- **Used In**: 
  - `app/feed-planner/feed-planner-client.tsx` (Feed Planner)
  - `components/sselfie/sselfie-app.tsx` (Main app - CONFLICTING)
- **Status**: ✅ **ACTIVE** - This is the wizard we want to use

### 2. **BlueprintWelcomeWizard** (Legacy - May conflict)
- **Location**: `components/sselfie/blueprint-welcome-wizard.tsx`
- **Purpose**: Welcome screen for blueprint users (members only)
- **Used In**: `components/sselfie/sselfie-app.tsx`
- **Status**: ⚠️ **ACTIVE** - May be conflicting with unified wizard

### 3. **BlueprintOnboardingWizard** (Legacy - CONFLICTING)
- **Location**: `components/onboarding/blueprint-onboarding-wizard.tsx`
- **Purpose**: Old blueprint onboarding wizard
- **Used In**: `components/sselfie/sselfie-app.tsx`
- **Status**: ❌ **CONFLICTING** - Should be removed, replaced by UnifiedOnboardingWizard

### 4. **OnboardingWizard** (Legacy - Training only)
- **Location**: `components/sselfie/onboarding-wizard.tsx`
- **Purpose**: Training/model onboarding wizard
- **Used In**: `components/sselfie/sselfie-app.tsx`
- **Status**: ✅ **ACTIVE** - For training, not conflicting with unified wizard

### 5. **BaseWizard** (Legacy - Deprecated)
- **Location**: `components/onboarding/base-wizard.tsx`
- **Purpose**: Old base wizard (deprecated)
- **Used In**: Unknown (likely unused)
- **Status**: ❌ **DEPRECATED** - Should be removed

### 6. **BrandProfileWizard** (Legacy - Deprecated)
- **Location**: `components/sselfie/brand-profile-wizard.tsx`
- **Purpose**: Old brand profile wizard (deprecated)
- **Used In**: Unknown (likely unused)
- **Status**: ❌ **DEPRECATED** - Should be removed

---

## Conflict Analysis

### Primary Conflict: `sselfie-app.tsx` vs `feed-planner-client.tsx`

**Problem**: Both components are trying to show the unified wizard, but with different logic:

#### `sselfie-app.tsx` (Lines 509-515)
```typescript
// Shows UnifiedOnboardingWizard when:
else if ((isMember && blueprintWelcomeShown && (!hasBaseWizardData || !hasExtensionData)) ||
         (!isMember && (!hasBaseWizardData || !hasExtensionData))) {
  console.log("[Blueprint Onboarding] 📝 Showing unified blueprint onboarding wizard (onboarding data missing)")
  setShowBlueprintWelcome(false)
  setShowBlueprintOnboarding(true)  // ❌ This shows BlueprintOnboardingWizard, NOT UnifiedOnboardingWizard
  setShowOnboarding(false)
}
```

**Issue**: `setShowBlueprintOnboarding(true)` shows `BlueprintOnboardingWizard` (old wizard), NOT `UnifiedOnboardingWizard`.

#### `feed-planner-client.tsx` (Lines 173-252)
```typescript
// Shows UnifiedOnboardingWizard when:
if (showWizard) {
  return (
    <UnifiedOnboardingWizard
      isOpen={true}
      existingData={existingData}  // ✅ Correctly passes data
      ...
    />
  )
}
```

**Issue**: This is the CORRECT implementation, but `sselfie-app.tsx` is also trying to show a wizard, causing conflicts.

---

## Wizard State Management Conflicts

### State Variables in `sselfie-app.tsx`:
1. `showOnboarding` - Controls `OnboardingWizard` (training)
2. `showBlueprintWelcome` - Controls `BlueprintWelcomeWizard`
3. `showBlueprintOnboarding` - Controls `BlueprintOnboardingWizard` (OLD, conflicting)

### State Variables in `feed-planner-client.tsx`:
1. `showWizard` - Controls `UnifiedOnboardingWizard` (CORRECT)

**Problem**: When both components try to show wizards simultaneously, React state conflicts occur, causing formData to not display correctly.

---

## Data Flow Issues

### Expected Flow:
1. User opens Feed Planner
2. `feed-planner-client.tsx` checks if wizard is needed
3. If needed, shows `UnifiedOnboardingWizard` with `existingData`
4. Wizard loads data from `existingData` into `formData`
5. Form inputs display saved values

### Actual Flow (Broken):
1. User opens Feed Planner
2. `feed-planner-client.tsx` checks if wizard is needed
3. `sselfie-app.tsx` ALSO checks if wizard is needed (separate logic)
4. Both try to show wizards simultaneously
5. State conflicts prevent `formData` from displaying
6. Form inputs show empty even though data exists

---

## Console Log Analysis

From user's console logs:
```
[Blueprint Onboarding] 📝 Showing unified blueprint onboarding wizard (onboarding data missing)
[Feed Planner Wizard] ✅ Mapped existingData for wizard: {hasData: true, fields: Array(13), ...}
[Unified Wizard] ✅ Setting formData: {businessType: 'Visibility and selfie coach ', ...}
```

**Observation**: 
- Data IS being loaded correctly
- `formData` IS being set correctly
- But form inputs are NOT displaying the values

**Conclusion**: This is a React rendering/state conflict issue, not a data loading issue.

---

## Solutions

### Option 1: Remove Wizard Logic from `sselfie-app.tsx` (RECOMMENDED)
- Remove `BlueprintOnboardingWizard` import and usage
- Remove `showBlueprintOnboarding` state
- Let `feed-planner-client.tsx` handle ALL wizard logic
- Keep `BlueprintWelcomeWizard` for members (welcome screen only)
- Keep `OnboardingWizard` for training (separate use case)

### Option 2: Consolidate Wizard Logic
- Move all wizard logic to a single location
- Use one state management system
- Prevent multiple components from showing wizards

### Option 3: Fix State Conflicts
- Ensure only ONE wizard can be shown at a time
- Use a global wizard state manager
- Prevent `sselfie-app.tsx` from interfering with `feed-planner-client.tsx`

---

## Files to Modify

### High Priority:
1. `components/sselfie/sselfie-app.tsx`
   - Remove `BlueprintOnboardingWizard` import (line 19)
   - Remove `showBlueprintOnboarding` state (line 127)
   - Remove `BlueprintOnboardingWizard` component (lines 1156-1178)
   - Update wizard logic to NOT show `BlueprintOnboardingWizard`

2. `components/onboarding/blueprint-onboarding-wizard.tsx`
   - Mark as deprecated
   - Consider deleting if not used elsewhere

### Medium Priority:
3. `components/onboarding/base-wizard.tsx`
   - Mark as deprecated
   - Delete if not used

4. `components/sselfie/brand-profile-wizard.tsx`
   - Mark as deprecated
   - Delete if not used

### Low Priority:
5. Clean up unused wizard imports
6. Update documentation

---

## Recommended Action Plan

1. **Immediate**: Remove `BlueprintOnboardingWizard` from `sselfie-app.tsx`
2. **Verify**: Ensure `feed-planner-client.tsx` is the ONLY place showing `UnifiedOnboardingWizard`
3. **Test**: Verify form data displays correctly
4. **Cleanup**: Remove deprecated wizard files
5. **Document**: Update any documentation referencing old wizards

---

## Testing Checklist

After fixes:
- [ ] Unified wizard shows saved data in form inputs
- [ ] No console errors about conflicting wizards
- [ ] Only ONE wizard shows at a time
- [ ] Welcome wizard still works for members
- [ ] Training wizard still works
- [ ] Feed planner wizard works correctly
- [ ] No infinite re-renders
- [ ] Form data persists after page refresh

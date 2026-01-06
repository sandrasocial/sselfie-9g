# SSELFIE Canonical UI Components Map

**Date:** January 6, 2025  
**Purpose:** Declare official UI components for consistent development  
**Status:** READ-ONLY DECLARATION (No code changes made)

---

## Overview

This document declares which UI components are **canonical** (official, should be used) versus **legacy** (old, should not be used in new code). This improves consistency and helps AI tools understand what to use.

**Key Principle:** New code MUST use canonical components. Legacy components may remain until naturally replaced.

---

## 1. Buttons

### ✅ Canonical Button
**Location:** `components/ui/button.tsx`  
**Type:** shadcn/ui component (Radix UI + Tailwind)  
**Why Canonical:**
- Most widely used (imported by 100+ files)
- Full variant system (default, destructive, outline, secondary, ghost, link)
- Full size system (default, sm, lg, icon, icon-sm, icon-lg)
- Accessible (Radix UI primitives)
- Consistent styling across app

**Usage:**
```tsx
import { Button } from "@/components/ui/button"

<Button variant="default" size="lg">Click me</Button>
```

### ⚠️ Specialized Buttons (Feature-Specific)
These are NOT duplicates - they serve specific purposes:

- `components/sselfie/loading-button.tsx` - **WRAPPER** around canonical button (adds loading state)
- `components/feedback/feedback-button.tsx` - **FEATURE-SPECIFIC** (feedback modal trigger)
- `components/sselfie/install-button.tsx` - **FEATURE-SPECIFIC** (PWA install)
- `components/reset-passwords-button.tsx` - **FEATURE-SPECIFIC** (admin tool)

**Rule:** Use canonical `Button` for new code. Specialized buttons are acceptable for their specific features.

---

## 2. Loaders / Spinners

### ✅ Canonical Loader (Full Screen / Section)
**Location:** `components/sselfie/unified-loading.tsx`  
**Type:** Custom component with variants  
**Why Canonical:**
- Most comprehensive (screen, section, inline variants)
- Used by 24+ files (most common)
- Consistent SSELFIE branding
- Flexible sizing

**Usage:**
```tsx
import UnifiedLoading from "@/components/sselfie/unified-loading"

<UnifiedLoading variant="screen" message="Loading..." />
<UnifiedLoading variant="section" />
<UnifiedLoading variant="inline" />
```

### ✅ Canonical Spinner (Small / Inline)
**Location:** `components/sselfie/loading-spinner.tsx`  
**Type:** Small spinner for buttons and inline use  
**Why Canonical:**
- Used by `LoadingButton` component
- Three sizes (sm, md, lg)
- Lightweight for inline use

**Usage:**
```tsx
import LoadingSpinner from "@/components/sselfie/loading-spinner"

<LoadingSpinner size="sm" />
```

### ⚠️ Legacy / Specialized Loaders

- `components/sselfie/loading-screen.tsx` - **SPECIALIZED** (full-screen with logo animation)
  - Used for initial app load
  - Keep for specific use case
  - Do not use for general loading

- `components/ui/skeleton.tsx` - **CANONICAL** (shadcn/ui skeleton loader)
  - Use for content placeholders
  - Different purpose than spinners

**Rule:** Use `UnifiedLoading` for most loading states. Use `LoadingSpinner` for buttons/inline. Use `LoadingScreen` only for initial app load.

---

## 3. Modals / Dialogs

### ✅ Canonical Dialog
**Location:** `components/ui/dialog.tsx`  
**Type:** shadcn/ui component (Radix UI Dialog)  
**Why Canonical:**
- Most widely used (imported by 50+ files)
- Accessible (Radix UI primitives)
- Full component system (Dialog, DialogTrigger, DialogContent, DialogHeader, etc.)
- Consistent styling

**Usage:**
```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
  </DialogContent>
</Dialog>
```

### ⚠️ Feature-Specific Modals
These are NOT duplicates - they are specialized modals for specific features:

- `components/feedback/feedback-modal.tsx` - Feedback submission
- `components/upgrade/upgrade-modal.tsx` - Upgrade flow
- `components/sselfie/buy-credits-modal.tsx` - Credit purchase
- `components/feed-planner/feed-highlights-modal.tsx` - Feed highlights
- `components/sselfie/retrain-model-modal.tsx` - Model retraining
- `components/sselfie/image-gallery-modal.tsx` - Image gallery
- `components/credits/low-credit-modal.tsx` - Low credit warning
- `components/credits/zero-credits-upgrade-modal.tsx` - Zero credits upgrade
- And 7+ more feature-specific modals

**Rule:** Use canonical `Dialog` for new modals. Feature-specific modals are acceptable for their specific features.

---

## 4. Tabs

### ✅ Canonical Tabs
**Location:** `components/ui/tabs.tsx`  
**Type:** shadcn/ui component (Radix UI Tabs)  
**Why Canonical:**
- Standard shadcn/ui component
- Accessible (Radix UI primitives)
- Full component system (Tabs, TabsList, TabsTrigger, TabsContent)

**Usage:**
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

<Tabs>
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content</TabsContent>
</Tabs>
```

### ⚠️ Specialized Tab Components
These are NOT duplicates - they are specialized tab switchers:

- `components/sselfie/maya/maya-tab-switcher.tsx` - **SPECIALIZED** (Maya chat tabs with custom styling)
- `components/feed-planner/feed-tabs.tsx` - **SPECIALIZED** (Feed planner tabs with custom styling)

**Rule:** Use canonical `Tabs` for new tab interfaces. Specialized tab switchers are acceptable for their specific features.

---

## 5. Headers (Maya Headers)

### ✅ Canonical Maya Header
**Location:** `components/sselfie/maya/maya-header.tsx`  
**Type:** Custom Maya chat header component  
**Why Canonical:**
- **VERIFIED:** Imported and used by `maya-chat-screen.tsx` (line 56)
- **VERIFIED:** Rendered in `maya-chat-screen.tsx` (line 2481)
- Active implementation for Maya chat interface

**Usage:**
```tsx
import MayaHeader from "./maya/maya-header"

<MayaHeader
  proMode={proMode}
  chatTitle={chatTitle}
  // ... other props
/>
```

### ⚠️ Legacy Maya Headers

**Status:** These are NOT used and should be considered legacy:

1. `components/sselfie/maya/maya-header-unified.tsx` - **LEGACY** (1045 lines, not imported)
2. `components/sselfie/maya/maya-header-simplified.tsx` - **LEGACY** (not imported)
3. `components/sselfie/maya/maya-header-old.tsx` - **LEGACY** (explicitly named "old")

**Recommendation:**
- Archive legacy headers to `archive/` folder (don't delete yet)
- Keep for reference during transition period
- Do not use in new code

### ⚠️ Specialized Header

- `components/sselfie/pro-mode/ProModeHeader.tsx` - **SPECIALIZED** (Pro mode specific, may be used separately)

**Rule:** Use `maya-header.tsx` for Maya chat. Do not use legacy headers. ProModeHeader is acceptable for Pro mode features.

---

## 6. Empty States

### ⚠️ NO CANONICAL COMPONENT DECLARED

**Current Status:** Empty states are implemented inline in components.

**Examples Found:**
- `components/sselfie/content-calendar-screen.tsx` - Inline empty state
- `components/sselfie/gallery-screen.tsx` - Inline empty state
- Various other screens - Inline empty states

**Recommendation:**
- Create canonical empty state component: `components/ui/empty-state.tsx`
- Standardize empty state patterns
- **NOT YET IMPLEMENTED** - Mark as future improvement

**Rule:** For now, empty states are acceptable as inline implementations. Future: create canonical component.

---

## 7. Error States

### ⚠️ NO CANONICAL COMPONENT DECLARED

**Current Status:** Error states are implemented inline in components.

**Examples Found:**
- `app/auth/error/page.tsx` - Inline error display
- `app/checkout/page.tsx` - Inline error display
- `components/admin/beta-testimonial-broadcast.tsx` - Inline error display
- Various other components - Inline error states

**Recommendation:**
- Create canonical error state component: `components/ui/error-state.tsx`
- Standardize error message patterns
- **NOT YET IMPLEMENTED** - Mark as future improvement

**Rule:** For now, error states are acceptable as inline implementations. Future: create canonical component.

---

## 8. Other UI Components

### ✅ Canonical Components (shadcn/ui)

All components in `components/ui/` are canonical:

- `components/ui/button.tsx` - ✅ Canonical
- `components/ui/dialog.tsx` - ✅ Canonical
- `components/ui/tabs.tsx` - ✅ Canonical
- `components/ui/input.tsx` - ✅ Canonical
- `components/ui/textarea.tsx` - ✅ Canonical
- `components/ui/select.tsx` - ✅ Canonical
- `components/ui/card.tsx` - ✅ Canonical
- `components/ui/badge.tsx` - ✅ Canonical
- `components/ui/avatar.tsx` - ✅ Canonical
- `components/ui/skeleton.tsx` - ✅ Canonical
- `components/ui/progress.tsx` - ✅ Canonical
- `components/ui/alert.tsx` - ✅ Canonical
- `components/ui/label.tsx` - ✅ Canonical
- `components/ui/dropdown-menu.tsx` - ✅ Canonical
- `components/ui/toast.tsx` - ✅ Canonical
- `components/ui/toaster.tsx` - ✅ Canonical

**Rule:** All `components/ui/*` components are canonical shadcn/ui components. Use them for new code.

---

## Usage Rules

### For New Code

1. **MUST use canonical components:**
   - `components/ui/button.tsx` for buttons
   - `components/ui/dialog.tsx` for modals
   - `components/ui/tabs.tsx` for tabs
   - `components/sselfie/unified-loading.tsx` for loading states
   - `components/sselfie/loading-spinner.tsx` for inline spinners
   - All `components/ui/*` components

2. **MUST NOT use legacy components:**
   - Do not create new buttons outside of canonical `Button`
   - Do not create new modals outside of canonical `Dialog`
   - Do not create new tabs outside of canonical `Tabs`
   - Do not use old Maya headers (once canonical is declared)

3. **MAY use specialized components:**
   - Feature-specific modals (feedback, upgrade, etc.) are acceptable
   - Feature-specific buttons (install, feedback trigger) are acceptable
   - Feature-specific tab switchers (Maya, feed planner) are acceptable

### For Existing Code

1. **Legacy components may remain:**
   - Do not rush to replace existing code
   - Replace naturally during refactoring
   - No enforcement mechanism yet (declaration only)

2. **Gradual migration:**
   - When touching a file, migrate to canonical components
   - When adding new features, use canonical components
   - When fixing bugs, consider migrating if easy

---

## Verification Checklist

Before declaring a component as canonical, verify:

- [ ] Component is actively used (imported by multiple files)
- [ ] Component is well-maintained (recent updates)
- [ ] Component is accessible (ARIA, keyboard navigation)
- [ ] Component is consistent with design system
- [ ] Component has good abstraction (not too specific)
- [ ] Component is documented

---

## Future Improvements

### Recommended Canonical Components to Create

1. **Empty State Component**
   - Location: `components/ui/empty-state.tsx`
   - Purpose: Standardize empty state displays
   - Status: Not yet implemented

2. **Error State Component**
   - Location: `components/ui/error-state.tsx`
   - Purpose: Standardize error message displays
   - Status: Not yet implemented

3. **Loading Button Component**
   - Location: `components/ui/loading-button.tsx` (move from sselfie/)
   - Purpose: Standardize loading button pattern
   - Status: Exists but in wrong location

---

## Summary

### ✅ Canonical Components (Use These)

| Component | Location | Type |
|-----------|----------|------|
| Button | `components/ui/button.tsx` | shadcn/ui |
| Dialog | `components/ui/dialog.tsx` | shadcn/ui |
| Tabs | `components/ui/tabs.tsx` | shadcn/ui |
| Unified Loading | `components/sselfie/unified-loading.tsx` | Custom |
| Loading Spinner | `components/sselfie/loading-spinner.tsx` | Custom |
| All UI Components | `components/ui/*` | shadcn/ui |

### ⚠️ Needs Verification

| Component | Location | Status |
|-----------|----------|--------|
| Maya Header | `components/sselfie/maya/maya-header*.tsx` | 4 variants, need to verify which is current |

### ⚠️ Future Improvements

| Component | Status |
|-----------|--------|
| Empty State | Not yet implemented |
| Error State | Not yet implemented |

---

**Report Generated:** January 6, 2025  
**Analysis Method:** Static code analysis, import tracing, component review  
**Next Steps:** Verify Maya header usage, create empty/error state components


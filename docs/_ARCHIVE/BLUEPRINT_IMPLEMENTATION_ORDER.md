# BLUEPRINT FUNNEL - COMPLETE IMPLEMENTATION ORDER

**Date:** January 2025  
**Status:** Ready for Implementation  
**Decision:** Option B - Complete Implementation (All Phases 0-5)  
**Total Estimated Time:** 24-33 hours

---

## CONTEXT

You have completed comprehensive audits and created these documents:
- `docs/MAYA_FEED_CHAT_AUDIT.md` - Architecture analysis
- `docs/BLUEPRINT_FUNNEL_GAP_ANALYSIS.md` - Gap analysis
- `docs/USER_JOURNEY_ANALYSIS.md` - User journey comparison
- `docs/IMPLEMENTATION_PLAN.md` - Detailed implementation plan

**Key Finding:** ✅ Maya Feed Chat and Blueprint can coexist safely with proper status management.

---

## IMPLEMENTATION ORDER

**⚠️ CRITICAL:** Execute phases in this **exact sequence**. Do not skip phases or change order.

---

## PHASE 0: COMPATIBILITY UPDATES (2-3 hours) 🔴 CRITICAL - DO THIS FIRST

**Purpose:** Update shared infrastructure to support both Maya Feed Chat (9 posts) and Blueprint (12 posts)

### Task 1: Update Feed Strategy Validation (1-2 hours)

**File:** `app/api/feed-planner/create-from-strategy/route.ts`

**Current Code (Line 128-134):**
```typescript
if (strategy.posts.length !== 9) {
  console.error("[FEED-FROM-STRATEGY] Invalid strategy: expected 9 posts, got", strategy.posts.length)
  return NextResponse.json(
    { error: "Strategy must contain exactly 9 posts" },
    { status: 400 }
  )
}
```

**Change To:**
```typescript
// Support both 9 posts (Maya Feed Chat) and 12 posts (Blueprint)
if (strategy.posts.length !== 9 && strategy.posts.length !== 12) {
  console.error("[FEED-FROM-STRATEGY] Invalid strategy: expected 9 or 12 posts, got", strategy.posts.length)
  return NextResponse.json(
    { error: "Strategy must contain exactly 9 posts (Maya Feed Chat) or 12 posts (Blueprint)" },
    { status: 400 }
  )
}
```

**Also Update:**
- Line 31: `getLayoutType` function - Support both `'grid_3x3'` and `'grid_3x4'`
- Line 572: Layout type assignment - Use `strategy.posts.length === 12 ? 'grid_3x4' : 'grid_3x3'`

---

### Task 2: Update Maya Feed Validation (30 minutes)

**File 1:** `app/api/maya/generate-feed/route.ts`

**Current Code (Line 104-110):**
```typescript
if (strategy.posts.length !== 9) {
  console.error(`[generate-feed] ❌ Strategy must have exactly 9 posts, found ${strategy.posts.length}`)
  return NextResponse.json(
    { error: `Strategy must contain exactly 9 posts, found ${strategy.posts.length}` },
    { status: 400 }
  )
}
```

**Change To:**
```typescript
// Support both 9 posts (Maya Feed Chat) and 12 posts (Blueprint)
if (strategy.posts.length !== 9 && strategy.posts.length !== 12) {
  console.error(`[generate-feed] ❌ Strategy must have 9 or 12 posts, found ${strategy.posts.length}`)
  return NextResponse.json(
    { error: `Strategy must contain exactly 9 posts (Maya Feed Chat) or 12 posts (Blueprint), found ${strategy.posts.length}` },
    { status: 400 }
  )
}
```

**File 2:** `app/api/maya/pro/generate-feed/route.ts`

**Current Code (Line 117):**
```typescript
if (strategy.posts.length !== 9) {
  console.error(`[generate-feed-pro] ❌ Strategy must have exactly 9 posts, found ${strategy.posts.length}`)
  return NextResponse.json(
    { error: `Strategy must contain exactly 9 posts, found ${strategy.posts.length}` },
    { status: 400 }
  )
}
```

**Change To:**
```typescript
// Support both 9 posts (Maya Feed Chat) and 12 posts (Blueprint)
if (strategy.posts.length !== 9 && strategy.posts.length !== 12) {
  console.error(`[generate-feed-pro] ❌ Strategy must have 9 or 12 posts, found ${strategy.posts.length}`)
  return NextResponse.json(
    { error: `Strategy must contain exactly 9 posts (Maya Feed Chat) or 12 posts (Blueprint), found ${strategy.posts.length}` },
    { status: 400 }
  )
}
```

**File 3:** `app/api/maya/generate-feed/route.ts` - Position Validation (Line 115)

**Current Code:**
```typescript
if (!post.position || post.position < 1 || post.position > 9) {
  invalidPosts.push(index + 1)
}
```

**Change To:**
```typescript
// Support positions 1-12 (Blueprint) and 1-9 (Maya Feed Chat)
if (!post.position || post.position < 1 || post.position > 12) {
  invalidPosts.push(index + 1)
}
```

**Same change in:** `app/api/maya/pro/generate-feed/route.ts`

---

### Task 3: Add `'grid_3x4'` Layout Type Support (30 minutes)

**File:** `app/api/feed-planner/create-from-strategy/route.ts`

**Update `getLayoutType` function (Line 31):**
```typescript
function getLayoutType(gridPattern: string | undefined, posts: any[]): string {
  if (!posts || posts.length === 0) return "Mixed Layout"
  
  // Support both 9 and 12 post grids
  if (posts.length === 12) return "3x4 Grid"
  if (posts.length === 9) return "3x3 Grid"
  
  // ... rest of function
}
```

**Update layout type assignment (Line 572):**
```typescript
layout_type: getLayoutType(strategy.gridPattern, strategy.posts) || 
  (strategy.posts.length === 12 ? 'grid_3x4' : 'grid_3x3'),
```

**Update UI Components:**
- `components/feed-planner/feed-grid.tsx` - Already handles dynamic grid (will update in Phase 4)
- No other UI changes needed yet

---

### Testing Checklist

- [ ] Maya Feed Chat creates 9-post feed successfully
- [ ] Blueprint can create 12-post feed (test after Phase 4)
- [ ] Both feed types appear in Feed Planner without conflicts
- [ ] Status field separation (`'chat'` vs `'saved'`) works correctly
- [ ] Position validation accepts 1-12
- [ ] Layout type supports both `'grid_3x3'` and `'grid_3x4'`

**✅ STOP AND TEST BEFORE PROCEEDING TO PHASE 1**

---

## PHASE 1: CREDIT-BASED UPSELL MODAL (3-4 hours) 🔴 HIGH

**Purpose:** Convert free users to paid after using 2 credits

### Task 1: Create Upsell Modal Component (2 hours)

**File:** `components/feed-planner/free-mode-upsell-modal.tsx` (NEW)

```typescript
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CreditCard, Sparkles, ArrowRight } from "lucide-react"
import BuyBlueprintModal from "@/components/sselfie/buy-blueprint-modal"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface FreeModeUpsellModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feedId?: number
}

export default function FreeModeUpsellModal({
  open,
  onOpenChange,
  feedId,
}: FreeModeUpsellModalProps) {
  const router = useRouter()
  const [showBlueprintModal, setShowBlueprintModal] = useState(false)

  const handleBuyCredits = () => {
    onOpenChange(false)
    router.push("/account?tab=credits")
  }

  const handleUnlockBlueprint = () => {
    onOpenChange(false)
    setShowBlueprintModal(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif font-light text-stone-900">
              You've Used Your Free Credits
            </DialogTitle>
            <DialogDescription className="text-stone-600">
              Choose how you'd like to continue creating content
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-3">
            {/* Option 1: Buy Credits */}
            <Button
              onClick={handleBuyCredits}
              variant="outline"
              className="w-full justify-start h-auto py-4 px-4 border-2 hover:border-stone-900"
            >
              <div className="flex items-center gap-3 w-full">
                <CreditCard className="w-5 h-5 text-stone-600" />
                <div className="flex-1 text-left">
                  <div className="font-medium text-stone-900">Buy Credits</div>
                  <div className="text-xs text-stone-500">Generate more preview feeds</div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400" />
              </div>
            </Button>

            {/* Option 2: Unlock Full Blueprint */}
            <Button
              onClick={handleUnlockBlueprint}
              className="w-full justify-start h-auto py-4 px-4 bg-stone-900 hover:bg-stone-800"
            >
              <div className="flex items-center gap-3 w-full">
                <Sparkles className="w-5 h-5 text-white" />
                <div className="flex-1 text-left">
                  <div className="font-medium text-white">Unlock Full Blueprint</div>
                  <div className="text-xs text-stone-300">$47 • 60 Credits • Full Feed Planner</div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-300" />
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embedded checkout modal */}
      <BuyBlueprintModal
        open={showBlueprintModal}
        onOpenChange={setShowBlueprintModal}
        feedId={feedId}
      />
    </>
  )
}
```

---

### Task 2: Modify Feed Single Placeholder (1-2 hours)

**File:** `components/feed-planner/feed-single-placeholder.tsx`

**Add Credit Tracking:**

1. **Import useState and useEffect:**
```typescript
import { useState, useEffect } from "react"
import FreeModeUpsellModal from "./free-mode-upsell-modal"
```

2. **Add state for credit tracking:**
```typescript
const [showUpsellModal, setShowUpsellModal] = useState(false)
const [creditsUsed, setCreditsUsed] = useState<number | null>(null)
```

3. **Add credit check on mount (after line 30):**
```typescript
// Check user's credit usage
useEffect(() => {
  const checkCredits = async () => {
    try {
      const response = await fetch("/api/credits/balance")
      if (response.ok) {
        const data = await response.json()
        // Check total_used from user_credits table
        setCreditsUsed(data.total_used || 0)
        
        // Show upsell modal if 2+ credits used
        if (data.total_used >= 2 && !showUpsellModal) {
          setShowUpsellModal(true)
        }
      }
    } catch (error) {
      console.error("[Feed Single Placeholder] Error checking credits:", error)
    }
  }
  
  checkCredits()
}, [showUpsellModal])
```

4. **Replace generic button (lines 178-185) with conditional:**
```typescript
{/* Helper text and Upsell CTA */}
<div className="mt-6 text-center space-y-4">
  <div>
    <p className="text-xs text-stone-500 font-light">
      This is a preview of your feed grid
    </p>
    <p className="text-xs text-stone-400 font-light mt-1">
      Get the full Feed Planner + 30 Photos, Captions & Strategy
    </p>
  </div>
  
  {/* Conditional: Show upsell modal trigger if credits used >= 2, otherwise show generic button */}
  {creditsUsed !== null && creditsUsed >= 2 ? (
    <Button
      onClick={() => setShowUpsellModal(true)}
      className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium shadow-lg hover:shadow-xl transition-all"
      size="default"
    >
      Continue Creating
      <ArrowRight className="w-4 h-4 ml-2" />
    </Button>
  ) : (
    <Button
      onClick={() => setShowBlueprintModal(true)}
      className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium shadow-lg hover:shadow-xl transition-all"
      size="default"
    >
      Unlock Full Feed Planner
      <ArrowRight className="w-4 h-4 ml-2" />
    </Button>
  )}
</div>

{/* Credit-based upsell modal */}
<FreeModeUpsellModal
  open={showUpsellModal}
  onOpenChange={setShowUpsellModal}
  feedId={feedId}
/>
```

**Note:** Keep existing `BuyBlueprintModal` for users with < 2 credits used.

---

### Task 3: Create Credit Balance API (if doesn't exist)

**File:** `app/api/credits/balance/route.ts` (NEW - if needed)

```typescript
import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sql = getDb()
    const [credits] = await sql`
      SELECT balance, total_used, total_purchased
      FROM user_credits
      WHERE user_id = ${user.id}
    ` as any[]

    if (!credits) {
      return NextResponse.json({
        balance: 0,
        total_used: 0,
        total_purchased: 0,
      })
    }

    return NextResponse.json({
      balance: credits.balance || 0,
      total_used: credits.total_used || 0,
      total_purchased: credits.total_purchased || 0,
    })
  } catch (error) {
    console.error("[Credits Balance] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch credits" },
      { status: 500 }
    )
  }
}
```

---

### Testing Checklist

- [ ] Free user generates preview (uses 2 credits)
- [ ] Credit balance API returns `total_used >= 2`
- [ ] Upsell modal appears after 2 credits used
- [ ] "Buy Credits" button links to `/account?tab=credits`
- [ ] "Unlock Full Blueprint" opens checkout modal
- [ ] Modal doesn't appear for users with 0 or 1 credits used
- [ ] Generic button still shows for users with < 2 credits

**✅ STOP AND TEST BEFORE PROCEEDING TO PHASE 2**

---

## PHASE 2: MAYA INTEGRATION FOR PAID MODE (6-8 hours) 🔴 HIGH

**Purpose:** Use Maya to generate unique prompts from preview template for paid users

### Task 1: Create Maya Template Guideline Builder (Optional - 1 hour)

**File:** `lib/feed-planner/maya-template-guideline-builder.ts` (NEW)

```typescript
/**
 * Converts preview template prompt to Maya guideline format
 * Extracts key style elements for Maya to use as reference
 */
export function buildMayaGuidelineFromPreview(previewTemplate: string): string {
  if (!previewTemplate || previewTemplate.trim().length === 0) {
    return ""
  }

  // Extract key elements from template
  const vibeMatch = previewTemplate.match(/Vibe:\s*(.+?)(?:\n|Setting:)/i)
  const settingMatch = previewTemplate.match(/Setting:\s*(.+?)(?:\n|Outfits:)/i)
  const outfitsMatch = previewTemplate.match(/Outfits:\s*(.+?)(?:\n|Color grade:)/i)
  const colorMatch = previewTemplate.match(/Color grade:\s*(.+?)$/i)

  const vibe = vibeMatch ? vibeMatch[1].trim() : ""
  const setting = settingMatch ? settingMatch[1].trim() : ""
  const outfits = outfitsMatch ? outfitsMatch[1].trim() : ""
  const colorGrade = colorMatch ? colorMatch[1].trim() : ""

  // Build guideline instruction for Maya
  let guideline = "Based on this preview template style, generate a unique prompt for this position:\n\n"
  
  if (vibe) guideline += `Vibe: ${vibe}\n`
  if (setting) guideline += `Setting: ${setting}\n`
  if (outfits) guideline += `Outfits: ${outfits}\n`
  if (colorGrade) guideline += `Color grade: ${colorGrade}\n`
  
  guideline += "\nMaintain the same aesthetic, color grading, and style while creating a unique scene for this specific position."

  return guideline
}
```

---

### Task 2: Modify Generate Single Endpoint (5-7 hours)

**File:** `app/api/feed/[feedId]/generate-single/route.ts`

**Add Maya Integration for Paid Users:**

1. **Import access control (if not already):**
```typescript
import { getFeedPlannerAccess } from "@/lib/feed-planner/access-control"
```

2. **Add Maya integration logic (after line 230, before Pro Mode routing):**

```typescript
// Check if user is paid Blueprint user
const access = await getFeedPlannerAccess(user.id.toString())

// If paid user, use Maya to generate prompt from preview template
if (access.isPaidBlueprint) {
  console.log("[v0] [GENERATE-SINGLE] 🎨 Paid Blueprint user - using Maya with preview template")
  
  try {
    // Load preview template from feed_posts[0].prompt (where preview was generated)
    const previewPost = await sql`
      SELECT prompt
      FROM feed_posts
      WHERE feed_layout_id = ${feedId}
      AND position = 1
      ORDER BY created_at ASC
      LIMIT 1
    ` as any[]
    
    if (previewPost.length > 0 && previewPost[0].prompt) {
      const previewTemplate = previewPost[0].prompt
      console.log("[v0] [GENERATE-SINGLE] ✅ Found preview template, length:", previewTemplate.length)
      
      // Get post type from strategy or default
      const postType = post.post_type || 'portrait'
      
      // Build Maya guideline from preview template
      const { buildMayaGuidelineFromPreview } = await import("@/lib/feed-planner/maya-template-guideline-builder")
      const mayaGuideline = buildMayaGuidelineFromPreview(previewTemplate)
      
      // Call Maya to generate unique prompt
      const mayaRequest = new Request(`${req.nextUrl.origin}/api/maya/generate-feed-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-studio-pro-mode': 'true', // Use Pro Mode (Nano Banana)
        },
        body: JSON.stringify({
          postType: postType,
          feedPosition: post.position,
          referencePrompt: previewTemplate, // Pass preview template as guideline
          proMode: true,
          brandVibe: feedLayout.brand_vibe || null,
          colorTheme: feedLayout.color_palette || null,
        }),
      })
      
      const mayaResponse = await fetch(mayaRequest)
      if (!mayaResponse.ok) {
        throw new Error(`Maya prompt generation failed: ${mayaResponse.statusText}`)
      }
      
      const mayaData = await mayaResponse.json()
      if (mayaData.prompt) {
        console.log("[v0] [GENERATE-SINGLE] ✅ Maya generated unique prompt for position", post.position)
        // Use Maya's generated prompt instead of static template
        prompt = mayaData.prompt
      } else {
        console.warn("[v0] [GENERATE-SINGLE] ⚠️ Maya response missing prompt, using fallback")
      }
    } else {
      console.log("[v0] [GENERATE-SINGLE] ⚠️ No preview template found, using default prompt generation")
    }
  } catch (mayaError) {
    console.error("[v0] [GENERATE-SINGLE] ❌ Error calling Maya:", mayaError)
    // Fall back to default prompt generation
    console.log("[v0] [GENERATE-SINGLE] Falling back to default prompt generation")
  }
}
```

**Note:** This code should be placed BEFORE the Pro Mode routing (line 234) so Maya prompt is used for Pro Mode generation.

---

### Testing Checklist

- [ ] Paid user clicks placeholder at position 1
- [ ] System loads preview template from `feed_posts[0].prompt`
- [ ] Maya endpoint is called with preview template as `referencePrompt`
- [ ] Maya generates unique prompt for position 1
- [ ] Image is generated with Maya's prompt
- [ ] Image maintains preview aesthetic (color grade, vibe, style)
- [ ] Test positions 2-12 - each generates unique prompt
- [ ] All images maintain consistent style across positions
- [ ] Free users still use individual image generation (not affected)

**✅ STOP AND TEST BEFORE PROCEEDING TO PHASE 3**

---

## PHASE 3: WELCOME WIZARD (6-8 hours) 🔴 HIGH

**Purpose:** Onboard first-time paid users with tutorial

### Task 1: Create Welcome Wizard Component (4-5 hours)

**File:** `components/feed-planner/welcome-wizard.tsx` (NEW)

```typescript
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronLeft, X, Grid, Image, FileText, Sparkles } from "lucide-react"

interface WelcomeWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

const WELCOME_STEPS = [
  {
    id: "welcome",
    title: "Welcome to Full Feed Planner",
    description: "You now have access to the complete feed planning experience",
    icon: Sparkles,
    content: (
      <div className="space-y-4">
        <p className="text-stone-600">
          With Full Feed Planner, you can:
        </p>
        <ul className="space-y-2 text-stone-600">
          <li className="flex items-start gap-2">
            <span className="text-stone-900">•</span>
            <span>Generate 12 custom images for your Instagram feed</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-stone-900">•</span>
            <span>Get AI-generated captions for each post</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-stone-900">•</span>
            <span>Create a complete Instagram strategy document</span>
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "generate",
    title: "Generate Your Grid",
    description: "Click each placeholder to generate images one by one",
    icon: Grid,
    content: (
      <div className="space-y-4">
        <p className="text-stone-600">
          Your feed has 12 placeholders. Click each one to generate a unique image.
        </p>
        <p className="text-stone-600">
          Each image will maintain your preview style while being unique to that position.
        </p>
      </div>
    ),
  },
  {
    id: "tabs",
    title: "Add Captions & Strategy",
    description: "Use the tabs to enhance your feed",
    icon: FileText,
    content: (
      <div className="space-y-4">
        <p className="text-stone-600">
          <strong>Posts Tab:</strong> Generate AI captions for each post
        </p>
        <p className="text-stone-600">
          <strong>Strategy Tab:</strong> Create a complete Instagram strategy document
        </p>
      </div>
    ),
  },
  {
    id: "ready",
    title: "You're Ready!",
    description: "Start creating your feed",
    icon: Sparkles,
    content: (
      <div className="space-y-4">
        <p className="text-stone-600">
          You're all set! Start generating your feed images and building your Instagram presence.
        </p>
      </div>
    ),
  },
]

export default function WelcomeWizard({ open, onOpenChange, onComplete }: WelcomeWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const step = WELCOME_STEPS[currentStep]
  const Icon = step.icon

  const handleNext = () => {
    if (currentStep < WELCOME_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    try {
      // Mark welcome wizard as shown
      await fetch("/api/feed-planner/welcome-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shown: true }),
      })
      onComplete()
      onOpenChange(false)
    } catch (error) {
      console.error("[Welcome Wizard] Error marking as shown:", error)
      onComplete()
      onOpenChange(false)
    }
  }

  const handleSkip = () => {
    handleComplete()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-serif font-light text-stone-900">
              {step.title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-stone-600 mt-2">{step.description}</p>
        </DialogHeader>

        <div className="mt-6">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
              <Icon className="w-8 h-8 text-stone-600" />
            </div>
          </div>
          {step.content}
        </div>

        {/* Progress indicator */}
        <div className="mt-6 flex items-center justify-center gap-2">
          {WELCOME_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full ${
                index === currentStep ? "bg-stone-900" : "bg-stone-300"
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          <Button onClick={handleNext}>
            {currentStep === WELCOME_STEPS.length - 1 ? "Get Started" : "Next"}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

### Task 2: Create Welcome Status API (1 hour)

**File:** `app/api/feed-planner/welcome-status/route.ts` (NEW)

```typescript
import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db"

// GET: Check if welcome wizard has been shown
export async function GET(req: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sql = getDb()
    const [brandProfile] = await sql`
      SELECT feed_planner_welcome_shown
      FROM user_personal_brand
      WHERE user_id = ${user.id}
    ` as any[]

    return NextResponse.json({
      shown: brandProfile?.feed_planner_welcome_shown || false,
    })
  } catch (error) {
    console.error("[Welcome Status] Error:", error)
    return NextResponse.json(
      { error: "Failed to check welcome status" },
      { status: 500 }
    )
  }
}

// POST: Mark welcome wizard as shown
export async function POST(req: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { shown } = await req.json()
    const sql = getDb()

    // Update or insert welcome status
    await sql`
      INSERT INTO user_personal_brand (user_id, feed_planner_welcome_shown)
      VALUES (${user.id}, ${shown})
      ON CONFLICT (user_id)
      DO UPDATE SET feed_planner_welcome_shown = ${shown}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Welcome Status] Error:", error)
    return NextResponse.json(
      { error: "Failed to update welcome status" },
      { status: 500 }
    )
  }
}
```

---

### Task 3: Database Migration (30 minutes)

**File:** `scripts/migrations/add-welcome-status-field.sql` (NEW)

```sql
-- Add feed_planner_welcome_shown field to user_personal_brand
ALTER TABLE user_personal_brand
ADD COLUMN IF NOT EXISTS feed_planner_welcome_shown BOOLEAN DEFAULT false;
```

**File:** `scripts/migrations/run-welcome-status-migration.ts` (NEW)

```typescript
import { neon } from "@neondatabase/serverless"
import * as fs from "fs"
import * as path from "path"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL || "")

async function runMigration() {
  try {
    console.log("[Migration] Adding feed_planner_welcome_shown field...")
    
    const migrationSQL = fs.readFileSync(
      path.join(process.cwd(), "scripts/migrations/add-welcome-status-field.sql"),
      "utf-8"
    )
    
    await sql(migrationSQL)
    
    console.log("[Migration] ✅ Welcome status field added successfully")
  } catch (error) {
    console.error("[Migration] ❌ Error:", error)
    process.exit(1)
  }
}

runMigration()
```

**Run migration:**
```bash
npx tsx scripts/migrations/run-welcome-status-migration.ts
```

---

### Task 4: Integrate into Feed Planner Client (1 hour)

**File:** `app/feed-planner/feed-planner-client.tsx`

**Add welcome wizard check:**

1. **Import WelcomeWizard:**
```typescript
import WelcomeWizard from "@/components/feed-planner/welcome-wizard"
```

2. **Add state:**
```typescript
const [showWelcomeWizard, setShowWelcomeWizard] = useState(false)
```

3. **Add useEffect to check welcome status (after access check):**
```typescript
// Check welcome wizard status for paid users
useEffect(() => {
  const checkWelcomeStatus = async () => {
    if (access?.isPaidBlueprint && !isLoading) {
      try {
        const response = await fetch("/api/feed-planner/welcome-status")
        if (response.ok) {
          const data = await response.json()
          if (!data.shown) {
            setShowWelcomeWizard(true)
          }
        }
      } catch (error) {
        console.error("[Feed Planner] Error checking welcome status:", error)
      }
    }
  }
  
  checkWelcomeStatus()
}, [access?.isPaidBlueprint, isLoading])
```

4. **Add WelcomeWizard component:**
```typescript
<WelcomeWizard
  open={showWelcomeWizard}
  onOpenChange={setShowWelcomeWizard}
  onComplete={() => setShowWelcomeWizard(false)}
/>
```

---

### Testing Checklist

- [ ] New paid user lands on feed planner
- [ ] Welcome wizard appears automatically
- [ ] Can navigate through all 4 steps
- [ ] "Skip" button closes wizard
- [ ] Wizard doesn't show on subsequent visits
- [ ] Free users don't see welcome wizard
- [ ] Welcome status saved to database

**✅ STOP AND TEST BEFORE PROCEEDING TO PHASE 4**

---

## PHASE 4: GRID EXTENSION (3-4 hours) 🟡 MEDIUM

**Purpose:** Extend paid grid from 9 to 12 posts (3x3 → 3x4)

### Task 1: Update Feed Grid Component (1-2 hours)

**File:** `components/feed-planner/feed-grid.tsx`

**Change grid layout from 3x3 to 3x4:**

1. **Find grid container (usually `grid-cols-3`):**
```typescript
// Change from:
<div className="grid grid-cols-3 gap-1 bg-stone-100 p-1 rounded-xl">

// To:
<div className="grid grid-cols-4 gap-1 bg-stone-100 p-1 rounded-xl">
```

2. **Update post mapping to handle 12 posts:**
```typescript
// Ensure posts array includes positions 1-12
// Filter and sort posts by position
const sortedPosts = posts
  .filter((post) => post.position >= 1 && post.position <= 12)
  .sort((a, b) => a.position - b.position)
```

3. **Update placeholder generation (if needed):**
```typescript
// Generate placeholders for positions 1-12
const allPositions = Array.from({ length: 12 }, (_, i) => i + 1)
const existingPositions = sortedPosts.map((p) => p.position)
const missingPositions = allPositions.filter((pos) => !existingPositions.includes(pos))
```

---

### Task 2: Update Expand for Paid Endpoint (1-2 hours)

**File:** `app/api/feed/expand-for-paid/route.ts`

**Change from 9 to 12 posts:**

1. **Find position array creation:**
```typescript
// Change from:
const positions = [2, 3, 4, 5, 6, 7, 8, 9]

// To:
const positions = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
```

2. **Update any validation:**
```typescript
// Ensure validation allows 12 posts
// Check if any validation limits to 9 posts and update
```

---

### Testing Checklist

- [ ] Paid grid displays 3x4 layout (12 posts)
- [ ] All 12 positions have placeholders
- [ ] Free user upgrades → webhook creates posts 2-12
- [ ] All 12 positions can generate images
- [ ] Maya Feed Chat still shows 3x3 grid (9 posts) - no conflicts
- [ ] Grid is responsive on mobile

**✅ STOP AND TEST BEFORE PROCEEDING TO PHASE 5**

---

## PHASE 5: FEED HISTORY ORGANIZATION (4-6 hours) 🟡 MEDIUM

**Purpose:** Add color coding, renaming, and preview storage in feed history

### Task 1: Database Migration (1 hour)

**File:** `scripts/migrations/add-feed-organization-fields.sql` (NEW)

```sql
-- Add organization fields to feed_layouts
ALTER TABLE feed_layouts
ADD COLUMN IF NOT EXISTS color_code VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS preview_image_url TEXT DEFAULT NULL;
```

**File:** `scripts/migrations/run-feed-organization-migration.ts` (NEW)

```typescript
import { neon } from "@neondatabase/serverless"
import * as fs from "fs"
import * as path from "path"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL || "")

async function runMigration() {
  try {
    console.log("[Migration] Adding feed organization fields...")
    
    const migrationSQL = fs.readFileSync(
      path.join(process.cwd(), "scripts/migrations/add-feed-organization-fields.sql"),
      "utf-8"
    )
    
    await sql(migrationSQL)
    
    console.log("[Migration] ✅ Feed organization fields added successfully")
  } catch (error) {
    console.error("[Migration] ❌ Error:", error)
    process.exit(1)
  }
}

runMigration()
```

**Run migration:**
```bash
npx tsx scripts/migrations/run-feed-organization-migration.ts
```

---

### Task 2: Update Feed Header Component (2-3 hours)

**File:** `components/feed-planner/feed-header.tsx`

**Add organization features:**

1. **Add color picker:**
```typescript
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Palette } from "lucide-react"

const COLORS = [
  { name: "Stone", value: "stone", hex: "#78716c" },
  { name: "Red", value: "red", hex: "#ef4444" },
  { name: "Blue", value: "blue", hex: "#3b82f6" },
  { name: "Green", value: "green", hex: "#22c55e" },
  { name: "Purple", value: "purple", hex: "#a855f7" },
  { name: "Pink", value: "pink", hex: "#ec4899" },
]

// Add color picker UI
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" size="sm">
      <Palette className="w-4 h-4 mr-2" />
      Color
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    <div className="grid grid-cols-3 gap-2">
      {COLORS.map((color) => (
        <button
          key={color.value}
          onClick={() => handleColorChange(color.value)}
          className="w-8 h-8 rounded-full border-2 border-stone-300"
          style={{ backgroundColor: color.hex }}
        />
      ))}
    </div>
  </PopoverContent>
</Popover>
```

2. **Add rename functionality:**
```typescript
import { Pencil } from "lucide-react"
import { Input } from "@/components/ui/input"

const [isRenaming, setIsRenaming] = useState(false)
const [newName, setNewName] = useState(feed?.title || "")

const handleRename = async () => {
  if (newName.trim()) {
    await fetch(`/api/feed/${feedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: newName.trim() }),
    })
    setIsRenaming(false)
    // Refresh feed data
  }
}
```

---

### Task 3: Update Feed List API (30 minutes)

**File:** `app/api/feed/list/route.ts`

**Include organization fields:**
```typescript
SELECT 
  id,
  title,
  display_name,  // Add this
  color_code,    // Add this
  preview_image_url,  // Add this
  status,
  created_at
FROM feed_layouts
WHERE user_id = ${user.id}
AND status = 'saved'  // Include preview feeds
ORDER BY created_at DESC
```

---

### Task 4: Update Create Free Example (30 minutes)

**File:** `app/api/feed/create-free-example/route.ts`

**Save preview image URL:**
```typescript
// After preview generation, update feed_layouts
await sql`
  UPDATE feed_layouts
  SET preview_image_url = ${previewImageUrl}
  WHERE id = ${feedId}
`
```

---

### Testing Checklist

- [ ] Can rename feeds
- [ ] Can assign colors to feeds
- [ ] Colors and names display in feed selector
- [ ] Preview feeds appear in feed history
- [ ] Preview feeds show grid image in history view
- [ ] Organization persists after page refresh

---

## FINAL TESTING CHECKLIST

After all phases complete, test end-to-end:

### Free User Journey
- [ ] Sign up with 2 credits
- [ ] Complete unified onboarding wizard
- [ ] Generate 3x4 preview grid (uses 2 credits)
- [ ] Preview displays correctly
- [ ] Upsell modal appears
- [ ] Can click "Buy Credits" or "Unlock Full Blueprint"

### Paid User Journey
- [ ] Purchase paid blueprint ($47, 60 credits)
- [ ] Welcome wizard appears
- [ ] Can navigate through tutorial
- [ ] See 3x4 grid (12 placeholders)
- [ ] Click placeholder → Maya generates unique prompt
- [ ] Image maintains preview aesthetic
- [ ] Can generate all 12 images
- [ ] Can rename and color code feed
- [ ] Previous preview appears in feed history

### Compatibility Testing
- [ ] Maya Feed Chat still creates 9-post feeds
- [ ] Maya Feed Chat feeds don't interfere with Blueprint
- [ ] Both systems share APIs without conflicts
- [ ] Status field separation works correctly

---

## CRITICAL REMINDERS

### DO NOT BREAK
- ✅ Free mode preview generation (already working)
- ✅ Individual image generation (already working)
- ✅ Maya Feed Chat (must continue working)
- ✅ `/api/feed/create-free-example` (keep as-is)
- ✅ `components/feed-planner/hooks/use-feed-polling.ts` (keep as-is)

### ADDITIVE CHANGES ONLY
- Add new features, don't replace working ones
- Preserve existing functionality at all times
- Test compatibility after each phase

---

## IMPLEMENTATION RULES

1. **Execute phases in order** - Do not skip or reorder
2. **Test after each phase** - Stop and verify before proceeding
3. **Document changes** - Update CHANGELOG.md after each phase
4. **Preserve working features** - Do not break existing functionality
5. **Share infrastructure** - Reuse existing APIs and components

---

## SUCCESS CRITERIA

✅ Phase 0: Maya Feed Chat and Blueprint both work without conflicts  
✅ Phase 1: Free users see credit-based upsell after using 2 credits  
✅ Phase 2: Paid users get Maya-generated unique prompts  
✅ Phase 3: New paid users see welcome wizard once  
✅ Phase 4: Paid grid shows 3x4 (12 posts)  
✅ Phase 5: Feeds can be organized with colors and names  

---

**BEGIN IMPLEMENTATION WITH PHASE 0**

Report progress after completing each phase.

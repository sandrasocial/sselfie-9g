/**
 * Feed Planner Issues Diagnostic Test
 * 
 * This script tests all identified issues in the Feed Planner:
 * 1. Button loading state
 * 2. API endpoint flow
 * 3. Queue function prerequisites
 * 4. Error handling
 * 5. Progress tracking
 * 
 * Run with: npx tsx scripts/test-feed-planner-issues.ts
 */

import { readFileSync } from "fs"
import { join } from "path"

interface TestResult {
  name: string
  passed: boolean
  error?: string
  details?: string
}

const results: TestResult[] = []

function test(name: string, fn: () => boolean | { passed: boolean; error?: string; details?: string }): void {
  try {
    const result = fn()
    if (typeof result === "boolean") {
      results.push({ name, passed: result })
    } else {
      results.push({ name, passed: result.passed, error: result.error, details: result.details })
    }
  } catch (error) {
    results.push({
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

console.log("🧪 Feed Planner Issues Diagnostic Test\n")
console.log("=" .repeat(60))

// ============================================================================
// TEST 1: Button Loading State
// ============================================================================
console.log("\n📋 TEST 1: Button Loading State")

test("StrategyPreview receives isCreating prop", () => {
  const filePath = join(process.cwd(), "components/feed-planner/strategy-preview.tsx")
  const content = readFileSync(filePath, "utf-8")
  
  // Check if component accepts isCreating prop
  const hasIsCreatingProp = /isCreating|isCreatingStrategy/.test(content)
  
  // Check if button uses loading state
  const buttonUsesLoading = /disabled.*isCreating|isCreating.*disabled/.test(content)
  
  // Check if button shows spinner (allow multiline matching)
  const buttonShowsSpinner = /Loader2[\s\S]*?isCreating|isCreating[\s\S]*?Loader2|animate-spin[\s\S]*?isCreating/.test(content)
  
  if (!hasIsCreatingProp) {
    return {
      passed: false,
      error: "StrategyPreview component does not accept isCreating prop",
      details: "Component needs to accept isCreating prop to show loading state",
    }
  }
  
  if (!buttonUsesLoading) {
    return {
      passed: false,
      error: "Button does not use loading state",
      details: "Button should be disabled when isCreating is true",
    }
  }
  
  if (!buttonShowsSpinner) {
    return {
      passed: false,
      error: "Button does not show spinner when loading",
      details: "Button should show Loader2 spinner when isCreating is true",
    }
  }
  
  return true
})

test("FeedPlannerScreen passes isCreatingStrategy to StrategyPreview", () => {
  const filePath = join(process.cwd(), "components/feed-planner/feed-planner-screen.tsx")
  const content = readFileSync(filePath, "utf-8")
  
  // Check if StrategyPreview is called with isCreating prop
  const passesIsCreating = /StrategyPreview[\s\S]*?isCreating|isCreatingStrategy.*StrategyPreview/.test(content)
  
  if (!passesIsCreating) {
    return {
      passed: false,
      error: "FeedPlannerScreen does not pass isCreatingStrategy to StrategyPreview",
      details: "Need to pass isCreating={isCreatingStrategy} to StrategyPreview component",
    }
  }
  
  return true
})

// ============================================================================
// TEST 2: API Endpoint Flow
// ============================================================================
console.log("\n📋 TEST 2: API Endpoint Flow")

test("create-from-strategy endpoint validates prerequisites", () => {
  const filePath = join(process.cwd(), "app/api/feed-planner/create-from-strategy/route.ts")
  const content = readFileSync(filePath, "utf-8")
  
  // Check if it validates trained model before queueing
  const validatesModel = /trained.*model|user_models.*training_status.*completed/.test(content)
  
  // Check if it validates avatar images for Pro Mode
  const validatesAvatars = /avatar.*images|user_avatar_images.*3/.test(content)
  
  // Check if it validates credits before queueing
  const validatesCredits = /checkCredits|getUserCredits/.test(content)
  
  if (!validatesCredits) {
    return {
      passed: false,
      error: "Endpoint does not validate credits before queueing",
      details: "Should check credits before calling queueAllImagesForFeed",
    }
  }
  
  return {
    passed: true,
    details: `Model validation: ${validatesModel ? "✅" : "⚠️"}, Avatar validation: ${validatesAvatars ? "✅" : "⚠️"}, Credits validation: ✅`,
  }
})

test("create-from-strategy handles queue errors", () => {
  const filePath = join(process.cwd(), "app/api/feed-planner/create-from-strategy/route.ts")
  const content = readFileSync(filePath, "utf-8")
  
  // Check if queue is called with error handling
  const hasErrorHandling = /queueAllImagesForFeed[\s\S]*?catch|\.catch\(/.test(content)
  
  // Check if errors are returned to user (not just logged) - check after await queue call
  const awaitQueueMatch = content.match(/await\s+queueAllImagesForFeed[\s\S]{0,500}/)
  const returnsErrors = awaitQueueMatch ? /NextResponse\.json[\s\S]*?error|return[\s\S]*?error/.test(awaitQueueMatch[0] + (content.split(awaitQueueMatch[0])[1]?.substring(0, 500) || "")) : false
  
  if (!hasErrorHandling) {
    return {
      passed: false,
      error: "Queue function called without error handling",
      details: "queueAllImagesForFeed should be wrapped in try-catch or have .catch() handler",
    }
  }
  
  if (!returnsErrors) {
    return {
      passed: false,
      error: "Queue errors are not returned to user",
      details: "Errors should be returned in API response, not just logged",
    }
  }
  
  return true
})

// ============================================================================
// TEST 3: Queue Function Prerequisites
// ============================================================================
console.log("\n📋 TEST 3: Queue Function Prerequisites")

test("queueAllImagesForFeed checks for trained model", () => {
  const filePath = join(process.cwd(), "lib/feed-planner/queue-images.ts")
  const content = readFileSync(filePath, "utf-8")
  
  // Check if it queries for trained model
  const checksModel = /user_models.*training_status.*completed|trained.*model/.test(content)
  
  // Check if it throws error if no model
  const throwsIfNoModel = /throw.*Error.*model|No trained model/.test(content)
  
  if (!checksModel) {
    return {
      passed: false,
      error: "Queue function does not check for trained model",
      details: "Should query user_models table for completed training",
    }
  }
  
  if (!throwsIfNoModel) {
    return {
      passed: false,
      error: "Queue function does not throw error if no model",
      details: "Should throw error if no trained model found (for Classic Mode posts)",
    }
  }
  
  return true
})

test("queueAllImagesForFeed checks for avatar images (Pro Mode)", () => {
  const filePath = join(process.cwd(), "lib/feed-planner/queue-images.ts")
  const content = readFileSync(filePath, "utf-8")
  
  // Check if it queries for avatar images
  const checksAvatars = /user_avatar_images|avatar.*images/.test(content)
  
  // Check if it validates minimum count (3)
  const validatesCount = /avatarImages\.length.*3|length.*>=.*3/.test(content)
  
  // Check if it throws error if insufficient
  const throwsIfInsufficient = /throw.*Error.*avatar|Pro Mode requires.*avatar/.test(content)
  
  if (!checksAvatars) {
    return {
      passed: false,
      error: "Queue function does not check for avatar images",
      details: "Should query user_avatar_images table for Pro Mode posts",
    }
  }
  
  if (!validatesCount || !throwsIfInsufficient) {
    return {
      passed: false,
      error: "Queue function does not validate minimum avatar count",
      details: "Should throw error if less than 3 avatar images (Pro Mode requirement)",
    }
  }
  
  return true
})

test("queueAllImagesForFeed checks credits before queueing", () => {
  const filePath = join(process.cwd(), "lib/feed-planner/queue-images.ts")
  const content = readFileSync(filePath, "utf-8")
  
  // Check if it checks credits
  const checksCredits = /checkCredits|getUserCredits/.test(content)
  
  // Check if it throws error if insufficient
  const throwsIfInsufficient = /throw.*Error.*credit|Insufficient credits/.test(content)
  
  if (!checksCredits) {
    return {
      passed: false,
      error: "Queue function does not check credits",
      details: "Should check credits before queueing images",
    }
  }
  
  if (!throwsIfInsufficient) {
    return {
      passed: false,
      error: "Queue function does not throw error if insufficient credits",
      details: "Should throw error if user doesn't have enough credits",
    }
  }
  
  return true
})

// ============================================================================
// TEST 4: Error Handling
// ============================================================================
console.log("\n📋 TEST 4: Error Handling")

test("Queue errors are surfaced to user", () => {
  const createFromStrategyPath = join(process.cwd(), "app/api/feed-planner/create-from-strategy/route.ts")
  const content = readFileSync(createFromStrategyPath, "utf-8")
  
  // Check if queue is awaited (not fire-and-forget)
  const isAwaited = /await.*queueAllImagesForFeed/.test(content)
  
  // Check if errors are caught and returned
  const catchesErrors = /catch.*queueAllImagesForFeed|queueAllImagesForFeed[\s\S]*?catch/.test(content)
  
  // Check if errors are returned in response - check after await queue call
  const awaitQueueMatch = content.match(/await\s+queueAllImagesForFeed[\s\S]{0,500}/)
  const returnsErrors = awaitQueueMatch ? /NextResponse\.json[\s\S]*?error/.test(awaitQueueMatch[0] + (content.split(awaitQueueMatch[0])[1]?.substring(0, 500) || "")) : false
  
  if (!isAwaited) {
    return {
      passed: false,
      error: "Queue function is fire-and-forget (not awaited)",
      details: "Should await queueAllImagesForFeed to catch errors",
    }
  }
  
  if (!catchesErrors || !returnsErrors) {
    return {
      passed: false,
      error: "Queue errors are not surfaced to user",
      details: "Errors should be caught and returned in API response",
    }
  }
  
  return true
})

test("FeedPlannerScreen handles API errors", () => {
  const filePath = join(process.cwd(), "components/feed-planner/feed-planner-screen.tsx")
  const content = readFileSync(filePath, "utf-8")
  
  // Check if handleCreateFeed has error handling
  const hasErrorHandling = /handleCreateFeed[\s\S]*?catch|try[\s\S]*?handleCreateFeed/.test(content)
  
  // Check if errors are shown to user (toast) - check in catch block of handleCreateFeed
  const catchBlockMatch = content.match(/handleCreateFeed[\s\S]*?catch\s*\([^)]*\)\s*\{[\s\S]{0,300}/)
  const showsErrors = catchBlockMatch ? /toast[\s\S]*?error|toast[\s\S]*?destructive|error[\s\S]*?toast/.test(catchBlockMatch[0]) : false
  
  if (!hasErrorHandling) {
    return {
      passed: false,
      error: "handleCreateFeed does not have error handling",
      details: "Should wrap API call in try-catch",
    }
  }
  
  if (!showsErrors) {
    return {
      passed: false,
      error: "Errors are not shown to user",
      details: "Should show error toast when API call fails",
    }
  }
  
  return true
})

// ============================================================================
// TEST 5: Progress Tracking
// ============================================================================
console.log("\n📋 TEST 5: Progress Tracking")

test("InstagramFeedView calculates progress correctly", () => {
  const filePath = join(process.cwd(), "components/feed-planner/instagram-feed-view.tsx")
  const content = readFileSync(filePath, "utf-8")
  
  // Check if it calculates readyPosts
  const calculatesReady = /readyPosts|isComplete/.test(content)
  
  // Check if it calculates totalPosts
  const calculatesTotal = /totalPosts|posts\.length/.test(content)
  
  // Check if it calculates progress percentage
  const calculatesProgress = /progress.*=|Math\.round.*readyPosts.*totalPosts/.test(content)
  
  if (!calculatesReady || !calculatesTotal || !calculatesProgress) {
    return {
      passed: false,
      error: "Progress calculation is missing or incorrect",
      details: "Should calculate readyPosts, totalPosts, and progress percentage",
    }
  }
  
  return true
})

test("Progress updates when posts complete", () => {
  const filePath = join(process.cwd(), "components/feed-planner/instagram-feed-view.tsx")
  const content = readFileSync(filePath, "utf-8")
  
  // Check if it polls for updates
  const pollsForUpdates = /refreshInterval|useSWR.*refreshInterval/.test(content)
  
  // Check if it checks generation_status
  const checksStatus = /generation_status|prediction_id/.test(content)
  
  if (!pollsForUpdates) {
    return {
      passed: false,
      error: "Feed view does not poll for progress updates",
      details: "Should use SWR with refreshInterval to poll for post completion",
    }
  }
  
  if (!checksStatus) {
    return {
      passed: false,
      error: "Feed view does not check generation status",
      details: "Should check generation_status and prediction_id to determine progress",
    }
  }
  
  return true
})

// ============================================================================
// TEST 6: Loading Overlay
// ============================================================================
console.log("\n📋 TEST 6: Loading Overlay")

test("Loading overlay shown during API call", () => {
  const filePath = join(process.cwd(), "components/feed-planner/feed-planner-screen.tsx")
  const content = readFileSync(filePath, "utf-8")
  
  // Check if there's a loading overlay component or state (allow multiline)
  const hasLoadingOverlay = /loading[\s\S]*?overlay|isCreatingStrategy[\s\S]*?overlay|Loader2[\s\S]*?overlay/i.test(content)
  
  // Check if overlay is shown when isCreatingStrategy is true (allow multiline)
  const showsWhenCreating = /isCreatingStrategy[\s\S]*?\?|isCreatingStrategy[\s\S]*?&&/.test(content)
  
  if (!hasLoadingOverlay || !showsWhenCreating) {
    return {
      passed: false,
      error: "No loading overlay shown during API call",
      details: "Should show loading overlay when isCreatingStrategy is true",
    }
  }
  
  return true
})

// ============================================================================
// SUMMARY
// ============================================================================
console.log("\n" + "=".repeat(60))
console.log("\n📊 TEST RESULTS SUMMARY\n")

const passed = results.filter((r) => r.passed).length
const failed = results.filter((r) => !r.passed).length

results.forEach((result, index) => {
  const icon = result.passed ? "✅" : "❌"
  console.log(`${icon} ${index + 1}. ${result.name}`)
  if (!result.passed) {
    console.log(`   Error: ${result.error}`)
    if (result.details) {
      console.log(`   Details: ${result.details}`)
    }
  } else if (result.details) {
    console.log(`   ${result.details}`)
  }
})

console.log("\n" + "=".repeat(60))
console.log(`\n✅ Passed: ${passed}/${results.length}`)
console.log(`❌ Failed: ${failed}/${results.length}`)

if (failed > 0) {
  console.log("\n⚠️  Issues found! See details above.")
  console.log("\n📝 Next steps:")
  console.log("   1. Review failed tests above")
  console.log("   2. Check the analysis document: docs/feed-planner/FEED_PLANNER_LOADING_STATE_ANALYSIS.md")
  console.log("   3. Implement fixes for failed tests")
  process.exit(1)
} else {
  console.log("\n🎉 All tests passed!")
  process.exit(0)
}


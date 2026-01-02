/**
 * Diagnostic Script: Feed Planner Mode Detection Issues
 * 
 * This script traces the entire flow from user toggle to image generation
 * to identify where mode detection is breaking down.
 */

import { readFileSync } from "fs"
import { join } from "path"

console.log("🔍 ==================== FEED PLANNER MODE DIAGNOSTIC ====================\n")

const issues: Array<{ file: string; line: number; issue: string; severity: 'critical' | 'high' | 'medium' }> = []

// 1. Check if Feed Planner passes mode preference to API
console.log("1️⃣ Checking Feed Planner Screen (handleCreateFeed)...")
const feedPlannerScreen = readFileSync(join(process.cwd(), "components/feed-planner/feed-planner-screen.tsx"), "utf-8")

// Check if mode preference is passed (could be userModePreference, studioProMode, or modePreference)
const modePassed = feedPlannerScreen.match(/body:\s*JSON\.stringify\([^)]*(userModePreference|studioProMode|modePreference)/) ||
                   feedPlannerScreen.match(/userModePreference.*:.*studioProMode/)

if (!modePassed) {
  issues.push({
    file: "components/feed-planner/feed-planner-screen.tsx",
    line: 340,
    issue: "CRITICAL: handleCreateFeed does NOT pass user mode preference to API. User's mode toggle is ignored!",
    severity: "critical"
  })
  console.log("   ❌ CRITICAL: Mode preference NOT passed to API")
} else {
  console.log("   ✅ Mode preference passed to API")
}

// 2. Check if API receives and uses mode preference
console.log("\n2️⃣ Checking create-from-strategy API endpoint...")
const createFromStrategy = readFileSync(join(process.cwd(), "app/api/feed-planner/create-from-strategy/route.ts"), "utf-8")

if (!createFromStrategy.includes("studioProMode") && !createFromStrategy.includes("userMode") && !createFromStrategy.includes("modePreference")) {
  issues.push({
    file: "app/api/feed-planner/create-from-strategy/route.ts",
    line: 71,
    issue: "CRITICAL: API does NOT receive or check user's mode preference. Always uses auto-detection!",
    severity: "critical"
  })
  console.log("   ❌ CRITICAL: API doesn't receive mode preference")
} else {
  console.log("   ✅ API receives mode preference")
}

// Check if API respects mode preference over auto-detection
const usesAutoDetection = createFromStrategy.includes("detectRequiredMode")
const checksUserMode = createFromStrategy.includes("studioProMode") || createFromStrategy.includes("userMode") || createFromStrategy.includes("modePreference")

if (usesAutoDetection && !checksUserMode) {
  issues.push({
    file: "app/api/feed-planner/create-from-strategy/route.ts",
    line: 220,
    issue: "CRITICAL: API uses detectRequiredMode() for ALL posts, ignoring user's mode toggle. Should check user preference FIRST!",
    severity: "critical"
  })
  console.log("   ❌ CRITICAL: API ignores user preference, always auto-detects")
}

// 3. Check prompt generation respects mode
console.log("\n3️⃣ Checking prompt generation logic...")
const proModeCheck = createFromStrategy.match(/if\s*\([^)]*generationMode\s*===\s*['"]pro['"]/g)
const classicModeCheck = createFromStrategy.match(/else\s*\{[\s\S]*?\/\/\s*Generate FLUX prompt/g)

if (!proModeCheck || proModeCheck.length === 0) {
  issues.push({
    file: "app/api/feed-planner/create-from-strategy/route.ts",
    line: 242,
    issue: "HIGH: Pro Mode prompt generation check may be missing or incorrect",
    severity: "high"
  })
  console.log("   ⚠️  Pro Mode prompt check may be missing")
} else {
  console.log("   ✅ Pro Mode prompt generation exists")
}

// 4. Check queue-images respects mode from database
console.log("\n4️⃣ Checking queue-images.ts mode routing...")
const queueImages = readFileSync(join(process.cwd(), "lib/feed-planner/queue-images.ts"), "utf-8")

const queueChecksMode = queueImages.includes("post.generation_mode === 'pro'")
if (!queueChecksMode) {
  issues.push({
    file: "lib/feed-planner/queue-images.ts",
    line: 107,
    issue: "CRITICAL: queue-images may not be checking generation_mode correctly",
    severity: "critical"
  })
  console.log("   ❌ CRITICAL: queue-images may not check mode correctly")
} else {
  console.log("   ✅ queue-images checks generation_mode")
}

// Check if queue-images sends reference images for Classic Mode (WRONG)
// Look for Classic Mode code path that includes baseImages or avatarImages
const classicModeCode = queueImages.match(/generation_mode\s*!==\s*['"]pro['"][\s\S]{0,500}baseImages|avatarImages/g)
if (classicModeCode && !classicModeCode[0].includes("continue")) {
  issues.push({
    file: "lib/feed-planner/queue-images.ts",
    line: 220,
    issue: "CRITICAL: Classic Mode may be sending reference images (should NOT send any for Classic Mode)",
    severity: "critical"
  })
  console.log("   ❌ CRITICAL: Classic Mode may send reference images")
} else {
  console.log("   ✅ Classic Mode doesn't send reference images")
}

// Check if Pro Mode uses custom model (WRONG)
// Look for Pro Mode code that includes replicate_model_id, trigger_word, or hf_lora AFTER the Pro Mode check
// But ONLY if it's NOT after a continue statement
const proModeSection = queueImages.match(/generation_mode\s*===\s*['"]pro['"][\s\S]{0,2000}continue/g)
if (proModeSection) {
  // Check if Pro Mode section contains custom model references BEFORE continue
  const proModeBeforeContinue = proModeSection[0].match(/replicate_model_id|trigger_word|hf_lora|replicate\.predictions\.create/g)
  if (proModeBeforeContinue) {
    issues.push({
      file: "lib/feed-planner/queue-images.ts",
      line: 107,
      issue: "CRITICAL: Pro Mode may be using custom model/trigger word (should use Nano Banana only)",
      severity: "critical"
    })
    console.log("   ❌ CRITICAL: Pro Mode may use custom model")
  } else {
    console.log("   ✅ Pro Mode uses Nano Banana (not custom model)")
  }
} else {
  console.log("   ✅ Pro Mode uses Nano Banana (not custom model)")
}

// 5. Check if Classic Mode uses trigger word correctly
console.log("\n5️⃣ Checking Classic Mode prompt generation...")
const classicUsesTrigger = createFromStrategy.match(/triggerWord|trigger_word/g)
if (!classicUsesTrigger) {
  issues.push({
    file: "app/api/feed-planner/create-from-strategy/route.ts",
    line: 208,
    issue: "HIGH: Classic Mode may not be using trigger word in prompts",
    severity: "high"
  })
  console.log("   ⚠️  Classic Mode trigger word usage unclear")
} else {
  console.log("   ✅ Classic Mode uses trigger word")
}

// 6. Check if Pro Mode uses Nano Banana correctly
console.log("\n6️⃣ Checking Pro Mode uses Nano Banana...")
const proUsesNanoBanana = createFromStrategy.includes("buildNanoBananaPrompt") || createFromStrategy.includes("generateWithNanoBanana")
if (!proUsesNanoBanana) {
  issues.push({
    file: "app/api/feed-planner/create-from-strategy/route.ts",
    line: 344,
    issue: "CRITICAL: Pro Mode may not be using Nano Banana prompt builder",
    severity: "critical"
  })
  console.log("   ❌ CRITICAL: Pro Mode may not use Nano Banana")
} else {
  console.log("   ✅ Pro Mode uses Nano Banana")
}

// Summary
console.log("\n📊 ==================== DIAGNOSTIC SUMMARY ====================")
console.log(`Found ${issues.length} issues:\n`)

const critical = issues.filter(i => i.severity === 'critical')
const high = issues.filter(i => i.severity === 'high')
const medium = issues.filter(i => i.severity === 'medium')

if (critical.length > 0) {
  console.log(`🔴 CRITICAL (${critical.length}):`)
  critical.forEach((issue, idx) => {
    console.log(`   ${idx + 1}. ${issue.file}:${issue.line}`)
    console.log(`      ${issue.issue}\n`)
  })
}

if (high.length > 0) {
  console.log(`🟡 HIGH (${high.length}):`)
  high.forEach((issue, idx) => {
    console.log(`   ${idx + 1}. ${issue.file}:${issue.line}`)
    console.log(`      ${issue.issue}\n`)
  })
}

if (medium.length > 0) {
  console.log(`🟠 MEDIUM (${medium.length}):`)
  medium.forEach((issue, idx) => {
    console.log(`   ${idx + 1}. ${issue.file}:${issue.line}`)
    console.log(`      ${issue.issue}\n`)
  })
}

if (issues.length === 0) {
  console.log("✅ No issues found! Mode detection is working correctly.")
} else {
  console.log("\n🔧 RECOMMENDED FIXES:")
  console.log("1. Pass studioProMode from Feed Planner Screen to API")
  console.log("2. Update API to check user mode preference FIRST, then auto-detect if needed")
  console.log("3. Ensure Classic Mode: Uses trigger word, NO reference images, custom FLUX model")
  console.log("4. Ensure Pro Mode: Uses Nano Banana, sends reference images, NO trigger word")
  console.log("5. Verify queue-images routes correctly based on generation_mode from database")
}

process.exit(issues.length > 0 ? 1 : 0)


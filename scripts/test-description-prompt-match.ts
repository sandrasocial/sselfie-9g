/**
 * Test that prompts match their descriptions
 * 
 * Verifies that buildPoseSection() and buildSettingSection() correctly extract
 * pose and setting information from descriptions instead of using hardcoded templates.
 * 
 * Run with: npx tsx scripts/test-description-prompt-match.ts
 */

import { buildPoseSection, buildSettingSection, ConceptComponents } from '@/lib/maya/pro/prompt-builder'

interface TestCase {
  name: string
  description: string
  expectedPoseKeywords: string[]
  expectedSettingKeywords: string[]
  shouldNotContain?: string[] // Keywords that should NOT appear (e.g., hardcoded mismatches)
}

const testCases: TestCase[] = [
  {
    name: 'Kitchen Scene',
    description: "Standing in bright modern kitchen with marble countertops, preparing holiday pancakes with fresh berries",
    expectedPoseKeywords: ["standing", "kitchen", "preparing", "pancakes"],
    expectedSettingKeywords: ["kitchen", "marble", "countertops"],
    shouldNotContain: ["sofa", "living room", "christmas tree"] // Should NOT have these when description says kitchen
  },
  {
    name: 'Dining Table Scene',
    description: "Sitting at elegant dining table with festive decorations, holding warm mug of hot chocolate",
    expectedPoseKeywords: ["sitting", "table", "holding", "mug"],
    expectedSettingKeywords: ["dining", "table", "festive", "decorations"],
    shouldNotContain: ["kitchen", "sofa"]
  },
  {
    name: 'Living Room Scene',
    description: "Relaxed on cozy sofa with soft throw blanket, reading by Christmas tree",
    expectedPoseKeywords: ["relaxed", "sofa", "reading"],
    expectedSettingKeywords: ["sofa", "cozy", "christmas tree"],
    shouldNotContain: ["kitchen", "marble"]
  },
  {
    name: 'Bedroom Scene',
    description: "Standing in serene bedroom before full-length mirror, adjusting necklace",
    expectedPoseKeywords: ["standing", "bedroom", "mirror", "adjusting"],
    expectedSettingKeywords: ["bedroom", "mirror"],
    shouldNotContain: ["kitchen", "sofa", "dining"]
  },
  {
    name: 'Bathroom Scene',
    description: "In elegant marble bathroom with brass fixtures, applying skincare at vanity",
    expectedPoseKeywords: ["bathroom", "vanity"],
    expectedSettingKeywords: ["bathroom", "marble", "brass"],
    shouldNotContain: ["kitchen", "sofa", "bedroom"]
  }
]

/**
 * Check if text contains any of the keywords (case-insensitive)
 */
function containsKeywords(text: string, keywords: string[]): { found: string[]; missing: string[] } {
  const lowerText = text.toLowerCase()
  const found: string[] = []
  const missing: string[] = []
  
  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      found.push(keyword)
    } else {
      missing.push(keyword)
    }
  }
  
  return { found, missing }
}

/**
 * Run a single test case
 */
function runTestCase(testCase: TestCase): { passed: boolean; details: string } {
  const concept: ConceptComponents = {
    title: `Test: ${testCase.name}`,
    description: testCase.description,
    category: 'LIFESTYLE'
  }
  
  // Build pose and setting sections
  const poseSection = buildPoseSection(concept)
  const settingSection = buildSettingSection(concept)
  
  // Check pose keywords
  const poseCheck = containsKeywords(poseSection, testCase.expectedPoseKeywords)
  
  // Check setting keywords
  const settingCheck = containsKeywords(settingSection, testCase.expectedSettingKeywords)
  
  // Check for unwanted keywords (hardcoded mismatches)
  let unwantedFound: string[] = []
  if (testCase.shouldNotContain) {
    const poseUnwanted = containsKeywords(poseSection, testCase.shouldNotContain)
    const settingUnwanted = containsKeywords(settingSection, testCase.shouldNotContain)
    unwantedFound = [...poseUnwanted.found, ...settingUnwanted.found]
  }
  
  // Determine if test passed
  const passed = 
    poseCheck.missing.length === 0 &&
    settingCheck.missing.length === 0 &&
    unwantedFound.length === 0
  
  // Build details string
  let details = `  Description: "${testCase.description}"\n`
  details += `  Pose: "${poseSection}"\n`
  details += `    ✅ Found: ${poseCheck.found.join(', ') || 'none'}\n`
  if (poseCheck.missing.length > 0) {
    details += `    ❌ Missing: ${poseCheck.missing.join(', ')}\n`
  }
  details += `  Setting: "${settingSection}"\n`
  details += `    ✅ Found: ${settingCheck.found.join(', ') || 'none'}\n`
  if (settingCheck.missing.length > 0) {
    details += `    ❌ Missing: ${settingCheck.missing.join(', ')}\n`
  }
  if (unwantedFound.length > 0) {
    details += `    ⚠️  Unwanted keywords found: ${unwantedFound.join(', ')}\n`
  }
  
  return { passed, details }
}

/**
 * Main test runner
 */
function runTests() {
  console.log('🧪 TESTING DESCRIPTION-PROMPT MATCHING\n')
  console.log('='.repeat(80))
  console.log()
  
  let passedCount = 0
  let failedCount = 0
  
  for (const testCase of testCases) {
    console.log(`📋 Test: ${testCase.name}`)
    console.log('-'.repeat(80))
    
    const result = runTestCase(testCase)
    
    if (result.passed) {
      console.log('✅ PASSED')
      passedCount++
    } else {
      console.log('❌ FAILED')
      failedCount++
    }
    
    console.log(result.details)
    console.log()
  }
  
  // Summary
  console.log('='.repeat(80))
  console.log('📊 SUMMARY')
  console.log(`  ✅ Passed: ${passedCount}/${testCases.length}`)
  console.log(`  ❌ Failed: ${failedCount}/${testCases.length}`)
  console.log()
  
  if (failedCount === 0) {
    console.log('🎉 All tests passed! Descriptions are correctly matched to prompts.')
    process.exit(0)
  } else {
    console.log('⚠️  Some tests failed. Review the output above.')
    process.exit(1)
  }
}

// Run tests
runTests()

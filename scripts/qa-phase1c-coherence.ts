/**
 * Phase 1C QA: Coherence Fix Assertions
 * 
 * PURPOSE: Verify that category mapping and Scene 8 awareness work correctly
 * 
 * TEST CASES:
 * Case A: visual_aesthetic="beige feed" → category="beige" → Scene 8 has NO laptop/office
 * Case B: visual_aesthetic="professional" → category="professional" → Scene 8 MAY have laptop/workspace
 */

import { mapVisualAestheticToCategory } from '../lib/feed-planner/generation-helpers'
import { getSceneSpec } from '../lib/maya/scene-library'
import { buildSingleImagePrompt } from '../lib/feed-planner/build-single-image-prompt'

/**
 * Assert that a string does NOT contain any of the forbidden substrings
 */
function assertNotContains(text: string, forbiddenStrings: string[], testName: string): void {
  const found: string[] = []
  
  for (const forbidden of forbiddenStrings) {
    if (text.toLowerCase().includes(forbidden.toLowerCase())) {
      found.push(forbidden)
    }
  }
  
  if (found.length > 0) {
    throw new Error(`[${testName}] Found forbidden strings: ${found.join(', ')}\n\nText:\n${text.substring(0, 500)}...`)
  }
  
  console.log(`✅ [${testName}] No forbidden strings found`)
}

/**
 * Assert that a string contains at least one of the required substrings
 */
function assertContainsAny(text: string, requiredStrings: string[], testName: string): void {
  const found = requiredStrings.some(required => text.toLowerCase().includes(required.toLowerCase()))
  
  if (!found) {
    throw new Error(`[${testName}] None of the required strings found: ${requiredStrings.join(', ')}\n\nText:\n${text.substring(0, 500)}...`)
  }
  
  console.log(`✅ [${testName}] Found at least one required string`)
}

/**
 * Test Case A: "beige feed" → "beige" category → NO laptop/office in Scene 8
 */
async function testCaseA(): Promise<void> {
  console.log('\n🧪 Test Case A: "beige feed" → "beige" category → NO laptop/office\n')
  
  // Step 1: Test category mapping
  const mappedCategory = mapVisualAestheticToCategory('beige feed')
  if (mappedCategory !== 'beige') {
    throw new Error(`[Case A] Category mapping failed: expected "beige", got "${mappedCategory}"`)
  }
  console.log(`✅ [Case A] Category mapping: "beige feed" → "${mappedCategory}"`)
  
  // Step 2: Test Scene 8 spec for beige category
  const scene8Beige = getSceneSpec(8, { category: 'beige' })
  if (!scene8Beige) {
    throw new Error(`[Case A] Scene 8 spec not found`)
  }
  
  // Assert Scene 8 does NOT contain workspace terms
  const scene8Text = `${scene8Beige.sceneDNA} ${scene8Beige.location} ${scene8Beige.negativeRules.join(' ')}`
  assertNotContains(scene8Text, ['laptop', 'office', 'workspace', 'desk'], 'Case A - Scene 8 Spec')
  
  // Assert Scene 8 is lifestyle flatlay (not workspace)
  if (!scene8Beige.title.toLowerCase().includes('lifestyle')) {
    throw new Error(`[Case A] Scene 8 title should be "Lifestyle Flatlay", got "${scene8Beige.title}"`)
  }
  console.log(`✅ [Case A] Scene 8 title: "${scene8Beige.title}"`)
  
  // Step 3: Test prompt generation (Scene 8 only)
  const templatePrompt = 'Test template with frame 8 placeholder'
  const prompt8 = await buildSingleImagePrompt(templatePrompt, 8, null, 'beige')
  
  // Assert prompt does NOT contain workspace terms
  assertNotContains(prompt8, ['laptop', 'office', 'workspace', 'desk'], 'Case A - Generated Prompt')
  
  console.log(`✅ [Case A] All assertions passed\n`)
}

/**
 * Test Case B: "professional" → "professional" category → MAY have laptop/workspace
 */
async function testCaseB(): Promise<void> {
  console.log('\n🧪 Test Case B: "professional" → "professional" category → MAY have laptop/workspace\n')
  
  // Step 1: Test category mapping
  const mappedCategory = mapVisualAestheticToCategory('professional')
  if (mappedCategory !== 'professional') {
    throw new Error(`[Case B] Category mapping failed: expected "professional", got "${mappedCategory}"`)
  }
  console.log(`✅ [Case B] Category mapping: "professional" → "${mappedCategory}"`)
  
  // Step 2: Test Scene 8 spec for professional category
  const scene8Professional = getSceneSpec(8, { category: 'professional' })
  if (!scene8Professional) {
    throw new Error(`[Case B] Scene 8 spec not found`)
  }
  
  // Assert Scene 8 is workspace flatlay (original behavior)
  if (!scene8Professional.title.toLowerCase().includes('workspace')) {
    throw new Error(`[Case B] Scene 8 title should be "Workspace Flatlay", got "${scene8Professional.title}"`)
  }
  console.log(`✅ [Case B] Scene 8 title: "${scene8Professional.title}"`)
  
  // Assert Scene 8 MAY contain workspace terms (not forbidden)
  const scene8Text = `${scene8Professional.sceneDNA} ${scene8Professional.location}`
  const hasWorkspaceTerms = ['laptop', 'workspace', 'desk'].some(term => 
    scene8Text.toLowerCase().includes(term.toLowerCase())
  )
  if (!hasWorkspaceTerms) {
    console.warn(`[Case B] Scene 8 does not contain workspace terms (this is OK for professional category)`)
  } else {
    console.log(`✅ [Case B] Scene 8 contains workspace terms (expected for professional)`)
  }
  
  console.log(`✅ [Case B] All assertions passed\n`)
}

/**
 * Test Case C: Other scenes still generate correctly
 */
async function testCaseC(): Promise<void> {
  console.log('\n🧪 Test Case C: Other scenes (1-7, 9) still generate correctly\n')
  
  const templatePrompt = 'Test template with frame placeholders'
  
  for (let position = 1; position <= 9; position++) {
    if (position === 8) continue // Skip Scene 8 (tested separately)
    
    try {
      const prompt = await buildSingleImagePrompt(templatePrompt, position, null, 'beige')
      if (!prompt || prompt.length < 20) {
        throw new Error(`[Case C] Prompt for position ${position} is too short or empty`)
      }
      console.log(`✅ [Case C] Position ${position} generated (${prompt.split(/\s+/).length} words)`)
    } catch (error) {
      throw new Error(`[Case C] Failed to generate prompt for position ${position}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  console.log(`✅ [Case C] All scenes generate correctly\n`)
}

/**
 * Test Case D: Partial matching edge cases
 */
function testCaseD(): void {
  console.log('\n🧪 Test Case D: Partial matching edge cases\n')
  
  const testCases = [
    { input: 'beige feed', expected: 'beige' },
    { input: 'beige aesthetic', expected: 'beige' },
    { input: 'beige minimal', expected: 'beige' },
    { input: 'luxury minimal', expected: 'luxury' },
    { input: 'professional business', expected: 'professional' },
    { input: 'corporate style', expected: 'professional' },
    { input: 'warm tones', expected: 'warm' },
    { input: 'edgy urban', expected: 'edgy' },
    { input: 'minimalist clean', expected: 'minimal' },
    { input: 'unknown style', expected: null },
    { input: '', expected: null },
    { input: null, expected: null },
  ]
  
  for (const testCase of testCases) {
    const result = mapVisualAestheticToCategory(testCase.input as any)
    if (result !== testCase.expected) {
      throw new Error(`[Case D] Mapping failed for "${testCase.input}": expected "${testCase.expected}", got "${result}"`)
    }
    console.log(`✅ [Case D] "${testCase.input}" → "${result}"`)
  }
  
  console.log(`✅ [Case D] All edge cases passed\n`)
}

/**
 * Main QA test
 */
async function runQATest(): Promise<void> {
  console.log('🧪 Phase 1C QA: Coherence Fix Test\n')
  
  try {
    // Test Case A: beige feed → beige → NO laptop/office
    await testCaseA()
    
    // Test Case B: professional → professional → MAY have laptop/workspace
    await testCaseB()
    
    // Test Case C: Other scenes still generate
    await testCaseC()
    
    // Test Case D: Partial matching edge cases
    testCaseD()
    
    console.log('✅ Phase 1C QA: All test cases passed!\n')
    console.log('Summary:')
    console.log('- Category mapping: ✅')
    console.log('- Scene 8 category awareness: ✅')
    console.log('- Other scenes unaffected: ✅')
    console.log('- Partial matching: ✅')
  } catch (error) {
    console.error('\n❌ Phase 1C QA failed:', error)
    throw error
  }
}

// Run test
if (require.main === module) {
  runQATest()
    .then(() => {
      console.log('\n🎉 Phase 1C QA completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Phase 1C QA failed:', error)
      process.exit(1)
    })
}

export { runQATest }

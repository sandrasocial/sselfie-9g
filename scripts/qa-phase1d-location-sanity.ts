/**
 * Phase 1D QA: Template Location Sanity Check (Beige)
 * 
 * PURPOSE: Verify that beige templates do NOT contain office/workspace tokens
 * unless category is professional.
 * 
 * CHECKS:
 * - List indoor locations used for beige templates
 * - Assert they do NOT contain office tokens unless category is professional
 */

import { getBlueprintPhotoshootPrompt } from '../lib/maya/blueprint-photoshoot-templates'
import { injectAndValidateTemplate } from '../lib/feed-planner/dynamic-template-injector'

/**
 * Office/workspace tokens that should NOT appear in non-professional beige templates
 */
const OFFICE_TOKENS = [
  'office',
  'workspace',
  'boardroom',
  'meeting',
  'corporate',
  'financial district',
  'desk',
  'laptop',
  'executive',
  'business',
]

/**
 * Extract indoor locations from a template string
 */
function extractIndoorLocations(template: string): string[] {
  const indoorLocations: string[] = []
  
  // Look for LOCATION_INDOOR placeholders and their replacements
  // Pattern: {{LOCATION_INDOOR_1}}, {{LOCATION_INDOOR_2}}, {{LOCATION_INDOOR_3}}
  const placeholderPattern = /\{\{LOCATION_INDOOR_\d+\}\}/g
  const placeholders = template.match(placeholderPattern) || []
  
  // Also look for actual location text (after placeholder replacement)
  // Common patterns: "in {{LOCATION_INDOOR_1}}", "on {{LOCATION_INDOOR_2}}", etc.
  // And after replacement: "in modern cafe", "on neutral desk", etc.
  
  // Extract location descriptions from template text
  // Look for phrases like "in [location]", "on [location]", "at [location]"
  const locationPatterns = [
    /in\s+([A-Z][a-z]+(?:\s+[a-z]+)*)\s+/gi,
    /on\s+([A-Z][a-z]+(?:\s+[a-z]+)*)\s+/gi,
    /at\s+([A-Z][a-z]+(?:\s+[a-z]+)*)\s+/gi,
    /{{LOCATION_INDOOR_\d+}}/g,
  ]
  
  for (const pattern of locationPatterns) {
    const matches = template.matchAll(pattern)
    for (const match of matches) {
      if (match[1]) {
        indoorLocations.push(match[1].toLowerCase())
      }
    }
  }
  
  return [...new Set(indoorLocations)]
}

/**
 * Check if a string contains any office tokens
 */
function containsOfficeTokens(text: string): string[] {
  const found: string[] = []
  const lowerText = text.toLowerCase()
  
  for (const token of OFFICE_TOKENS) {
    if (lowerText.includes(token)) {
      found.push(token)
    }
  }
  
  return found
}

/**
 * Test Case A: Beige template (non-professional) should NOT contain office tokens
 */
async function testCaseA(): Promise<void> {
  console.log('\n🧪 Test Case A: Beige template (non-professional) → NO office tokens\n')
  
  // Get beige_beige_aesthetic template
  const template = getBlueprintPhotoshootPrompt('beige', 'beige')
  
  if (!template) {
    throw new Error('[Case A] Beige template not found')
  }
  
  console.log(`✅ [Case A] Beige template loaded (${template.split(/\s+/).length} words)`)
  
  // Extract indoor locations from template
  const indoorLocations = extractIndoorLocations(template)
  console.log(`✅ [Case A] Found ${indoorLocations.length} indoor location references`)
  
  // Check template text for office tokens
  const officeTokensFound = containsOfficeTokens(template)
  
  if (officeTokensFound.length > 0) {
    throw new Error(
      `[Case A] Beige template contains office tokens: ${officeTokensFound.join(', ')}\n\n` +
      `Template excerpt:\n${template.substring(0, 500)}...`
    )
  }
  
  console.log(`✅ [Case A] No office tokens found in beige template`)
  
  // Check Setting line specifically
  const settingMatch = template.match(/Setting:\s*(.+)/i)
  if (settingMatch) {
    const settingText = settingMatch[1]
    const settingOfficeTokens = containsOfficeTokens(settingText)
    
    if (settingOfficeTokens.length > 0) {
      throw new Error(
        `[Case A] Beige template Setting contains office tokens: ${settingOfficeTokens.join(', ')}\n\n` +
        `Setting: ${settingText}`
      )
    }
    
    console.log(`✅ [Case A] Setting line clean: "${settingText.substring(0, 100)}..."`)
  }
  
  console.log(`✅ [Case A] All assertions passed\n`)
}

/**
 * Test Case B: Professional template MAY contain office tokens
 */
async function testCaseB(): Promise<void> {
  console.log('\n🧪 Test Case B: Professional template → MAY contain office tokens\n')
  
  // Get professional_beige_aesthetic template (if exists) or professional_light_minimalistic
  const template = getBlueprintPhotoshootPrompt('professional', 'minimal')
  
  if (!template) {
    console.warn('[Case B] Professional template not found, skipping')
    return
  }
  
  console.log(`✅ [Case B] Professional template loaded (${template.split(/\s+/).length} words)`)
  
  // Check template text for office tokens (this is OK for professional)
  const officeTokensFound = containsOfficeTokens(template)
  
  if (officeTokensFound.length > 0) {
    console.log(`✅ [Case B] Professional template contains office tokens (expected): ${officeTokensFound.join(', ')}`)
  } else {
    console.log(`✅ [Case B] Professional template does not contain office tokens (also OK)`)
  }
  
  // Check Setting line
  const settingMatch = template.match(/Setting:\s*(.+)/i)
  if (settingMatch) {
    const settingText = settingMatch[1]
    console.log(`✅ [Case B] Setting: "${settingText.substring(0, 100)}..."`)
  }
  
  console.log(`✅ [Case B] All assertions passed\n`)
}

/**
 * Test Case C: Check all beige mood combinations
 */
async function testCaseC(): Promise<void> {
  console.log('\n🧪 Test Case C: All beige mood combinations → NO office tokens\n')
  
  const moods: Array<'luxury' | 'minimal' | 'beige'> = ['luxury', 'minimal', 'beige']
  
  for (const mood of moods) {
    try {
      const template = getBlueprintPhotoshootPrompt('beige', mood)
      
      if (!template) {
        console.warn(`[Case C] Beige + ${mood} template not found, skipping`)
        continue
      }
      
      const officeTokensFound = containsOfficeTokens(template)
      
      if (officeTokensFound.length > 0) {
        throw new Error(
          `[Case C] Beige + ${mood} template contains office tokens: ${officeTokensFound.join(', ')}`
        )
      }
      
      console.log(`✅ [Case C] Beige + ${mood}: No office tokens`)
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        console.warn(`[Case C] Beige + ${mood} template not found, skipping`)
      } else {
        throw error
      }
    }
  }
  
  console.log(`✅ [Case C] All beige mood combinations passed\n`)
}

/**
 * Main QA test
 */
async function runQATest(): Promise<void> {
  console.log('🧪 Phase 1D QA: Template Location Sanity Check\n')
  
  try {
    // Test Case A: Beige template (non-professional) → NO office tokens
    await testCaseA()
    
    // Test Case B: Professional template → MAY contain office tokens
    await testCaseB()
    
    // Test Case C: All beige mood combinations → NO office tokens
    await testCaseC()
    
    console.log('✅ Phase 1D QA: All test cases passed!\n')
    console.log('Summary:')
    console.log('- Beige templates: ✅ No office tokens')
    console.log('- Professional templates: ✅ Office tokens allowed')
    console.log('- All beige moods: ✅ Clean')
  } catch (error) {
    console.error('\n❌ Phase 1D QA failed:', error)
    throw error
  }
}

// Run test
if (require.main === module) {
  runQATest()
    .then(() => {
      console.log('\n🎉 Phase 1D QA completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Phase 1D QA failed:', error)
      process.exit(1)
    })
}

export { runQATest }

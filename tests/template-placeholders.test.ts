/**
 * Test file for template placeholder system
 * 
 * Run with: npx tsx tests/template-placeholders.test.ts
 */

import { replacePlaceholders, extractPlaceholderKeys, validatePlaceholders } from '../lib/feed-planner/template-placeholders'
import { BLUEPRINT_PHOTOSHOOT_TEMPLATES } from '../lib/maya/blueprint-photoshoot-templates'

// Test placeholder replacement
function testPlaceholderReplacement() {
  console.log('🧪 Testing placeholder replacement...\n')
  
  const template = "Sitting on {{LOCATION_OUTDOOR_1}} - {{OUTFIT_FULLBODY_1}}, {{STYLING_NOTES}}, relaxed pose"
  const placeholders = {
    LOCATION_OUTDOOR_1: "concrete stairs",
    OUTFIT_FULLBODY_1: "black blazer, leather pants, beanie, sunglasses",
    STYLING_NOTES: "editorial styling with attention to texture"
  }
  
  const result = replacePlaceholders(template, placeholders)
  console.log('Template:', template)
  console.log('Result:', result)
  console.log('✅ Expected: "Sitting on concrete stairs - black blazer, leather pants, beanie, sunglasses, editorial styling with attention to texture, relaxed pose"\n')
  
  return result.includes('concrete stairs') && 
         result.includes('black blazer') && 
         !result.includes('{{')
}

// Test placeholder extraction
function testPlaceholderExtraction() {
  console.log('🧪 Testing placeholder extraction...\n')
  
  const template = "{{OUTFIT_FULLBODY_1}} {{LOCATION_OUTDOOR_1}} {{LIGHTING_EVENING}}"
  const keys = extractPlaceholderKeys(template)
  
  console.log('Template:', template)
  console.log('Extracted keys:', keys)
  console.log('✅ Expected: ["LIGHTING_EVENING", "LOCATION_OUTDOOR_1", "OUTFIT_FULLBODY_1"]\n')
  
  return keys.length === 3 && 
         keys.includes('OUTFIT_FULLBODY_1') &&
         keys.includes('LOCATION_OUTDOOR_1') &&
         keys.includes('LIGHTING_EVENING')
}

// Test validation
function testPlaceholderValidation() {
  console.log('🧪 Testing placeholder validation...\n')
  
  const template = "{{OUTFIT_FULLBODY_1}} {{LOCATION_OUTDOOR_1}} {{MISSING_PLACEHOLDER}}"
  const placeholders = {
    OUTFIT_FULLBODY_1: "test outfit",
    LOCATION_OUTDOOR_1: "test location"
  }
  
  const validation = validatePlaceholders(template, placeholders)
  
  console.log('Template:', template)
  console.log('Validation result:', validation)
  console.log('✅ Expected: isValid=false, missingPlaceholders=["MISSING_PLACEHOLDER"]\n')
  
  return !validation.isValid && 
         validation.missingPlaceholders.includes('MISSING_PLACEHOLDER')
}

// Test all templates have placeholders
function testAllTemplatesHavePlaceholders() {
  console.log('🧪 Testing all templates have placeholders...\n')
  
  const templates = Object.entries(BLUEPRINT_PHOTOSHOOT_TEMPLATES)
  const results: Array<{ vibe: string; hasPlaceholders: boolean; placeholderCount: number }> = []
  
  for (const [vibe, template] of templates) {
    const keys = extractPlaceholderKeys(template)
    const hasPlaceholders = keys.length > 0
    
    results.push({
      vibe,
      hasPlaceholders,
      placeholderCount: keys.length
    })
    
    if (!hasPlaceholders) {
      console.log(`⚠️  ${vibe}: No placeholders found`)
    }
  }
  
  console.log('\n📊 Results:')
  results.forEach(r => {
    console.log(`  ${r.vibe}: ${r.placeholderCount} placeholders ${r.hasPlaceholders ? '✅' : '❌'}`)
  })
  
  const allHavePlaceholders = results.every(r => r.hasPlaceholders)
  console.log(`\n✅ All templates have placeholders: ${allHavePlaceholders}\n`)
  
  return allHavePlaceholders
}

// Run all tests
function runTests() {
  console.log('='.repeat(60))
  console.log('TEMPLATE PLACEHOLDER SYSTEM - TEST SUITE')
  console.log('='.repeat(60))
  console.log()
  
  const tests = [
    { name: 'Placeholder Replacement', fn: testPlaceholderReplacement },
    { name: 'Placeholder Extraction', fn: testPlaceholderExtraction },
    { name: 'Placeholder Validation', fn: testPlaceholderValidation },
    { name: 'All Templates Have Placeholders', fn: testAllTemplatesHavePlaceholders }
  ]
  
  const results = tests.map(test => ({
    name: test.name,
    passed: test.fn()
  }))
  
  console.log('='.repeat(60))
  console.log('TEST RESULTS')
  console.log('='.repeat(60))
  results.forEach(r => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name}`)
  })
  
  const allPassed = results.every(r => r.passed)
  console.log()
  console.log(`Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`)
  console.log('='.repeat(60))
  
  return allPassed
}

// Run if executed directly
if (require.main === module) {
  const success = runTests()
  process.exit(success ? 0 : 1)
}

export { runTests }

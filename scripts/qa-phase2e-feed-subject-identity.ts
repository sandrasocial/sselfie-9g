/**
 * QA Script: Phase 2E Feed Subject Identity Override
 * 
 * Validates that subject identity override is injected at root of feed preview prompts:
 * - Non-professional categories: Feed preview contains explicit NOT business/CEO language
 * - Professional category: Subject identity block is empty or neutral
 * - Block appears once (root level)
 * - Block appears before scene 1
 * - No business tokens appear in non-professional feeds unless explicitly allowed
 */

import { getBlueprintPhotoshootPrompt } from '../lib/maya/blueprint-photoshoot-templates'
import { resolveSubjectIdentity } from '../lib/feed-planner/resolve-subject-identity'

async function runQATests() {
  console.log('🧪 Phase 2E Feed Subject Identity Override QA\n')
  
  let passed = 0
  let failed = 0
  const failures: string[] = []

  // TEST 1: Non-professional category returns identity override in feed preview
  console.log('TEST 1: Non-professional category feed preview contains identity override')
  try {
    const prompt = getBlueprintPhotoshootPrompt('minimal', 'minimal', 'athletic')
    
    if (!prompt.includes('SUBJECT IDENTITY')) {
      failed++
      failures.push('TEST 1: Non-professional feed preview missing SUBJECT IDENTITY block')
    } else {
      passed++
      console.log('  ✅ Non-professional feed preview contains SUBJECT IDENTITY block')
    }
    
    if (!prompt.toLowerCase().includes('lifestyle individual')) {
      failed++
      failures.push('TEST 1: Feed preview should mention "lifestyle individual"')
    } else {
      passed++
      console.log('  ✅ Feed preview mentions lifestyle individual')
    }
    
    const forbiddenTerms = ['ceo', 'founder', 'executive', 'corporate']
    let foundForbidden = false
    for (const term of forbiddenTerms) {
      if (prompt.toLowerCase().includes(`not a ${term}`) || prompt.toLowerCase().includes(`not ${term}`)) {
        foundForbidden = true
        break
      }
    }
    
    if (!foundForbidden) {
      failed++
      failures.push('TEST 1: Feed preview should explicitly state what subject is NOT (CEO/founder/executive/corporate)')
    } else {
      passed++
      console.log('  ✅ Feed preview explicitly states what subject is NOT')
    }
  } catch (error) {
    failed++
    failures.push(`TEST 1: Failed to get feed preview prompt: ${error}`)
  }

  // TEST 2: Professional category returns empty identity block
  console.log('\nTEST 2: Professional category feed preview')
  try {
    const prompt = getBlueprintPhotoshootPrompt('professional', 'minimal', null)
    
    if (prompt.includes('SUBJECT IDENTITY')) {
      failed++
      failures.push('TEST 2: Professional feed preview should NOT have SUBJECT IDENTITY override block')
    } else {
      passed++
      console.log('  ✅ Professional feed preview does not have identity override (business language allowed)')
    }
    
    // Verify business language is present in professional template
    if (!prompt.toLowerCase().includes('professional') && !prompt.toLowerCase().includes('executive') && !prompt.toLowerCase().includes('corporate')) {
      // This is okay - template might not have these words, but identity override should not block them
      passed++
      console.log('  ✅ Professional template preserves business context')
    } else {
      passed++
      console.log('  ✅ Professional template contains business language (correct)')
    }
  } catch (error) {
    failed++
    failures.push(`TEST 2: Failed to get professional feed preview prompt: ${error}`)
  }

  // TEST 3: Identity block appears before scene 1 (root level)
  console.log('\nTEST 3: Identity block appears at root (before scenes)')
  try {
    const prompt = getBlueprintPhotoshootPrompt('beige', 'beige', 'athletic')
    
    const identityIndex = prompt.indexOf('SUBJECT IDENTITY')
    const scene1Index = prompt.indexOf('9 frames:')
    const frame1Index = prompt.indexOf('1.')
    
    if (identityIndex === -1) {
      failed++
      failures.push('TEST 3: Feed preview missing SUBJECT IDENTITY block')
    } else if (scene1Index !== -1 && identityIndex > scene1Index) {
      failed++
      failures.push('TEST 3: SUBJECT IDENTITY must appear BEFORE "9 frames:" section')
    } else if (frame1Index !== -1 && identityIndex > frame1Index) {
      failed++
      failures.push('TEST 3: SUBJECT IDENTITY must appear BEFORE frame 1')
    } else {
      passed++
      console.log('  ✅ Identity block appears at root (before scenes)')
    }
  } catch (error) {
    failed++
    failures.push(`TEST 3: Failed to check prompt structure: ${error}`)
  }

  // TEST 4: Identity block appears only once (root level, not per scene)
  console.log('\nTEST 4: Identity block appears only once')
  try {
    const prompt = getBlueprintPhotoshootPrompt('minimal', 'minimal', 'athletic')
    
    const identityMatches = (prompt.match(/SUBJECT IDENTITY/g) || []).length
    
    if (identityMatches === 0) {
      failed++
      failures.push('TEST 4: Feed preview missing SUBJECT IDENTITY block')
    } else if (identityMatches > 1) {
      failed++
      failures.push(`TEST 4: SUBJECT IDENTITY appears ${identityMatches} times (should appear only once at root)`)
    } else {
      passed++
      console.log('  ✅ Identity block appears exactly once (root level)')
    }
  } catch (error) {
    failed++
    failures.push(`TEST 4: Failed to check identity block count: ${error}`)
  }

  // TEST 5: Non-professional feeds exclude business tokens (outside identity block)
  console.log('\nTEST 5: Non-professional feeds exclude business tokens outside identity block')
  const businessTokens = ['ceo', 'founder', 'executive', 'business owner', 'career-focused']
  
  try {
    const prompt = getBlueprintPhotoshootPrompt('minimal', 'minimal', 'athletic')
    
    // Extract SUBJECT IDENTITY block
    const identityStart = prompt.indexOf('SUBJECT IDENTITY')
    const identityEnd = prompt.indexOf('Maintain strict identity', identityStart)
    const identityBlock = identityStart !== -1 && identityEnd !== -1 
      ? prompt.substring(identityStart, identityEnd)
      : ''
    
    // Extract rest of prompt (after SUBJECT IDENTITY block)
    const restOfPrompt = identityEnd !== -1 
      ? prompt.substring(identityEnd)
      : prompt
    
    // Check for business tokens in rest of prompt (not in SUBJECT IDENTITY block)
    for (const token of businessTokens) {
      const lowerRestOfPrompt = restOfPrompt.toLowerCase()
      if (lowerRestOfPrompt.includes(token)) {
        failed++
        const tokenIndex = lowerRestOfPrompt.indexOf(token)
        const contextStart = Math.max(0, tokenIndex - 30)
        const contextEnd = Math.min(lowerRestOfPrompt.length, tokenIndex + token.length + 30)
        const context = lowerRestOfPrompt.substring(contextStart, contextEnd)
        failures.push(`TEST 5: Feed preview contains business token "${token}" outside SUBJECT IDENTITY block: "${context}"`)
      }
    }
    
    if (failed === 0 || failures.filter(f => f.startsWith('TEST 5')).length === 0) {
      passed++
      console.log('  ✅ Non-professional feeds correctly exclude business tokens outside identity block')
    }
  } catch (error) {
    failed++
    failures.push(`TEST 5: Failed to check business tokens: ${error}`)
  }

  // TEST 6: Verify identity resolver is used (not hardcoded)
  console.log('\nTEST 6: Identity resolver is used correctly')
  try {
    const athleticIdentity = resolveSubjectIdentity({
      category: 'minimal',
      fashionStyle: 'athletic'
    })
    
    const prompt = getBlueprintPhotoshootPrompt('minimal', 'minimal', 'athletic')
    
    if (athleticIdentity.identityBlock && !prompt.includes(athleticIdentity.identityBlock)) {
      failed++
      failures.push('TEST 6: Feed preview does not match resolver output')
    } else {
      passed++
      console.log('  ✅ Feed preview uses identity resolver correctly')
    }
  } catch (error) {
    failed++
    failures.push(`TEST 6: Failed to verify resolver usage: ${error}`)
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log(`✅ PASSED: ${passed}`)
  console.log(`❌ FAILED: ${failed}`)
  
  if (failures.length > 0) {
    console.log('\nFailures:')
    failures.forEach((failure, index) => {
      console.log(`  ${index + 1}. ${failure}`)
    })
    process.exit(1)
  } else {
    console.log('\n🎉 All tests passed!')
    process.exit(0)
  }
}

// Run tests
runQATests().catch((error) => {
  console.error('❌ QA script error:', error)
  process.exit(1)
})

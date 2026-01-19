/**
 * QA Script: Phase 2D Subject Identity Override
 * 
 * Validates that subject identity override prevents business/CEO identity leakage:
 * - Athletic + minimal + dark/moody → No CEO/business/executive tokens
 * - Professional category → Business language allowed
 * - Identity block appears before Scene DNA
 * - Identity override present in all non-professional prompts
 */

import { resolveSubjectIdentity } from '../lib/feed-planner/resolve-subject-identity'
import { buildSingleImagePrompt } from '../lib/feed-planner/build-single-image-prompt'

// Mock template prompt for testing (athletic + minimal)
const mockTemplateAthleticMinimal = `
Vibe: Minimal athletic aesthetic. Clean lines, neutral tones, movement-focused imagery.

Setting: Modern gym spaces, outdoor parks, urban streets, minimalist apartments

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. Seated on {{LOCATION_INDOOR_1}} - {{OUTFIT_FULLBODY_1}}, relaxed pose, soft window light
2. Protein shake arranged on {{LOCATION_INDOOR_2}} - overhead flatlay, gentle natural light
3. Full-body standing - {{OUTFIT_FULLBODY_2}}, neutral wall background, centered composition
4. Close-up hands adjusting sneaker - {{OUTFIT_MIDSHOT_1}}, warm skin tones, soft focus
5. Simple sign reading "MOVE" in bold sans-serif font on {{LOCATION_ARCHITECTURAL_1}}
6. {{OUTFIT_MIDSHOT_2}} texture - close-up revealing athletic fabric, natural detail
7. Walking past {{LOCATION_ARCHITECTURAL_1}} - {{OUTFIT_FULLBODY_3}}, natural stride, gentle side lighting
8. {{LOCATION_INDOOR_3}} - overhead perspective, water bottle, yoga mat, neutral surface, soft natural light
9. Seated by window - {{OUTFIT_FULLBODY_4}}, holding water bottle, soft profile, warm natural light

Color grade: Neutral grays, soft whites, subtle blacks, clean shadows, natural light
`

// Professional template for comparison
const mockTemplateProfessional = `
Vibe: Professional business aesthetic. Tailored suiting, office environments, executive presence.

Setting: Modern offices, corporate spaces, business districts

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. Standing in {{LOCATION_INDOOR_1}} - {{OUTFIT_FULLBODY_1}}, professional stance, office lighting
2. Coffee and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_2}} - overhead flatlay, desk lamp
3. Full-body standing - {{OUTFIT_FULLBODY_2}}, office background, centered composition
4. Close-up hands on laptop - {{OUTFIT_MIDSHOT_1}}, professional setting
5. Modern sign reading "LEAD" in bold serif font on {{LOCATION_ARCHITECTURAL_1}}
6. {{OUTFIT_MIDSHOT_2}} texture - close-up revealing tailored fabric
7. Walking through {{LOCATION_ARCHITECTURAL_1}} - {{OUTFIT_FULLBODY_3}}, confident stride
8. Executive desk - overhead, laptop, coffee, leather journal, {{LOCATION_INDOOR_3}}
9. Seated at desk - {{OUTFIT_FULLBODY_4}}, holding coffee, professional setting

Color grade: Rich blacks, charcoal grays, warm office tones, professional lighting
`

const mockBrandKitAthletic = {
  fashionStyle: ['athletic'],
  visualAesthetic: ['minimal'],
  colorPalette: {
    primary: '#e0e0e0',
    secondary: '#9e9e9e',
    accent: '#616161'
  }
}

const mockBrandKitProfessional = {
  fashionStyle: ['professional'],
  visualAesthetic: ['dark & moody'],
  colorPalette: {
    primary: '#000000',
    secondary: '#424242',
    accent: '#757575'
  }
}

async function runQATests() {
  console.log('🧪 Phase 2D Subject Identity Override QA\n')
  
  let passed = 0
  let failed = 0
  const failures: string[] = []

  // TEST 1: Non-professional category returns identity override
  console.log('TEST 1: Non-professional category returns identity override')
  const athleticIdentity = resolveSubjectIdentity({
    category: 'minimal',
    fashionStyle: 'athletic'
  })
  
  if (!athleticIdentity.identityBlock) {
    failed++
    failures.push('TEST 1: Non-professional category should return identity override')
  } else {
    passed++
    console.log('  ✅ Non-professional category returns identity override')
  }
  
  if (!athleticIdentity.identityBlock.toLowerCase().includes('lifestyle')) {
    failed++
    failures.push('TEST 1: Identity block should mention "lifestyle"')
  } else {
    passed++
    console.log('  ✅ Identity block mentions lifestyle')
  }
  
  const forbiddenTerms = ['ceo', 'founder', 'executive', 'corporate']
  let foundForbidden = false
  for (const term of forbiddenTerms) {
    if (athleticIdentity.identityBlock.toLowerCase().includes(`not a ${term}`)) {
      foundForbidden = true
      break
    }
  }
  
  if (!foundForbidden) {
    failed++
    failures.push('TEST 1: Identity block should explicitly state what subject is NOT (CEO/founder/executive/corporate)')
  } else {
    passed++
    console.log('  ✅ Identity block explicitly states what subject is NOT')
  }

  // TEST 2: Professional category returns empty identity block
  console.log('\nTEST 2: Professional category returns empty identity block')
  const professionalIdentity = resolveSubjectIdentity({
    category: 'professional',
    fashionStyle: null
  })
  
  if (professionalIdentity.identityBlock !== '') {
    failed++
    failures.push('TEST 2: Professional category should return empty identity block')
  } else {
    passed++
    console.log('  ✅ Professional category returns empty identity block (business language allowed)')
  }

  // TEST 3: Identity block appears before Scene DNA in prompts
  console.log('\nTEST 3: Identity block appears before Scene DNA')
  for (let sceneIndex = 1; sceneIndex <= 9; sceneIndex++) {
    try {
      const prompt = await buildSingleImagePrompt(
        mockTemplateAthleticMinimal,
        sceneIndex,
        mockBrandKitAthletic,
        'minimal',
        'minimal'
      )
      
      const identityIndex = prompt.indexOf('SUBJECT IDENTITY')
      const sceneDNAIndex = prompt.indexOf('Scene:')
      
      if (identityIndex === -1) {
        failed++
        failures.push(`TEST 3: Scene ${sceneIndex} missing SUBJECT IDENTITY block`)
      } else if (sceneDNAIndex === -1) {
        failed++
        failures.push(`TEST 3: Scene ${sceneIndex} missing Scene DNA`)
      } else if (identityIndex > sceneDNAIndex) {
        failed++
        failures.push(`TEST 3: Scene ${sceneIndex} SUBJECT IDENTITY must appear BEFORE Scene DNA`)
      } else {
        passed++
      }
    } catch (error) {
      failed++
      failures.push(`TEST 3: Failed to build prompt for scene ${sceneIndex}: ${error}`)
    }
  }
  
  if (failed === 0) {
    console.log('  ✅ All scenes have correct identity block ordering')
  }

  // TEST 4: Non-professional prompts exclude business tokens (outside safe zones)
  console.log('\nTEST 4: Non-professional prompts exclude business tokens outside safe zones')
  // Business tokens that should NOT appear in scene descriptions, templates, or user-facing content
  // They CAN appear in:
  // - SUBJECT IDENTITY block (as negations: "not a CEO")
  // - LIFESTYLE CONTEXT RULES (as restrictions: "Avoid restricted environments: boardroom")
  const businessTokens = ['ceo', 'founder', 'executive', 'business owner', 'career-focused']
  // Note: 'leadership', 'authority', 'boardroom' are allowed in restriction contexts
  
  for (let sceneIndex = 1; sceneIndex <= 9; sceneIndex++) {
    try {
      const prompt = await buildSingleImagePrompt(
        mockTemplateAthleticMinimal,
        sceneIndex,
        mockBrandKitAthletic,
        'minimal',
        'minimal'
      )
      
      // Extract safe zones where business tokens are allowed (as negations/restrictions)
      const identityStart = prompt.indexOf('SUBJECT IDENTITY')
      const identityEnd = prompt.indexOf('USER BRAND PROFILE', identityStart)
      
      const lifestyleStart = prompt.indexOf('LIFESTYLE CONTEXT RULES')
      const lifestyleEnd = lifestyleStart !== -1 ? prompt.indexOf('Aesthetic direction:', lifestyleStart) : -1
      
      // Check for business tokens outside safe zones
      for (const token of businessTokens) {
        const lowerPrompt = prompt.toLowerCase()
        let searchStart = 0
        let tokenIndex = lowerPrompt.indexOf(token, searchStart)
        
        while (tokenIndex !== -1) {
          // Check if this token occurrence is in a safe zone
          const inIdentityBlock = identityStart !== -1 && identityEnd !== -1 && 
                                  tokenIndex >= identityStart && tokenIndex < identityEnd
          const inLifestyleBlock = lifestyleStart !== -1 && lifestyleEnd !== -1 && 
                                   tokenIndex >= lifestyleStart && tokenIndex < lifestyleEnd
          
          if (!inIdentityBlock && !inLifestyleBlock) {
            failed++
            const contextStart = Math.max(0, tokenIndex - 30)
            const contextEnd = Math.min(lowerPrompt.length, tokenIndex + token.length + 30)
            const context = lowerPrompt.substring(contextStart, contextEnd)
            failures.push(`TEST 4: Scene ${sceneIndex} contains business token "${token}" outside safe zones: "${context}"`)
          }
          
          searchStart = tokenIndex + 1
          tokenIndex = lowerPrompt.indexOf(token, searchStart)
        }
      }
    } catch (error) {
      failed++
      failures.push(`TEST 4: Failed to build prompt for scene ${sceneIndex}: ${error}`)
    }
  }
  
  if (failed === 0 || failures.filter(f => f.startsWith('TEST 4')).length === 0) {
    passed++
    console.log('  ✅ Non-professional prompts correctly exclude business tokens outside safe zones')
  }

  // TEST 5: Professional category allows business language
  console.log('\nTEST 5: Professional category allows business language')
  try {
    const prompt = await buildSingleImagePrompt(
      mockTemplateProfessional,
      1,
      mockBrandKitProfessional,
      'professional',
      'minimal'
    )
    
    if (prompt.includes('SUBJECT IDENTITY')) {
      failed++
      failures.push('TEST 5: Professional category should NOT have SUBJECT IDENTITY override block')
    } else {
      passed++
      console.log('  ✅ Professional category does not have identity override')
    }
    
    // Verify template business language is preserved
    if (!prompt.toLowerCase().includes('professional') && !prompt.toLowerCase().includes('office')) {
      failed++
      failures.push('TEST 5: Professional template should preserve business context')
    } else {
      passed++
      console.log('  ✅ Professional template preserves business context')
    }
  } catch (error) {
    failed++
    failures.push(`TEST 5: Failed to build professional prompt: ${error}`)
  }

  // TEST 6: Verify "lifestyle individual" language for non-professional
  console.log('\nTEST 6: Non-professional identity explicitly states lifestyle')
  try {
    const prompt = await buildSingleImagePrompt(
      mockTemplateAthleticMinimal,
      1,
      mockBrandKitAthletic,
      'beige',
      'minimal'
    )
    
    if (!prompt.toLowerCase().includes('lifestyle individual')) {
      failed++
      failures.push('TEST 6: Non-professional prompt should explicitly state "lifestyle individual"')
    } else {
      passed++
      console.log('  ✅ Non-professional prompt explicitly states lifestyle individual')
    }
    
    if (!prompt.toLowerCase().includes('everyday life') && !prompt.toLowerCase().includes('personal style')) {
      failed++
      failures.push('TEST 6: Non-professional prompt should mention everyday life or personal style')
    } else {
      passed++
      console.log('  ✅ Non-professional prompt mentions everyday life/personal style')
    }
  } catch (error) {
    failed++
    failures.push(`TEST 6: Failed to build prompt: ${error}`)
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

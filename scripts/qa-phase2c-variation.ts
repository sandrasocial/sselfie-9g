/**
 * QA Script: Phase 2C Variation Rules
 * 
 * Validates that intentional variation rules are correctly applied:
 * - Athletic style ≠ gymwear everywhere
 * - Business elements only appear intentionally
 * - Indoor/outdoor mix present
 * - Visual story across 9 scenes
 * - No forbidden environments/props
 */

import { resolveLifestyleContext } from '../lib/feed-planner/resolve-lifestyle-context'
import { buildSingleImagePrompt } from '../lib/feed-planner/build-single-image-prompt'

// Mock template prompt for testing
const mockTemplatePrompt = `
Vibe: Beige minimal aesthetic. Neutral beige and sand tones with understated elegance.

Setting: Beige minimal apartments, sand-colored interiors, neutral modern spaces

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. Seated on {{LOCATION_INDOOR_1}} - {{OUTFIT_FULLBODY_1}}, relaxed pose, soft window light
2. Beige coffee cup arranged on {{LOCATION_INDOOR_2}} - overhead flatlay, gentle natural light
3. Full-body standing - {{OUTFIT_FULLBODY_2}}, beige wall background, centered composition
4. Close-up hands holding beige cup - {{OUTFIT_MIDSHOT_1}}, warm skin tones, soft focus
5. Simple wooden sign reading "COZY" in natural carved typography on {{LOCATION_ARCHITECTURAL_1}}
6. {{OUTFIT_MIDSHOT_2}} texture - close-up revealing ribbed pattern, natural fiber detail
7. Walking past {{LOCATION_ARCHITECTURAL_1}} - {{OUTFIT_FULLBODY_3}}, natural stride, gentle side lighting
8. {{LOCATION_INDOOR_3}} - overhead perspective, laptop, coffee, neutral desk, soft natural light
9. Seated by window - {{OUTFIT_FULLBODY_4}}, holding cup, soft profile, warm natural light

Color grade: Warm beiges, sand tones, oatmeal neutrals, soft shadows, gentle Nordic light
`

const mockBrandKit = {
  fashionStyle: ['athletic'],
  visualAesthetic: ['beige'],
  colorPalette: {
    primary: '#c9b8a8',
    secondary: '#a89384',
    accent: '#8a7968'
  }
}

async function runQATests() {
  console.log('🧪 Phase 2C Variation Rules QA\n')
  
  let passed = 0
  let failed = 0
  const failures: string[] = []

  // TEST 1: Athletic style resolves correctly
  console.log('TEST 1: Athletic style lifestyle context')
  const athleticContext = resolveLifestyleContext({
    fashionStyle: 'athletic',
    category: 'beige',
    vibe: 'minimal'
  })
  
  if (!athleticContext.forbiddenEnvironments?.includes('corporate office')) {
    failed++
    failures.push('TEST 1: Athletic context missing forbiddenEnvironments')
  } else {
    passed++
    console.log('  ✅ Athletic context has forbiddenEnvironments')
  }
  
  if (athleticContext.posture !== 'movement') {
    failed++
    failures.push('TEST 1: Athletic context posture should be "movement"')
  } else {
    passed++
    console.log('  ✅ Athletic context posture is "movement"')
  }
  
  if (!athleticContext.locationMix || athleticContext.locationMix.outdoor < 1) {
    failed++
    failures.push('TEST 1: Athletic context should have outdoor location mix')
  } else {
    passed++
    console.log(`  ✅ Athletic context has location mix: ${athleticContext.locationMix.indoor} indoor, ${athleticContext.locationMix.outdoor} outdoor`)
  }
  
  if (!athleticContext.outfitVariation?.base?.includes('athletic wear')) {
    failed++
    failures.push('TEST 1: Athletic context should include "athletic wear" in base')
  } else {
    passed++
    console.log('  ✅ Athletic context has correct base outfit variation')
  }

  // TEST 2: Professional category resolves correctly
  console.log('\nTEST 2: Professional category lifestyle context')
  const professionalContext = resolveLifestyleContext({
    fashionStyle: null,
    category: 'professional',
    vibe: 'minimal'
  })
  
  if (professionalContext.posture !== 'static') {
    failed++
    failures.push('TEST 2: Professional context posture should be "static"')
  } else {
    passed++
    console.log('  ✅ Professional context posture is "static"')
  }
  
  if (!professionalContext.locationMix || professionalContext.locationMix.indoor < 7) {
    failed++
    failures.push('TEST 2: Professional context should have indoor-heavy location mix')
  } else {
    passed++
    console.log(`  ✅ Professional context has location mix: ${professionalContext.locationMix.indoor} indoor, ${professionalContext.locationMix.outdoor} outdoor`)
  }

  // TEST 3: Scene intent detection (scenes 3 and 7 are accent)
  console.log('\nTEST 3: Scene intent detection')
  const accentScenes = [3, 7]
  const baseScenes = [1, 2, 4, 5, 6, 8, 9]
  
  for (const sceneIndex of accentScenes) {
    try {
      const prompt = await buildSingleImagePrompt(
        mockTemplatePrompt,
        sceneIndex,
        mockBrandKit,
        'beige',
        'minimal'
      )
      
      if (!prompt.includes('Scene intent: accent')) {
        failed++
        failures.push(`TEST 3: Scene ${sceneIndex} should have "accent" intent`)
      } else {
        passed++
        console.log(`  ✅ Scene ${sceneIndex} correctly identified as accent`)
      }
    } catch (error) {
      failed++
      failures.push(`TEST 3: Failed to build prompt for scene ${sceneIndex}: ${error}`)
    }
  }
  
  for (const sceneIndex of baseScenes) {
    try {
      const prompt = await buildSingleImagePrompt(
        mockTemplatePrompt,
        sceneIndex,
        mockBrandKit,
        'beige',
        'minimal'
      )
      
      if (!prompt.includes('Scene intent: base')) {
        failed++
        failures.push(`TEST 3: Scene ${sceneIndex} should have "base" intent`)
      } else {
        passed++
        console.log(`  ✅ Scene ${sceneIndex} correctly identified as base`)
      }
    } catch (error) {
      failed++
      failures.push(`TEST 3: Failed to build prompt for scene ${sceneIndex}: ${error}`)
    }
  }

  // TEST 4: Athletic style prompts exclude forbidden environments
  console.log('\nTEST 4: Athletic style excludes forbidden environments')
  const forbiddenEnvs = ['corporate office', 'boardroom', 'financial district', 'formal workplace']
  
  for (let sceneIndex = 1; sceneIndex <= 9; sceneIndex++) {
    try {
      const prompt = await buildSingleImagePrompt(
        mockTemplatePrompt,
        sceneIndex,
        mockBrandKit,
        'beige',
        'minimal'
      )
      
      for (const forbiddenEnv of forbiddenEnvs) {
        if (prompt.toLowerCase().includes(forbiddenEnv.toLowerCase())) {
          failed++
          failures.push(`TEST 4: Scene ${sceneIndex} contains forbidden environment "${forbiddenEnv}"`)
        }
      }
      
      if (!prompt.includes('Avoid restricted environments')) {
        // Check if lifestyle context was applied
        const context = resolveLifestyleContext({
          fashionStyle: 'athletic',
          category: 'beige',
          vibe: 'minimal'
        })
        if (context.forbiddenEnvironments && context.forbiddenEnvironments.length > 0) {
          // Lifestyle context exists, so it should be in prompt
          failed++
          failures.push(`TEST 4: Scene ${sceneIndex} should include forbidden environments rule`)
        }
      } else {
        passed++
      }
    } catch (error) {
      failed++
      failures.push(`TEST 4: Failed to build prompt for scene ${sceneIndex}: ${error}`)
    }
  }
  
  if (failed === 0) {
    console.log('  ✅ All scenes correctly exclude forbidden environments')
  }

  // TEST 5: Story coherence rule present
  console.log('\nTEST 5: Story coherence rule')
  try {
    const prompt = await buildSingleImagePrompt(
      mockTemplatePrompt,
      1,
      mockBrandKit,
      'beige',
      'minimal'
    )
    
    if (!prompt.includes('STORY COHERENCE RULE') || !prompt.includes('distinct moment')) {
      failed++
      failures.push('TEST 5: Story coherence rule missing from prompt')
    } else {
      passed++
      console.log('  ✅ Story coherence rule present in prompt')
    }
  } catch (error) {
    failed++
    failures.push(`TEST 5: Failed to build prompt: ${error}`)
  }

  // TEST 6: Accent scenes allow accent items
  console.log('\nTEST 6: Accent scenes allow accent items')
  for (const sceneIndex of [3, 7]) {
    try {
      const prompt = await buildSingleImagePrompt(
        mockTemplatePrompt,
        sceneIndex,
        mockBrandKit,
        'beige',
        'minimal'
      )
      
      const context = resolveLifestyleContext({
        fashionStyle: 'athletic',
        category: 'beige',
        vibe: 'minimal'
      })
      
      if (context.outfitVariation?.accent && context.outfitVariation.accent.length > 0) {
        // Should mention accent items allowed
        if (!prompt.includes('Accent items allowed') || prompt.includes('Accent items allowed: none')) {
          failed++
          failures.push(`TEST 6: Scene ${sceneIndex} (accent) should allow accent items`)
        } else {
          passed++
          console.log(`  ✅ Scene ${sceneIndex} correctly allows accent items`)
        }
      }
    } catch (error) {
      failed++
      failures.push(`TEST 6: Failed to build prompt for scene ${sceneIndex}: ${error}`)
    }
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

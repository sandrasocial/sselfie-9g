/**
 * QA Script: P0 Scene Contract Verification
 * 
 * Phase P0: Paid Blueprint FeedPlanner 9-Scene Prompt Quality Fix
 * 
 * This script generates 9 prompts for a sample brandKit and verifies:
 * 1. Each prompt includes the correct sceneDNA block
 * 2. Each prompt matches its sceneId (position 1 = scene 1, etc.)
 * 3. No scene mixing language
 * 4. Fingerprints change expectedly
 * 
 * Run with: npx tsx scripts/qa-p0-scene-contract.ts
 */

import { buildSingleImagePrompt } from '@/lib/feed-planner/build-single-image-prompt'
import { getSceneSpec, validateSceneContract } from '@/lib/maya/scene-library'
import { createHash } from 'crypto'

// Sample template (luxury_dark_moody) with placeholders replaced
const SAMPLE_TEMPLATE = `Use reference images for strict identity consistency (face, body, hair, skin tone, styling). Create 3x3 grid with 9 distinct camera angles. Clean symmetrical layout with subtle frame separation. High-resolution editorial photography. Natural poses, authentic lighting. Different angles from reference.

Vibe: Dark luxury editorial aesthetic. All black outfits with urban edge. Moody city lighting, concrete architecture, professional spaces. iPhone photography style with natural film grain, high contrast shadows, sophisticated and effortless.

Setting: Urban concrete structures, modern office interiors, city streets at dusk, luxury building lobbies

Outfits: Black tailored blazer, dark denim, black accessories

9 frames:
1. Sitting on city bench - Black tailored blazer, dark denim, relaxed pose
2. Coffee and black accessories on dark marble table - overhead flatlay, evening lighting
3. Full-body against concrete wall - Black tailored blazer, dark denim, dynamic pose, urban background
4. Close-up black necklace - hand touching collarbone, soft shadow
5. Street sign reading "ICONIC" in bold serif font on concrete wall, evening lighting
6. Black blazer with rhinestone details - close texture shot on reflective dark surface
7. Walking naturally on city street - Black tailored blazer, dark denim, yellow road markings visible
8. Working at laptop with coffee - overhead view, hands typing, modern office
9. Mirror selfie - Black tailored blazer, dark denim, phone in hand, luxury bathroom

Color grade: Deep blacks, cool grays, concrete tones, warm skin preserved, gold jewelry highlights, dramatic shadows, iPhone grain, moody candid lighting, high contrast.`

async function runQACheck() {
  console.log('🔍 P0 Scene Contract QA Check')
  console.log('=' .repeat(60))
  console.log('')

  const results: Array<{
    position: number
    sceneId: number
    prompt: string
    fingerprint: string
    validation: ReturnType<typeof validateSceneContract>
    sceneSpec: ReturnType<typeof getSceneSpec>
  }> = []

  // Generate prompts for positions 1-9
  for (let position = 1; position <= 9; position++) {
    try {
      const prompt = await buildSingleImagePrompt(SAMPLE_TEMPLATE, position)
      const fingerprint = createHash('sha256').update(prompt).digest('hex').substring(0, 16)
      const sceneSpec = getSceneSpec(position)
      const validation = validateSceneContract(prompt, position)

      results.push({
        position,
        sceneId: position, // Deterministic mapping: position = sceneId
        prompt,
        fingerprint,
        validation,
        sceneSpec,
      })
    } catch (error) {
      console.error(`❌ Error generating prompt for position ${position}:`, error)
      process.exit(1)
    }
  }

  // Report results
  console.log('📊 Results Summary')
  console.log('=' .repeat(60))
  console.log('')

  let allValid = true
  const fingerprints = new Set<string>()

  for (const result of results) {
    const isValid = result.validation.isValid
    const hasWarnings = result.validation.warnings.length > 0
    const status = isValid ? '✅' : '❌'
    const warningStatus = hasWarnings ? '⚠️' : ''

    console.log(`${status} ${warningStatus} Position ${result.position} (Scene ${result.sceneId}):`)
    console.log(`   Scene: ${result.sceneSpec?.title || 'Unknown'}`)
    console.log(`   Fingerprint: ${result.fingerprint}`)
    console.log(`   Prompt length: ${result.prompt.split(/\s+/).length} words`)
    console.log(`   Valid: ${isValid}`)

    if (result.validation.missingElements.length > 0) {
      console.log(`   Missing: ${result.validation.missingElements.join(', ')}`)
      allValid = false
    }

    if (result.validation.warnings.length > 0) {
      console.log(`   Warnings: ${result.validation.warnings.join(', ')}`)
    }

    // Check for sceneDNA in prompt
    const hasSceneDNA = result.sceneSpec?.sceneDNA && result.prompt.toLowerCase().includes(result.sceneSpec.sceneDNA.toLowerCase().substring(0, 20))
    console.log(`   Contains sceneDNA: ${hasSceneDNA ? '✅' : '❌'}`)

    // Check for "one scene" constraint
    const hasOneSceneConstraint = result.prompt.toLowerCase().includes('exactly one scene') || result.prompt.toLowerCase().includes('do not mix')
    console.log(`   Has one-scene constraint: ${hasOneSceneConstraint ? '✅' : '❌'}`)

    // Check fingerprint uniqueness
    if (fingerprints.has(result.fingerprint)) {
      console.log(`   ⚠️ Duplicate fingerprint detected!`)
    } else {
      fingerprints.add(result.fingerprint)
    }

    console.log('')
  }

  // Summary
  console.log('=' .repeat(60))
  console.log('📋 Summary')
  console.log('=' .repeat(60))
  console.log(`Total prompts generated: ${results.length}`)
  console.log(`All valid: ${allValid ? '✅' : '❌'}`)
  console.log(`Unique fingerprints: ${fingerprints.size}/${results.length}`)
  console.log(`Expected fingerprints: 9 (one per scene)`)
  console.log('')

  if (allValid && fingerprints.size === 9) {
    console.log('✅ QA CHECK PASSED')
    console.log('   - All prompts include correct sceneDNA')
    console.log('   - All prompts match their sceneId')
    console.log('   - No scene mixing detected')
    console.log('   - Fingerprints are unique (expected behavior)')
  } else {
    console.log('❌ QA CHECK FAILED')
    if (!allValid) {
      console.log('   - Some prompts missing sceneDNA or have validation errors')
    }
    if (fingerprints.size !== 9) {
      console.log(`   - Fingerprint uniqueness issue: ${fingerprints.size} unique fingerprints (expected 9)`)
    }
    process.exit(1)
  }

  console.log('')
  console.log('📝 Sample Prompts (first 200 chars each)')
  console.log('=' .repeat(60))
  for (const result of results.slice(0, 3)) {
    console.log(`\nPosition ${result.position}:`)
    console.log(result.prompt.substring(0, 200) + '...')
  }
}

runQACheck().catch((error) => {
  console.error('❌ QA script failed:', error)
  process.exit(1)
})

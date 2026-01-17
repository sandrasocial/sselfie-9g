/**
 * Phase 1A QA: BrandKit Injection Assertions
 * 
 * PURPOSE: Verify that user-selected brand fields appear in generated prompts
 * 
 * TEST SCENARIO:
 * - Create sample user_personal_brand with obvious values
 * - Build BrandKit via canonical builder
 * - Generate 9 prompts (EP-05 single image)
 * - Assert prompts contain exact user-selected strings
 * - Assert scene blocks still differ per sceneId
 */

import { buildBrandKit, formatBrandProfileBlock } from '../lib/brand/build-brand-kit'
import { buildSingleImagePrompt } from '../lib/feed-planner/build-single-image-prompt'
import type { UserPersonalBrand } from '../lib/data/maya'

/**
 * Create sample user_personal_brand with obvious test values
 */
function createSampleBrandProfile(): Partial<UserPersonalBrand> {
  return {
    id: 999,
    user_id: 'test-user-123',
    name: 'Test Brand',
    business_type: 'FOUNDER BRAND',
    brand_vibe: 'LUXURY MINIMAL',
    brand_voice: 'AUTHENTIC ELEGANT',
    target_audience: 'women founders',
    color_palette: [
      { name: 'Primary', hex: '#000000' },
      { name: 'Secondary', hex: '#FFFFFF' },
      { name: 'Accent', hex: '#808080' },
    ],
    visual_aesthetic: JSON.stringify(['EDITORIAL MONOCHROME', 'MINIMALIST LUXURY']),
    fashion_style: JSON.stringify(['ALL BLACK BLAZER', 'STRUCTURED SILHOUETTES']),
    communication_voice: JSON.stringify(['PROFESSIONAL', 'CONFIDENT']),
    settings_preference: JSON.stringify(['MODERN OFFICE', 'LUXURY HOTEL']),
    content_pillars: 'BUSINESS INSIGHTS, PERSONAL STORY',
    is_completed: true,
    onboarding_step: 5,
    created_at: new Date(),
    updated_at: new Date(),
    completed_at: new Date(),
  }
}

/**
 * Assert that a string contains all required substrings
 */
function assertContains(text: string, requiredStrings: string[], testName: string): void {
  const missing: string[] = []
  
  for (const required of requiredStrings) {
    if (!text.includes(required)) {
      missing.push(required)
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`[${testName}] Missing required strings: ${missing.join(', ')}\n\nText:\n${text.substring(0, 500)}...`)
  }
  
  console.log(`✅ [${testName}] All required strings found`)
}

/**
 * Assert that prompts differ per sceneId (scene blocks are unique)
 */
function assertScenesDiffer(prompts: string[], testName: string): void {
  // Extract scene DNA from each prompt (look for "Scene requirement:" line)
  const sceneDNAs = prompts.map((prompt, index) => {
    const match = prompt.match(/Scene requirement:\s*([^.]+)/i)
    return match ? match[1].trim() : `NO_SCENE_${index + 1}`
  })
  
  // Check that all scenes are different
  const uniqueScenes = new Set(sceneDNAs)
  if (uniqueScenes.size < 9) {
    throw new Error(`[${testName}] Scenes are not unique. Found ${uniqueScenes.size} unique scenes out of 9.\n\nScenes:\n${sceneDNAs.join('\n')}`)
  }
  
  console.log(`✅ [${testName}] All 9 scenes are unique`)
}

/**
 * Main QA test
 */
async function runQATest(): Promise<void> {
  console.log('🧪 Phase 1A QA: BrandKit Injection Test\n')
  
  // Step 1: Create sample brand profile
  const sampleBrand = createSampleBrandProfile()
  console.log('📝 Sample brand profile created:', {
    brand_vibe: sampleBrand.brand_vibe,
    fashion_style: sampleBrand.fashion_style,
    visual_aesthetic: sampleBrand.visual_aesthetic,
  })
  
  // Step 2: Build BrandKit via canonical builder
  const brandKitResult = buildBrandKit(sampleBrand)
  console.log('\n📦 BrandKit built:', {
    brandVibe: brandKitResult.brandKit.brandVibe,
    fashionStyle: brandKitResult.brandKit.fashionStyle,
    visualAesthetic: brandKitResult.brandKit.visualAesthetic,
    hasColors: brandKitResult.metadata.hasColors,
    missingFields: brandKitResult.metadata.missingFields,
  })
  
  // Step 3: Format brand profile block
  const brandProfileBlock = formatBrandProfileBlock(brandKitResult.brandKit)
  console.log('\n📄 Brand Profile Block:\n', brandProfileBlock)
  
  // Assertions on brand profile block
  assertContains(brandProfileBlock, [
    'LUXURY MINIMAL',
    'ALL BLACK BLAZER',
    'EDITORIAL MONOCHROME',
    'women founders',
  ], 'Brand Profile Block Content')
  
  // Step 4: Generate 9 prompts (one per scene position)
  console.log('\n🎨 Generating 9 prompts (one per scene)...\n')
  const prompts: string[] = []
  const templatePrompt = 'Test template prompt with frame placeholders'
  
  for (let position = 1; position <= 9; position++) {
    try {
      const prompt = await buildSingleImagePrompt(
        templatePrompt,
        position,
        brandKitResult.brandKit
      )
      prompts.push(prompt)
      console.log(`✅ Prompt ${position} generated (${prompt.split(/\s+/).length} words)`)
    } catch (error) {
      throw new Error(`Failed to generate prompt for position ${position}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  // Step 5: Assert prompts contain user-selected fields
  console.log('\n🔍 Asserting prompts contain user-selected fields...\n')
  
  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i]
    const position = i + 1
    
    // Assert brand profile block is present
    assertContains(prompt, ['=== USER BRAND PROFILE ==='], `Prompt ${position} - Brand Profile Block Present`)
    
    // Assert user-selected fields are present
    assertContains(prompt, [
      'LUXURY MINIMAL', // brand_vibe
      'ALL BLACK BLAZER', // fashion_style
      'EDITORIAL MONOCHROME', // visual_aesthetic
      'women founders', // target_audience
    ], `Prompt ${position} - User Fields Present`)
    
    // Assert color palette is present (if colors were extracted)
    if (brandKitResult.metadata.hasColors) {
      assertContains(prompt, ['#000000', '#FFFFFF'], `Prompt ${position} - Color Palette Present`)
    }
  }
  
  // Step 6: Assert scenes differ per sceneId
  console.log('\n🔍 Asserting scenes differ per sceneId...\n')
  assertScenesDiffer(prompts, 'Scene Uniqueness')
  
  // Step 7: Summary
  console.log('\n✅ Phase 1A QA: All assertions passed!\n')
  console.log('Summary:')
  console.log(`- BrandKit built: ✅`)
  console.log(`- Brand profile block formatted: ✅`)
  console.log(`- 9 prompts generated: ✅`)
  console.log(`- User fields present in all prompts: ✅`)
  console.log(`- Scenes differ per position: ✅`)
}

// Run test
if (require.main === module) {
  runQATest()
    .then(() => {
      console.log('\n🎉 Phase 1A QA completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Phase 1A QA failed:', error)
      process.exit(1)
    })
}

export { runQATest }

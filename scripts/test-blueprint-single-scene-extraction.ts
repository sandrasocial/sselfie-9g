/**
 * Test Script: Blueprint Single Scene Extraction Audit
 * 
 * Tests the single scene extraction for all 9 positions in blueprint feed planner.
 * Logs the exact prompts being built for each position that would be sent to Replicate.
 * 
 * Run with: npx tsx scripts/test-blueprint-single-scene-extraction.ts
 * 
 * Prerequisites:
 * - DATABASE_URL must be set in .env.local
 * - Test user will be created automatically
 */

// Load environment variables FIRST
import { config } from 'dotenv'
import { resolve } from 'path'
const envResult = config({ path: resolve(process.cwd(), '.env.local') })

if (envResult.error) {
  console.warn('⚠️  Could not load .env.local, trying .env instead')
  config({ path: resolve(process.cwd(), '.env') })
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables')
  process.exit(1)
}

import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL!)

// Test configuration
const TEST_VIBE = 'luxury_light_minimalistic'
const TEST_CATEGORY = 'luxury'
const TEST_MOOD = 'minimal'

interface ScenePrompt {
  position: number
  frameType: 'flatlay' | 'closeup' | 'fullbody' | 'midshot'
  rawFrameDescription: string
  cleanedFrameDescription: string
  finalPrompt: string
  wordCount: number
  characterCount: number
}

// Helper: Create test user
async function createTestUser(): Promise<string> {
  const testEmail = `test-blueprint-${Date.now()}@test.local`
  const userId = globalThis.crypto.randomUUID()
  const result = await sql`
    INSERT INTO users (id, email, created_at, updated_at)
    VALUES (${userId}, ${testEmail}, NOW(), NOW())
    RETURNING id
  `
  return result[0].id.toString()
}

// Helper: Create personal brand for user
async function createPersonalBrand(userId: string, fashionStyles: string): Promise<void> {
  // Split comma-separated styles into array
  const stylesArray = fashionStyles.split(',').map(s => s.trim()).filter(s => s.length > 0)
  
  const existing = await sql`
    SELECT id FROM user_personal_brand WHERE user_id = ${userId} LIMIT 1
  `
  
  if (existing.length > 0) {
    await sql`
      UPDATE user_personal_brand
      SET visual_aesthetic = ARRAY[${TEST_VIBE}]::text[],
          fashion_style = ${stylesArray}::text[],
          is_completed = true,
          updated_at = NOW()
      WHERE user_id = ${userId}
    `
  } else {
    await sql`
      INSERT INTO user_personal_brand (user_id, visual_aesthetic, fashion_style, is_completed, created_at, updated_at)
      VALUES (
        ${userId},
        ARRAY[${TEST_VIBE}]::text[],
        ${stylesArray}::text[],
        true,
        NOW(),
        NOW()
      )
    `
  }
}

// Main test function
async function testBlueprintSingleSceneExtraction() {
  console.log('='.repeat(100))
  console.log('BLUEPRINT SINGLE SCENE EXTRACTION AUDIT')
  console.log('='.repeat(100))
  console.log()
  console.log('Testing all 9 scenes in blueprint feed planner')
  console.log(`Vibe: ${TEST_VIBE}`)
  console.log(`Category: ${TEST_CATEGORY}`)
  console.log(`Mood: ${TEST_MOOD}`)
  console.log()
  
  // Check database connection
  try {
    await sql`SELECT 1`
    console.log('✅ Database connection successful')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  }
  
  // Create test user
  const userId = await createTestUser()
  console.log(`✅ Created test user: ${userId}`)
  
  // Create personal brand with MULTIPLE fashion styles to test rotation
  // This simulates a user who selected multiple styles in the wizard
  await createPersonalBrand(userId, 'business,casual,athletic')
  console.log(`✅ Created personal brand with fashion styles: business, casual, athletic (rotation enabled)`)
  console.log()
  
  // Import required functions
  const { getBlueprintPhotoshootPrompt } = await import('../lib/maya/blueprint-photoshoot-templates')
  const { getCategoryAndMood, getFashionStyleForPosition, injectAndValidateTemplate } = await import('../lib/feed-planner/generation-helpers')
  const { buildSingleImagePrompt, parseTemplateFrames, detectFrameType } = await import('../lib/feed-planner/build-single-image-prompt')
  
  // Step 1: Get blueprint template
  console.log('='.repeat(100))
  console.log('STEP 1: GET BLUEPRINT TEMPLATE')
  console.log('='.repeat(100))
  const fullTemplate = getBlueprintPhotoshootPrompt(TEST_CATEGORY, TEST_MOOD)
  console.log(`✅ Retrieved blueprint template: ${TEST_CATEGORY}_${TEST_MOOD}`)
  console.log(`   Template length: ${fullTemplate.length} characters`)
  console.log(`   Template word count: ${fullTemplate.split(/\s+/).length} words`)
  console.log()
  
  // Step 2: Parse template to see raw structure
  console.log('='.repeat(100))
  console.log('STEP 2: PARSE TEMPLATE STRUCTURE')
  console.log('='.repeat(100))
  const parsed = parseTemplateFrames(fullTemplate)
  console.log(`✅ Parsed template structure:`)
  console.log(`   Vibe: ${parsed.vibe.substring(0, 80)}...`)
  console.log(`   Setting: ${parsed.setting.substring(0, 80)}...`)
  console.log(`   Color Grade: ${parsed.colorGrade.substring(0, 80)}...`)
  console.log(`   Frames found: ${parsed.frames.length}`)
  console.log()
  
  // Step 3: Inject dynamic content
  console.log('='.repeat(100))
  console.log('STEP 3: INJECT DYNAMIC CONTENT')
  console.log('='.repeat(100))
  const mockFeedLayout = { feed_style: TEST_MOOD }
  const mockUser = { id: userId }
  
  const { category, mood } = await getCategoryAndMood(mockFeedLayout, mockUser, {
    checkSettingsPreference: true,
    checkBlueprintSubscribers: false,
    trackSource: false
  })
  
  console.log(`✅ Category/Mood resolved: ${category}_${mood}`)
  
  // Get fashion style for position 1 (will rotate for other positions)
  const fashionStyle = await getFashionStyleForPosition(mockUser, 1)
  console.log(`✅ Fashion style for position 1: ${fashionStyle}`)
  
  const injectedTemplate = await injectAndValidateTemplate(
    fullTemplate,
    category,
    mood,
    fashionStyle,
    userId
  )
  
  console.log(`✅ Dynamic content injected`)
  console.log(`   Injected template length: ${injectedTemplate.length} characters`)
  console.log(`   Injected template word count: ${injectedTemplate.split(/\s+/).length} words`)
  console.log()
  
  // Step 4: Extract all 9 scenes
  console.log('='.repeat(100))
  console.log('STEP 4: EXTRACT ALL 9 SCENES')
  console.log('='.repeat(100))
  console.log()
  
  const scenePrompts: ScenePrompt[] = []
  
  for (let position = 1; position <= 9; position++) {
    console.log(`\n${'─'.repeat(100)}`)
    console.log(`POSITION ${position}/9`)
    console.log(`${'─'.repeat(100)}`)
    
    try {
      // Get fashion style for this position (rotates)
      const positionFashionStyle = await getFashionStyleForPosition(mockUser, position)
      
      // Re-inject template with position-specific fashion style
      // Note: In real flow, injection happens once per feed, but we're testing each position
      const positionInjectedTemplate = await injectAndValidateTemplate(
        fullTemplate,
        category,
        mood,
        positionFashionStyle,
        userId
      )
      
      // Extract single scene prompt
      const finalPrompt = buildSingleImagePrompt(positionInjectedTemplate, position)
      
      // Parse to get frame details
      const parsedInjected = parseTemplateFrames(positionInjectedTemplate)
      const frame = parsedInjected.frames.find(f => f.position === position)
      
      if (!frame) {
        console.error(`❌ Frame ${position} not found in template`)
        continue
      }
      
      const frameType = detectFrameType(frame.description)
      
      // Log detailed information
      console.log(`📋 Frame Type: ${frameType}`)
      console.log(`📋 Fashion Style: ${positionFashionStyle}`)
      console.log()
      console.log(`📝 Raw Frame Description:`)
      console.log(`   ${frame.description}`)
      console.log()
      
      // Show what was cleaned (if applicable)
      if (frameType === 'flatlay' || frameType === 'closeup') {
        console.log(`🧹 Frame was cleaned (${frameType} type):`)
        console.log(`   Original: ${frame.description.substring(0, 100)}...`)
        console.log(`   (Cleaning happens in buildSingleImagePrompt)`)
        console.log()
      }
      
      console.log(`✅ Final Prompt (sent to Replicate):`)
      console.log(`   Length: ${finalPrompt.length} characters`)
      console.log(`   Word count: ${finalPrompt.split(/\s+/).length} words`)
      console.log()
      console.log(`📤 PROMPT CONTENT:`)
      console.log(`${'─'.repeat(100)}`)
      console.log(finalPrompt)
      console.log(`${'─'.repeat(100)}`)
      
      // Store for summary
      scenePrompts.push({
        position,
        frameType,
        rawFrameDescription: frame.description,
        cleanedFrameDescription: finalPrompt.split(frame.description)[0] || frame.description, // Approximation
        finalPrompt,
        wordCount: finalPrompt.split(/\s+/).length,
        characterCount: finalPrompt.length
      })
      
    } catch (error: any) {
      console.error(`❌ Error extracting position ${position}:`, error.message)
      console.error(error.stack)
    }
  }
  
  // Step 5: Summary
  console.log()
  console.log('='.repeat(100))
  console.log('SUMMARY: ALL 9 SCENES')
  console.log('='.repeat(100))
  console.log()
  
  console.log('Position | Frame Type | Fashion Style | Word Count | Character Count')
  console.log('─'.repeat(100))
  
  for (const scene of scenePrompts) {
    const fashionStyle = await getFashionStyleForPosition(mockUser, scene.position)
    console.log(
      `   ${scene.position}    | ${scene.frameType.padEnd(8)} | ${fashionStyle.padEnd(13)} | ${scene.wordCount.toString().padStart(10)} | ${scene.characterCount.toString().padStart(15)}`
    )
  }
  
  console.log('─'.repeat(100))
  
  const totalWords = scenePrompts.reduce((sum, s) => sum + s.wordCount, 0)
  const avgWords = Math.round(totalWords / scenePrompts.length)
  const totalChars = scenePrompts.reduce((sum, s) => sum + s.characterCount, 0)
  const avgChars = Math.round(totalChars / scenePrompts.length)
  
  console.log(`Total: ${totalWords} words, ${totalChars} characters`)
  console.log(`Average: ${avgWords} words, ${avgChars} characters per scene`)
  console.log()
  
  // Frame type distribution
  const frameTypeCounts = scenePrompts.reduce((acc, s) => {
    acc[s.frameType] = (acc[s.frameType] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  console.log('Frame Type Distribution:')
  Object.entries(frameTypeCounts).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`)
  })
  console.log()
  
  // Verify all prompts are unique
  const uniquePrompts = new Set(scenePrompts.map(s => s.finalPrompt))
  console.log(`✅ Unique prompts: ${uniquePrompts.size}/9`)
  if (uniquePrompts.size < 9) {
    console.log(`⚠️  Warning: Some prompts are identical (may be expected for similar scenes)`)
  }
  console.log()
  
  // Check for placeholders
  const promptsWithPlaceholders = scenePrompts.filter(s => 
    /\{\{[A-Z_]+\}\}/.test(s.finalPrompt)
  )
  
  if (promptsWithPlaceholders.length > 0) {
    console.log(`❌ ERROR: Found ${promptsWithPlaceholders.length} prompts with unreplaced placeholders:`)
    promptsWithPlaceholders.forEach(s => {
      const placeholders = s.finalPrompt.match(/\{\{[A-Z_]+\}\}/g) || []
      console.log(`   Position ${s.position}: ${placeholders.join(', ')}`)
    })
  } else {
    console.log(`✅ All prompts have placeholders replaced`)
  }
  console.log()
  
  console.log('='.repeat(100))
  console.log('TEST COMPLETE')
  console.log('='.repeat(100))
  console.log()
  console.log('All 9 scenes have been extracted and logged above.')
  console.log('Each prompt shown is exactly what would be sent to Replicate for that position.')
  console.log()
}

// Run test
testBlueprintSingleSceneExtraction().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

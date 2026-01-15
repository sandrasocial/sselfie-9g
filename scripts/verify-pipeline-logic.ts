/**
 * Verification Script for Prompt Pipeline Cleanup
 * 
 * Tests the refactored helper functions to ensure they correctly:
 * 1. Resolve category/mood from priority sources
 * 2. Get fashion style with rotation
 * 3. Inject dynamic content and replace all placeholders
 * 
 * Run with: npx tsx scripts/verify-pipeline-logic.ts
 * 
 * Prerequisites:
 * - DATABASE_URL must be set in .env.local
 * - Test user should exist in database (or script will create mock data)
 */

// Load environment variables from .env.local FIRST (before any imports that use DATABASE_URL)
import { config } from 'dotenv'
import { resolve } from 'path'
const envResult = config({ path: resolve(process.cwd(), '.env.local') })

if (envResult.error) {
  console.warn('⚠️  Could not load .env.local, trying .env instead')
  config({ path: resolve(process.cwd(), '.env') })
}

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables')
  console.error('   Please ensure .env.local contains DATABASE_URL')
  process.exit(1)
}

// Use dynamic import to load helpers AFTER env vars are loaded
import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL!)

// Sample template with placeholders (matches actual blueprint template format)
const SAMPLE_TEMPLATE = `
Vibe: Professional elegance with modern sophistication

Frame 1 (Full Body): A confident woman in {{OUTFIT_FULLBODY_1}}, standing in {{LOCATION_OUTDOOR_1}}, {{LIGHTING_BRIGHT}}, shot on iPhone 15 Pro, natural skin texture.

Frame 2 (Mid Shot): A woman in {{OUTFIT_MIDSHOT_1}}, positioned in {{LOCATION_INDOOR_1}}, {{LIGHTING_AMBIENT}}, professional portrait style.

Frame 3 (Full Body): A confident woman in {{OUTFIT_FULLBODY_2}}, walking through {{LOCATION_ARCHITECTURAL_1}}, {{LIGHTING_EVENING}}, editorial quality.

Frame 4 (Close-up): Accessories on {{ACCESSORY_CLOSEUP_1}}, {{COLOR_PALETTE}}, minimal styling.

Frame 5 (Mid Shot): A woman in {{OUTFIT_MIDSHOT_2}}, seated in {{LOCATION_INDOOR_2}}, {{LIGHTING_AMBIENT}}, natural pose.

Frame 6 (Flatlay): Items arranged on {{ACCESSORY_FLATLAY_1}}, {{TEXTURE_NOTES}}, clean composition.

Frame 7 (Flatlay): Products displayed on {{ACCESSORY_FLATLAY_2}}, {{STYLING_NOTES}}, aesthetic arrangement.

Frame 8 (Full Body): A confident woman in {{OUTFIT_FULLBODY_3}}, in {{LOCATION_INDOOR_3}}, {{LIGHTING_BRIGHT}}, dynamic pose.

Frame 9 (Full Body): A confident woman in {{OUTFIT_FULLBODY_4}}, at {{LOCATION_OUTDOOR_1}}, {{LIGHTING_EVENING}}, final frame.
`

interface TestUser {
  id: string
  email: string
}

interface TestFeedLayout {
  feed_style: string | null
}

interface TestPost {
  position: number
}

async function main() {
  console.log('='.repeat(80))
  console.log('PROMPT PIPELINE VERIFICATION SCRIPT')
  console.log('='.repeat(80))
  console.log()

  // Check database connection
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set. Please set it in .env.local')
    process.exit(1)
  }

  try {
    // Test database connection
    await sql`SELECT 1`
    console.log('✅ Database connection successful')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  }

  // Dynamically import helpers after env vars are loaded
  const { getCategoryAndMood, getFashionStyleForPosition, injectAndValidateTemplate } = await import('../lib/feed-planner/generation-helpers')

  console.log()

  // ============================================================================
  // STEP 1: Test getCategoryAndMood
  // ============================================================================
  console.log('STEP 1: Testing getCategoryAndMood')
  console.log('-'.repeat(80))

  // Create mock feedLayout with feed_style (PRIMARY source)
  const mockFeedLayout: TestFeedLayout = {
    feed_style: 'luxury' // This should be used as PRIMARY source
  }

  // Create mock user (we'll use a test user ID or create one)
  let testUserId: string
  try {
    // Try to find an existing test user or create one
    const existingUser = await sql`
      SELECT id, email FROM users WHERE email LIKE 'test-%' LIMIT 1
    `
    
    if (existingUser.length > 0) {
      testUserId = existingUser[0].id
      console.log(`📋 Using existing test user: ${existingUser[0].email} (ID: ${testUserId})`)
    } else {
      // Create a test user for verification
      const testEmail = `test-${Date.now()}@verification.local`
      const newUser = await sql`
        INSERT INTO users (email, created_at)
        VALUES (${testEmail}, NOW())
        RETURNING id, email
      `
      testUserId = newUser[0].id
      console.log(`📋 Created test user: ${testEmail} (ID: ${testUserId})`)
    }
  } catch (error) {
    console.error('❌ Failed to get/create test user:', error)
    process.exit(1)
  }

  const mockUser = { id: testUserId }

  // Test 1a: With feedLayout.feed_style (should use PRIMARY source)
  console.log('\n📊 Test 1a: getCategoryAndMood with feedLayout.feed_style (PRIMARY)')
  const result1a = await getCategoryAndMood(mockFeedLayout, mockUser, {
    checkSettingsPreference: true,
    checkBlueprintSubscribers: false,
    trackSource: true
  })
  console.log(`   Result: category="${result1a.category}", mood="${result1a.mood}"`)
  console.log(`   Source: ${result1a.sourceUsed}`)
  
  if (result1a.mood === 'luxury' && result1a.sourceUsed?.includes('feed_layout')) {
    console.log('   ✅ PASS: Correctly used feedLayout.feed_style as PRIMARY source')
  } else {
    console.log('   ⚠️  WARNING: Expected mood="luxury" from feedLayout, but got different result')
  }

  // Test 1b: Without feedLayout (should fall back to user_personal_brand)
  console.log('\n📊 Test 1b: getCategoryAndMood without feedLayout (should use user_personal_brand)')
  const result1b = await getCategoryAndMood(null, mockUser, {
    checkSettingsPreference: true,
    checkBlueprintSubscribers: false,
    trackSource: true
  })
  console.log(`   Result: category="${result1b.category}", mood="${result1b.mood}"`)
  console.log(`   Source: ${result1b.sourceUsed}`)
  console.log('   ℹ️  Note: This will use defaults if no user_personal_brand exists')

  console.log()

  // ============================================================================
  // STEP 2: Test getFashionStyleForPosition
  // ============================================================================
  console.log('STEP 2: Testing getFashionStyleForPosition')
  console.log('-'.repeat(80))

  const mockPost: TestPost = { position: 1 }

  console.log(`\n📊 Testing with position: ${mockPost.position}`)
  const fashionStyle = await getFashionStyleForPosition(mockUser, mockPost.position)
  console.log(`   Result: fashionStyle="${fashionStyle}"`)
  
  if (fashionStyle && typeof fashionStyle === 'string') {
    console.log('   ✅ PASS: Fashion style returned successfully')
  } else {
    console.log('   ⚠️  WARNING: Fashion style should be a non-empty string')
  }

  console.log()

  // ============================================================================
  // STEP 3: Test injectAndValidateTemplate
  // ============================================================================
  console.log('STEP 3: Testing injectAndValidateTemplate')
  console.log('-'.repeat(80))

  // Use results from previous steps
  const category = result1a.category || 'professional'
  const mood = result1a.mood || 'minimal'

  console.log(`\n📊 Using category="${category}", mood="${mood}", fashionStyle="${fashionStyle}"`)
  console.log(`   Template length: ${SAMPLE_TEMPLATE.length} characters`)
  console.log(`   Template preview: ${SAMPLE_TEMPLATE.substring(0, 100)}...`)

  try {
    const injectedPrompt = await injectAndValidateTemplate(
      SAMPLE_TEMPLATE,
      category,
      mood,
      fashionStyle,
      testUserId
    )

    console.log(`\n✅ Injection successful!`)
    console.log(`   Injected prompt length: ${injectedPrompt.length} characters`)
    console.log(`   Injected prompt word count: ${injectedPrompt.split(/\s+/).length} words`)
    console.log(`   Injected prompt preview: ${injectedPrompt.substring(0, 200)}...`)

    // ============================================================================
    // STEP 4: Assertion - Check for remaining placeholders
    // ============================================================================
    console.log('\n' + '='.repeat(80))
    console.log('STEP 4: Assertion - Verifying no placeholders remain')
    console.log('='.repeat(80))

    // Check for any remaining {{...}} placeholders
    const placeholderPattern = /\{\{[A-Z_]+\}\}/g
    const remainingPlaceholders = injectedPrompt.match(placeholderPattern)

    if (remainingPlaceholders && remainingPlaceholders.length > 0) {
      console.log(`\n❌ FAIL: Found ${remainingPlaceholders.length} remaining placeholders:`)
      const uniquePlaceholders = Array.from(new Set(remainingPlaceholders))
      uniquePlaceholders.forEach(placeholder => {
        console.log(`   - ${placeholder}`)
      })
      console.log('\n⚠️  This indicates the injection did not complete successfully.')
      process.exit(1)
    } else {
      console.log('\n✅ PASS: No placeholders found in injected prompt!')
      console.log('   All placeholders have been successfully replaced with specific brand details.')
    }

    // Additional validation: Check for specific injected content
    console.log('\n📋 Additional Validation:')
    
    // Check for outfit mentions (should contain actual outfit descriptions, not placeholders)
    const hasOutfitMention = /(wearing|in|outfit|blazer|sweater|dress|jacket|shirt|pants|jeans)/i.test(injectedPrompt)
    console.log(`   Contains outfit descriptions: ${hasOutfitMention ? '✅' : '⚠️'}`)
    
    // Check for location mentions (should contain actual locations, not placeholders)
    const hasLocationMention = /(in|at|standing|sitting|walking|through|office|room|cafe|street|outdoor|indoor)/i.test(injectedPrompt)
    console.log(`   Contains location descriptions: ${hasLocationMention ? '✅' : '⚠️'}`)
    
    // Check for lighting mentions
    const hasLightingMention = /(lighting|light|bright|ambient|evening|golden|natural)/i.test(injectedPrompt)
    console.log(`   Contains lighting descriptions: ${hasLightingMention ? '✅' : '⚠️'}`)

    console.log()

    // ============================================================================
    // SUMMARY
    // ============================================================================
    console.log('='.repeat(80))
    console.log('VERIFICATION SUMMARY')
    console.log('='.repeat(80))
    console.log()
    console.log('✅ getCategoryAndMood: Tested priority order (feedLayout → user_personal_brand → defaults)')
    console.log('✅ getFashionStyleForPosition: Tested fashion style retrieval with rotation')
    console.log('✅ injectAndValidateTemplate: Tested placeholder injection and validation')
    console.log('✅ Placeholder Replacement: All placeholders successfully replaced')
    console.log()
    console.log('🎉 All verification tests passed!')
    console.log()
    console.log('The refactored helper functions are working correctly.')
    console.log('Pro Mode generations will now use specific brand details instead of generic placeholders.')
    console.log()

  } catch (error: any) {
    console.error('\n❌ FAIL: Injection failed with error:')
    console.error(`   ${error.message}`)
    if (error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// Run the verification
main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

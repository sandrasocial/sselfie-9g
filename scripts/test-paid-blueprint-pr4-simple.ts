#!/usr/bin/env tsx
/**
 * PR-4 Simple Test Runner
 * 
 * This script tests the paid blueprint APIs
 * (Assumes migrations have already been run)
 */

import { config } from 'dotenv'
import { neon } from '@neondatabase/serverless'

// Load environment variables
config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

console.log('🚀 PR-4 API Test Runner')
console.log('=======================\n')

// Helper to test API endpoints
async function testAPI(url: string, options: RequestInit = {}) {
  try {
    const response = await fetch(url, options)
    const data = await response.json()
    return { success: response.ok, status: response.status, data }
  } catch (error: any) {
    return { success: false, status: 0, error: error.message }
  }
}

async function main() {
  console.log('STEP 1: Verify Migrations')
  console.log('==========================\n')

  try {
    // Check if paid_blueprint columns exist
    const checkColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'blueprint_subscribers' 
      AND column_name LIKE 'paid_blueprint%'
    `
    
    if (checkColumns.length >= 6) {
      console.log(`✅ Found ${checkColumns.length} paid_blueprint columns`)
      checkColumns.forEach((col: any) => console.log(`   - ${col.column_name}`))
      console.log()
    } else {
      console.log('❌ ERROR: Paid blueprint columns not found!')
      console.log('   Please run migrations first.\n')
      process.exit(1)
    }
  } catch (error: any) {
    console.error('❌ Database check failed:', error.message)
    process.exit(1)
  }

  console.log('\nSTEP 2: Setting Up Test Data')
  console.log('==============================\n')

  // Create a test subscriber
  const testEmail = `test-pr4-${Date.now()}@sselfie.com`
  const testAccessToken = `test_token_${Date.now()}_${Math.random().toString(36).substring(7)}`

  console.log(`📧 Test email: ${testEmail}`)
  console.log(`🔑 Test token: ${testAccessToken.substring(0, 20)}...\n`)

  try {
    // Insert test subscriber with strategy data
    await sql`
      INSERT INTO blueprint_subscribers (
        email,
        name,
        access_token,
        business,
        dream_client,
        form_data,
        strategy_generated,
        strategy_generated_at,
        strategy_data
      ) VALUES (
        ${testEmail},
        'Test User PR4',
        ${testAccessToken},
        'Content Creator',
        'Small business owners',
        ${JSON.stringify({
          business: 'Content Creator',
          dreamClient: 'Small business owners',
          vibe: 'professional',
          selectedFeedStyle: 'minimal-aesthetic'
        })},
        TRUE,
        NOW(),
        ${JSON.stringify({
          title: 'Minimal Professional Studio',
          description: 'Clean, professional shots in a minimal studio setting',
          prompt: 'professional woman in minimal studio setting, white background, natural lighting, candid photo, shot on iPhone 15 Pro, film grain, muted colors, authentic iPhone photo aesthetic'
        })}
      )
    `
    console.log('✅ Test subscriber created\n')
  } catch (error: any) {
    console.error('❌ Failed to create test subscriber:', error.message)
    process.exit(1)
  }

  // Mark as purchased
  try {
    await sql`
      UPDATE blueprint_subscribers
      SET 
        paid_blueprint_purchased = TRUE,
        paid_blueprint_purchased_at = NOW(),
        paid_blueprint_stripe_payment_id = ${'pi_test_' + Date.now()}
      WHERE email = ${testEmail}
    `
    console.log('✅ Marked as purchased\n')
  } catch (error: any) {
    console.error('❌ Failed to mark as purchased:', error.message)
    process.exit(1)
  }

  console.log('\nSTEP 3: Testing APIs')
  console.log('====================\n')

  // Determine base URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  console.log(`🌐 Base URL: ${baseUrl}`)
  console.log('⚠️  NOTE: Make sure dev server is running!\n')

  // Test 1: Check Status (Should show purchased, not generated)
  console.log('TEST 1: Check Status (Not Generated)')
  console.log('-------------------------------------')
  const statusUrl1 = `${baseUrl}/api/blueprint/get-paid-status?access=${testAccessToken}`
  const status1 = await testAPI(statusUrl1)
  
  if (status1.success) {
    console.log('✅ Status API works')
    console.log(`   Purchased: ${status1.data.purchased}`)
    console.log(`   Generated: ${status1.data.generated}`)
    console.log(`   Total Photos: ${status1.data.totalPhotos}`)
    console.log(`   Can Generate: ${status1.data.canGenerate}\n`)
    
    if (!status1.data.purchased) {
      console.log('❌ ERROR: Should be marked as purchased!\n')
    }
    if (status1.data.generated) {
      console.log('❌ ERROR: Should NOT be generated yet!\n')
    }
    if (!status1.data.canGenerate) {
      console.log('❌ ERROR: Should be able to generate!\n')
    }
  } else {
    console.log(`❌ Status API failed (${status1.status})`)
    console.log(`   Error: ${JSON.stringify(status1.data || status1.error)}\n`)
    
    if (status1.status === 0) {
      console.log('⚠️  Is the dev server running? Try: npm run dev\n')
    }
  }

  // Test 2: Generate Photos (This will take 5-10 minutes)
  if (status1.success) {
    console.log('\nTEST 2: Generate 30 Photos')
    console.log('---------------------------')
    console.log('⏳ This will take 5-10 minutes...')
    console.log('   (Generating 30 photos in batches of 5)\n')
    
    const generateUrl = `${baseUrl}/api/blueprint/generate-paid`
    const generateStart = Date.now()
    
    const generate = await testAPI(generateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: testAccessToken })
    })
    
    const generateDuration = Math.round((Date.now() - generateStart) / 1000)
    
    if (generate.success) {
      console.log(`✅ Generation complete in ${generateDuration} seconds`)
      console.log(`   Already Generated: ${generate.data.alreadyGenerated}`)
      console.log(`   Total Photos: ${generate.data.totalPhotos}`)
      console.log(`   Partial: ${generate.data.partial || false}`)
      
      if (generate.data.photoUrls && generate.data.photoUrls.length > 0) {
        console.log(`   First Photo: ${generate.data.photoUrls[0].substring(0, 50)}...`)
        console.log(`   Last Photo: ${generate.data.photoUrls[generate.data.photoUrls.length - 1].substring(0, 50)}...\n`)
      }
      
      if (generate.data.totalPhotos < 30) {
        console.log(`⚠️  WARNING: Only generated ${generate.data.totalPhotos}/30 photos (partial generation)\n`)
      }
    } else {
      console.log(`❌ Generation failed (${generate.status})`)
      console.log(`   Error: ${JSON.stringify(generate.data || generate.error)}\n`)
    }

    // Test 3: Check Status (Should show generated)
    if (generate.success) {
      console.log('\nTEST 3: Check Status (After Generation)')
      console.log('----------------------------------------')
      const status2 = await testAPI(statusUrl1)
      
      if (status2.success) {
        console.log('✅ Status API works')
        console.log(`   Purchased: ${status2.data.purchased}`)
        console.log(`   Generated: ${status2.data.generated}`)
        console.log(`   Total Photos: ${status2.data.totalPhotos}`)
        console.log(`   Can Generate: ${status2.data.canGenerate}`)
        console.log(`   Generated At: ${status2.data.generatedAt}\n`)
        
        if (!status2.data.generated && status2.data.totalPhotos >= 30) {
          console.log('⚠️  WARNING: Photos exist but generated flag not set\n')
        }
      } else {
        console.log(`❌ Status API failed (${status2.status})`)
        console.log(`   Error: ${JSON.stringify(status2.data || status2.error)}\n`)
      }

      // Test 4: Retry Generation (Idempotency Test)
      console.log('\nTEST 4: Retry Generation (Idempotency)')
      console.log('---------------------------------------')
      const retryStart = Date.now()
      
      const retry = await testAPI(generateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: testAccessToken })
      })
      
      const retryDuration = Math.round((Date.now() - retryStart) / 1000)
      
      if (retry.success) {
        console.log(`✅ Retry complete in ${retryDuration} seconds (should be < 5 sec)`)
        console.log(`   Already Generated: ${retry.data.alreadyGenerated}`)
        console.log(`   Total Photos: ${retry.data.totalPhotos}\n`)
        
        if (!retry.data.alreadyGenerated) {
          console.log('❌ ERROR: Should return alreadyGenerated: true\n')
        }
        if (retryDuration > 5) {
          console.log('⚠️  WARNING: Retry took too long (not properly idempotent)\n')
        }
      } else {
        console.log(`❌ Retry failed (${retry.status})`)
        console.log(`   Error: ${JSON.stringify(retry.data || retry.error)}\n`)
      }
    }
  }

  // Test 5: Verify Database
  console.log('\nTEST 5: Verify Database')
  console.log('------------------------')
  try {
    const dbCheck = await sql`
      SELECT 
        email,
        paid_blueprint_purchased,
        paid_blueprint_generated,
        paid_blueprint_generated_at,
        jsonb_array_length(paid_blueprint_photo_urls) AS photo_count
      FROM blueprint_subscribers
      WHERE email = ${testEmail}
    `
    
    if (dbCheck.length > 0) {
      const row = dbCheck[0]
      console.log('✅ Database record found')
      console.log(`   Email: ${row.email}`)
      console.log(`   Purchased: ${row.paid_blueprint_purchased}`)
      console.log(`   Generated: ${row.paid_blueprint_generated}`)
      console.log(`   Generated At: ${row.paid_blueprint_generated_at}`)
      console.log(`   Photo Count: ${row.photo_count}\n`)
      
      if (row.photo_count && row.photo_count !== 30) {
        console.log(`⚠️  WARNING: Expected 30 photos, got ${row.photo_count}\n`)
      }
    } else {
      console.log('❌ Database record not found\n')
    }
  } catch (error: any) {
    console.log('❌ Database check failed:', error.message, '\n')
  }

  // Test 6: Invalid Token
  console.log('\nTEST 6: Invalid Token (Should Fail)')
  console.log('------------------------------------')
  const invalidUrl = `${baseUrl}/api/blueprint/get-paid-status?access=invalid_token_123`
  const invalid = await testAPI(invalidUrl)
  
  if (!invalid.success && invalid.status === 404) {
    console.log('✅ Correctly rejected invalid token (404)\n')
  } else {
    console.log(`❌ Should reject invalid token with 404, got ${invalid.status}\n`)
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('TEST SUMMARY')
  console.log('='.repeat(50))
  console.log(`${status1.success ? '✅' : '❌'} Status API works`)
  console.log(`${!invalid.success && invalid.status === 404 ? '✅' : '❌'} Invalid token handling works`)
  console.log('='.repeat(50))

  console.log('\n💡 TIP: Check server logs for detailed generation progress')
  console.log('💡 TIP: Test subscriber email:', testEmail)
  console.log('💡 TIP: To clean up, run:')
  console.log(`   DELETE FROM blueprint_subscribers WHERE email = '${testEmail}';`)
  console.log('\n✨ PR-4 Testing Complete!\n')
}

main().catch((error) => {
  console.error('\n💥 Fatal error:', error)
  process.exit(1)
})

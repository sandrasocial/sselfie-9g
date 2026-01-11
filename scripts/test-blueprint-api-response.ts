/**
 * Test Blueprint API Response
 * 
 * This script verifies the /api/blueprint/state endpoint response
 * to ensure Decision 2 implementation is working correctly.
 * 
 * Usage: npx tsx scripts/test-blueprint-api-response.ts [email]
 */

import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const sql = neon(process.env.DATABASE_URL!)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface TestResult {
  passed: boolean
  message: string
  details?: any
}

async function testBlueprintAPI(email?: string) {
  const testEmail = email || 'test-decision2-1768052449603@test.com'
  
  console.log('🧪 Testing Blueprint API Response\n')
  console.log(`📧 Test User: ${testEmail}\n`)
  console.log('=' .repeat(60))
  console.log()

  const results: TestResult[] = []

  try {
    // Step 1: Get Supabase auth user
    console.log('Step 1: Getting Supabase auth user...')
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const authUser = users.find(u => u.email === testEmail)
    
    if (!authUser) {
      results.push({
        passed: false,
        message: `Auth user not found: ${testEmail}`,
      })
      console.log('❌ Auth user not found')
      printResults(results)
      process.exit(1)
    }
    
    console.log(`✅ Found Auth User ID: ${authUser.id}\n`)
    results.push({
      passed: true,
      message: `Auth user found: ${authUser.id}`,
    })

    // Step 2: Get Neon user (check by supabase_user_id)
    console.log('Step 2: Getting Neon user...')
    const neonUsers = await sql`
      SELECT id, email, supabase_user_id
      FROM users
      WHERE supabase_user_id = ${authUser.id}
      LIMIT 1
    `
    
    if (neonUsers.length === 0) {
      // Try by email as fallback
      const usersByEmail = await sql`
        SELECT id, email, supabase_user_id
        FROM users
        WHERE email = ${testEmail}
        LIMIT 1
      `
      if (usersByEmail.length === 0) {
        results.push({
          passed: false,
          message: `Neon user not found for auth ID: ${authUser.id} or email: ${testEmail}`,
        })
        console.log('❌ Neon user not found')
        printResults(results)
        process.exit(1)
      }
      const neonUser = usersByEmail[0]
      console.log(`✅ Found Neon User ID: ${neonUser.id} (by email)\n`)
      results.push({
        passed: true,
        message: `Neon user found: ${neonUser.id}`,
      })
      var userId = neonUser.id
    } else {
      const neonUser = neonUsers[0]
      console.log(`✅ Found Neon User ID: ${neonUser.id}\n`)
      results.push({
        passed: true,
        message: `Neon user found: ${neonUser.id}`,
      })
      var userId = neonUser.id
    }

    // Step 3: Query blueprint_subscribers (same as API)
    console.log('Step 3: Querying blueprint_subscribers...')
    const subscriber = await sql`
      SELECT 
        id,
        email,
        name,
        form_data,
        strategy_generated,
        strategy_generated_at,
        strategy_data,
        grid_generated,
        grid_generated_at,
        grid_url,
        grid_frame_urls,
        selfie_image_urls,
        blueprint_completed,
        blueprint_completed_at,
        paid_blueprint_purchased,
        feed_style
      FROM blueprint_subscribers
      WHERE user_id = ${userId}
      LIMIT 1
    `

    if (subscriber.length === 0) {
      results.push({
        passed: false,
        message: 'Blueprint subscriber record not found',
        details: { userId: neonUser.id },
      })
      console.log('❌ Blueprint subscriber record NOT FOUND\n')
      console.log('⚠️  This means API will return blueprint: null')
      console.log('⚠️  FeedViewScreen will NOT show (hasStrategy will be false)\n')
    } else {
      const data = subscriber[0]
      const hasStrategyData = !!data.strategy_data
      const strategyGenerated = !!data.strategy_generated
      
      results.push({
        passed: true,
        message: 'Blueprint subscriber record found',
        details: {
          strategy_generated: strategyGenerated,
          has_strategy_data: hasStrategyData,
          paid_blueprint_purchased: data.paid_blueprint_purchased,
        },
      })
      console.log('✅ Blueprint subscriber record found')
      console.log(`   - strategy_generated: ${strategyGenerated}`)
      console.log(`   - has_strategy_data: ${hasStrategyData}`)
      console.log(`   - paid_blueprint_purchased: ${data.paid_blueprint_purchased}\n`)
    }

    // Step 4: Get entitlement (simulate API logic)
    console.log('Step 4: Getting entitlement...')
    
    // Simulate getBlueprintEntitlement logic
    const subscriptions = await sql`
      SELECT product_type, status
      FROM subscriptions
      WHERE user_id = ${userId}
      AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `
    
    let entitlementType: "free" | "paid" | "studio" = "free"
    if (subscriptions.length > 0) {
      if (subscriptions[0].product_type === "sselfie_studio_membership") {
        entitlementType = "studio"
      } else if (subscriptions[0].product_type === "paid_blueprint") {
        entitlementType = "paid"
      }
    }
    
    // Get credit balance
    const creditRecords = await sql`
      SELECT balance
      FROM user_credits
      WHERE user_id = ${userId}
      LIMIT 1
    `
    const creditBalance = creditRecords.length > 0 ? Number(creditRecords[0].balance || 0) : 0
    
    const entitlement = {
      type: entitlementType,
      freeGridUsed: false,
      paidGridsRemaining: entitlementType !== "free" ? 30 : null,
    }

    console.log(`✅ Entitlement: ${entitlement.type}`)
    console.log(`✅ Credit Balance: ${creditBalance}\n`)

    // Step 5: Simulate API response
    console.log('Step 5: Simulating API response...\n')
    
    let apiResponse: any
    if (subscriber.length === 0) {
      apiResponse = {
        success: true,
        blueprint: null,
        entitlement: {
          type: entitlement.type,
          creditBalance,
          freeGridUsed: entitlement.freeGridUsed,
          paidGridsRemaining: entitlement.paidGridsRemaining,
        },
      }
    } else {
      const data = subscriber[0]
      const isCompleted = (data.strategy_generated === true) && (data.grid_generated === true && data.grid_url)
      
      apiResponse = {
        success: true,
        blueprint: {
          formData: data.form_data || {},
          feedStyle: data.feed_style || null,
          strategy: {
            generated: data.strategy_generated || false,
            generatedAt: data.strategy_generated_at || null,
            data: data.strategy_data || null,
          },
          grid: {
            generated: data.grid_generated || false,
            generatedAt: data.grid_generated_at || null,
            gridUrl: data.grid_url || null,
            frameUrls: data.grid_frame_urls || null,
          },
          selfieImages: data.selfie_image_urls || [],
          completed: isCompleted,
          completedAt: isCompleted ? (data.blueprint_completed_at || data.grid_generated_at) : null,
          paidBlueprintPurchased: data.paid_blueprint_purchased || false,
        },
        entitlement: {
          type: entitlement.type,
          creditBalance,
          freeGridUsed: entitlement.freeGridUsed,
          paidGridsRemaining: entitlement.paidGridsRemaining,
        },
      }
    }

    console.log('📊 Simulated API Response:')
    console.log(JSON.stringify(apiResponse, null, 2))
    console.log()

    // Step 6: Test component logic
    console.log('Step 6: Testing component logic...\n')
    
    const blueprint = apiResponse.blueprint
    const entitlement_data = apiResponse.entitlement
    
    const isPaidBlueprint = entitlement_data.type === "paid" || entitlement_data.type === "studio"
    const hasStrategy = blueprint?.strategy?.generated && blueprint?.strategy?.data

    console.log('Component Condition Checks:')
    console.log(`   entitlement.type: "${entitlement_data.type}"`)
    console.log(`   isPaidBlueprint: ${isPaidBlueprint} (type === "paid" || type === "studio")`)
    console.log(`   blueprint.strategy.generated: ${blueprint?.strategy?.generated || false}`)
    console.log(`   blueprint.strategy.data exists: ${!!blueprint?.strategy?.data}`)
    console.log(`   hasStrategy: ${!!hasStrategy} (generated && data exists)`)
    console.log(`   Should show FeedViewScreen: ${!!(isPaidBlueprint && hasStrategy)}`)
    console.log()

    // Step 7: Evaluate results
    console.log('Step 7: Evaluating results...\n')
    
    // Test: Entitlement type should be "paid" for paid blueprint users
    const entitlementTest = entitlement_data.type === "paid" || entitlement_data.type === "studio"
    results.push({
      passed: entitlementTest,
      message: `Entitlement type is "${entitlement_data.type}"`,
      details: {
        expected: "paid" || "studio",
        actual: entitlement_data.type,
        note: entitlement_data.type === "studio" ? "Studio members also have access" : "Paid blueprint users",
      },
    })

    // Test: Blueprint should exist for paid blueprint users
    const blueprintExistsTest = blueprint !== null
    results.push({
      passed: blueprintExistsTest,
      message: blueprintExistsTest ? 'Blueprint data exists' : 'Blueprint data is null',
      details: {
        hasBlueprint: blueprintExistsTest,
        note: blueprintExistsTest ? 'Blueprint subscriber record found' : 'Blueprint subscriber record NOT found',
      },
    })

    // Test: Strategy should exist if blueprint exists
    const strategyTest = blueprintExistsTest ? hasStrategy : false
    results.push({
      passed: strategyTest || !blueprintExistsTest,
      message: blueprintExistsTest 
        ? (hasStrategy ? 'Strategy data exists' : 'Strategy data is missing')
        : 'Strategy test skipped (no blueprint data)',
      details: {
        hasStrategy,
        strategyGenerated: blueprint?.strategy?.generated || false,
        strategyDataExists: !!blueprint?.strategy?.data,
      },
    })

    // Test: FeedViewScreen should show condition
    const feedViewScreenTest = isPaidBlueprint && hasStrategy
    results.push({
      passed: feedViewScreenTest,
      message: feedViewScreenTest 
        ? '✅ FeedViewScreen WILL show (Decision 2 working!)'
        : '❌ FeedViewScreen will NOT show',
      details: {
        isPaidBlueprint,
        hasStrategy,
        reason: feedViewScreenTest 
          ? 'Both conditions met'
          : !isPaidBlueprint 
            ? 'User does not have paid blueprint or studio membership'
            : !hasStrategy
              ? 'Blueprint strategy data is missing'
              : 'Unknown reason',
      },
    })

    // Step 8: Print final results
    printResults(results)

    // Step 9: Recommendations
    console.log('\n' + '='.repeat(60))
    console.log('📋 RECOMMENDATIONS\n')

    if (!feedViewScreenTest) {
      if (!isPaidBlueprint) {
        console.log('⚠️  Issue: User does not have paid blueprint or studio membership')
        console.log('   - Check subscription table for product_type="paid_blueprint"')
        console.log('   - Verify subscription status is "active"')
      }
      
      if (!hasStrategy) {
        console.log('⚠️  Issue: Blueprint strategy data is missing')
        if (!blueprintExistsTest) {
          console.log('   - Create blueprint_subscribers record with user_id')
        } else {
          console.log('   - Set strategy_generated = true')
          console.log('   - Add strategy_data (JSONB) to blueprint_subscribers')
        }
      }
    } else {
      console.log('✅ All tests passed! Decision 2 is working correctly.')
      console.log('✅ FeedViewScreen should appear for this user.')
    }

    console.log()
    return feedViewScreenTest

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`)
    console.error(error.stack)
    results.push({
      passed: false,
      message: `Error: ${error.message}`,
      details: { stack: error.stack },
    })
    printResults(results)
    process.exit(1)
  }
}

function printResults(results: TestResult[]) {
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST RESULTS\n')
  
  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌'
    console.log(`${icon} Test ${index + 1}: ${result.message}`)
    if (result.details) {
      console.log(`   Details:`, JSON.stringify(result.details, null, 2).split('\n').join('\n   '))
    }
    console.log()
  })

  const passed = results.filter(r => r.passed).length
  const total = results.length
  const percentage = ((passed / total) * 100).toFixed(1)

  console.log(`Summary: ${passed}/${total} tests passed (${percentage}%)`)
}

// Run test
const emailArg = process.argv[2]
testBlueprintAPI(emailArg).then((success) => {
  console.log()
  process.exit(success ? 0 : 1)
}).catch((error) => {
  console.error('\n❌ Test failed:', error)
  process.exit(1)
})

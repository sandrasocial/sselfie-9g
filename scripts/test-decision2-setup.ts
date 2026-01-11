/**
 * Decision 2 Testing Setup Script
 * 
 * Creates a test scenario for Decision 2 (Feed Planner Embed):
 * 1. Creates/uses a test user
 * 2. Grants paid blueprint subscription
 * 3. Creates blueprint_subscribers record with strategy_data
 * 4. Grants 60 credits
 * 
 * Usage: npx tsx scripts/test-decision2-setup.ts [email]
 */

import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { getOrCreateNeonUser } from '@/lib/user-mapping'

config({ path: resolve(process.cwd(), '.env.local') })

const sql = neon(process.env.DATABASE_URL!)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupTestUser(email?: string) {
  const testEmail = email || `test-decision2-${Date.now()}@test.com`
  const testPassword = 'TestPassword123!'

  console.log('🔧 Setting up Decision 2 test scenario...\n')
  console.log(`📧 Test email: ${testEmail}`)
  console.log(`🔑 Test password: ${testPassword}\n`)

  try {
    // Step 1: Create/get Supabase auth user
    console.log('Step 1: Creating Supabase auth user...')
    let authUser
    
    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers.users.find(u => u.email === testEmail)
    
    if (existingUser) {
      console.log('✅ User already exists in Supabase Auth')
      authUser = existingUser
    } else {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      })
      
      if (createError) throw createError
      authUser = newUser.user
      console.log('✅ Created new Supabase auth user')
    }

    // Step 2: Get/create Neon user using existing helper
    console.log('\nStep 2: Getting/creating Neon user...')
    const neonUser = await getOrCreateNeonUser(authUser.id, testEmail, 'Test User')
    console.log('✅ Got/created Neon user')
    const userId = neonUser.id

    // Step 3: Create paid blueprint subscription
    console.log('\nStep 3: Creating paid blueprint subscription...')
    // Check if subscription exists
    const existingSub = await sql`
      SELECT id FROM subscriptions 
      WHERE user_id = ${userId} 
      AND product_type = 'paid_blueprint'
      LIMIT 1
    `
    
    if (existingSub.length > 0) {
      // Update existing
      await sql`
        UPDATE subscriptions
        SET status = 'active', updated_at = NOW()
        WHERE id = ${existingSub[0].id}
      `
      console.log('✅ Updated existing paid blueprint subscription')
    } else {
      // Insert new
      await sql`
        INSERT INTO subscriptions (
          user_id,
          product_type,
          status,
          plan,
          stripe_subscription_id,
          stripe_customer_id,
          created_at,
          updated_at
        )
        VALUES (
          ${userId},
          'paid_blueprint',
          'active',
          'paid_blueprint',
          'test_sub_' || ${Date.now()}::text,
          'test_cust_' || ${Date.now()}::text,
          NOW(),
          NOW()
        )
      `
      console.log('✅ Created new paid blueprint subscription')
    }

    // Step 4: Grant 60 credits
    console.log('\nStep 4: Granting 60 credits...')
    await sql`
      INSERT INTO user_credits (user_id, balance, total_purchased, total_used, created_at, updated_at)
      VALUES (${userId}, 60, 60, 0, NOW(), NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        balance = 60,
        total_purchased = 60,
        updated_at = NOW()
    `
    
    // Record transaction
    await sql`
      INSERT INTO credit_transactions (
        user_id,
        amount,
        transaction_type,
        description,
        balance_after,
        created_at
      )
      VALUES (
        ${userId},
        60,
        'bonus',
        'Test: Paid blueprint credits (Decision 2 testing)',
        60,
        NOW()
      )
    `
    console.log('✅ Granted 60 credits')

    // Step 5: Create blueprint_subscribers record with strategy_data
    console.log('\nStep 5: Creating blueprint strategy data...')
    const strategyData = {
      title: "Test Brand Blueprint",
      description: "Test blueprint for Decision 2 testing",
      prompt: "Modern, minimalist lifestyle brand",
      contentCalendar: {
        week1: [
          { day: 1, type: "lifestyle", title: "Morning Routine", caption: "Start your day right 🌅" },
          { day: 2, type: "product", title: "Product Spotlight", caption: "Our latest collection ✨" },
          { day: 3, type: "lifestyle", title: "Behind the Scenes", caption: "How we create 📸" },
          { day: 4, type: "product", title: "Style Inspiration", caption: "Styled for you 💫" },
          { day: 5, type: "lifestyle", title: "Weekend Vibes", caption: "Weekend essentials 🎒" },
          { day: 6, type: "product", title: "Customer Love", caption: "What you're saying ❤️" },
          { day: 7, type: "lifestyle", title: "Sunday Reset", caption: "Prepare for the week 📅" },
        ],
        week2: [
          { day: 8, type: "lifestyle", title: "Monday Motivation", caption: "New week, new goals 🎯" },
          { day: 9, type: "product", title: "Best Seller", caption: "Your favorite item 🔥" },
        ],
      },
      captionTemplates: {
        lifestyle: [
          { title: "Morning Routine", template: "Start your day with {product} 🌅" },
          { title: "Weekend Vibes", template: "Weekend essentials: {product} 🎒" },
        ],
        product: [
          { title: "Product Spotlight", template: "Introducing {product} ✨" },
          { title: "Customer Love", template: "Thank you for your support ❤️" },
        ],
      },
    }

    // Check if blueprint_subscribers record exists
    const existingBlueprint = await sql`
      SELECT id FROM blueprint_subscribers 
      WHERE user_id = ${userId} OR email = ${testEmail}
      LIMIT 1
    `
    
    if (existingBlueprint.length > 0) {
      // Update existing
      await sql`
        UPDATE blueprint_subscribers
        SET 
          user_id = ${userId},
          strategy_generated = true,
          strategy_data = ${JSON.stringify(strategyData)}::jsonb,
          paid_blueprint_purchased = true,
          updated_at = NOW()
        WHERE id = ${existingBlueprint[0].id}
      `
      console.log('✅ Updated existing blueprint subscriber')
    } else {
      // Insert new
      const accessToken = `test_token_${Date.now()}_${Math.random().toString(36).substring(7)}`
      await sql`
        INSERT INTO blueprint_subscribers (
          user_id,
          email,
          name,
          access_token,
          strategy_generated,
          strategy_data,
          grid_generated,
          paid_blueprint_purchased,
          blueprint_completed,
          created_at,
          updated_at
        )
        VALUES (
          ${userId},
          ${testEmail},
          'Test User',
          ${accessToken},
          true,
          ${JSON.stringify(strategyData)}::jsonb,
          false,
          true,
          false,
          NOW(),
          NOW()
        )
      `
      console.log('✅ Created new blueprint subscriber')
    }
    console.log('✅ Created blueprint strategy data')

    // Step 6: Verify setup
    console.log('\nStep 6: Verifying setup...')
    const verification = await sql`
      SELECT 
        u.id,
        u.email,
        s.product_type,
        s.status,
        uc.balance,
        bs.strategy_generated,
        bs.strategy_data IS NOT NULL as has_strategy_data,
        bs.paid_blueprint_purchased
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id AND s.product_type = 'paid_blueprint'
      LEFT JOIN user_credits uc ON uc.user_id = u.id
      LEFT JOIN blueprint_subscribers bs ON bs.user_id = u.id
      WHERE u.id = ${userId}
    `

    if (verification.length > 0) {
      const v = verification[0]
      console.log('\n✅ Setup Complete! Verification:')
      console.log(`   User ID: ${v.id}`)
      console.log(`   Email: ${v.email}`)
      console.log(`   Subscription: ${v.product_type} (${v.status})`)
      console.log(`   Credits: ${v.balance}`)
      console.log(`   Strategy Generated: ${v.strategy_generated}`)
      console.log(`   Has Strategy Data: ${v.has_strategy_data}`)
      console.log(`   Paid Blueprint: ${v.paid_blueprint_purchased}`)

      console.log('\n🎯 Test Instructions:')
      console.log(`   1. Sign in with: ${testEmail}`)
      console.log(`   2. Password: ${testPassword}`)
      console.log(`   3. Navigate to: http://localhost:3000/studio?tab=blueprint`)
      console.log(`   4. Expected: FeedViewScreen should appear (not welcome screen)`)
      console.log(`   5. Expected: Strategy data should be visible as feed posts`)
      console.log(`   6. Expected: Credits should show: 60`)
      console.log(`   7. Test: Try generating an image in the feed`)
      console.log(`   8. Verify: Credits are deducted correctly\n`)
    } else {
      console.error('❌ Verification failed - setup incomplete')
      process.exit(1)
    }

    return { email: testEmail, password: testPassword, userId }
  } catch (error: any) {
    console.error('\n❌ Error setting up test user:', error)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run setup
const emailArg = process.argv[2]
setupTestUser(emailArg).then((credentials) => {
  console.log('\n✅ Test setup complete!')
  process.exit(0)
}).catch((error) => {
  console.error('\n❌ Setup failed:', error)
  process.exit(1)
})

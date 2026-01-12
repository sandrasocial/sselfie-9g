/**
 * Fix Paid Blueprint Status
 * 
 * This script checks and fixes paid blueprint status for a user.
 * It will:
 * 1. Check if user has a Stripe payment for paid blueprint
 * 2. Update blueprint_subscribers.paid_blueprint_purchased = TRUE if payment exists
 * 3. Grant 60 credits if not already granted
 * 4. Expand feed from 1 to 9 posts if needed
 * 5. Create subscription entry if missing
 */

import { neon } from "@neondatabase/serverless"
import { grantPaidBlueprintCredits } from "@/lib/credits"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL!)

async function fixPaidBlueprintStatus(userEmail: string) {
  try {
    console.log(`\n🔍 Checking paid blueprint status for: ${userEmail}\n`)

    // Step 1: Find user by email
    const user = await sql`
      SELECT id, email
      FROM users
      WHERE LOWER(email) = LOWER(${userEmail})
      LIMIT 1
    ` as any[]

    if (user.length === 0) {
      console.log(`❌ User not found: ${userEmail}`)
      return
    }

    const userId = user[0].id
    console.log(`✅ Found user: ${userId}`)

    // Step 2: Check blueprint_subscribers
    const blueprintSub = await sql`
      SELECT 
        id,
        user_id,
        email,
        paid_blueprint_purchased,
        paid_blueprint_purchased_at,
        paid_blueprint_stripe_payment_id
      FROM blueprint_subscribers
      WHERE user_id = ${userId}
      OR LOWER(email) = LOWER(${userEmail})
      ORDER BY created_at DESC
      LIMIT 1
    ` as any[]

    console.log(`\n📊 Blueprint Subscribers Status:`)
    if (blueprintSub.length === 0) {
      console.log(`  ❌ No blueprint_subscribers record found`)
    } else {
      console.log(`  ✅ Record found:`)
      console.log(`     - paid_blueprint_purchased: ${blueprintSub[0].paid_blueprint_purchased}`)
      console.log(`     - purchased_at: ${blueprintSub[0].paid_blueprint_purchased_at || 'NULL'}`)
      console.log(`     - stripe_payment_id: ${blueprintSub[0].paid_blueprint_stripe_payment_id || 'NULL'}`)
    }

    // Step 3: Check Stripe payments
    const stripePayments = await sql`
      SELECT 
        id,
        stripe_payment_id,
        stripe_customer_id,
        user_id,
        amount_cents,
        status,
        product_type,
        payment_date,
        is_test_mode
      FROM stripe_payments
      WHERE user_id = ${userId}
      AND product_type = 'paid_blueprint'
      ORDER BY created_at DESC
      LIMIT 5
    ` as any[]

    console.log(`\n💳 Stripe Payments:`)
    if (stripePayments.length === 0) {
      console.log(`  ⚠️ No Stripe payment records found for paid_blueprint`)
    } else {
      console.log(`  ✅ Found ${stripePayments.length} payment(s):`)
      stripePayments.forEach((payment: any, idx: number) => {
        console.log(`     ${idx + 1}. Payment ID: ${payment.stripe_payment_id}`)
        console.log(`        Amount: $${(payment.amount_cents / 100).toFixed(2)}`)
        console.log(`        Status: ${payment.status}`)
        console.log(`        Date: ${payment.payment_date}`)
        console.log(`        Test Mode: ${payment.is_test_mode}`)
      })
    }

    // Step 4: Check subscriptions
    const subscriptions = await sql`
      SELECT 
        id,
        product_type,
        status,
        created_at
      FROM subscriptions
      WHERE user_id = ${userId}
      AND product_type = 'paid_blueprint'
      ORDER BY created_at DESC
    ` as any[]

    console.log(`\n📋 Subscriptions:`)
    if (subscriptions.length === 0) {
      console.log(`  ⚠️ No paid_blueprint subscription found`)
    } else {
      console.log(`  ✅ Found ${subscriptions.length} subscription(s):`)
      subscriptions.forEach((sub: any, idx: number) => {
        console.log(`     ${idx + 1}. Status: ${sub.status}, Created: ${sub.created_at}`)
      })
    }

    // Step 5: Check credits
    const credits = await sql`
      SELECT balance, total_purchased
      FROM user_credits
      WHERE user_id = ${userId}
      LIMIT 1
    ` as any[]

    console.log(`\n💰 Credits:`)
    if (credits.length === 0) {
      console.log(`  ⚠️ No credit record found`)
    } else {
      console.log(`  ✅ Balance: ${credits[0].balance}`)
      console.log(`     Total Purchased: ${credits[0].total_purchased}`)
    }

    // Step 6: Check credit transactions for paid blueprint
    const creditTransactions = await sql`
      SELECT 
        id,
        amount,
        transaction_type,
        description,
        stripe_payment_id,
        created_at
      FROM credit_transactions
      WHERE user_id = ${userId}
      AND description LIKE '%Paid Blueprint%'
      ORDER BY created_at DESC
      LIMIT 5
    ` as any[]

    console.log(`\n💸 Credit Transactions (Paid Blueprint):`)
    if (creditTransactions.length === 0) {
      console.log(`  ⚠️ No paid blueprint credit transactions found`)
    } else {
      console.log(`  ✅ Found ${creditTransactions.length} transaction(s):`)
      creditTransactions.forEach((tx: any, idx: number) => {
        console.log(`     ${idx + 1}. Amount: ${tx.amount}, Date: ${tx.created_at}`)
        console.log(`        Description: ${tx.description}`)
      })
    }

    // Step 7: Check feed posts
    const feedPosts = await sql`
      SELECT 
        fl.id as feed_id,
        COUNT(fp.id) as post_count
      FROM feed_layouts fl
      LEFT JOIN feed_posts fp ON fp.feed_layout_id = fl.id
      WHERE fl.user_id = ${userId}
      GROUP BY fl.id
      ORDER BY fl.created_at DESC
      LIMIT 1
    ` as any[]

    console.log(`\n📸 Feed Status:`)
    if (feedPosts.length === 0) {
      console.log(`  ⚠️ No feed found`)
    } else {
      console.log(`  ✅ Feed ID: ${feedPosts[0].feed_id}, Posts: ${feedPosts[0].post_count}`)
    }

    // Step 8: DECISION - Should we fix?
    console.log(`\n🔧 FIX ANALYSIS:`)
    
    const hasPayment = stripePayments.length > 0 && stripePayments.some((p: any) => p.status === 'succeeded')
    const hasPaidFlag = blueprintSub.length > 0 && blueprintSub[0].paid_blueprint_purchased === true
    const hasCredits = credits.length > 0 && credits[0].balance >= 60
    const hasSubscription = subscriptions.length > 0 && subscriptions.some((s: any) => s.status === 'active')
    const has9Posts = feedPosts.length > 0 && feedPosts[0].post_count >= 9

    console.log(`  - Has Stripe Payment: ${hasPayment ? '✅' : '❌'}`)
    console.log(`  - paid_blueprint_purchased = TRUE: ${hasPaidFlag ? '✅' : '❌'}`)
    console.log(`  - Has 60+ Credits: ${hasCredits ? '✅' : '❌'}`)
    console.log(`  - Has Active Subscription: ${hasSubscription ? '✅' : '❌'}`)
    console.log(`  - Has 9 Posts: ${has9Posts ? '✅' : '❌'}`)

    if (hasPayment && !hasPaidFlag) {
      console.log(`\n⚠️ ISSUE FOUND: User has payment but paid_blueprint_purchased = false`)
      console.log(`\n🔧 FIXING...\n`)

      // Fix 1: Update blueprint_subscribers
      if (blueprintSub.length > 0) {
        const paymentId = stripePayments[0].stripe_payment_id
        await sql`
          UPDATE blueprint_subscribers
          SET 
            paid_blueprint_purchased = TRUE,
            paid_blueprint_purchased_at = NOW(),
            paid_blueprint_stripe_payment_id = ${paymentId},
            converted_to_user = TRUE,
            converted_at = NOW(),
            updated_at = NOW()
          WHERE id = ${blueprintSub[0].id}
        `
        console.log(`✅ Updated blueprint_subscribers.paid_blueprint_purchased = TRUE`)
      } else {
        // Create record if missing
        await sql`
          INSERT INTO blueprint_subscribers (
            user_id,
            email,
            name,
            access_token,
            paid_blueprint_purchased,
            paid_blueprint_purchased_at,
            paid_blueprint_stripe_payment_id,
            converted_to_user,
            converted_at,
            created_at,
            updated_at
          )
          VALUES (
            ${userId},
            ${userEmail},
            ${userEmail.split('@')[0]},
            gen_random_uuid()::text,
            TRUE,
            NOW(),
            ${stripePayments[0].stripe_payment_id},
            TRUE,
            NOW(),
            NOW(),
            NOW()
          )
        `
        console.log(`✅ Created blueprint_subscribers record with paid_blueprint_purchased = TRUE`)
      }

      // Fix 2: Grant credits if needed
      if (!hasCredits) {
        console.log(`\n💰 Granting 60 credits...`)
        const creditResult = await grantPaidBlueprintCredits(
          userId,
          stripePayments[0].stripe_payment_id,
          stripePayments[0].is_test_mode
        )
        if (creditResult.success) {
          console.log(`✅ Granted 60 credits. New balance: ${creditResult.newBalance}`)
        } else {
          console.log(`❌ Failed to grant credits: ${creditResult.error}`)
        }
      } else {
        console.log(`✅ Credits already granted (balance: ${credits[0].balance})`)
      }

      // Fix 3: Create subscription if missing
      if (!hasSubscription) {
        console.log(`\n📋 Creating subscription entry...`)
        await sql`
          INSERT INTO subscriptions (
            user_id,
            product_type,
            plan,
            status,
            stripe_customer_id,
            created_at,
            updated_at
          )
          VALUES (
            ${userId},
            'paid_blueprint',
            'paid_blueprint',
            'active',
            ${stripePayments[0].stripe_customer_id || null},
            NOW(),
            NOW()
          )
        `
        console.log(`✅ Created paid_blueprint subscription entry`)
      } else {
        console.log(`✅ Subscription already exists`)
      }

      // Fix 4: Expand feed if needed
      if (!has9Posts && feedPosts.length > 0) {
        console.log(`\n📸 Expanding feed from ${feedPosts[0].post_count} to 9 posts...`)
        const feedId = feedPosts[0].feed_id
        
        const existingPosts = await sql`
          SELECT position
          FROM feed_posts
          WHERE feed_layout_id = ${feedId}
          ORDER BY position ASC
        ` as any[]

        const existingPositions = existingPosts.map((p: any) => p.position)
        const positionsToCreate = [2, 3, 4, 5, 6, 7, 8, 9].filter(
          (pos) => !existingPositions.includes(pos)
        )

        if (positionsToCreate.length > 0) {
          for (const position of positionsToCreate) {
            await sql`
              INSERT INTO feed_posts (
                feed_layout_id,
                user_id,
                position,
                post_type,
                generation_status,
                generation_mode,
                created_at,
                updated_at
              ) VALUES (
                ${feedId},
                ${userId},
                ${position},
                'photo',
                'pending',
                'pro',
                NOW(),
                NOW()
              )
            `
          }
          console.log(`✅ Created ${positionsToCreate.length} new posts (positions: ${positionsToCreate.join(', ')})`)
        } else {
          console.log(`✅ Feed already has all 9 positions`)
        }
      } else if (has9Posts) {
        console.log(`✅ Feed already has 9 posts`)
      } else {
        console.log(`⚠️ No feed found - will be created on first access`)
      }

      console.log(`\n✅ FIX COMPLETE!`)
      console.log(`\n📋 SUMMARY:`)
      console.log(`  - Updated paid_blueprint_purchased = TRUE`)
      console.log(`  - Credits: ${hasCredits ? 'Already had 60+' : 'Granted 60'}`)
      console.log(`  - Subscription: ${hasSubscription ? 'Already exists' : 'Created'}`)
      console.log(`  - Feed: ${has9Posts ? 'Already has 9 posts' : feedPosts.length > 0 ? 'Expanded to 9 posts' : 'No feed yet'}`)
    } else if (!hasPayment) {
      console.log(`\n⚠️ No Stripe payment found. User may not have completed purchase yet.`)
      console.log(`\n💡 MANUAL FIX OPTION:`)
      console.log(`   If you're certain the user completed the purchase, you can manually fix by:`)
      console.log(`   1. Finding the Stripe payment ID from Stripe dashboard`)
      console.log(`   2. Running this script with --force flag and --payment-id flag`)
      console.log(`   3. Or manually update the database`)
      
      // Check if --force flag is provided
      const forceFix = process.argv.includes('--force')
      const paymentIdIndex = process.argv.indexOf('--payment-id')
      const manualPaymentId = paymentIdIndex > -1 ? process.argv[paymentIdIndex + 1] : null
      
      if (forceFix && manualPaymentId) {
        console.log(`\n🔧 FORCE FIX MODE: Manually fixing with payment ID: ${manualPaymentId}\n`)
        
        // Update blueprint_subscribers
        if (blueprintSub.length > 0) {
          await sql`
            UPDATE blueprint_subscribers
            SET 
              paid_blueprint_purchased = TRUE,
              paid_blueprint_purchased_at = NOW(),
              paid_blueprint_stripe_payment_id = ${manualPaymentId},
              converted_to_user = TRUE,
              converted_at = NOW(),
              updated_at = NOW()
            WHERE id = ${blueprintSub[0].id}
          `
          console.log(`✅ Updated blueprint_subscribers.paid_blueprint_purchased = TRUE`)
        }
        
        // Grant credits
        console.log(`\n💰 Granting 60 credits...`)
        const creditResult = await grantPaidBlueprintCredits(userId, manualPaymentId, false)
        if (creditResult.success) {
          console.log(`✅ Granted 60 credits. New balance: ${creditResult.newBalance}`)
        }
        
        // Create subscription
        console.log(`\n📋 Creating subscription entry...`)
        await sql`
          INSERT INTO subscriptions (
            user_id,
            product_type,
            plan,
            status,
            created_at,
            updated_at
          )
          VALUES (
            ${userId},
            'paid_blueprint',
            'paid_blueprint',
            'active',
            NOW(),
            NOW()
          )
        `
        console.log(`✅ Created paid_blueprint subscription entry`)
        
        // Expand feed
        if (feedPosts.length > 0 && feedPosts[0].post_count < 9) {
          console.log(`\n📸 Expanding feed...`)
          const feedId = feedPosts[0].feed_id
          const existingPosts = await sql`
            SELECT position FROM feed_posts WHERE feed_layout_id = ${feedId}
          ` as any[]
          const existingPositions = existingPosts.map((p: any) => p.position)
          const positionsToCreate = [2, 3, 4, 5, 6, 7, 8, 9].filter(
            (pos) => !existingPositions.includes(pos)
          )
          for (const position of positionsToCreate) {
            await sql`
              INSERT INTO feed_posts (
                feed_layout_id, user_id, position, post_type,
                generation_status, generation_mode, created_at, updated_at
              ) VALUES (
                ${feedId}, ${userId}, ${position}, 'photo',
                'pending', 'pro', NOW(), NOW()
              )
            `
          }
          console.log(`✅ Created ${positionsToCreate.length} new posts`)
        }
        
        console.log(`\n✅ MANUAL FIX COMPLETE!`)
      }
    } else {
      console.log(`\n✅ Everything looks correct! No fixes needed.`)
    }

  } catch (error: any) {
    console.error(`\n❌ Error:`, error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run script
const userEmail = process.argv[2] || "rausudejeube-4015@yopmail.com"
fixPaidBlueprintStatus(userEmail)
  .then(() => {
    console.log(`\n✅ Script completed`)
    process.exit(0)
  })
  .catch((error) => {
    console.error(`\n❌ Script failed:`, error)
    process.exit(1)
  })

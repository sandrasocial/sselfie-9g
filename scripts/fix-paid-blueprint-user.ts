#!/usr/bin/env tsx
/**
 * Manual Fix Script: Grant Paid Blueprint Credits and Create Subscription
 * 
 * This script manually fixes a user who purchased paid blueprint but:
 * - Did not receive credits
 * - Did not get subscription created
 * 
 * Usage: npx tsx scripts/fix-paid-blueprint-user.ts [email]
 */

import { config } from "dotenv"
import { resolve } from "path"
import { neon } from "@neondatabase/serverless"
import { grantPaidBlueprintCredits } from "@/lib/credits"

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") })

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set")
  console.error("Please set it in .env.local or as an environment variable")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL!)

async function fixPaidBlueprintUser(userEmail: string) {
  console.log(`\n🔧 Fixing paid blueprint purchase for user: ${userEmail}\n`)

  try {
    // Step 1: Find user by email
    console.log("Step 1: Finding user by email...")
    const users = await sql`
      SELECT id, email, display_name, created_at
      FROM users
      WHERE email = ${userEmail}
      LIMIT 1
    `

    if (users.length === 0) {
      console.error(`❌ User not found with email: ${userEmail}`)
      process.exit(1)
    }

    const user = users[0]
    const userId = user.id
    console.log(`✅ User found:`, {
      id: userId,
      email: user.email,
      display_name: user.display_name,
      created_at: user.created_at,
    })

    // Step 2: Check current credit balance
    console.log("\nStep 2: Checking current credit balance...")
    const creditRecords = await sql`
      SELECT balance, total_purchased, total_used
      FROM user_credits
      WHERE user_id = ${userId}
      LIMIT 1
    `
    const currentBalance = creditRecords.length > 0 ? creditRecords[0].balance : 0
    console.log(`Current balance: ${currentBalance} credits`)

    // Step 3: Check if subscription already exists
    console.log("\nStep 3: Checking existing subscriptions...")
    const existingSubscriptions = await sql`
      SELECT id, product_type, status, created_at
      FROM subscriptions
      WHERE user_id = ${userId}
      AND product_type = 'paid_blueprint'
      ORDER BY created_at DESC
    `
    console.log(`Found ${existingSubscriptions.length} existing paid_blueprint subscription(s)`)
    if (existingSubscriptions.length > 0) {
      existingSubscriptions.forEach((sub: any, index: number) => {
        console.log(`  ${index + 1}. ID: ${sub.id}, Status: ${sub.status}, Created: ${sub.created_at}`)
      })
    }

    // Step 4: Check if credits were already granted
    console.log("\nStep 4: Checking credit transactions...")
    const creditTransactions = await sql`
      SELECT id, amount, transaction_type, description, stripe_payment_id, created_at
      FROM credit_transactions
      WHERE user_id = ${userId}
      AND transaction_type = 'purchase'
      AND description LIKE '%Paid Blueprint%'
      ORDER BY created_at DESC
      LIMIT 5
    `
    console.log(`Found ${creditTransactions.length} paid blueprint credit transaction(s)`)
    if (creditTransactions.length > 0) {
      creditTransactions.forEach((tx: any, index: number) => {
        console.log(`  ${index + 1}. Amount: ${tx.amount}, Payment ID: ${tx.stripe_payment_id || 'N/A'}, Created: ${tx.created_at}`)
      })
    }

    // Step 5: Grant credits (if not already granted)
    console.log("\nStep 5: Granting credits...")
    const creditsToGrant = 60 // 30 images × 2 credits per image
    const shouldGrantCredits = creditTransactions.length === 0 || creditTransactions[0].amount !== creditsToGrant

    if (shouldGrantCredits) {
      console.log(`Granting ${creditsToGrant} credits...`)
      
      // Get current balance
      const currentCredits = await sql`
        SELECT balance FROM user_credits WHERE user_id = ${userId} LIMIT 1
      `
      const currentBalance = currentCredits.length > 0 ? Number(currentCredits[0].balance) : 0
      const newBalance = currentBalance + creditsToGrant
      
      // Update or insert user credits
      await sql`
        INSERT INTO user_credits (user_id, balance, total_purchased, total_used, created_at, updated_at)
        VALUES (${userId}, ${newBalance}, ${creditsToGrant}, 0, NOW(), NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          balance = ${newBalance},
          total_purchased = user_credits.total_purchased + ${creditsToGrant},
          updated_at = NOW()
      `
      
      // Create credit transaction
      await sql`
        INSERT INTO credit_transactions (
          user_id, amount, transaction_type, description, 
          stripe_payment_id, balance_after, is_test_mode, created_at
        )
        VALUES (
          ${userId}, ${creditsToGrant}, 'purchase', 'Paid Blueprint purchase (60 credits - 30 images)',
          NULL, ${newBalance}, false, NOW()
        )
      `
      
      console.log(`✅ Credits granted successfully! New balance: ${newBalance}`)
    } else {
      console.log(`⏭️  Credits already granted (${creditsToGrant} credits). Skipping.`)
    }

    // Step 6: Create subscription (if not already exists)
    console.log("\nStep 6: Creating subscription...")
    const shouldCreateSubscription = existingSubscriptions.length === 0 || 
      existingSubscriptions.every((sub: any) => sub.status !== 'active')

    if (shouldCreateSubscription) {
      console.log("Creating subscription entry...")
      try {
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
            NULL,
            NOW(),
            NOW()
          )
        `
        console.log(`✅ Subscription created successfully!`)
      } catch (insertError: any) {
        if (insertError.code === '23505' || insertError.message?.includes('unique constraint')) {
          console.log(`⏭️  Subscription already exists (race condition). Skipping.`)
        } else {
          console.error(`❌ Failed to create subscription:`, {
            code: insertError.code,
            message: insertError.message,
            detail: insertError.detail,
            constraint: insertError.constraint,
          })
          throw insertError
        }
      }
    } else {
      console.log(`⏭️  Active subscription already exists. Skipping.`)
      // Update existing subscription to active if needed
      if (existingSubscriptions.some((sub: any) => sub.status !== 'active')) {
        console.log("Updating subscription status to 'active'...")
        await sql`
          UPDATE subscriptions
          SET status = 'active',
              updated_at = NOW()
          WHERE user_id = ${userId}
          AND product_type = 'paid_blueprint'
          AND status != 'active'
        `
        console.log(`✅ Subscription status updated to 'active'`)
      }
    }

    // Step 7: Verify fix
    console.log("\nStep 7: Verifying fix...")
    const finalCredits = await sql`
      SELECT balance FROM user_credits WHERE user_id = ${userId} LIMIT 1
    `
    const finalSubscription = await sql`
      SELECT id, product_type, status
      FROM subscriptions
      WHERE user_id = ${userId}
      AND product_type = 'paid_blueprint'
      AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `

    console.log("\n✅ Fix completed successfully!")
    console.log(`\nFinal status:`)
    console.log(`  - Credits: ${finalCredits.length > 0 ? finalCredits[0].balance : 0}`)
    console.log(`  - Subscription: ${finalSubscription.length > 0 ? 'ACTIVE' : 'MISSING'}`)
    if (finalSubscription.length > 0) {
      console.log(`    - ID: ${finalSubscription[0].id}`)
      console.log(`    - Product Type: ${finalSubscription[0].product_type}`)
      console.log(`    - Status: ${finalSubscription[0].status}`)
    }

    console.log("\n✅ User should now have access to paid blueprint features!\n")
  } catch (error: any) {
    console.error("\n❌ Error fixing user:", error)
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
    })
    process.exit(1)
  }
}

// Main execution
const userEmail = process.argv[2] || "pribrizouvafei-9716@yopmail.com"

fixPaidBlueprintUser(userEmail)
  .then(() => {
    console.log("Script completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Script failed:", error)
    process.exit(1)
  })

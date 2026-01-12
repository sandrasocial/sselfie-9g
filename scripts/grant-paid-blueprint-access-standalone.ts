/**
 * Standalone Script to Grant Paid Blueprint Access for Testing
 * 
 * This script manually grants paid blueprint access to a user for testing purposes.
 * Use this when webhook processing is delayed or when testing locally.
 * 
 * Usage:
 *   npx tsx scripts/grant-paid-blueprint-access-standalone.ts <user_id_or_email>
 * 
 * Example:
 *   npx tsx scripts/grant-paid-blueprint-access-standalone.ts user@example.com
 */

import { config } from 'dotenv'
import { neon } from '@neondatabase/serverless'

config({ path: '.env.local' })

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

async function grantPaidBlueprintAccess(identifier: string) {
  console.log(`\n🔍 Looking up user: ${identifier}\n`)
  
  // Try to find user by email or ID
  let userId: string | null = null
  let userEmail: string | null = null
  
  // Check if it's a UUID (user ID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(identifier)) {
    // It's a user ID
    const user = await sql`
      SELECT id, email FROM users WHERE id = ${identifier} LIMIT 1
    `
    if (user.length > 0) {
      userId = user[0].id
      userEmail = user[0].email
      console.log(`✅ Found user by ID: ${userId} (${userEmail})`)
    } else {
      console.error(`❌ User not found with ID: ${identifier}`)
      return
    }
  } else {
    // It's an email - try to find user
    const user = await sql`
      SELECT id, email FROM users WHERE email = ${identifier} LIMIT 1
    `
    if (user.length > 0) {
      userId = user[0].id
      userEmail = user[0].email
      console.log(`✅ Found user by email: ${userId} (${userEmail})`)
    } else {
      console.log(`⚠️ User not found with email: ${identifier}`)
      console.log(`   Will create/update blueprint_subscribers record by email only\n`)
      userEmail = identifier
    }
  }
  
  if (!userId && !userEmail) {
    console.error(`❌ Could not identify user from: ${identifier}`)
    return
  }
  
  console.log(`\n📝 Granting paid blueprint access...\n`)
  
  try {
    // Step 1: Update or create blueprint_subscribers record
    if (userId) {
      // Check if blueprint_subscribers record exists
      const existing = await sql`
        SELECT id, user_id, email, paid_blueprint_purchased
        FROM blueprint_subscribers
        WHERE user_id = ${userId}
        LIMIT 1
      `
      
      if (existing.length > 0) {
        // Update existing record
        await sql`
          UPDATE blueprint_subscribers
          SET 
            paid_blueprint_purchased = TRUE,
            paid_blueprint_purchased_at = NOW(),
            updated_at = NOW()
          WHERE user_id = ${userId}
        `
        console.log(`✅ Updated blueprint_subscribers record (ID: ${existing[0].id})`)
      } else {
        // Create new record
        const emailToUse = userEmail || `${userId}@test.local`
        await sql`
          INSERT INTO blueprint_subscribers (
            user_id,
            email,
            name,
            paid_blueprint_purchased,
            paid_blueprint_purchased_at,
            created_at,
            updated_at
          )
          VALUES (
            ${userId},
            ${emailToUse},
            ${emailToUse.split('@')[0]},
            TRUE,
            NOW(),
            NOW(),
            NOW()
          )
        `
        console.log(`✅ Created blueprint_subscribers record for user ${userId}`)
      }
    } else if (userEmail) {
      // No user_id - update by email
      const existing = await sql`
        SELECT id, user_id, email, paid_blueprint_purchased
        FROM blueprint_subscribers
        WHERE LOWER(email) = LOWER(${userEmail})
        LIMIT 1
      `
      
      if (existing.length > 0) {
        await sql`
          UPDATE blueprint_subscribers
          SET 
            paid_blueprint_purchased = TRUE,
            paid_blueprint_purchased_at = NOW(),
            updated_at = NOW()
          WHERE LOWER(email) = LOWER(${userEmail})
        `
        console.log(`✅ Updated blueprint_subscribers record by email (ID: ${existing[0].id})`)
      } else {
        await sql`
          INSERT INTO blueprint_subscribers (
            email,
            name,
            paid_blueprint_purchased,
            paid_blueprint_purchased_at,
            created_at,
            updated_at
          )
          VALUES (
            ${userEmail},
            ${userEmail.split('@')[0]},
            TRUE,
            NOW(),
            NOW(),
            NOW()
          )
        `
        console.log(`✅ Created blueprint_subscribers record by email`)
      }
    }
    
    // Step 2: Create subscription entry (if user_id exists)
    if (userId) {
      const existingSubscription = await sql`
        SELECT id FROM subscriptions
        WHERE user_id = ${userId}
        AND product_type = 'paid_blueprint'
        AND status = 'active'
        LIMIT 1
      `
      
      if (existingSubscription.length === 0) {
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
        console.log(`✅ Created subscription entry for user ${userId}`)
      } else {
        console.log(`✅ Subscription entry already exists (ID: ${existingSubscription[0].id})`)
      }
    }
    
    // Step 3: Grant 60 credits for paid blueprint purchase (30 images × 2 credits per image)
    if (userId) {
      console.log(`\n💰 Granting 60 credits for paid blueprint purchase...`)
      
      // Check current balance
      const currentCredits = await sql`
        SELECT balance FROM user_credits WHERE user_id = ${userId} LIMIT 1
      `
      const currentBalance = currentCredits.length > 0 ? Number(currentCredits[0].balance) : 0
      const newBalance = currentBalance + 60
      
      // Update or create user_credits record
      await sql`
        INSERT INTO user_credits (user_id, balance, total_purchased, total_used, created_at, updated_at)
        VALUES (${userId}, ${newBalance}, 60, 0, NOW(), NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          balance = ${newBalance},
          total_purchased = user_credits.total_purchased + 60,
          updated_at = NOW()
      `
      
      // Create credit transaction record
      await sql`
        INSERT INTO credit_transactions (
          user_id, amount, transaction_type, description, 
          stripe_payment_id, balance_after, is_test_mode, created_at
        )
        VALUES (
          ${userId}, 60, 'purchase', 'Paid Blueprint purchase (60 credits - 30 images)',
          NULL, ${newBalance}, false, NOW()
        )
      `
      
      console.log(`✅ Granted 60 credits (balance: ${currentBalance} → ${newBalance})`)
    }
    
    // Step 4: Expand user's feed from 1 post to 9 posts (free → paid upgrade)
    if (userId) {
      console.log(`\n📊 Checking/expanding feed for user ${userId}...`)
      const userFeed = await sql`
        SELECT id, user_id
        FROM feed_layouts
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 1
      `

      if (userFeed && userFeed.length > 0) {
        const feedId = userFeed[0].id
        console.log(`Found feed_layout_id: ${feedId} for user ${userId}.`)

        const existingPosts = await sql`
          SELECT position
          FROM feed_posts
          WHERE feed_layout_id = ${feedId}
          ORDER BY position ASC
        `
        const existingPositions = existingPosts.map((p: any) => p.position)
        console.log(`Feed ${feedId} currently has posts at positions:`, existingPositions)

        const positionsToCreate = [2, 3, 4, 5, 6, 7, 8, 9].filter(
          (pos) => !existingPositions.includes(pos)
        )

        if (positionsToCreate.length > 0) {
          console.log(`Creating posts for missing positions:`, positionsToCreate)
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
          console.log(`✅ Created ${positionsToCreate.length} new posts for feed ${feedId}.`)
        } else {
          console.log(`⏭️ Feed ${feedId} already has all 9 positions.`)
        }
      } else {
        console.log(`⚠️ No existing feed_layout found for user ${userId}. A new feed will be created on first access.`)
      }
    }
    
    console.log(`\n✨ Paid blueprint access granted successfully!\n`)
    
  } catch (error: any) {
    console.error(`\n❌ Error granting access:`, error.message)
    if (error.code) {
      console.error(`   Error code: ${error.code}`)
    }
    if (error.detail) {
      console.error(`   Detail: ${error.detail}`)
    }
    throw error
  }
}

// Main execution
const identifier = process.argv[2]

if (!identifier) {
  console.error(`
❌ Usage: npx tsx scripts/grant-paid-blueprint-access-standalone.ts <user_id_or_email>

Examples:
  npx tsx scripts/grant-paid-blueprint-access-standalone.ts user@example.com
  npx tsx scripts/grant-paid-blueprint-access-standalone.ts c15e91f4-6711-4801-bfe5-7482e6d6703e
`)
  process.exit(1)
}

grantPaidBlueprintAccess(identifier)
  .then(() => {
    console.log(`\n✅ Script completed successfully!\n`)
    process.exit(0)
  })
  .catch((error) => {
    console.error(`\n❌ Script failed:`, error)
    process.exit(1)
  })

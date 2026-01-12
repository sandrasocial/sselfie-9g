/**
 * Manual Script to Grant Paid Blueprint Access for Testing
 * 
 * This script manually grants paid blueprint access to a user for testing purposes.
 * Use this when webhook processing is delayed or when testing locally.
 * 
 * Usage:
 *   npx tsx scripts/grant-paid-blueprint-access.ts <user_id_or_email>
 * 
 * Example:
 *   npx tsx scripts/grant-paid-blueprint-access.ts user@example.com
 *   npx tsx scripts/grant-paid-blueprint-access.ts c15e91f4-6711-4801-bfe5-7482e6d6703e
 */

import { config } from 'dotenv'
import { getDb } from '@/lib/db'
import { getUserByAuthId } from '@/lib/user-mapping'

config({ path: '.env.local' })

async function grantPaidBlueprintAccess(identifier: string) {
  const sql = getDb()
  
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
    
    console.log(`\n✨ Paid blueprint access granted successfully!\n`)
    
    // Verify access
    if (userId) {
      const { hasPaidBlueprint } = await import('@/lib/subscription')
      const hasAccess = await hasPaidBlueprint(userId)
      console.log(`🔍 Verification: hasPaidBlueprint(${userId}) = ${hasAccess}`)
      
      if (hasAccess) {
        console.log(`\n✅ SUCCESS: User now has paid blueprint access!\n`)
      } else {
        console.log(`\n⚠️ WARNING: Access check returned false. Please verify manually.\n`)
      }
    }
    
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
❌ Usage: npx tsx scripts/grant-paid-blueprint-access.ts <user_id_or_email>

Examples:
  npx tsx scripts/grant-paid-blueprint-access.ts user@example.com
  npx tsx scripts/grant-paid-blueprint-access.ts c15e91f4-6711-4801-bfe5-7482e6d6703e
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

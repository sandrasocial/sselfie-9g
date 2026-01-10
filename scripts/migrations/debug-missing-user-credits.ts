#!/usr/bin/env tsx
/**
 * Debug Script: Find users missing user_credits records
 * 
 * Purpose: Investigate why 1 free user is missing a user_credits record
 */

import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL!)

async function debugMissingCredits() {
  try {
    console.log("[Debug] Finding free users missing user_credits records...")

    // Find free users (no active subscription) missing user_credits
    const missingCredits = await sql`
      SELECT 
        u.id,
        u.email,
        u.display_name,
        u.created_at,
        u.supabase_user_id,
        (SELECT COUNT(*) FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active') as active_subscriptions,
        (SELECT COUNT(*) FROM blueprint_subscribers bs WHERE bs.user_id = u.id) as has_blueprint
      FROM users u
      WHERE NOT EXISTS (
        SELECT 1 FROM subscriptions s 
        WHERE s.user_id = u.id AND s.status = 'active'
      )
      AND NOT EXISTS (
        SELECT 1 FROM user_credits uc WHERE uc.user_id = u.id
      )
      ORDER BY u.created_at DESC
    `

    console.log(`[Debug] Found ${missingCredits.length} free users missing user_credits records:\n`)

    for (const user of missingCredits) {
      console.log(`User ID: ${user.id}`)
      console.log(`Email: ${user.email}`)
      console.log(`Display Name: ${user.display_name || 'N/A'}`)
      console.log(`Created: ${user.created_at}`)
      console.log(`Has Supabase User ID: ${!!user.supabase_user_id}`)
      console.log(`Active Subscriptions: ${user.active_subscriptions}`)
      console.log(`Has Blueprint: ${user.has_blueprint}`)
      console.log(`Free Grid Used Count:`, await sql`
        SELECT free_grid_used_count 
        FROM blueprint_subscribers 
        WHERE user_id = ${user.id} 
        LIMIT 1
      `.then(r => r[0]?.free_grid_used_count || 0))
      console.log('---')
    }

    // Check if these users should have received credits
    if (missingCredits.length > 0) {
      console.log(`\n[Debug] Attempting to grant credits to ${missingCredits.length} user(s)...`)
      
      for (const user of missingCredits) {
        // Check if they used their free grid
        const blueprintCheck = await sql`
          SELECT free_grid_used_count 
          FROM blueprint_subscribers 
          WHERE user_id = ${user.id} 
          LIMIT 1
        `
        
        const freeGridUsed = blueprintCheck.length > 0 && (blueprintCheck[0].free_grid_used_count || 0) > 0
        
        if (!freeGridUsed) {
          // Grant 2 credits
          await sql`
            INSERT INTO user_credits (user_id, balance, total_purchased, total_used, created_at, updated_at)
            VALUES (${user.id}, 2, 2, 0, NOW(), NOW())
            ON CONFLICT (user_id) DO NOTHING
          `
          
          await sql`
            INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after, created_at)
            VALUES (${user.id}, 2, 'bonus', 'Free blueprint credits (manual fix)', 2, NOW())
            ON CONFLICT DO NOTHING
          `
          
          console.log(`✅ Granted 2 credits to user ${user.id} (${user.email})`)
        } else {
          // Create record with 0 credits
          await sql`
            INSERT INTO user_credits (user_id, balance, total_purchased, total_used, created_at, updated_at)
            VALUES (${user.id}, 0, 0, 0, NOW(), NOW())
            ON CONFLICT (user_id) DO NOTHING
          `
          
          console.log(`✅ Created user_credits record (0 credits) for user ${user.id} (${user.email}) - already used free grid`)
        }
      }
      
      console.log(`\n[Debug] ✅ Fixed ${missingCredits.length} user(s)`)
    } else {
      console.log(`\n[Debug] ✅ No users missing user_credits records`)
    }
  } catch (error) {
    console.error("[Debug] ❌ Error:", error)
    throw error
  }
}

// Run if executed directly
if (require.main === module) {
  debugMissingCredits()
    .then(() => {
      console.log("[Debug] Done!")
      process.exit(0)
    })
    .catch((error) => {
      console.error("[Debug] Error:", error)
      process.exit(1)
    })
}

export default debugMissingCredits

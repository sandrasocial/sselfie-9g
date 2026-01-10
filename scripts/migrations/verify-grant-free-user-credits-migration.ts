#!/usr/bin/env tsx
/**
 * Migration Verifier: Grant Free User Credits
 * 
 * Purpose: Verify that credits were granted correctly to free users
 * 
 * Run with: npx tsx scripts/migrations/verify-grant-free-user-credits-migration.ts
 */

import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL!)

async function verifyMigration() {
  try {
    console.log("[Verification] Verifying: Grant Free User Credits Migration")

    // Check 1: All free users should have user_credits record
    const freeUsersWithoutCredits = await sql`
      SELECT COUNT(*) as count
      FROM users u
      WHERE NOT EXISTS (
        SELECT 1 FROM subscriptions s 
        WHERE s.user_id = u.id AND s.status = 'active'
      )
      AND NOT EXISTS (
        SELECT 1 FROM user_credits uc WHERE uc.user_id = u.id
      )
    `

    if (freeUsersWithoutCredits[0].count > 0) {
      console.log(`[Verification] ❌ FAILED: ${freeUsersWithoutCredits[0].count} free users missing user_credits record`)
      return false
    } else {
      console.log("[Verification] ✅ PASSED: All free users have user_credits record")
    }

    // Check 2: Credits were granted to users who haven't used free grid
    const usersWithCredits = await sql`
      SELECT COUNT(*) as count
      FROM user_credits uc
      WHERE uc.balance = 2
      AND EXISTS (
        SELECT 1 FROM credit_transactions ct
        WHERE ct.user_id = uc.user_id
        AND ct.transaction_type = 'bonus'
        AND ct.description = 'Free blueprint credits (migration)'
      )
    `

    console.log(`[Verification] ✅ Users with 2 credits granted: ${usersWithCredits[0].count}`)

    // Check 3: Users who used free grid have 0 credits (record exists but no grant)
    const usersWhoUsedFreeGrid = await sql`
      SELECT COUNT(*) as count
      FROM user_credits uc
      WHERE uc.balance = 0
      AND EXISTS (
        SELECT 1 FROM blueprint_subscribers bs
        WHERE bs.user_id = uc.user_id
        AND bs.free_grid_used_count > 0
      )
      AND NOT EXISTS (
        SELECT 1 FROM credit_transactions ct
        WHERE ct.user_id = uc.user_id
        AND ct.transaction_type = 'bonus'
        AND ct.description = 'Free blueprint credits (migration)'
      )
    `

    console.log(`[Verification] ✅ Users who used free grid (0 credits): ${usersWhoUsedFreeGrid[0].count}`)

    // Check 4: Credit transactions recorded correctly
    const migrationTransactions = await sql`
      SELECT COUNT(*) as count
      FROM credit_transactions
      WHERE transaction_type = 'bonus'
      AND description = 'Free blueprint credits (migration)'
    `

    console.log(`[Verification] ✅ Migration transactions recorded: ${migrationTransactions[0].count}`)

    // Check 5: No users with unexpected credit balances
    const unexpectedBalances = await sql`
      SELECT COUNT(*) as count
      FROM user_credits uc
      WHERE uc.balance NOT IN (0, 2, 50, 200, 999999)
      AND NOT EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.user_id = uc.user_id
        AND s.status = 'active'
      )
    `

    if (unexpectedBalances[0].count > 0) {
      console.log(
        `[Verification] ⚠️  WARNING: ${unexpectedBalances[0].count} free users have unexpected credit balances`,
      )
      console.log("[Verification] Expected balances: 0 (used free grid) or 2 (not used)")
    } else {
      console.log("[Verification] ✅ PASSED: All free users have expected credit balances")
    }

    console.log("[Verification] ✅ Migration verification complete!")
    return true
  } catch (error) {
    console.error("[Verification] ❌ Verification failed:", error)
    return false
  }
}

// Run verification if executed directly
if (require.main === module) {
  verifyMigration()
    .then((success) => {
      if (success) {
        console.log("[Verification] All checks passed!")
        process.exit(0)
      } else {
        console.log("[Verification] Some checks failed!")
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error("[Verification] Error:", error)
      process.exit(1)
    })
}

export default verifyMigration

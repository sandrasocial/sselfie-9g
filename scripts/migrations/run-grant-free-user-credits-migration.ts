#!/usr/bin/env tsx
/**
 * Migration Runner: Grant Free User Credits
 * 
 * Purpose: Grant 2 credits to existing free users who haven't used their free grid
 * 
 * This migration:
 * - Grants 2 credits to free users (if free_grid_used_count = 0)
 * - Creates user_credits record for users who already used free grid (0 credits)
 * - Records credit transactions for audit trail
 * 
 * Run with: npx tsx scripts/migrations/run-grant-free-user-credits-migration.ts
 */

import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL!)

async function runMigration() {
  try {
    console.log("[Migration] Starting: Grant Free User Credits")
    console.log("[Migration] This will grant 2 credits to free users who haven't used their free grid")

    // Check if migration already applied (check if any credits were granted via this migration)
    const existingGrants = await sql`
      SELECT COUNT(*) as count
      FROM credit_transactions
      WHERE transaction_type = 'bonus'
      AND description = 'Free blueprint credits (migration)'
    `

    if (existingGrants[0].count > 0) {
      console.log(
        `[Migration] ⚠️  Migration may have already been applied (found ${existingGrants[0].count} previous grants)`,
      )
      console.log("[Migration] Proceeding anyway (migration is idempotent)")
    }

    // Read SQL migration file
    const sqlPath = join(process.cwd(), "scripts/migrations/grant-free-user-credits.sql")
    const sqlFile = readFileSync(sqlPath, "utf-8")

    console.log("[Migration] Executing SQL migration...")

    // Execute migration (SQL file contains BEGIN/COMMIT)
    await sql.unsafe(sqlFile)

    // Verify migration
    const creditsGranted = await sql`
      SELECT COUNT(*) as count
      FROM credit_transactions
      WHERE transaction_type = 'bonus'
      AND description = 'Free blueprint credits (migration)'
      AND created_at >= NOW() - INTERVAL '1 minute'
    `

    const usersWithCredits = await sql`
      SELECT COUNT(*) as count
      FROM user_credits
      WHERE balance > 0
    `

    const usersWithoutCredits = await sql`
      SELECT COUNT(*) as count
      FROM user_credits
      WHERE balance = 0
    `

    console.log("[Migration] ✅ Migration completed successfully!")
    console.log(`[Migration] Credits granted: ${creditsGranted[0].count} users`)
    console.log(`[Migration] Users with credits: ${usersWithCredits[0].count}`)
    console.log(`[Migration] Users without credits (already used): ${usersWithoutCredits[0].count}`)
  } catch (error) {
    console.error("[Migration] ❌ Migration failed:", error)
    throw error
  }
}

// Run migration if executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log("[Migration] Done!")
      process.exit(0)
    })
    .catch((error) => {
      console.error("[Migration] Error:", error)
      process.exit(1)
    })
}

export default runMigration

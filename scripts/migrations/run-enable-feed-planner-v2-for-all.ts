#!/usr/bin/env tsx
/**
 * Migration Runner: Enable Feed Planner V2 for all users
 *
 * Run with:
 *   pnpm exec tsx scripts/migrations/run-enable-feed-planner-v2-for-all.ts
 */

import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL!)

async function runMigration() {
  console.log("[Migration] Starting: Enable Feed Planner V2 for all users")

  const sqlPath = join(
    process.cwd(),
    "scripts/migrations/2026-01-20-enable-feed-planner-v2-for-all.sql",
  )
  const sqlFile = readFileSync(sqlPath, "utf-8")

  await sql.unsafe(sqlFile)

  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count
    FROM users
    WHERE use_feed_planner_v2 = true
  `

  console.log(`[Migration] ✅ V2 enabled users: ${count}`)
}

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

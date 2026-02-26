#!/usr/bin/env tsx
/**
 * Verify maya_personal_memory table for ClawDBot bridge
 * NORTH-CODE-AUDIT-FEB26: Critical blocker — confirm table exists before bridge deploys
 *
 * Run: pnpm tsx scripts/verify-maya-bridge-table.ts
 */

import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { resolve } from "path"

dotenv.config({ path: resolve(__dirname, "..", ".env.local") })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("❌ DATABASE_URL not set. Use .env.local")
  process.exit(1)
}

const sql = neon(databaseUrl)

async function verify() {
  console.log("🔍 Verifying maya_personal_memory for bridge...\n")

  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_name = 'maya_personal_memory'
  `
  if (tables.length === 0) {
    console.error("❌ Table maya_personal_memory does NOT exist.")
    console.error("   Run: scripts/00-create-all-tables.sql or 02-create-maya-tables.sql")
    process.exit(1)
  }
  console.log("✅ Table maya_personal_memory exists")

  const cols = await sql`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'maya_personal_memory'
    ORDER BY ordinal_position
  `
  const colNames = (cols as { column_name: string }[]).map((c) => c.column_name)
  const hasUserId = colNames.includes("user_id")
  const hasMemoryData = colNames.includes("memory_data")
  if (!hasUserId || !hasMemoryData) {
    console.error("❌ Missing columns. Bridge needs: user_id, memory_data")
    console.error("   Actual columns:", colNames.join(", "))
    process.exit(1)
  }
  console.log("✅ Columns user_id, memory_data present")

  const count = await sql`SELECT COUNT(*)::int AS c FROM maya_personal_memory`
  const n = (count[0] as { c: number })?.c ?? 0
  console.log(`   Rows: ${n}`)

  console.log("\n✅ Bridge-ready. inject_maya_context can write to maya_personal_memory.")
}

verify().catch((err) => {
  console.error("❌", err.message)
  process.exit(1)
})

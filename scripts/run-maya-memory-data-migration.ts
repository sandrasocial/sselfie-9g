#!/usr/bin/env tsx
/**
 * Run migration: add memory_data to maya_personal_memory
 * NORTH-CODE-AUDIT-FEB26: Required for ClawDBot bridge inject_maya_context
 *
 * Run: pnpm tsx scripts/run-maya-memory-data-migration.ts
 */

import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { resolve } from "path"

dotenv.config({ path: resolve(__dirname, "..", ".env.local") })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("❌ DATABASE_URL not set")
  process.exit(1)
}

const sql = neon(databaseUrl)

async function run() {
  console.log("🔧 Adding memory_data to maya_personal_memory...\n")

  await sql`
    ALTER TABLE maya_personal_memory
    ADD COLUMN IF NOT EXISTS memory_data JSONB NOT NULL DEFAULT '{}'
  `
  console.log("✅ Migration applied")

  // Verify
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'maya_personal_memory' AND column_name = 'memory_data'
  `
  if (cols.length === 0) {
    console.error("❌ memory_data column still missing after migration")
    process.exit(1)
  }
  console.log("✅ memory_data column verified")
}

run().catch((err) => {
  console.error("❌", err.message)
  process.exit(1)
})

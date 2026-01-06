#!/usr/bin/env tsx
/**
 * Run chat_type constraints migration
 * 
 * This script:
 * 1. Updates legacy chats with NULL chat_type to 'maya'
 * 2. Adds NOT NULL constraint
 * 3. Adds check constraint for valid values
 */

import { neon } from "@neondatabase/serverless"
import * as fs from "fs"
import * as path from "path"
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") })
dotenv.config({ path: path.join(process.cwd(), ".env") })

const sql = neon(process.env.DATABASE_URL!)

async function runMigration() {
  try {
    console.log("[Migration] Starting chat_type constraints migration...")

    // Read migration file
    const migrationPath = path.join(process.cwd(), "migrations", "add-chat-type-constraints.sql")
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

    // Split by semicolon and filter out empty statements
    const statements = migrationSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"))

    console.log(`[Migration] Found ${statements.length} statements to execute`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`[Migration] Executing statement ${i + 1}/${statements.length}...`)
      
      try {
        await sql(statement)
        console.log(`[Migration] ✅ Statement ${i + 1} executed successfully`)
      } catch (error: any) {
        // Check if it's a "constraint already exists" error (safe to ignore)
        if (error?.message?.includes("already exists") || error?.code === "42710") {
          console.log(`[Migration] ⚠️ Statement ${i + 1} constraint already exists, skipping...`)
          continue
        }
        // Check if it's a "column is already not null" error (safe to ignore)
        if (error?.message?.includes("column") && error?.message?.includes("is already not null")) {
          console.log(`[Migration] ⚠️ Statement ${i + 1} column already has NOT NULL, skipping...`)
          continue
        }
        throw error
      }
    }

    // Verify migration
    console.log("[Migration] Verifying migration...")
    const [result] = await sql`
      SELECT 
        COUNT(*) as total_chats,
        COUNT(*) FILTER (WHERE chat_type IS NULL) as null_chats,
        COUNT(*) FILTER (WHERE chat_type = 'maya') as maya_chats,
        COUNT(*) FILTER (WHERE chat_type = 'pro') as pro_chats,
        COUNT(*) FILTER (WHERE chat_type = 'feed-planner') as feed_chats
      FROM maya_chats
    `

    console.log("[Migration] ✅ Migration completed successfully!")
    console.log("[Migration] Chat type distribution:", {
      total: result.total_chats,
      null: result.null_chats,
      maya: result.maya_chats,
      pro: result.pro_chats,
      feedPlanner: result.feed_chats,
    })

    if (result.null_chats > 0) {
      console.warn("[Migration] ⚠️ WARNING: Still found NULL chat_type values. This should not happen after migration.")
    }
  } catch (error) {
    console.error("[Migration] ❌ Migration failed:", error)
    process.exit(1)
  }
}

runMigration()


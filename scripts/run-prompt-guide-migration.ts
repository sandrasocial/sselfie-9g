/**
 * Run Prompt Guide Tables Migration
 * Creates the prompt_guides, prompt_guide_items, prompt_pages, and writing_assistant_outputs tables
 */

import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"
import { config } from "dotenv"

// Load environment variables
config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("[Migration] ❌ DATABASE_URL environment variable is not set")
  process.exit(1)
}

const sql = neon(databaseUrl)

async function runMigration() {
  console.log("[Migration] Starting prompt guide tables migration...\n")

  try {
    // Read the SQL file
    const sqlFile = readFileSync(
      join(process.cwd(), "scripts", "50-create-prompt-guide-tables.sql"),
      "utf-8"
    )

    // Split by semicolons and execute each statement
    const statements = sqlFile
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"))

    console.log(`[Migration] Found ${statements.length} SQL statements to execute\n`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        try {
          // Use unsafe to execute raw SQL - it returns a promise
          const result = await sql.unsafe(statement)
          console.log(`[Migration] ✓ Executed statement ${i + 1}/${statements.length}`)
        } catch (error: any) {
          // Ignore "already exists" errors
          if (error.message?.includes("already exists") || 
              error.message?.includes("duplicate") ||
              error.message?.includes("relation") && error.message?.includes("already exists")) {
            console.log(`[Migration] ⊙ Statement ${i + 1} already exists, skipping`)
          } else {
            console.error(`[Migration] Error in statement ${i + 1}:`, error.message)
            throw error
          }
        }
      }
    }

    console.log("\n[Migration] ✅ Migration completed successfully!")
    console.log("[Migration] Tables created:")
    console.log("  - prompt_guides")
    console.log("  - prompt_guide_items")
    console.log("  - prompt_pages")
    console.log("  - writing_assistant_outputs")
  } catch (error: any) {
    console.error("[Migration] ❌ Migration failed:", error.message)
    process.exit(1)
  }
}

runMigration()

/**
 * Migration script to add updated_at column to prompt_pages table
 * Run with: pnpm exec tsx scripts/migrations/run-prompt-pages-updated-at-migration.ts
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
    console.log("🚀 Starting migration: Add updated_at to prompt_pages...")

    // Read the SQL migration file
    const migrationPath = join(process.cwd(), "scripts/migrations/16-add-updated-at-to-prompt-pages.sql")
    const migrationSQL = readFileSync(migrationPath, "utf-8")

    // Execute the migration
    console.log("📝 Executing SQL migration...")
    // Split SQL into individual statements and execute them separately
    // Handle function definitions that span multiple statements
    const statements: string[] = []
    let currentStatement = ''
    let inFunction = false
    
    for (const line of migrationSQL.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('--')) continue
      
      currentStatement += line + '\n'
      
      // Check if we're entering a function definition
      if (trimmed.includes('CREATE OR REPLACE FUNCTION') || trimmed.includes('CREATE FUNCTION')) {
        inFunction = true
      }
      
      // Check if we're exiting a function definition
      if (inFunction && trimmed.includes('$$ LANGUAGE')) {
        inFunction = false
        statements.push(currentStatement.trim())
        currentStatement = ''
      } else if (!inFunction && trimmed.endsWith(';')) {
        statements.push(currentStatement.trim())
        currentStatement = ''
      }
    }
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        await sql.query(statement)
      }
    }

    console.log("✅ Migration completed successfully!")
    console.log("✅ Added updated_at column to prompt_pages table")
    console.log("✅ Set updated_at for existing rows")
    console.log("✅ Created trigger to auto-update updated_at on row updates")

    // Verify the column was added
    console.log("\n🔍 Verifying migration...")
    const result = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'prompt_pages' AND column_name = 'updated_at'
    `

    if (result.length > 0) {
      console.log("✅ Verification successful!")
      console.log("   Column details:", result[0])
    } else {
      console.error("❌ Verification failed: updated_at column not found")
      process.exit(1)
    }
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message)
    console.error(error)
    process.exit(1)
  }
}

runMigration()


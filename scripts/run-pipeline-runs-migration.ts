/**
 * Run Pipeline Runs Migration
 * Executes the SQL migration to create the pipeline_runs table
 * 
 * Usage:
 *   DATABASE_URL=your_connection_string npx tsx scripts/run-pipeline-runs-migration.ts
 * 
 * Or if using .env.local:
 *   npx tsx scripts/run-pipeline-runs-migration.ts
 */

// Load environment variables from .env.local if it exists
try {
  const fs = require("fs")
  const path = require("path")
  const envPath = path.join(process.cwd(), ".env.local")
  
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf-8")
    envFile.split("\n").forEach((line: string) => {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim().replace(/^["']|["']$/g, "")
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    })
  }
} catch (e) {
  // Continue without loading .env.local
}

import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set")
  }

  const sql = neon(process.env.DATABASE_URL)

  // Read the migration SQL file
  const migrationPath = join(process.cwd(), "scripts", "create-pipeline-runs-table.sql")
  const migrationSQL = readFileSync(migrationPath, "utf-8")

  console.log("🚀 Running pipeline_runs table migration...")
  console.log("📁 Migration file:", migrationPath)
  console.log("")

  try {
    // Split SQL into individual statements and execute them
    // Remove comments and empty lines, then split by semicolon
    const statements = migrationSQL
      .split("\n")
      .filter((line) => !line.trim().startsWith("--") && line.trim().length > 0)
      .join("\n")
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    console.log(`📝 Executing ${statements.length} SQL statements...`)

    // Execute each statement using tagged template literal
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement) {
        // Use sql.query for raw SQL strings
        await sql.query(statement)
        console.log(`  ✓ Statement ${i + 1}/${statements.length} executed`)
      }
    }

    console.log("")
    console.log("✅ Migration completed successfully!")
    console.log("📊 Table 'pipeline_runs' created with indexes")
    console.log("")
    console.log("Created:")
    console.log("  - Table: pipeline_runs")
    console.log("  - Index: idx_pipeline_runs_started_at")
    console.log("  - Index: idx_pipeline_runs_pipeline")
    console.log("  - Index: idx_pipeline_runs_ok")
  } catch (error) {
    console.error("")
    console.error("❌ Migration failed:", error)
    throw error
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log("✨ Migration script finished")
    process.exit(0)
  })
  .catch((error) => {
    console.error("💥 Migration script error:", error)
    process.exit(1)
  })


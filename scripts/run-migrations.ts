/**
 * Run Database Migrations
 * Executes all required migrations for Phase D
 */

import { neon } from "@neondatabase/serverless"
import { readFileSync, existsSync } from "fs"
import { join, resolve } from "path"

// Load environment variables from .env.local or .env manually
function loadEnvFile(filePath: string) {
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, "utf-8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...valueParts] = trimmed.split("=")
        const value = valueParts.join("=").trim()
        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, "")
        if (key && !process.env[key]) {
          process.env[key] = cleanValue
        }
      }
    }
  }
}

// Try loading .env.local first, then .env
loadEnvFile(resolve(process.cwd(), ".env.local"))
loadEnvFile(resolve(process.cwd(), ".env"))

if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL environment variable is not set")
  console.error("Please set DATABASE_URL in .env.local or .env file")
  console.error("Or export it as an environment variable: export DATABASE_URL=...")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

const MIGRATIONS = [
  {
    name: "Daily Drops Table",
    file: "create-daily-drops-table.sql",
  },
  {
    name: "Hooks Library Table",
    file: "create-hooks-library-table.sql",
  },
  {
    name: "Pipeline Runs Table",
    file: "create-pipeline-runs-table.sql",
  },
  {
    name: "Abandoned Checkouts Table",
    file: "create-abandoned-checkouts-table.sql",
  },
]

async function runMigrations() {
  try {
    console.log("=".repeat(80))
    console.log("Running Phase D Database Migrations")
    console.log("=".repeat(80))

    for (const migration of MIGRATIONS) {
      console.log(`\n📦 Running migration: ${migration.name}`)
      
      const filePath = join(process.cwd(), "scripts", migration.file)
      const sqlContent = readFileSync(filePath, "utf-8")
      
      // Execute the entire SQL file as a single query
      // Neon SQL client supports multi-statement queries
      try {
        // Use tagged template literal syntax
        await sql.unsafe(sqlContent)
        console.log(`  ✅ Migration complete: ${migration.name}`)
      } catch (error: any) {
        // Ignore "already exists" errors
        if (
          error.message?.includes("already exists") ||
          error.message?.includes("duplicate") ||
          error.message?.includes("relation") && error.message?.includes("already exists")
        ) {
          console.log(`  ⚠️  Skipped (already exists): ${migration.name}`)
        } else {
          console.error(`  ❌ Error in ${migration.name}:`, error.message)
          throw error
        }
      }
    }

    console.log("\n" + "=".repeat(80))
    console.log("✅ All migrations completed successfully!")
    console.log("=".repeat(80))
  } catch (error) {
    console.error("\n❌ Migration failed:", error)
    process.exit(1)
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error("Fatal error:", error)
      process.exit(1)
    })
}

export { runMigrations }


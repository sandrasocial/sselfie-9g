/**
 * Admin Tables Discovery Script
 * Checks which admin tables exist in the database
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { join } from "path"

// Load environment variables
config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

const TARGET_TABLES = [
  "admin_knowledge_base",
  "admin_memory",
  "admin_business_insights",
  "admin_content_performance",
  "admin_email_campaigns",
  "admin_agent_messages",
  "admin_personal_story",
  "admin_writing_samples",
  "alex_suggestion_history",
]

async function checkAdminTables() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set")
    process.exit(1)
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    // Query information_schema for existing tables
    const existingTables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY(${TARGET_TABLES})
      ORDER BY table_name
    `

    const existingTableNames = existingTables.map((row: any) => row.table_name)
    const missingTables = TARGET_TABLES.filter((name) => !existingTableNames.includes(name))

    console.log("\n" + "=".repeat(60))
    console.log("ADMIN TABLES DISCOVERY REPORT")
    console.log("=".repeat(60) + "\n")

    console.log("✅ PRESENT TABLES (" + existingTableNames.length + "):")
    if (existingTableNames.length > 0) {
      existingTableNames.forEach((name) => console.log(`   - ${name}`))
    } else {
      console.log("   (none)")
    }

    console.log("\n❌ MISSING TABLES (" + missingTables.length + "):")
    if (missingTables.length > 0) {
      missingTables.forEach((name) => console.log(`   - ${name}`))
    } else {
      console.log("   (none - all tables present!)")
    }

    console.log("\n" + "=".repeat(60) + "\n")

    return {
      present: existingTableNames,
      missing: missingTables,
    }
  } catch (error) {
    console.error("❌ Error checking tables:", error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  checkAdminTables()
    .then((result) => {
      process.exit(result.missing.length > 0 ? 1 : 0)
    })
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { checkAdminTables, TARGET_TABLES }


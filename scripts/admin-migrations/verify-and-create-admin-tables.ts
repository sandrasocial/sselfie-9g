/**
 * Admin Tables Verification & Creation Script
 * Checks which admin tables exist and creates missing ones
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { join } from "path"
import { readFileSync } from "fs"

// Load environment variables
config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

const ADMIN_TABLES = [
  // From admin-memory-system.sql
  "admin_memory",
  "admin_email_campaigns",
  "admin_automation_rules",
  "admin_content_performance",
  "admin_business_insights",
  
  // From admin-knowledge-base.sql
  "admin_knowledge_base",
  "admin_context_guidelines",
  
  // From personal-knowledge-system.sql
  "admin_personal_story",
  "admin_writing_samples",
  "admin_agent_feedback",
  "admin_automation_triggers",
  
  // Note: admin_competitor_analyses is legacy - replaced by admin_competitor_analyses_ai
  // Keeping it optional since code doesn't use it
  
  // From admin-agent-messages
  "admin_agent_chats",
  "admin_agent_messages",
  
  // From admin-migrations
  "admin_feature_flags",
  "admin_cron_runs",
  "admin_email_errors",
]

const MIGRATION_SCRIPTS = [
  { file: "scripts/34-create-admin-memory-system.sql", tables: ["admin_memory", "admin_email_campaigns", "admin_automation_rules", "admin_content_performance", "admin_business_insights"] },
  { file: "scripts/36-create-admin-knowledge-base.sql", tables: ["admin_knowledge_base", "admin_context_guidelines"] },
  { file: "scripts/30-create-personal-knowledge-system.sql", tables: ["admin_personal_story", "admin_writing_samples", "admin_agent_feedback", "admin_automation_triggers"] },
  // Note: admin_competitor_analyses from 35-create-admin-tools-tables.sql is legacy and not used
  { file: "scripts/38-add-email-preview-data-column.sql", tables: ["admin_agent_chats", "admin_agent_messages"] },
  { file: "scripts/admin-migrations/20250106_create_admin_feature_flags.sql", tables: ["admin_feature_flags"] },
  { file: "scripts/admin-migrations/20250106_create_admin_cron_runs.sql", tables: ["admin_cron_runs"] },
  { file: "scripts/admin-migrations/20250106_create_admin_email_errors.sql", tables: ["admin_email_errors"] },
]

async function verifyAndCreateTables() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set")
    process.exit(1)
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    console.log("\n" + "=".repeat(70))
    console.log("ADMIN TABLES VERIFICATION & CREATION")
    console.log("=".repeat(70) + "\n")

    // Step 1: Check which tables exist
    console.log("📋 Step 1: Checking existing tables...")
    const existingTables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY(${ADMIN_TABLES})
      ORDER BY table_name
    `

    const existingTableNames = existingTables.map((row: any) => row.table_name)
    const missingTables = ADMIN_TABLES.filter((name) => !existingTableNames.includes(name))

    console.log(`✅ Found ${existingTableNames.length}/${ADMIN_TABLES.length} tables\n`)

    if (existingTableNames.length > 0) {
      console.log("✅ EXISTING TABLES:")
      existingTableNames.forEach((name) => console.log(`   - ${name}`))
      console.log("")
    }

    if (missingTables.length === 0) {
      console.log("✅ All admin tables exist! No migrations needed.\n")
      console.log("=".repeat(70) + "\n")
      return { created: 0, existing: existingTableNames.length }
    }

    console.log(`❌ MISSING TABLES (${missingTables.length}):`)
    missingTables.forEach((name) => console.log(`   - ${name}`))
    console.log("")

    // Step 2: Run migration scripts for missing tables
    console.log("🔧 Step 2: Running migration scripts...\n")
    let createdCount = 0

    for (const migration of MIGRATION_SCRIPTS) {
      const needsToRun = migration.tables.some((table) => missingTables.includes(table))
      
      if (needsToRun) {
        try {
          console.log(`📄 Running: ${migration.file}`)
          const sqlContent = readFileSync(join(process.cwd(), migration.file), "utf-8")
          await sql.unsafe(sqlContent)
          
          const createdFromThis = migration.tables.filter((table) => missingTables.includes(table))
          createdCount += createdFromThis.length
          console.log(`   ✅ Created tables: ${createdFromThis.join(", ")}\n`)
        } catch (error: any) {
          // Some errors are expected (e.g., table already exists, duplicate columns)
          if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
            console.log(`   ⚠️  Some objects already exist (skipping): ${error.message.substring(0, 80)}...\n`)
          } else {
            console.error(`   ❌ Error running ${migration.file}:`, error.message)
            throw error
          }
        }
      }
    }

    // Step 3: Verify all tables now exist
    console.log("🔍 Step 3: Verifying all tables were created...\n")
    const finalCheck = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY(${ADMIN_TABLES})
      ORDER BY table_name
    `

    const finalTableNames = finalCheck.map((row: any) => row.table_name)
    const stillMissing = ADMIN_TABLES.filter((name) => !finalTableNames.includes(name))

    if (stillMissing.length > 0) {
      console.log("⚠️  WARNING: Some tables still missing after migrations:")
      stillMissing.forEach((name) => console.log(`   - ${name}`))
      console.log("")
    } else {
      console.log("✅ All admin tables verified!\n")
    }

    // Summary
    console.log("=".repeat(70))
    console.log("SUMMARY")
    console.log("=".repeat(70))
    console.log(`✅ Existing tables: ${existingTableNames.length}`)
    console.log(`✅ Created tables: ${createdCount}`)
    console.log(`✅ Total tables: ${finalTableNames.length}/${ADMIN_TABLES.length}`)
    if (stillMissing.length > 0) {
      console.log(`⚠️  Still missing: ${stillMissing.length}`)
    }
    console.log("=".repeat(70) + "\n")

    return {
      created: createdCount,
      existing: existingTableNames.length,
      total: finalTableNames.length,
      stillMissing: stillMissing.length,
    }
  } catch (error) {
    console.error("\n❌ Error verifying/creating tables:", error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  verifyAndCreateTables()
    .then((result) => {
      process.exit(result.stillMissing > 0 ? 1 : 0)
    })
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { verifyAndCreateTables, ADMIN_TABLES }


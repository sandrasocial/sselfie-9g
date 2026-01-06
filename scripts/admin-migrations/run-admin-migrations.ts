/**
 * Admin Tables Migration Runner
 * Discovers missing admin tables and creates them using existing migrations or new minimal schemas
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { join } from "path"
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs"

// Load environment variables (must be first)
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

// Map tables to their migration scripts
const TABLE_MIGRATIONS: Record<string, string> = {
  admin_knowledge_base: "scripts/36-create-admin-knowledge-base.sql",
  admin_memory: "scripts/34-create-admin-memory-system.sql",
  admin_business_insights: "scripts/34-create-admin-memory-system.sql", // Same file
  admin_content_performance: "scripts/34-create-admin-memory-system.sql", // Same file
  admin_email_campaigns: "scripts/42-ensure-email-campaign-tables.sql",
  admin_agent_messages: "scripts/38-add-email-preview-data-column.sql",
  admin_personal_story: "scripts/30-create-personal-knowledge-system.sql",
  admin_writing_samples: "scripts/30-create-personal-knowledge-system.sql", // Same file
  alex_suggestion_history: "scripts/migrations/019_create_alex_suggestion_history.sql",
}

async function checkTables(sql: ReturnType<typeof neon>) {
  const existingTables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY(${TARGET_TABLES})
    ORDER BY table_name
  `
  return existingTables.map((row: any) => row.table_name)
}

async function runMigration(sql: ReturnType<typeof neon>, migrationPath: string, tableName: string) {
  console.log(`[Migration] 📄 Running migration for ${tableName} from ${migrationPath}...`)
  
  if (!existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${migrationPath}`)
  }

  const migrationSQL = readFileSync(migrationPath, "utf-8")
  
  // Execute the migration
  await sql.unsafe(migrationSQL)
  
  console.log(`[Migration] ✅ Completed migration for ${tableName}`)
}

async function createMinimalTable(sql: ReturnType<typeof neon>, tableName: string) {
  console.log(`[Migration] 🔨 Creating minimal schema for ${tableName}...`)
  
  // Create minimal safe schemas based on table name and code usage
  const minimalSchemas: Record<string, string> = {
    // These should have existing migrations, but fallback if needed
  }
  
  if (minimalSchemas[tableName]) {
    await sql.unsafe(minimalSchemas[tableName])
    console.log(`[Migration] ✅ Created minimal table ${tableName}`)
  } else {
    throw new Error(`No minimal schema defined for ${tableName} - should use existing migration`)
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("[Migration] ❌ DATABASE_URL environment variable is not set")
    process.exit(1)
  }

  const sql = neon(databaseUrl)

  console.log("\n" + "=".repeat(60))
  console.log("ADMIN TABLES MIGRATION")
  console.log("=".repeat(60) + "\n")

  // Step 1: Discover existing tables
  console.log("[Step 1] 🔍 Checking existing tables...")
  const existingTables = await checkTables(sql)
  const missingTables = TARGET_TABLES.filter((name) => !existingTables.includes(name))

  console.log(`✅ Present: ${existingTables.length} tables`)
  existingTables.forEach((name) => console.log(`   - ${name}`))
  
  console.log(`\n❌ Missing: ${missingTables.length} tables`)
  if (missingTables.length === 0) {
    console.log("   (none - all tables present!)")
    console.log("\n" + "=".repeat(60))
    console.log("✅ All admin tables exist. No migration needed.")
    console.log("=".repeat(60) + "\n")
    return
  }
  missingTables.forEach((name) => console.log(`   - ${name}`))

  // Step 2: Create missing tables
  console.log("\n[Step 2] 🚀 Creating missing tables...\n")

  const createdTables: string[] = []
  const failedTables: Array<{ table: string; error: string }> = []

  for (const tableName of missingTables) {
    try {
      const migrationPath = TABLE_MIGRATIONS[tableName]
      
      if (migrationPath && existsSync(migrationPath)) {
        // Use existing migration
        await runMigration(sql, migrationPath, tableName)
        createdTables.push(tableName)
      } else {
        // Need to create new migration file
        console.log(`[Migration] ⚠️  No existing migration found for ${tableName}`)
        console.log(`[Migration] 📝 Creating new migration file...`)
        
        // Create migration directory if needed
        const migrationDir = "scripts/admin-migrations"
        if (!existsSync(migrationDir)) {
          mkdirSync(migrationDir, { recursive: true })
        }

        // Generate date-based filename
        const date = new Date().toISOString().split("T")[0].replace(/-/g, "")
        const migrationFile = `${migrationDir}/${date}_create_${tableName}.sql`
        
        // Create minimal safe schema based on code usage
        const minimalSQL = await generateMinimalSchema(tableName, sql)
        
        writeFileSync(migrationFile, minimalSQL)
        console.log(`[Migration] 📄 Created migration file: ${migrationFile}`)
        
        // Execute it
        await sql.unsafe(minimalSQL)
        createdTables.push(tableName)
        console.log(`[Migration] ✅ Created table ${tableName}`)
      }
    } catch (error: any) {
      console.error(`[Migration] ❌ Failed to create ${tableName}:`, error.message)
      failedTables.push({ table: tableName, error: error.message })
    }
  }

  // Step 3: Verify all tables exist
  console.log("\n[Step 3] ✅ Verifying all tables exist...")
  const finalCheck = await checkTables(sql)
  const stillMissing = TARGET_TABLES.filter((name) => !finalCheck.includes(name))

  console.log("\n" + "=".repeat(60))
  console.log("MIGRATION SUMMARY")
  console.log("=".repeat(60))
  console.log(`✅ Created: ${createdTables.length} tables`)
  createdTables.forEach((name) => console.log(`   - ${name}`))
  
  if (failedTables.length > 0) {
    console.log(`\n❌ Failed: ${failedTables.length} tables`)
    failedTables.forEach(({ table, error }) => console.log(`   - ${table}: ${error}`))
  }
  
  if (stillMissing.length > 0) {
    console.log(`\n⚠️  Still Missing: ${stillMissing.length} tables`)
    stillMissing.forEach((name) => console.log(`   - ${name}`))
  } else {
    console.log("\n✅ All target tables now exist!")
  }
  console.log("=".repeat(60) + "\n")

  if (stillMissing.length > 0 || failedTables.length > 0) {
    process.exit(1)
  }
}

async function generateMinimalSchema(tableName: string, sql: ReturnType<typeof neon>): Promise<string> {
  // Generate minimal safe schemas based on code usage patterns
  // This is a fallback - most tables should have existing migrations
  
  const schemas: Record<string, string> = {
    // These should not be needed if migrations exist, but provide fallbacks
  }
  
  if (schemas[tableName]) {
    return schemas[tableName]
  }
  
  // Default minimal schema (should not be used if migrations exist)
  return `-- Minimal schema for ${tableName}
-- WARNING: This is a fallback. Check code usage to ensure all required columns are included.

CREATE TABLE IF NOT EXISTS ${tableName} (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ${tableName} IS 'Admin table - minimal schema. Review code usage to add required columns.';
`
}

if (require.main === module) {
  main().catch((error) => {
    console.error("[Migration] ❌ Fatal error:", error)
    process.exit(1)
  })
}

export { main, checkTables, TARGET_TABLES }


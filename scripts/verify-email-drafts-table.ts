import { neon } from "@neondatabase/serverless"
import * as fs from "fs"
import * as path from "path"
import { config } from "dotenv"

// Load environment variables
config({ path: ".env.local" })
config({ path: ".env" })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("[EmailDrafts] ❌ DATABASE_URL environment variable is not set")
  process.exit(1)
}

const sql = neon(databaseUrl)

async function verifyEmailDraftsTable() {
  try {
    console.log("[EmailDrafts] Checking database connection...")
    console.log("[EmailDrafts] Database URL:", process.env.DATABASE_URL?.substring(0, 50) + "...")

    // Check if table exists
    console.log("\n[EmailDrafts] === CHECKING admin_email_drafts TABLE ===")
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_email_drafts'
      )
    `

    if (tableExists[0].exists) {
      console.log("[EmailDrafts] ✅ Table 'admin_email_drafts' EXISTS")

      // Check table structure
      console.log("\n[EmailDrafts] === TABLE STRUCTURE ===")
      const columns = await sql`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'admin_email_drafts'
        ORDER BY ordinal_position
      `

      console.log(`[EmailDrafts] Found ${columns.length} columns:`)
      columns.forEach((col) => {
        const nullable = col.is_nullable === "YES" ? "NULL" : "NOT NULL"
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : ""
        console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`)
      })

      // Check indexes
      console.log("\n[EmailDrafts] === INDEXES ===")
      const indexes = await sql`
        SELECT 
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' 
          AND tablename = 'admin_email_drafts'
        ORDER BY indexname
      `

      console.log(`[EmailDrafts] Found ${indexes.length} indexes:`)
      indexes.forEach((idx) => {
        console.log(`  - ${idx.indexname}`)
      })

      // Check triggers
      console.log("\n[EmailDrafts] === TRIGGERS ===")
      const triggers = await sql`
        SELECT 
          trigger_name,
          event_manipulation,
          action_statement
        FROM information_schema.triggers
        WHERE event_object_schema = 'public' 
          AND event_object_table = 'admin_email_drafts'
      `

      console.log(`[EmailDrafts] Found ${triggers.length} triggers:`)
      triggers.forEach((trig) => {
        console.log(`  - ${trig.trigger_name}: ${trig.event_manipulation}`)
      })

      // Check row count
      const rowCount = await sql`
        SELECT COUNT(*) as count FROM admin_email_drafts
      `
      console.log(`\n[EmailDrafts] === ROW COUNT ===`)
      console.log(`[EmailDrafts] Total rows: ${rowCount[0].count}`)

      console.log("\n[EmailDrafts] ✅ Verification complete! Table is ready to use.")
      return true
      } else {
        console.log("[EmailDrafts] ❌ Table 'admin_email_drafts' DOES NOT EXIST")
        console.log("\n[EmailDrafts] 🔧 To create the table, please run the migration script:")
        console.log("[EmailDrafts]   psql $DATABASE_URL -f scripts/51-create-email-drafts-table.sql")
        console.log("\n[EmailDrafts] Or if you prefer to run it via TypeScript:")
        console.log("[EmailDrafts]   npx tsx scripts/run-email-drafts-migration.ts")
        return false
      }
  } catch (error: any) {
    console.error("[EmailDrafts] ❌ Error verifying table:", error)
    return false
  }
}

verifyEmailDraftsTable()
  .then((success) => {
    if (success) {
      console.log("\n[EmailDrafts] ✅ Verification completed successfully!")
      process.exit(0)
    } else {
      console.log("\n[EmailDrafts] ❌ Verification failed!")
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error("[EmailDrafts] ❌ Fatal error:", error)
    process.exit(1)
  })


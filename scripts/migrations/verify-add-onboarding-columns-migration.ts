import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { resolve } from "path"

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") })

async function verifyMigration() {
  const sql = neon(process.env.DATABASE_URL!)

  try {
    console.log("🔍 Verifying migration: add-onboarding-columns\n")

    // Check if columns exist
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name IN ('onboarding_completed', 'blueprint_welcome_shown_at')
      ORDER BY column_name
    `

    console.log("📊 Columns found:")
    if (columns.length === 0) {
      console.log("   ❌ No columns found!")
      return false
    }

    columns.forEach((col: any) => {
      console.log(`   ✅ ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`)
    })

    // Check index
    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'users'
        AND indexname = 'idx_users_onboarding_completed'
    `

    console.log("\n📊 Indexes found:")
    if (indexes.length === 0) {
      console.log("   ❌ Index idx_users_onboarding_completed not found!")
      return false
    } else {
      console.log(`   ✅ ${indexes[0].indexname}`)
    }

    // Check migration record
    const migration = await sql`
      SELECT version, applied_at
      FROM schema_migrations
      WHERE version = 'add-onboarding-columns'
      LIMIT 1
    `

    console.log("\n📊 Migration record:")
    if (migration.length === 0) {
      console.log("   ❌ Migration record not found!")
      return false
    } else {
      console.log(`   ✅ Migration '${migration[0].version}' recorded at ${migration[0].applied_at}`)
    }

    console.log("\n✅ Verification passed! All checks successful.")
    return true
  } catch (error: any) {
    console.error("❌ Verification failed:", error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    return false
  }
}

verifyMigration().then((success) => {
  process.exit(success ? 0 : 1)
})

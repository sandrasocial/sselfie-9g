import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { join } from "path"

// Load environment variables
config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("[Verification] ❌ DATABASE_URL environment variable is not set")
  process.exit(1)
}

const sql = neon(databaseUrl)

async function verifyMigration() {
  console.log("[Verification] 🔍 Verifying: add-user-id-to-blueprint-subscribers")

  try {
    // Check if migration was recorded
    const migrationRecord = await sql`
      SELECT version, applied_at 
      FROM schema_migrations 
      WHERE version = 'add-user-id-to-blueprint-subscribers'
    `

    if (migrationRecord.length === 0) {
      console.log("[Verification] ❌ Migration not recorded in schema_migrations")
      return false
    }

    console.log("[Verification] ✅ Migration recorded:", migrationRecord[0].applied_at)

    // Check if column exists
    const columnResult = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'blueprint_subscribers' 
      AND column_name = 'user_id'
    `

    if (columnResult.length === 0) {
      console.log("[Verification] ❌ user_id column not found")
      return false
    }

    console.log("[Verification] ✅ user_id column exists:")
    console.log("   - Type:", columnResult[0].data_type)
    console.log("   - Nullable:", columnResult[0].is_nullable)

    // Check if index exists
    const indexResult = await sql`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'blueprint_subscribers' 
      AND indexname = 'idx_blueprint_subscribers_user_id'
    `

    if (indexResult.length === 0) {
      console.log("[Verification] ❌ Index not found")
      return false
    }

    console.log("[Verification] ✅ Index exists:", indexResult[0].indexname)

    // Check foreign key constraint
    const fkResult = await sql`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'blueprint_subscribers'
        AND kcu.column_name = 'user_id'
    `

    if (fkResult.length === 0) {
      console.log("[Verification] ⚠️  Foreign key constraint not found (might be OK)")
    } else {
      console.log("[Verification] ✅ Foreign key constraint exists:")
      console.log("   - References:", fkResult[0].foreign_table_name, "(", fkResult[0].foreign_column_name, ")")
    }

    console.log("[Verification] ✨ All checks passed!")
    return true
  } catch (error) {
    console.error("[Verification] ❌ Error during verification:", error)
    return false
  }
}

// Run verification
verifyMigration()
  .then((success) => {
    if (success) {
      console.log("[Verification] ✅ Verification completed successfully")
      process.exit(0)
    } else {
      console.log("[Verification] ❌ Verification failed")
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error("[Verification] 💥 Verification error:", error)
    process.exit(1)
  })

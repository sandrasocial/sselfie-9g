import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") })

if (!process.env.DATABASE_URL) {
  console.error("[v0] ❌ DATABASE_URL not found")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

async function verifyMigration() {
  try {
    console.log("[v0] Verifying migration: Checking if is_test column exists...")
    
    // Check if column exists
    const columnCheck = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'user_models' 
      AND column_name = 'is_test'
    `
    
    if (columnCheck.length > 0) {
      console.log("[v0] ✅ Column 'is_test' exists!")
      console.log("[v0] Column details:", columnCheck[0])
      
      // Check index
      const indexCheck = await sql`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'user_models' 
        AND indexname = 'idx_user_models_is_test'
      `
      
      if (indexCheck.length > 0) {
        console.log("[v0] ✅ Index 'idx_user_models_is_test' exists!")
      } else {
        console.log("[v0] ⚠️  Index not found (may need to be created)")
      }
      
      // Check sample data
      const sampleData = await sql`
        SELECT 
          COUNT(*) as total_models,
          COUNT(CASE WHEN is_test = true THEN 1 END) as test_models,
          COUNT(CASE WHEN is_test = false OR is_test IS NULL THEN 1 END) as production_models
        FROM user_models
      `
      
      console.log("[v0] Sample data:", sampleData[0])
      console.log("[v0] ✅ Migration verified successfully!")
    } else {
      console.log("[v0] ❌ Column 'is_test' does NOT exist!")
      console.log("[v0] Migration may have failed. Please check the logs.")
      process.exit(1)
    }
  } catch (error: any) {
    console.error("[v0] ❌ Verification failed:", error.message)
    process.exit(1)
  }
}

verifyMigration()

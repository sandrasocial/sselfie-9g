import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import * as path from "path"

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function checkTables() {
  const sql = neon(process.env.DATABASE_URL!)

  try {
    console.log("🔍 Checking projects table structure...\n")

    // Check if table exists
    const tableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'projects'
    `
    
    if (tableCheck.length === 0) {
      console.log("❌ projects table does not exist!")
      return
    }

    console.log("✅ projects table exists\n")

    // Get column information
    console.log("📋 Columns in projects table:")
    const columns = await sql`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'projects'
      ORDER BY ordinal_position
    `

    console.table(columns)

    // Check if there are any rows
    console.log("\n📊 Checking for existing data...")
    const count = await sql`SELECT COUNT(*) as count FROM projects`
    console.log(`Found ${count[0].count} project(s)\n`)

    if (count[0].count > 0) {
      console.log("📝 Sample data:")
      const sample = await sql`SELECT * FROM projects LIMIT 3`
      console.table(sample)
    }

  } catch (error) {
    console.error("❌ Error:", error)
  }
}

checkTables()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

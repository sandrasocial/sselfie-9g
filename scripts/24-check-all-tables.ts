import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function checkAllTables() {
  try {
    console.log("[v0] Checking database connection...")
    console.log("[v0] Database URL:", process.env.DATABASE_URL?.substring(0, 50) + "...")

    // Get all table names
    console.log("\n[v0] === LISTING ALL TABLES ===")
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `
    console.log("[v0] Total tables found:", tables.length)
    tables.forEach((table) => {
      console.log(`  - ${table.table_name}`)
    })

    // Get row counts for each table
    console.log("\n[v0] === ROW COUNTS FOR EACH TABLE ===")
    for (const table of tables) {
      const tableName = table.table_name
      try {
        const result = await sql(`SELECT COUNT(*) as count FROM ${tableName}`)
        console.log(`  ${tableName}: ${result[0].count} rows`)
      } catch (error) {
        console.log(`  ${tableName}: Error counting rows - ${error}`)
      }
    }

    // Check specifically for generated_images
    console.log("\n[v0] === CHECKING GENERATED_IMAGES TABLE ===")
    const imagesExist = tables.find((t) => t.table_name === "generated_images")
    if (imagesExist) {
      console.log("[v0] generated_images table exists")

      // Get column info
      const columns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'generated_images'
        ORDER BY ordinal_position
      `
      console.log("[v0] Columns in generated_images:")
      columns.forEach((col) => {
        console.log(`  - ${col.column_name} (${col.data_type})`)
      })

      // Get sample data
      const sampleImages = await sql`
        SELECT id, user_id, image_url, created_at 
        FROM generated_images 
        LIMIT 5
      `
      console.log("[v0] Sample images (first 5):")
      if (sampleImages.length === 0) {
        console.log("  No images found in table")
      } else {
        sampleImages.forEach((img) => {
          console.log(`  - ID: ${img.id}, User: ${img.user_id}, Created: ${img.created_at}`)
        })
      }

      // Get user distribution
      const userDistribution = await sql`
        SELECT user_id, COUNT(*) as image_count
        FROM generated_images
        GROUP BY user_id
        ORDER BY image_count DESC
      `
      console.log("[v0] Images per user:")
      if (userDistribution.length === 0) {
        console.log("  No images found")
      } else {
        userDistribution.forEach((dist) => {
          console.log(`  User ${dist.user_id}: ${dist.image_count} images`)
        })
      }
    } else {
      console.log("[v0] ❌ generated_images table does NOT exist!")
    }

    // Check users table
    console.log("\n[v0] === CHECKING USERS TABLE ===")
    const usersExist = tables.find((t) => t.table_name === "users")
    if (usersExist) {
      const users = await sql`SELECT id, email, name FROM users LIMIT 10`
      console.log("[v0] Sample users (first 10):")
      users.forEach((user) => {
        console.log(`  - ${user.email} (ID: ${user.id})`)
      })
    } else {
      console.log("[v0] ❌ users table does NOT exist!")
    }

    console.log("\n[v0] === DIAGNOSTIC COMPLETE ===")
  } catch (error) {
    console.error("[v0] Error running diagnostic:", error)
  }
}

checkAllTables()

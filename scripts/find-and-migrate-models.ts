import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function findAndMigrateModels() {
  console.log("🔍 Searching for trained models in all tables...\n")

  try {
    // Check for old training_jobs or similar tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%train%' OR table_name LIKE '%model%' OR table_name LIKE '%lora%'
    `

    console.log("📋 Tables found:", tables)

    // Check user_models table for any existing data
    const userModels = await sql`
      SELECT 
        um.*,
        u.email,
        u.full_name
      FROM user_models um
      LEFT JOIN users u ON um.user_id = u.id
      ORDER BY um.created_at DESC
    `

    console.log("\n📊 Current user_models table:")
    console.log(`Total records: ${userModels.length}`)

    if (userModels.length > 0) {
      console.log("\nRecords:")
      userModels.forEach((model) => {
        console.log(`  - ${model.email || "No email"}: ${model.lora_weights_url ? "✅ Has LoRA" : "❌ No LoRA"}`)
      })
    }

    // Check for old Stack Auth user data
    const stackUsers = await sql`
      SELECT 
        id,
        email,
        full_name,
        stack_auth_id,
        created_at
      FROM users
      WHERE stack_auth_id IS NOT NULL
      ORDER BY created_at DESC
    `

    console.log("\n👥 Users with Stack Auth IDs:")
    console.log(`Total: ${stackUsers.length}`)
    stackUsers.forEach((user) => {
      console.log(`  - ${user.email} (Stack ID: ${user.stack_auth_id})`)
    })

    // Look for any columns that might contain LoRA URLs
    console.log("\n🔎 Checking for LoRA URLs in users table...")
    const usersWithPossibleLora = await sql`
      SELECT 
        id,
        email,
        full_name,
        stack_auth_id
      FROM users
      WHERE 
        stack_auth_id IS NOT NULL
      LIMIT 20
    `

    console.log(`Found ${usersWithPossibleLora.length} users with Stack Auth IDs`)
  } catch (error) {
    console.error("❌ Error:", error)
  }
}

findAndMigrateModels()

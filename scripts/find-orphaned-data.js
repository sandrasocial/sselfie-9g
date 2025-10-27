import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function findOrphanedData() {
  console.log("🔍 Searching for ALL data that might belong to Christian...\n")

  try {
    // 1. Find all users with similar names or emails
    console.log("👥 Searching for users matching 'christian' or 'levelpartner'...\n")
    const potentialUsers = await sql`
      SELECT id, email, first_name, last_name, stack_auth_id, supabase_user_id, created_at
      FROM users
      WHERE LOWER(first_name) LIKE '%christian%' 
         OR LOWER(last_name) LIKE '%christian%'
         OR LOWER(email) LIKE '%levelpartner%'
         OR LOWER(email) LIKE '%co@%'
      ORDER BY created_at DESC
    `

    console.log(`Found ${potentialUsers.length} potential user(s):\n`)
    potentialUsers.forEach((u) => {
      console.log(`  User ID: ${u.id}`)
      console.log(`  Email: ${u.email}`)
      console.log(`  Name: ${u.first_name} ${u.last_name}`)
      console.log(`  Created: ${new Date(u.created_at).toLocaleString()}`)
      console.log(`  Stack Auth ID: ${u.stack_auth_id || "Not set"}`)
      console.log(`  Supabase ID: ${u.supabase_user_id || "Not set"}`)
      console.log("")
    })

    // 2. Find ALL trained models and check which user they belong to
    console.log("\n🤖 Searching for ALL trained models...\n")
    const allModels = await sql`
      SELECT 
        m.id, 
        m.user_id, 
        m.model_name, 
        m.training_status, 
        m.replicate_model_id,
        m.created_at,
        u.email,
        u.first_name,
        u.last_name
      FROM user_models m
      LEFT JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at DESC
    `

    console.log(`Found ${allModels.length} total trained model(s):\n`)
    allModels.forEach((model) => {
      console.log(`  Model: ${model.model_name || "Unnamed"}`)
      console.log(`  Status: ${model.training_status}`)
      console.log(`  User ID: ${model.user_id}`)
      console.log(`  User Email: ${model.email || "NO USER LINKED"}`)
      console.log(`  User Name: ${model.first_name || ""} ${model.last_name || ""}`)
      console.log(`  Replicate ID: ${model.replicate_model_id || "N/A"}`)
      console.log(`  Created: ${new Date(model.created_at).toLocaleString()}`)
      console.log("")
    })

    // 3. Count images per user
    console.log("\n📸 Counting AI images per user...\n")
    const imageCounts = await sql`
      SELECT 
        i.user_id,
        u.email,
        u.first_name,
        u.last_name,
        COUNT(*) as image_count
      FROM ai_images i
      LEFT JOIN users u ON i.user_id = u.id
      GROUP BY i.user_id, u.email, u.first_name, u.last_name
      ORDER BY image_count DESC
    `

    imageCounts.forEach((row) => {
      console.log(`  User ID: ${row.user_id}`)
      console.log(`  Email: ${row.email || "NO USER LINKED"}`)
      console.log(`  Name: ${row.first_name || ""} ${row.last_name || ""}`)
      console.log(`  Images: ${row.image_count}`)
      console.log("")
    })

    // 4. Show sample images for each user with images
    console.log("\n📸 Sample images per user:\n")
    for (const row of imageCounts) {
      const sampleImages = await sql`
        SELECT id, prompt, created_at
        FROM ai_images
        WHERE user_id = ${row.user_id}
        ORDER BY created_at DESC
        LIMIT 2
      `

      console.log(`  User: ${row.email || row.user_id}`)
      sampleImages.forEach((img) => {
        const promptPreview = img.prompt ? img.prompt.substring(0, 60) : "No prompt"
        console.log(`    - ${promptPreview}...`)
        console.log(`      Created: ${new Date(img.created_at).toLocaleString()}`)
      })
      console.log("")
    }

    console.log("\n✅ Search complete!")
    console.log("\n💡 Next steps:")
    console.log("   1. Identify which user_id has Christian's data")
    console.log("   2. Run the relink script to move data to co@levelpartner.ai")
  } catch (error) {
    console.error("❌ Error:", error.message)
    console.error(error)
  }
}

findOrphanedData()

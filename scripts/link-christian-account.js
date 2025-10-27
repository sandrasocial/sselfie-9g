import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function linkChristianAccount() {
  console.log("🔍 Searching for Christian's data...\n")

  try {
    // Find user by email
    const users = await sql`
      SELECT id, email, first_name, last_name, stack_auth_id, supabase_user_id, created_at
      FROM users
      WHERE email = 'co@levelpartner.ai'
    `

    if (users.length === 0) {
      console.log("❌ No user found with email co@levelpartner.ai")
      console.log("\n📋 Checking if data exists without user account...\n")

      // Check for orphaned data
      const models = await sql`
        SELECT id, model_name, training_status, created_at
        FROM user_models
        WHERE user_id = 'co@levelpartner.ai' OR user_id LIKE '%christian%'
        ORDER BY created_at DESC
      `

      const images = await sql`
        SELECT id, prompt, created_at
        FROM ai_images
        WHERE user_id = 'co@levelpartner.ai' OR user_id LIKE '%christian%'
        ORDER BY created_at DESC
        LIMIT 5
      `

      console.log(`📸 Found ${images.length} AI images`)
      console.log(`🤖 Found ${models.length} trained models`)

      if (models.length > 0) {
        console.log("\n🤖 Trained Models:")
        models.forEach((model) => {
          console.log(`  - ${model.model_name || "Unnamed"} (${model.training_status})`)
          console.log(`    Created: ${new Date(model.created_at).toLocaleString()}`)
        })
      }

      if (images.length > 0) {
        console.log("\n📸 Recent AI Images:")
        images.forEach((img) => {
          console.log(`  - ${img.prompt?.substring(0, 50)}...`)
          console.log(`    Created: ${new Date(img.created_at).toLocaleString()}`)
        })
      }

      console.log("\n📋 Checking all users to find Christian...\n")

      const allUsers = await sql`
        SELECT id, email, first_name, last_name, created_at
        FROM users
        WHERE LOWER(first_name) LIKE '%christian%' 
           OR LOWER(email) LIKE '%levelpartner%'
        ORDER BY created_at DESC
      `

      if (allUsers.length > 0) {
        console.log(`Found ${allUsers.length} potential matches:`)
        allUsers.forEach((u) => {
          console.log(`  - ${u.email} (${u.first_name} ${u.last_name}) - ID: ${u.id}`)
        })
      } else {
        console.log("No users found matching 'christian' or 'levelpartner'")
      }

      return
    }

    const user = users[0]
    console.log("✅ Found user account:")
    console.log(`  Email: ${user.email}`)
    console.log(`  Name: ${user.first_name} ${user.last_name}`)
    console.log(`  User ID: ${user.id}`)
    console.log(`  Stack Auth ID: ${user.stack_auth_id || "Not set"}`)
    console.log(`  Supabase ID: ${user.supabase_user_id || "Not set"}`)

    const models = await sql`
      SELECT id, model_name, training_status, replicate_model_id, created_at
      FROM user_models
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `

    console.log(`\n🤖 Trained Models: ${models.length}`)
    models.forEach((model) => {
      console.log(`  - ${model.model_name || "Unnamed"} (${model.training_status})`)
      console.log(`    Replicate ID: ${model.replicate_model_id || "N/A"}`)
    })

    const imageCount = await sql`
      SELECT COUNT(*) as count
      FROM ai_images
      WHERE user_id = ${user.id}
    `

    console.log(`\n📸 AI Images: ${imageCount[0].count}`)

    const recentImages = await sql`
      SELECT id, prompt, created_at
      FROM ai_images
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 3
    `

    if (recentImages.length > 0) {
      console.log("\n📸 Recent Images:")
      recentImages.forEach((img) => {
        const promptPreview = img.prompt ? img.prompt.substring(0, 50) : "No prompt"
        console.log(`  - ${promptPreview}...`)
      })
    }

    console.log("\n✅ Data check complete!")
  } catch (error) {
    console.error("❌ Error:", error.message)
    console.error(error)
  }
}

linkChristianAccount()

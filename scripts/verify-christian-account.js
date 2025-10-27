import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function verifyChristianAccount() {
  try {
    console.log("🔍 Verifying Christian's account...\n")

    // Find Christian's Supabase account
    const users = await sql`
      SELECT id, email, first_name, last_name, supabase_user_id, created_at
      FROM users
      WHERE email = 'co@levelpartner.ai'
    `

    if (users.length === 0) {
      console.log("❌ Christian's account not found!")
      return
    }

    const christian = users[0]
    console.log("✅ Christian's Account Found:")
    console.log(`   Email: ${christian.email}`)
    console.log(`   Name: ${christian.first_name || ""} ${christian.last_name || ""}`)
    console.log(`   User ID: ${christian.id}`)
    console.log(`   Supabase ID: ${christian.supabase_user_id || "N/A"}`)
    console.log(`   Created: ${new Date(christian.created_at).toLocaleString()}\n`)

    // Check trained models
    const models = await sql`
      SELECT id, model_name, training_status, trigger_word, created_at
      FROM user_models
      WHERE user_id = ${christian.id}
      ORDER BY created_at DESC
    `

    console.log(`🤖 Trained Models: ${models.length}`)
    for (const model of models) {
      console.log(`   - ${model.model_name || "Unnamed"} (${model.training_status})`)
      console.log(`     Trigger: ${model.trigger_word || "N/A"}`)
      console.log(`     Created: ${new Date(model.created_at).toLocaleString()}`)
    }
    console.log("")

    // Check AI images count
    const imageCount = await sql`
      SELECT COUNT(*) as count
      FROM ai_images
      WHERE user_id = ${christian.id}
    `

    console.log(`📸 AI Images: ${imageCount[0].count}`)
    console.log("")

    // Check Maya chats count
    const chatCount = await sql`
      SELECT COUNT(*) as count
      FROM maya_chats
      WHERE user_id = ${christian.id}
    `

    console.log(`💬 Maya Chats: ${chatCount[0].count}`)
    console.log("")

    // Summary
    console.log("📊 Summary:")
    console.log(`   ✅ Account: ${christian.email}`)
    console.log(`   ✅ Trained Models: ${models.length}`)
    console.log(`   ✅ AI Images: ${imageCount[0].count}`)
    console.log(`   ✅ Maya Chats: ${chatCount[0].count}`)
    console.log("\n✅ Verification complete!")
  } catch (error) {
    console.error("❌ Error:", error.message)
    throw error
  }
}

verifyChristianAccount().catch(console.error)

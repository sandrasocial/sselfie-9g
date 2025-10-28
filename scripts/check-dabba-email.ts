import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

async function checkDabbaEmail() {
  console.log("🔍 Checking which email has Dabba's trained model...\n")

  // Check both potential emails
  const emails = ["dabbajona@icloud.com", "gloth.coaching@gmail.com"]

  for (const email of emails) {
    console.log(`\n📧 Checking: ${email}`)
    console.log("=".repeat(60))

    // Find user by email
    const users = await sql`
      SELECT id, email, stack_auth_id, supabase_user_id
      FROM users
      WHERE email = ${email}
    `

    if (users.length === 0) {
      console.log("❌ No user found with this email")
      continue
    }

    const user = users[0]
    console.log(`✅ User found:`)
    console.log(`   User ID: ${user.id}`)
    console.log(`   Stack Auth ID: ${user.stack_auth_id}`)
    console.log(`   Supabase User ID: ${user.supabase_user_id}`)

    // Check if user has a trained model
    const models = await sql`
      SELECT id, trigger_word, lora_weights_url, training_status, lora_scale
      FROM user_models
      WHERE user_id = ${user.supabase_user_id || user.id}
    `

    if (models.length === 0) {
      console.log("   ❌ No trained model found")
    } else {
      console.log(`   ✅ Trained model found!`)
      for (const model of models) {
        console.log(`      Model ID: ${model.id}`)
        console.log(`      Trigger Word: ${model.trigger_word}`)
        console.log(`      Training Status: ${model.training_status}`)
        console.log(`      LoRA Scale: ${model.lora_scale}`)
        console.log(`      LoRA URL: ${model.lora_weights_url || "NULL"}`)
      }
    }
  }

  console.log("\n" + "=".repeat(60))
  console.log("✅ Check complete!")
}

checkDabbaEmail().catch(console.error)

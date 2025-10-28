import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function addUserLoraScale() {
  try {
    console.log("Adding lora_scale column to user_models table...")

    // Add lora_scale column (if it doesn't exist)
    await sql`
      ALTER TABLE user_models 
      ADD COLUMN IF NOT EXISTS lora_scale NUMERIC(3,2) DEFAULT NULL
    `

    console.log("✅ Column added successfully")

    // Update Shannon's lora_scale to 0.9
    console.log("\nUpdating Shannon's LoRA scale to 0.9...")

    const shannonResult = await sql`
      UPDATE user_models
      SET lora_scale = 0.9
      WHERE user_id IN (
        SELECT id FROM users 
        WHERE email = 'shannon@soulresets.com'
      )
      RETURNING user_id, trigger_word, lora_scale
    `

    if (shannonResult.length > 0) {
      console.log("✅ Shannon's LoRA scale updated:")
      console.log(`   User ID: ${shannonResult[0].user_id}`)
      console.log(`   Trigger: ${shannonResult[0].trigger_word}`)
      console.log(`   LoRA Scale: ${shannonResult[0].lora_scale}`)
    } else {
      console.log("❌ Shannon's user_models entry not found")
    }

    console.log("\nUpdating ssa@ssasocial.com's LoRA scale to 1.0...")

    const ssaResult = await sql`
      UPDATE user_models
      SET lora_scale = 1.0
      WHERE user_id IN (
        SELECT id FROM users 
        WHERE email = 'ssa@ssasocial.com'
      )
      RETURNING user_id, trigger_word, lora_scale
    `

    if (ssaResult.length > 0) {
      console.log("✅ ssa@ssasocial.com's LoRA scale updated:")
      console.log(`   User ID: ${ssaResult[0].user_id}`)
      console.log(`   Trigger: ${ssaResult[0].trigger_word}`)
      console.log(`   LoRA Scale: ${ssaResult[0].lora_scale}`)
    } else {
      console.log("❌ ssa@ssasocial.com's user_models entry not found")
    }

    // Verify all users
    console.log("\n📊 All users with LoRA scales:")
    const allUsers = await sql`
      SELECT u.email, um.trigger_word, um.lora_scale
      FROM user_models um
      JOIN users u ON um.user_id = u.id
      WHERE um.training_status = 'completed'
      ORDER BY u.email
    `

    allUsers.forEach((user) => {
      const scale = user.lora_scale || "default (0.95)"
      console.log(`   ${user.email}: ${scale}`)
    })

    console.log("\n✅ Setup complete!")
  } catch (error) {
    console.error("❌ Error:", error)
    throw error
  }
}

addUserLoraScale()

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

async function updateBjarkiLora() {
  const email = "bjarkijonna@gmail.com"
  const newLoraScale = 1.0

  try {
    console.log(`[v0] Looking up user: ${email}`)

    // Find user by email
    const users = await sql`
      SELECT id, email, display_name, first_name, last_name
      FROM users
      WHERE LOWER(email) = LOWER(${email})
    `

    if (users.length === 0) {
      console.log(`[v0] ❌ No user found with email: ${email}`)
      return
    }

    const user = users[0]
    console.log(`[v0] ✅ Found user:`, {
      id: user.id,
      email: user.email,
      name: user.display_name || `${user.first_name} ${user.last_name}`,
    })

    // Find user's models
    const models = await sql`
      SELECT id, model_name, lora_scale, lora_weights_url, training_status
      FROM user_models
      WHERE user_id = ${user.id}
      AND training_status = 'completed'
    `

    if (models.length === 0) {
      console.log(`[v0] ❌ No completed models found for user ${user.email}`)
      return
    }

    console.log(`[v0] Found ${models.length} model(s) for user`)

    // Update lora_scale for all user's models
    for (const model of models) {
      console.log(`[v0] Updating model ${model.model_name}:`)
      console.log(`  Current LoRA scale: ${model.lora_scale}`)
      console.log(`  New LoRA scale: ${newLoraScale}`)

      await sql`
        UPDATE user_models
        SET lora_scale = ${newLoraScale},
            updated_at = NOW()
        WHERE id = ${model.id}
      `

      console.log(`[v0] ✅ Updated model ${model.model_name} to LoRA scale ${newLoraScale}`)
    }

    console.log(`[v0] ✅ Successfully updated LoRA scale for ${user.email}`)
  } catch (error) {
    console.error("[v0] ❌ Error updating LoRA scale:", error)
  }
}

updateBjarkiLora()

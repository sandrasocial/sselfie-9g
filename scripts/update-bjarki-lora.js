import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

async function updateBjarkiLora() {
  try {
    const email = "bjarkijonna@gmail.com"
    const newLoraScale = 0.9

    console.log(`[v0] Looking up user: ${email}`)

    // Find user by email
    const users = await sql`
      SELECT id, email, display_name
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
      display_name: user.display_name,
    })

    // Find user's models
    const models = await sql`
      SELECT id, model_name, lora_scale, lora_url
      FROM user_models
      WHERE user_id = ${user.id}
    `

    if (models.length === 0) {
      console.log(`[v0] ❌ No models found for user ${user.email}`)
      return
    }

    console.log(`[v0] Found ${models.length} model(s) for user`)

    // Update each model's lora_scale
    for (const model of models) {
      console.log(`[v0] Updating model: ${model.model_name}`)
      console.log(`[v0]   Current lora_scale: ${model.lora_scale}`)
      console.log(`[v0]   New lora_scale: ${newLoraScale}`)

      await sql`
        UPDATE user_models
        SET lora_scale = ${newLoraScale}
        WHERE id = ${model.id}
      `

      console.log(`[v0] ✅ Updated model ${model.model_name} to lora_scale ${newLoraScale}`)
    }

    // Verify the update
    const updatedModels = await sql`
      SELECT id, model_name, lora_scale
      FROM user_models
      WHERE user_id = ${user.id}
    `

    console.log(`[v0] ✅ Verification - Updated models:`)
    for (const model of updatedModels) {
      console.log(`[v0]   ${model.model_name}: lora_scale = ${model.lora_scale}`)
    }

    console.log(`[v0] ✅ Successfully updated LoRA scale for ${user.email} to ${newLoraScale}`)
  } catch (error) {
    console.error("[v0] ❌ Error updating LoRA scale:", error)
  }
}

updateBjarkiLora()

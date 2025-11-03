import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

async function lowerBjarkiLora() {
  try {
    console.log("[v0] Lowering Bjarki's LoRA scale to 0.9...")

    // Find user by email
    const users = await sql`
      SELECT id, email, display_name
      FROM users
      WHERE LOWER(email) = LOWER('bjarkijonna@gmail.com')
    `

    if (users.length === 0) {
      console.log("[v0] ❌ No user found with email bjarkijonna@gmail.com")
      return
    }

    const user = users[0]
    console.log(`[v0] Found user: ${user.display_name || user.email} (${user.id})`)

    // Find user's models
    const models = await sql`
      SELECT id, model_name, lora_scale
      FROM user_models
      WHERE user_id = ${user.id}
    `

    if (models.length === 0) {
      console.log("[v0] ❌ No trained models found for this user")
      return
    }

    console.log(`[v0] Found ${models.length} model(s)`)

    // Update each model's lora_scale to 0.9
    for (const model of models) {
      console.log(`[v0] Updating model "${model.model_name}" from lora_scale ${model.lora_scale} to 0.9`)

      await sql`
        UPDATE user_models
        SET lora_scale = 0.9
        WHERE id = ${model.id}
      `
    }

    // Verify the update
    const updatedModels = await sql`
      SELECT id, model_name, lora_scale
      FROM user_models
      WHERE user_id = ${user.id}
    `

    console.log("[v0] ✅ Successfully updated LoRA scales:")
    for (const model of updatedModels) {
      console.log(`   - ${model.model_name}: ${model.lora_scale}`)
    }
  } catch (error) {
    console.error("[v0] ❌ Error lowering LoRA scale:", error)
  }
}

lowerBjarkiLora()

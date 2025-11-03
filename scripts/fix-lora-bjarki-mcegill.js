import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

async function fixLoraScales() {
  const emails = ["mcegill@hotmail.com", "bjarkijonna@gmail.com"] // Added Bjarki's email to update both users' LoRA scales
  const newLoraScale = 1.0

  try {
    console.log(`[v0] Fixing LoRA scales for users...`)

    for (const email of emails) {
      console.log(`\n[v0] Processing user: ${email}`)

      // Find user by email
      const users = await sql`
        SELECT id, email, display_name
        FROM users
        WHERE LOWER(email) = LOWER(${email})
      `

      if (users.length === 0) {
        console.log(`[v0] ❌ No user found with email: ${email}`)
        continue
      }

      const user = users[0]
      console.log(`[v0] ✅ Found user:`, {
        id: user.id,
        email: user.email,
        name: user.display_name,
      })

      // Find user's models
      const models = await sql`
        SELECT id, model_name, lora_scale
        FROM user_models
        WHERE user_id = ${user.id}
      `

      if (models.length === 0) {
        console.log(`[v0] ⚠️ No models found for user`)
        continue
      }

      console.log(`[v0] Found ${models.length} model(s)`)

      // Update each model's lora_scale
      for (const model of models) {
        console.log(`[v0] Updating model: ${model.model_name}`)
        console.log(`[v0]   Current lora_scale: ${model.lora_scale}`)

        await sql`
          UPDATE user_models
          SET lora_scale = ${newLoraScale}
          WHERE id = ${model.id}
        `

        console.log(`[v0]   ✅ Updated lora_scale to: ${newLoraScale}`)
      }
    }

    console.log(`\n[v0] ✅ All LoRA scales updated successfully!`)
  } catch (error) {
    console.error("[v0] ❌ Error fixing LoRA scales:", error)
  }
}

fixLoraScales()

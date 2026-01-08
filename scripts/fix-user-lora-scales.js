import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

async function fixUserLoraScales() {
  console.log("🔧 Fixing LoRA scales for Bjarki and Mcegill...\n")

  try {
    // Find users by email
    const users = await sql`
      SELECT u.id, u.email, u.display_name,
             um.id as model_id, um.lora_scale, um.trigger_word
      FROM users u
      LEFT JOIN user_models um ON um.user_id = u.id
      WHERE LOWER(u.email) IN ('bjarki@example.com', 'mcegill@hotmail.com')
         OR LOWER(u.display_name) LIKE '%bjarki%'
         OR LOWER(u.email) LIKE '%bjarki%'
         OR u.email = 'mcegill@hotmail.com'
      ORDER BY u.email
    `

    if (users.length === 0) {
      console.log("❌ No users found matching 'bjarki' or 'mcegill@hotmail.com'")
      console.log("\nSearching for all users with models...")

      const allUsers = await sql`
        SELECT u.id, u.email, u.display_name,
               um.lora_scale, um.trigger_word
        FROM users u
        INNER JOIN user_models um ON um.user_id = u.id
        WHERE um.lora_scale IS NOT NULL
        ORDER BY u.email
        LIMIT 20
      `

      console.log(`\nFound ${allUsers.length} users with LoRA models:`)
      allUsers.forEach((user) => {
        console.log(
          `  - ${user.email} (${user.display_name || "N/A"}) - LoRA: ${user.lora_scale}`,
        )
      })

      return
    }

    console.log(`✅ Found ${users.length} user(s):\n`)

    for (const user of users) {
      console.log(`📧 Email: ${user.email}`)
      console.log(`   Name: ${user.display_name || "N/A"}`)
      console.log(`   User ID: ${user.id}`)

      if (!user.model_id) {
        console.log(`   ⚠️  No model found for this user\n`)
        continue
      }

      console.log(`   Model ID: ${user.model_id}`)
      console.log(`   Trigger Word: ${user.trigger_word || "N/A"}`)
      console.log(`   Current LoRA Scale: ${user.lora_scale}`)

      if (user.lora_scale === 1.0) {
        console.log(`   ✅ LoRA scale is already 1.0, skipping\n`)
        continue
      }

      // Update the lora_scale to 1.0
      const result = await sql`
        UPDATE user_models
        SET lora_scale = 1.0,
            updated_at = NOW()
        WHERE id = ${user.model_id}
        RETURNING lora_scale
      `

      if (result.length > 0) {
        console.log(`   ✅ Updated LoRA scale to ${result[0].lora_scale}\n`)

        // Log the transaction
        await sql`
          INSERT INTO credit_transactions (
            user_id,
            amount,
            transaction_type,
            description,
            balance_after,
            created_at
          )
          SELECT 
            ${user.id},
            0,
            'bonus',
            'LoRA scale adjusted from ' || ${user.lora_scale} || ' to 1.0 for better image quality',
            COALESCE((SELECT balance FROM user_credits WHERE user_id = ${user.id}), 0),
            NOW()
        `
      } else {
        console.log(`   ❌ Failed to update LoRA scale\n`)
      }
    }

    console.log("\n✅ LoRA scale fix complete!")
  } catch (error) {
    console.error("❌ Error fixing LoRA scales:", error)
    throw error
  }
}

fixUserLoraScales()

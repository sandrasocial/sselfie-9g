import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function linkShannonAccounts() {
  try {
    console.log("🔍 Finding Shannon's accounts...\n")

    // Find both Shannon accounts
    const appleRelayUser = await sql`
      SELECT id, email, stack_auth_id, supabase_user_id
      FROM users
      WHERE email = 'y4qgnbv9jg@privaterelay.appleid.com'
    `

    const realEmailUser = await sql`
      SELECT id, email, stack_auth_id, supabase_user_id
      FROM users
      WHERE email = 'shannon@soulresets.com'
    `

    if (appleRelayUser.length === 0) {
      console.log("❌ Apple relay account not found")
      return
    }

    if (realEmailUser.length === 0) {
      console.log("❌ Real email account not found")
      return
    }

    console.log("✅ Found both accounts:")
    console.log(`   Apple Relay: ${appleRelayUser[0].email} (ID: ${appleRelayUser[0].id})`)
    console.log(`   Real Email: ${realEmailUser[0].email} (ID: ${realEmailUser[0].id})\n`)

    // Get the LoRA weights from the Apple relay account
    const appleRelayLora = await sql`
      SELECT *
      FROM user_models
      WHERE user_id = ${appleRelayUser[0].id}
    `

    if (appleRelayLora.length === 0) {
      console.log("❌ No LoRA weights found for Apple relay account")
      return
    }

    console.log("✅ Found LoRA weights for Apple relay account")
    console.log(`   Trigger Word: ${appleRelayLora[0].trigger_word}`)
    console.log(`   LoRA URL: ${appleRelayLora[0].lora_weights_url}\n`)

    // Check if real email account already has LoRA weights
    const realEmailLora = await sql`
      SELECT *
      FROM user_models
      WHERE user_id = ${realEmailUser[0].id}
    `

    if (realEmailLora.length > 0) {
      console.log("ℹ️  Real email account already has LoRA weights")
      console.log(`   Trigger Word: ${realEmailLora[0].trigger_word}`)
      console.log(`   LoRA URL: ${realEmailLora[0].lora_weights_url}\n`)
      console.log("✅ Both accounts already have LoRA weights linked!")
      return
    }

    // Update the user_models entry to point to the real email account
    console.log("📋 Transferring LoRA weights to real email account...\n")

    await sql`
      UPDATE user_models
      SET user_id = ${realEmailUser[0].id},
          updated_at = NOW()
      WHERE user_id = ${appleRelayUser[0].id}
    `

    console.log("✅ Successfully transferred LoRA weights to shannon@soulresets.com!\n")

    // Verify the transfer
    const verification = await sql`
      SELECT u.email, um.trigger_word, um.lora_weights_url
      FROM users u
      JOIN user_models um ON u.id = um.user_id
      WHERE u.email = 'shannon@soulresets.com'
    `

    if (verification.length > 0) {
      console.log("📊 Verification - Shannon's account:")
      console.log(`   ✅ ${verification[0].email}`)
      console.log(`      Trigger: ${verification[0].trigger_word}`)
      console.log(`      LoRA: ${verification[0].lora_weights_url}\n`)
      console.log("✅ Transfer complete! Shannon should now use shannon@soulresets.com to access her trained model.")
    }
  } catch (error) {
    console.error("❌ Error:", error)
  }
}

linkShannonAccounts()

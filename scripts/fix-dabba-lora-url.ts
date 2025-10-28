import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function fixDabbaLoraUrl() {
  try {
    console.log("🔍 Finding Dabba's LoRA weights...")

    // Find the lora_weights entry for user 45292112
    const loraWeights = await sql`
      SELECT 
        id,
        user_id,
        s3_bucket,
        s3_key,
        trigger_word,
        status
      FROM lora_weights
      WHERE user_id = '45292112'
      AND status = 'available'
      LIMIT 1
    `

    if (loraWeights.length === 0) {
      console.log("❌ No LoRA weights found for user 45292112")
      return
    }

    const lora = loraWeights[0]
    console.log("✅ Found LoRA weights:")
    console.log(`   ID: ${lora.id}`)
    console.log(`   S3 Bucket: ${lora.s3_bucket}`)
    console.log(`   S3 Key: ${lora.s3_key}`)
    console.log(`   Trigger: ${lora.trigger_word}`)

    // Construct the full URL
    const loraUrl = `https://${lora.s3_bucket}.s3.amazonaws.com/${lora.s3_key}`
    console.log(`   Constructed URL: ${loraUrl}`)

    // Update the user_models table
    console.log("\n📝 Updating user_models table...")
    await sql`
      UPDATE user_models
      SET lora_weights_url = ${loraUrl}
      WHERE trigger_word = ${lora.trigger_word}
    `

    console.log("✅ Successfully updated LoRA URL!")

    // Verify the update
    console.log("\n📊 Verification:")
    const verification = await sql`
      SELECT 
        u.email,
        um.trigger_word,
        um.lora_weights_url,
        um.training_status
      FROM user_models um
      JOIN users u ON u.id = um.user_id
      WHERE um.trigger_word = ${lora.trigger_word}
    `

    if (verification.length > 0) {
      const v = verification[0]
      console.log(`   ✅ ${v.email}`)
      console.log(`      Trigger: ${v.trigger_word}`)
      console.log(`      LoRA URL: ${v.lora_weights_url}`)
      console.log(`      Status: ${v.training_status}`)
    }

    console.log("\n✅ Fix complete!")
  } catch (error) {
    console.error("❌ Error:", error)
    throw error
  }
}

fixDabbaLoraUrl()

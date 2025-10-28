import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function fixShannonLoraUrl() {
  try {
    console.log("🔍 Finding Shannon's LoRA weights in lora_weights table...")

    // Find the LoRA weights entry with Shannon's trigger word
    const loraWeights = await sql`
      SELECT 
        id,
        user_id,
        s3_bucket,
        s3_key,
        trigger_word,
        status
      FROM lora_weights
      WHERE trigger_word = 'usershannon-1753945376880'
      LIMIT 1
    `

    if (loraWeights.length === 0) {
      console.log("❌ No LoRA weights found with trigger word: usershannon-1753945376880")
      return
    }

    const lora = loraWeights[0]
    console.log("✅ Found LoRA weights:")
    console.log(`   ID: ${lora.id}`)
    console.log(`   S3 Bucket: ${lora.s3_bucket}`)
    console.log(`   S3 Key: ${lora.s3_key}`)
    console.log(`   Status: ${lora.status}`)

    // Construct the full S3 URL
    const loraUrl = `https://${lora.s3_bucket}.s3.amazonaws.com/${lora.s3_key}`
    console.log(`   Constructed URL: ${loraUrl}`)

    // Update the user_models table with the LoRA URL
    console.log("\n📝 Updating user_models table...")
    await sql`
      UPDATE user_models
      SET lora_weights_url = ${loraUrl}
      WHERE trigger_word = 'usershannon-1753945376880'
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
      WHERE um.trigger_word = 'usershannon-1753945376880'
    `

    if (verification.length > 0) {
      const v = verification[0]
      console.log(`   ✅ ${v.email}`)
      console.log(`      Trigger: ${v.trigger_word}`)
      console.log(`      LoRA URL: ${v.lora_weights_url}`)
      console.log(`      Status: ${v.training_status}`)
    }

    console.log("\n✅ Fix complete! Shannon can now use her trained model.")
  } catch (error) {
    console.error("❌ Error:", error)
    throw error
  }
}

fixShannonLoraUrl()

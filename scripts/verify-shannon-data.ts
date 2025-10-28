import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function verifyShannon() {
  try {
    console.log("🔍 Checking Shannon's data...\n")

    // Check lora_weights table
    const loraWeights = await sql`
      SELECT id, user_id, trigger_word, s3_bucket, s3_key, status
      FROM lora_weights
      WHERE user_id = '44991795' OR trigger_word LIKE '%shannon%'
    `

    console.log("📦 LoRA Weights table:")
    for (const lora of loraWeights) {
      const url =
        lora.s3_bucket && lora.s3_key ? `https://${lora.s3_bucket}.s3.amazonaws.com/${lora.s3_key}` : "No S3 data"
      console.log(`   ID: ${lora.id}`)
      console.log(`   User ID: ${lora.user_id}`)
      console.log(`   Trigger: ${lora.trigger_word}`)
      console.log(`   Status: ${lora.status}`)
      console.log(`   S3 URL: ${url}\n`)
    }

    // Check user_models table
    const userModels = await sql`
      SELECT um.*, u.email
      FROM user_models um
      JOIN users u ON um.user_id = u.id
      WHERE u.email = 'shannon@soulresets.com' 
         OR um.trigger_word LIKE '%shannon%'
    `

    console.log("👤 User Models table:")
    for (const model of userModels) {
      console.log(`   Email: ${model.email}`)
      console.log(`   User ID: ${model.user_id}`)
      console.log(`   Trigger: ${model.trigger_word}`)
      console.log(`   LoRA URL: ${model.lora_weights_url || "NULL"}`)
      console.log(`   Training Status: ${model.training_status}\n`)
    }

    console.log("✅ Verification complete!")
  } catch (error) {
    console.error("❌ Error:", error)
    throw error
  }
}

verifyShannon().catch(console.error)

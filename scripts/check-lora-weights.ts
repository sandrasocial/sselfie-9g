import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function checkLoraWeights() {
  console.log("🔍 Checking LoRA weights table...\n")

  // Get all LoRA weights
  const loraWeights = await sql`
    SELECT 
      lw.id,
      lw.user_id,
      lw.status,
      lw.s3_bucket,
      lw.s3_key,
      lw.trigger_word,
      lw.training_run_id,
      lw.created_at,
      u.email,
      u.stack_auth_id,
      u.supabase_user_id
    FROM lora_weights lw
    LEFT JOIN users u ON lw.user_id = u.id
    ORDER BY lw.created_at DESC
  `

  console.log(`📊 Found ${loraWeights.length} LoRA weights in database\n`)

  if (loraWeights.length > 0) {
    console.log("LoRA Weights Details:")
    console.log("=".repeat(80))
    loraWeights.forEach((lw) => {
      console.log(`\nID: ${lw.id}`)
      console.log(`User ID: ${lw.user_id}`)
      console.log(`Email: ${lw.email || "NOT FOUND"}`)
      console.log(`Stack Auth ID: ${lw.stack_auth_id || "N/A"}`)
      console.log(`Supabase ID: ${lw.supabase_user_id || "N/A"}`)
      console.log(`Status: ${lw.status}`)
      console.log(`S3 Location: ${lw.s3_bucket}/${lw.s3_key}`)
      console.log(`Trigger Word: ${lw.trigger_word}`)
      console.log(`Training Run ID: ${lw.training_run_id}`)
      console.log(`Created: ${lw.created_at}`)
    })
  }

  // Check user_models table
  console.log("\n\n🔍 Checking user_models table...\n")

  const userModels = await sql`
    SELECT 
      um.id,
      um.user_id,
      um.lora_weights_url,
      um.training_status,
      um.trigger_word,
      u.email,
      u.stack_auth_id,
      u.supabase_user_id
    FROM user_models um
    LEFT JOIN users u ON um.user_id = u.id
    WHERE um.lora_weights_url IS NOT NULL
    ORDER BY um.created_at DESC
  `

  console.log(`📊 Found ${userModels.length} user models with LoRA weights\n`)

  if (userModels.length > 0) {
    console.log("User Models with LoRA Weights:")
    console.log("=".repeat(80))
    userModels.forEach((um) => {
      console.log(`\nModel ID: ${um.id}`)
      console.log(`User ID: ${um.user_id}`)
      console.log(`Email: ${um.email || "NOT FOUND"}`)
      console.log(`LoRA URL: ${um.lora_weights_url}`)
      console.log(`Status: ${um.training_status}`)
      console.log(`Trigger Word: ${um.trigger_word}`)
    })
  }

  console.log("\n\n✅ Audit complete!")
}

checkLoraWeights().catch(console.error)

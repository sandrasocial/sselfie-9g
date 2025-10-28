import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function diagnoseLora() {
  console.log("🔍 Checking all LoRA weights in database...\n")

  // Get all LoRA weights with any status
  const allLora = await sql`
    SELECT 
      id,
      user_id,
      training_run_id,
      s3_bucket,
      s3_key,
      status,
      base_model,
      trigger_word,
      created_at
    FROM lora_weights
    ORDER BY created_at DESC
  `

  console.log(`📊 Total LoRA weights found: ${allLora.length}\n`)

  if (allLora.length > 0) {
    console.log("LoRA Weights by Status:")
    console.log("================================================================================\n")

    // Group by status
    const byStatus = {}
    allLora.forEach((lora) => {
      const status = lora.status || "unknown"
      if (!byStatus[status]) byStatus[status] = []
      byStatus[status].push(lora)
    })

    // Display each status group
    for (const [status, loras] of Object.entries(byStatus)) {
      console.log(`\n📌 Status: ${status} (${loras.length} weights)`)
      console.log("─".repeat(80))

      loras.forEach((lora) => {
        console.log(`\nID: ${lora.id}`)
        console.log(`User ID (Stack Auth): ${lora.user_id}`)
        console.log(`Trigger Word: ${lora.trigger_word || "N/A"}`)
        console.log(`S3 Location: ${lora.s3_bucket}/${lora.s3_key}`)
        console.log(`Created: ${lora.created_at}`)
      })
    }
  }

  // Check user_models table
  console.log("\n\n📋 Current user_models entries:")
  console.log("================================================================================\n")

  const userModels = await sql`
    SELECT 
      um.id,
      um.user_id,
      um.lora_weights_url,
      um.trigger_word,
      u.email,
      u.stack_auth_id
    FROM user_models um
    LEFT JOIN users u ON um.user_id = u.id
    WHERE um.lora_weights_url IS NOT NULL
  `

  console.log(`Found ${userModels.length} users with LoRA weights linked:\n`)

  userModels.forEach((model) => {
    console.log(`✅ ${model.email}`)
    console.log(`   User ID: ${model.user_id}`)
    console.log(`   Stack Auth ID: ${model.stack_auth_id}`)
    console.log(`   Trigger Word: ${model.trigger_word}`)
    console.log(`   LoRA URL: ${model.lora_weights_url}`)
    console.log()
  })

  console.log("\n✅ Diagnosis complete!")
}

diagnoseLora().catch(console.error)

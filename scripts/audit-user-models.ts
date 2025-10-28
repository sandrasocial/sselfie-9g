import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function auditUserModels() {
  console.log("=== USER MODEL AUDIT ===\n")

  // Get all users with their model information
  const usersWithModels = await sql`
    SELECT 
      u.id,
      u.email,
      u.first_name,
      u.last_name,
      u.stack_auth_id,
      u.supabase_user_id,
      u.created_at as user_created_at,
      um.id as model_id,
      um.lora_weights_url,
      um.training_status,
      um.model_type,
      um.trigger_word,
      um.created_at as model_created_at,
      um.completed_at as model_completed_at
    FROM users u
    LEFT JOIN user_models um ON u.id = um.user_id
    ORDER BY u.created_at DESC
  `

  console.log(`Total users in database: ${usersWithModels.length}\n`)

  // Users with trained models (has lora_weights_url)
  const usersWithTrainedModels = usersWithModels.filter((u) => u.lora_weights_url !== null)

  console.log(`✅ Users with trained models linked: ${usersWithTrainedModels.length}\n`)

  if (usersWithTrainedModels.length > 0) {
    console.log("Users with trained models:")
    console.log("─".repeat(80))
    usersWithTrainedModels.forEach((user) => {
      console.log(`Email: ${user.email}`)
      console.log(`Name: ${user.first_name} ${user.last_name}`)
      console.log(`User ID: ${user.id}`)
      console.log(`Supabase ID: ${user.supabase_user_id || "N/A"}`)
      console.log(`Stack Auth ID: ${user.stack_auth_id || "N/A"}`)
      console.log(`Model Status: ${user.training_status}`)
      console.log(`LoRA Weights: ${user.lora_weights_url?.substring(0, 50)}...`)
      console.log(`Model Created: ${user.model_created_at}`)
      console.log("─".repeat(80))
    })
  }

  // Users without trained models
  const usersWithoutModels = usersWithModels.filter((u) => u.lora_weights_url === null)

  console.log(`\n❌ Users without trained models: ${usersWithoutModels.length}\n`)

  if (usersWithoutModels.length > 0) {
    console.log("Users without trained models:")
    console.log("─".repeat(80))
    usersWithoutModels.forEach((user) => {
      console.log(`Email: ${user.email}`)
      console.log(`Name: ${user.first_name} ${user.last_name}`)
      console.log(`User ID: ${user.id}`)
      console.log(`Supabase ID: ${user.supabase_user_id || "N/A"}`)
      console.log(`Stack Auth ID: ${user.stack_auth_id || "N/A"}`)
      console.log(`Model Status: ${user.training_status || "No model record"}`)
      console.log("─".repeat(80))
    })
  }

  // Check for orphaned models (models without users)
  const orphanedModels = await sql`
    SELECT 
      um.id,
      um.user_id,
      um.lora_weights_url,
      um.training_status,
      um.created_at
    FROM user_models um
    LEFT JOIN users u ON um.user_id = u.id
    WHERE u.id IS NULL
  `

  if (orphanedModels.length > 0) {
    console.log(`\n⚠️  Orphaned models (no matching user): ${orphanedModels.length}\n`)
    console.log("Orphaned models:")
    console.log("─".repeat(80))
    orphanedModels.forEach((model) => {
      console.log(`Model ID: ${model.id}`)
      console.log(`User ID (missing): ${model.user_id}`)
      console.log(`LoRA Weights: ${model.lora_weights_url?.substring(0, 50)}...`)
      console.log(`Status: ${model.training_status}`)
      console.log("─".repeat(80))
    })
  }

  // Summary
  console.log("\n=== SUMMARY ===")
  console.log(`Total users: ${usersWithModels.length}`)
  console.log(`Users with trained models: ${usersWithTrainedModels.length}`)
  console.log(`Users without trained models: ${usersWithoutModels.length}`)
  console.log(`Orphaned models: ${orphanedModels.length}`)

  // Check for users with Stack Auth ID but no Supabase ID
  const needsMigration = usersWithModels.filter((u) => u.stack_auth_id && !u.supabase_user_id)

  if (needsMigration.length > 0) {
    console.log(`\n⚠️  Users needing migration (have Stack Auth ID but no Supabase ID): ${needsMigration.length}`)
    needsMigration.forEach((user) => {
      console.log(`  - ${user.email} (Stack ID: ${user.stack_auth_id})`)
    })
  }
}

auditUserModels()
  .then(() => {
    console.log("\n✅ Audit complete!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Audit failed:", error)
    process.exit(1)
  })

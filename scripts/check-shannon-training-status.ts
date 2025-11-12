import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function checkShannonTrainingStatus() {
  try {
    console.log("🔍 Checking Shannon's Training Status...\n")

    // Find Shannon's account
    const users = await sql`
      SELECT id, email, supabase_user_id, stack_auth_id, created_at
      FROM users
      WHERE email = 'shannon@soulresets.com'
    `

    if (users.length === 0) {
      console.log("❌ Shannon's account not found\n")
      return
    }

    const shannon = users[0]
    console.log("✅ Found Shannon's account:")
    console.log(`   Email: ${shannon.email}`)
    console.log(`   User ID: ${shannon.id}`)
    console.log(`   Created: ${new Date(shannon.created_at).toLocaleString()}\n`)

    // Check training models
    console.log("📦 Training Models:")
    const models = await sql`
      SELECT *
      FROM user_models
      WHERE user_id = ${shannon.id}
      ORDER BY created_at DESC
    `

    if (models.length === 0) {
      console.log("   ⚠️  No models found\n")
    } else {
      models.forEach((model, i) => {
        console.log(`\n   Model ${i + 1}:`)
        console.log(`      ID: ${model.id}`)
        console.log(`      Name: ${model.model_name}`)
        console.log(`      Status: ${model.training_status}`)
        console.log(`      Progress: ${model.training_progress}%`)
        console.log(`      Training ID: ${model.training_id || "NOT SET"}`)
        console.log(`      Trigger: ${model.trigger_word || "NOT SET"}`)

        if (model.lora_weights_url) {
          console.log(`      LoRA URL: ${model.lora_weights_url.substring(0, 60)}...`)
        }

        if (model.started_at) {
          const elapsed = Math.round((Date.now() - new Date(model.started_at).getTime()) / 1000 / 60)
          console.log(`      Started: ${new Date(model.started_at).toLocaleString()}`)
          console.log(`      Elapsed: ${elapsed} minutes`)
        }

        if (model.failure_reason) {
          console.log(`      ❌ Error: ${model.failure_reason}`)
        }
      })
    }

    // Check training images
    console.log("\n\n📸 Training Images:")
    const images = await sql`
      SELECT id, filename, processing_status, created_at
      FROM selfie_uploads
      WHERE user_id = ${shannon.id}
      ORDER BY created_at DESC
    `

    console.log(`   Total: ${images.length} images`)
    if (images.length > 0) {
      images.forEach((img, i) => {
        console.log(`   ${i + 1}. ${img.filename} - ${img.processing_status}`)
      })
    }

    // Summary
    console.log("\n\n📊 Summary:")
    const trainingModels = models.filter((m) => m.training_status === "training")
    const completedModels = models.filter((m) => m.training_status === "completed")
    const failedModels = models.filter((m) => m.training_status === "failed")

    console.log(`   Training: ${trainingModels.length}`)
    console.log(`   Completed: ${completedModels.length}`)
    console.log(`   Failed: ${failedModels.length}`)

    if (trainingModels.length > 0) {
      console.log("\n⚠️  STUCK TRAINING DETECTED:")
      trainingModels.forEach((model) => {
        if (model.started_at) {
          const elapsed = Math.round((Date.now() - new Date(model.started_at).getTime()) / 1000 / 60)
          console.log(`   Model ${model.id}: ${elapsed} minutes at ${model.training_progress}%`)

          if (elapsed > 60 && model.training_progress < 50) {
            console.log(`   🔴 LIKELY STUCK - Running over 60 minutes with low progress`)
          }
        }
      })
    }

    console.log("\n✅ Check complete!\n")
  } catch (error) {
    console.error("❌ Error:", error)
    throw error
  }
}

checkShannonTrainingStatus().catch(console.error)

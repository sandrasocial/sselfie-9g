import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function resetShannonTraining() {
  const email = "shannon@soulresets.com"

  console.log("\n🔄 Resetting Shannon's training...\n")

  try {
    // Find Shannon
    const users = await sql`
      SELECT id, email, display_name
      FROM users
      WHERE email = ${email}
    `

    if (users.length === 0) {
      console.error("❌ Shannon not found!")
      return
    }

    const shannon = users[0]
    console.log(`✅ Found Shannon: ID ${shannon.id}`)

    // Get stuck training
    const models = await sql`
      SELECT *
      FROM user_models
      WHERE user_id = ${shannon.id}
      AND training_status = 'training'
    `

    if (models.length === 0) {
      console.log("✅ No stuck training found - nothing to reset")
      return
    }

    const model = models[0]
    console.log(`\n📋 Stuck Training Details:`)
    console.log(`   Model ID: ${model.id}`)
    console.log(`   Training ID: ${model.training_id}`)
    console.log(`   Status: ${model.training_status}`)
    console.log(`   Progress: ${model.training_progress}%`)

    // Cancel the training on Replicate
    if (model.training_id) {
      console.log(`\n🛑 Canceling Replicate training ${model.training_id}...`)

      try {
        const response = await fetch(`https://api.replicate.com/v1/trainings/${model.training_id}/cancel`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          console.log("✅ Replicate training canceled successfully")
        } else {
          const error = await response.json().catch(() => ({}))
          console.log(`⚠️  Replicate cancel failed (might already be done): ${JSON.stringify(error)}`)
        }
      } catch (error) {
        console.log(`⚠️  Could not cancel Replicate training: ${error}`)
      }
    }

    // Reset the model to allow new training
    await sql`
      UPDATE user_models
      SET 
        training_status = 'failed',
        failure_reason = 'Training reset - no images uploaded. Please upload images and try again.',
        training_id = NULL,
        replicate_model_id = NULL,
        training_progress = 0,
        updated_at = NOW()
      WHERE id = ${model.id}
    `

    console.log("\n✅ Training reset complete!")
    console.log("\n📝 Next steps:")
    console.log("   1. Shannon should go to the Training tab")
    console.log("   2. Upload 10-20 clear selfies")
    console.log("   3. Select gender")
    console.log("   4. Click 'Start Training'")
    console.log("\n✅ Done!\n")
  } catch (error) {
    console.error("\n❌ Error:", error)
  }
}

resetShannonTraining()

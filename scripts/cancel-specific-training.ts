import Replicate from "replicate"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
})

async function cancelSpecificTraining() {
  console.log("🛑 Canceling training ID: jja89j2h6drm80ctf7982bg3cr\n")

  try {
    // Find this training in database
    const training = await sql`
      SELECT 
        um.id as model_id,
        um.user_id,
        um.training_id,
        um.training_status,
        um.trigger_word,
        u.email,
        u.display_name
      FROM user_models um
      LEFT JOIN users u ON u.id = um.user_id
      WHERE um.training_id = 'jja89j2h6drm80ctf7982bg3cr'
    `

    if (training.length === 0) {
      console.log("❌ Training not found in database")
      return
    }

    const record = training[0]
    console.log("📋 Training Details:")
    console.log(`   User: ${record.email || "Unknown"} (${record.display_name || "N/A"})`)
    console.log(`   User ID: ${record.user_id}`)
    console.log(`   Model ID: ${record.model_id}`)
    console.log(`   Status: ${record.training_status}`)
    console.log(`   Trigger: ${record.trigger_word}\n`)

    // Cancel on Replicate
    console.log("🔄 Canceling training on Replicate...")
    try {
      await replicate.trainings.cancel(record.training_id)
      console.log("✅ Replicate training canceled\n")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.log(`⚠️  Replicate cancel failed: ${errorMessage}`)
      console.log("   (Training may have already completed or been canceled)\n")
    }

    // Update database
    console.log("🔄 Updating database...")
    await sql`
      UPDATE user_models
      SET 
        training_status = 'failed',
        failure_reason = 'Training canceled by admin',
        updated_at = NOW()
      WHERE id = ${record.model_id}
    `
    console.log("✅ Database updated\n")

    console.log("✅ Training cancellation complete!")
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("❌ Error:", errorMessage)
    process.exit(1)
  }
}

cancelSpecificTraining()

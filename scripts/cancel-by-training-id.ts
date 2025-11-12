import { neon } from "@neondatabase/serverless"
import Replicate from "replicate"

const sql = neon(process.env.DATABASE_URL || "")

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
})

// Training IDs from Replicate URLs
const trainingIds = [
  "t5yerg5tt9rm80ctf93vwxfd08", // First stuck training
  "ezfj5x43s9rmc0ctf95b9qrj5c", // Second stuck training
]

async function cancelTrainings() {
  console.log("🎯 Canceling specific trainings...")

  for (const trainingId of trainingIds) {
    try {
      console.log(`\n📍 Processing training: ${trainingId}`)

      // Find model in database
      const models = await sql`
        SELECT id, user_id, trigger_word, training_status, started_at
        FROM user_models
        WHERE training_id = ${trainingId}
      `

      if (models.length === 0) {
        console.log(`⚠️  Training ${trainingId} not found in database`)
        continue
      }

      const model = models[0]
      console.log(`  Model ID: ${model.id}`)
      console.log(`  User ID: ${model.user_id}`)
      console.log(`  Status: ${model.training_status}`)
      console.log(`  Trigger: ${model.trigger_word}`)

      // Cancel on Replicate
      console.log("  🔄 Canceling training on Replicate...")
      await replicate.trainings.cancel(trainingId)
      console.log("  ✅ Replicate training canceled")

      // Update database
      console.log("  🔄 Updating database...")
      await sql`
        UPDATE user_models
        SET 
          training_status = 'failed',
          failure_reason = 'Training canceled - stuck in starting status',
          updated_at = NOW()
        WHERE training_id = ${trainingId}
      `
      console.log("  ✅ Database updated")
    } catch (error) {
      console.error(`❌ Error canceling training ${trainingId}:`, error)
    }
  }

  console.log("\n✅ Done!")
}

cancelTrainings()

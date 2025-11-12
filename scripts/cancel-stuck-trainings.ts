import Replicate from "replicate"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
})

const STUCK_THRESHOLD_MINUTES = 60 // Consider stuck after 60 minutes in 'starting' or 'training'

async function cancelStuckTrainings() {
  console.log("🔍 Finding stuck trainings...\n")

  try {
    // Find all trainings stuck in 'starting' or 'training' status for too long
    const stuckTrainings = await sql`
      SELECT 
        um.id as model_id,
        um.user_id,
        um.training_id,
        um.training_status,
        um.trigger_word,
        um.created_at,
        um.updated_at,
        u.email,
        u.display_name,
        EXTRACT(EPOCH FROM (NOW() - um.created_at))/60 as minutes_since_creation
      FROM user_models um
      LEFT JOIN users u ON u.id = um.user_id
      WHERE um.training_status IN ('starting', 'training')
      AND um.created_at < NOW() - INTERVAL '60 minutes'
      ORDER BY um.created_at DESC
    `

    if (stuckTrainings.length === 0) {
      console.log("✅ No stuck trainings found!")
      return
    }

    console.log(`📋 Found ${stuckTrainings.length} stuck training(s):\n`)

    for (const record of stuckTrainings) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`Model ID: ${record.model_id}`)
      console.log(`User: ${record.email || "Unknown"} (${record.display_name || "N/A"})`)
      console.log(`Training ID: ${record.training_id}`)
      console.log(`Status: ${record.training_status}`)
      console.log(`Trigger Word: ${record.trigger_word}`)
      console.log(`Stuck for: ${Math.round(record.minutes_since_creation)} minutes`)

      console.log(`\n🔍 Checking status on Replicate...`)
      try {
        const replicateTraining = await replicate.trainings.get(record.training_id)
        console.log(`   Replicate status: ${replicateTraining.status}`)

        if (
          replicateTraining.status === "succeeded" ||
          replicateTraining.status === "failed" ||
          replicateTraining.status === "canceled"
        ) {
          console.log(`   ⚠️  Training already ${replicateTraining.status} on Replicate, updating database...`)
          await sql`
            UPDATE user_models
            SET 
              training_status = ${replicateTraining.status},
              failure_reason = ${replicateTraining.status === "failed" ? replicateTraining.error || "Training failed" : null},
              updated_at = NOW()
            WHERE id = ${record.model_id}
          `
          console.log(`   ✅ Database synced with Replicate status\n`)
          continue
        }
      } catch (error) {
        console.log(`   ⚠️  Could not fetch Replicate status: ${error instanceof Error ? error.message : String(error)}`)
      }

      console.log(`\n🔄 Canceling training on Replicate...`)
      try {
        await replicate.trainings.cancel(record.training_id)
        console.log(`   ✅ Canceled on Replicate`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.log(`   ⚠️  Cancel failed: ${errorMessage}`)
        console.log(`   (May already be completed or canceled)`)
      }

      console.log(`\n🔄 Updating database...`)
      await sql`
        UPDATE user_models
        SET 
          training_status = 'failed',
          failure_reason = 'Training stuck and canceled by admin',
          updated_at = NOW()
        WHERE id = ${record.model_id}
      `
      console.log(`   ✅ Database updated\n`)
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`\n✅ Processed ${stuckTrainings.length} stuck training(s)!`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("❌ Error:", errorMessage)
    process.exit(1)
  }
}

cancelStuckTrainings()

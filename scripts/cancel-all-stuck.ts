import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function cancelAllStuck() {
  console.log("🔍 Finding all stuck trainings...\n")

  const stuckTrainings = await sql`
    SELECT id, user_id, training_id, training_status, started_at
    FROM user_models
    WHERE training_status IN ('starting', 'training')
    AND started_at < NOW() - INTERVAL '60 minutes'
    ORDER BY started_at ASC
  `

  if (stuckTrainings.length === 0) {
    console.log("✅ No stuck trainings found")
    return
  }

  console.log(`Found ${stuckTrainings.length} stuck training(s):\n`)

  for (const training of stuckTrainings) {
    const elapsed = Math.floor((Date.now() - new Date(training.started_at).getTime()) / (1000 * 60))
    console.log(`  Model ID: ${training.id}`)
    console.log(`  Status: ${training.training_status}`)
    console.log(`  Stuck for: ${elapsed} minutes`)
    console.log(`  Replicate ID: ${training.training_id}`)
    console.log()
  }

  // Cancel each stuck training
  for (const training of stuckTrainings) {
    console.log(`🔄 Canceling Model ID ${training.id}...`)

    try {
      // Cancel on Replicate
      const response = await fetch(`https://api.replicate.com/v1/trainings/${training.training_id}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        console.log("✅ Canceled on Replicate")

        // Update database
        await sql`
          UPDATE user_models
          SET 
            training_status = 'failed',
            failure_reason = 'Training stuck - canceled manually after 60+ minutes'
          WHERE id = ${training.id}
        `
        console.log("✅ Updated database\n")
      } else {
        const error = await response.text()
        console.log(`❌ Failed to cancel on Replicate: ${error}\n`)
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`)
    }
  }

  console.log("✅ Done! All stuck trainings have been processed.")
}

cancelAllStuck()

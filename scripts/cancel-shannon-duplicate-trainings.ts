import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function cancelShannon() {
  console.log("🔍 Canceling Shannon's duplicate trainings...")

  const email = "shannon@soulresets.com"

  // Find Shannon
  const [shannon] = await sql`
    SELECT id, email, display_name
    FROM users
    WHERE email = ${email}
  `

  if (!shannon) {
    console.log("❌ Shannon not found")
    return
  }

  console.log(`✅ Found Shannon's account:`)
  console.log(`   Email: ${shannon.email}`)
  console.log(`   ID: ${shannon.id}`)

  // Get all her active trainings
  const activeTrainings = await sql`
    SELECT id, training_id, training_status, replicate_model_id, trigger_word
    FROM user_models
    WHERE user_id = ${shannon.id}
    AND training_status = 'training'
  `

  if (activeTrainings.length === 0) {
    console.log("\n✅ No active trainings found for Shannon")
    return
  }

  console.log(`\n⚠️  Found ${activeTrainings.length} active training(s):`)

  for (const training of activeTrainings) {
    console.log(`\n   Training ID: ${training.training_id}`)
    console.log(`   Model ID: ${training.id}`)

    // Cancel on Replicate
    try {
      const response = await fetch(`https://api.replicate.com/v1/trainings/${training.training_id}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        },
      })

      if (response.ok) {
        console.log(`   ✅ Canceled on Replicate`)
      } else {
        console.log(`   ⚠️  Replicate cancel failed: ${response.status}`)
      }
    } catch (error) {
      console.log(`   ⚠️  Error canceling on Replicate:`, error)
    }

    // Update database
    await sql`
      UPDATE user_models
      SET 
        training_status = 'failed',
        failure_reason = 'Training canceled by admin due to duplicate trainings. Please restart with proper images.',
        updated_at = NOW()
      WHERE id = ${training.id}
    `

    console.log(`   ✅ Updated database status to failed`)
  }

  console.log(`\n✅ All trainings canceled! Shannon can now start fresh.`)
}

cancelShannon().catch(console.error)

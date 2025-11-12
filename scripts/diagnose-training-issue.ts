import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function diagnoseTrainingIssue() {
  console.log("🔍 Diagnosing Training ZIP Upload Issue\n")

  try {
    const recentTrainings = await sql`
      SELECT 
        um.id,
        um.user_id,
        um.training_id,
        um.training_status,
        um.trigger_word,
        um.started_at,
        u.email,
        u.display_name
      FROM user_models um
      LEFT JOIN users u ON u.id = um.user_id
      WHERE um.started_at > NOW() - INTERVAL '24 hours'
      ORDER BY um.started_at DESC
      LIMIT 10
    `

    console.log(`📊 Found ${recentTrainings.length} trainings in last 24 hours:\n`)

    for (const training of recentTrainings) {
      console.log(`\n🎯 Training ${training.id}:`)
      console.log(`   User: ${training.email} (ID: ${training.user_id})`)
      console.log(`   Replicate ID: ${training.training_id}`)
      console.log(`   Status: ${training.training_status}`)
      console.log(`   Trigger: ${training.trigger_word}`)
      console.log(`   Started: ${training.started_at}`)

      try {
        const imageCount = await sql`
          SELECT COUNT(*) as count
          FROM training_runs
          WHERE id = ${training.id}
        `
        console.log(`   Training run exists: Yes`)
      } catch {
        console.log(`   Training run exists: No`)
      }
    }

    console.log("\n\n📦 Vercel Blob URL Analysis:")
    console.log("   Note: Replicate needs publicly accessible URLs")
    console.log("   URLs with 'addRandomSuffix: true' may have auth tokens that block Replicate")

    const stuckTrainings = await sql`
      SELECT 
        um.id,
        um.user_id,
        um.training_id,
        um.training_status,
        um.trigger_word,
        um.started_at,
        EXTRACT(EPOCH FROM (NOW() - um.started_at))/60 as minutes_elapsed,
        u.email
      FROM user_models um
      LEFT JOIN users u ON u.id = um.user_id
      WHERE um.training_status = 'training'
      AND um.started_at < NOW() - INTERVAL '30 minutes'
    `

    if (stuckTrainings.length > 0) {
      console.log("\n\n⚠️  STUCK TRAININGS DETECTED:\n")
      for (const stuck of stuckTrainings) {
        console.log(`   ${stuck.email}: ${Math.round(stuck.minutes_elapsed)} minutes`)
        console.log(`   Training ID: ${stuck.training_id}`)
        console.log(`   Model ID: ${stuck.id}\n`)
      }
    } else {
      console.log("\n\n✅ No stuck trainings found")
    }

    console.log("\n\n💡 COMMON ISSUES:")
    console.log("   1. Vercel Blob URLs with auth tokens that Replicate can't access")
    console.log("   2. ZIP files uploaded with 'addRandomSuffix: true' causing access errors")
    console.log("   3. Empty ZIP files (0 images uploaded)")
    console.log("   4. Network/firewall issues blocking Replicate from downloading")

    console.log("\n✅ Diagnosis complete!")
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("❌ Error:", errorMessage)
    process.exit(1)
  }
}

diagnoseTrainingIssue()

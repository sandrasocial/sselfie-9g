/**
 * PRODUCTION CLEANUP SCRIPT
 *
 * Removes:
 * 1. Test users (emails with yopmail, test, +test, example.com)
 * 2. Users without completed trained models
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function cleanupTestUsers() {
  console.log("🧹 SSELFIE - Test User Cleanup\n")
  console.log("=".repeat(60))

  try {
    // ============================================================
    // STEP 1: Find users with completed trained models (KEEP)
    // ============================================================

    console.log("\n✅ USERS WE'LL KEEP (have completed trained models):\n")

    const usersToKeep = await sql`
      SELECT 
        u.email,
        u.display_name,
        COUNT(DISTINCT um.id) as trained_models,
        u.plan,
        u.created_at::date as created_date
      FROM users u
      INNER JOIN user_models um ON um.user_id = u.id 
        AND um.training_status = 'completed'
      GROUP BY u.id, u.email, u.display_name, u.plan, u.created_at
      ORDER BY u.created_at DESC
    `

    usersToKeep.forEach((user, i) => {
      console.log(
        `  ${i + 1}. ${user.email} - ${user.trained_models} model(s) - ${user.plan} - joined ${user.created_date}`,
      )
    })

    console.log(`\n  Total: ${usersToKeep.length} users with trained models`)

    // ============================================================
    // STEP 2: Find users to DELETE (no trained models)
    // ============================================================

    console.log("\n\n❌ USERS WE'LL DELETE (no completed trained models):\n")

    const usersToDelete = await sql`
      SELECT 
        u.id,
        u.email,
        u.display_name,
        u.plan,
        COALESCE(COUNT(DISTINCT um.id) FILTER (WHERE um.training_status != 'completed'), 0) as failed_models,
        u.created_at::date as created_date
      FROM users u
      LEFT JOIN user_models um ON um.user_id = u.id
      WHERE NOT EXISTS (
        SELECT 1 FROM user_models 
        WHERE user_id = u.id AND training_status = 'completed'
      )
      GROUP BY u.id, u.email, u.display_name, u.plan, u.created_at
      ORDER BY u.created_at DESC
    `

    if (usersToDelete.length === 0) {
      console.log("  No users to delete. All users have trained models!")
      return
    }

    usersToDelete.forEach((user, i) => {
      console.log(
        `  ${i + 1}. ${user.email} - ${user.failed_models} failed/incomplete model(s) - ${user.plan} - joined ${user.created_date}`,
      )
    })

    console.log(`\n  Total: ${usersToDelete.length} users without trained models`)

    // ============================================================
    // STEP 3: DELETION
    // ============================================================

    console.log("\n\n" + "=".repeat(60))
    console.log("🗑️  DELETING USERS")
    console.log("=".repeat(60))
    console.log(`\nDeleting ${usersToDelete.length} users and all their data...\n`)

    let deletedCount = 0

    for (const user of usersToDelete) {
      console.log(`  Deleting ${user.email}...`)

      await sql`DELETE FROM maya_chat_messages 
        WHERE chat_id IN (SELECT id FROM maya_chats WHERE user_id = ${user.id})`

      await sql`DELETE FROM maya_chats WHERE user_id = ${user.id}`
      await sql`DELETE FROM credit_transactions WHERE user_id = ${user.id}`
      await sql`DELETE FROM subscriptions WHERE user_id = ${user.id}`
      await sql`DELETE FROM user_academy_enrollments WHERE user_id = ${user.id}`
      await sql`DELETE FROM user_lesson_progress WHERE user_id = ${user.id}`
      await sql`DELETE FROM user_resource_downloads WHERE user_id = ${user.id}`
      await sql`DELETE FROM feed_layouts WHERE user_id = ${user.id}`
      await sql`DELETE FROM feed_posts WHERE user_id = ${user.id}`
      await sql`DELETE FROM user_personal_brand WHERE user_id = ${user.id}`
      await sql`DELETE FROM user_credits WHERE user_id = ${user.id}`
      await sql`DELETE FROM user_style_profile WHERE user_id = ${user.id}`
      await sql`DELETE FROM generated_images WHERE user_id = ${user.id}`
      await sql`DELETE FROM ai_images WHERE user_id = ${user.id}`

      // Delete training data (using tables that exist)
      await sql`DELETE FROM lora_weights 
        WHERE training_run_id IN (SELECT id FROM training_runs WHERE user_id = ${user.id})`
      await sql`DELETE FROM training_runs WHERE user_id = ${user.id}`
      await sql`DELETE FROM user_models WHERE user_id = ${user.id}`

      // Finally delete the user
      await sql`DELETE FROM users WHERE id = ${user.id}`

      deletedCount++
      console.log(`    ✓ Deleted`)
    }

    console.log(`\n✅ Deletion complete! Removed ${deletedCount} users.`)

    // ============================================================
    // STEP 4: Final stats
    // ============================================================

    console.log("\n\n" + "=".repeat(60))
    console.log("📊 CURRENT DATABASE STATS")
    console.log("=".repeat(60))

    const remainingUsers = await sql`SELECT COUNT(*) as count FROM users`
    const trainedModels = await sql`SELECT COUNT(*) as count FROM user_models WHERE training_status = 'completed'`
    const activeSubscriptions = await sql`SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'`

    console.log(`  Total Users: ${remainingUsers[0].count}`)
    console.log(`  Trained Models: ${trainedModels[0].count}`)
    console.log(`  Active Subscriptions: ${activeSubscriptions[0].count}`)
    console.log("\n")
  } catch (error) {
    console.error("\n❌ Error during cleanup:", error)
    throw error
  }
}

cleanupTestUsers()

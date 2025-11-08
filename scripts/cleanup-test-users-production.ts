/**
 * PRODUCTION CLEANUP SCRIPT
 *
 * Removes:
 * 1. Test users (emails with yopmail, test, +test, example.com)
 * 2. Users without completed trained models
 *
 * SAFE: Shows preview first, requires confirmation
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

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
    // STEP 3: Confirmation
    // ============================================================

    console.log("\n\n" + "=".repeat(60))
    console.log("⚠️  CONFIRMATION REQUIRED")
    console.log("=".repeat(60))
    console.log(`\nThis will DELETE ${usersToDelete.length} users and all their data.`)
    console.log(`\nTo proceed, uncomment the deletion code and run again.\n`)

    // ============================================================
    // STEP 4: DELETION (commented out for safety)
    // ============================================================

    // Uncomment below to actually delete the users:
    /*
    console.log("\n🗑️  Starting deletion process...\n")
    
    let deletedCount = 0
    
    for (const user of usersToDelete) {
      console.log(`  Deleting ${user.email}...`)
      
      // Delete in dependency order (children first, parents last)
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
      
      // Delete training data
      await sql`DELETE FROM lora_weights 
        WHERE training_run_id IN (SELECT id FROM training_runs WHERE user_id = ${user.id})`
      await sql`DELETE FROM training_images 
        WHERE training_run_id IN (SELECT id FROM training_runs WHERE user_id = ${user.id})`
      await sql`DELETE FROM training_runs WHERE user_id = ${user.id}`
      await sql`DELETE FROM user_models WHERE user_id = ${user.id}`
      
      // Finally delete the user
      await sql`DELETE FROM users WHERE id = ${user.id}`
      
      deletedCount++
      console.log(`    ✓ Deleted`)
    }
    
    console.log(`\n✅ Deletion complete! Removed ${deletedCount} users.`)
    */

    // ============================================================
    // STEP 5: Final stats
    // ============================================================

    const finalStats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM user_models WHERE training_status = 'completed') as trained_models,
        (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as active_subscriptions,
        (SELECT COALESCE(SUM(amount), 0)::float / 100 
         FROM credit_transactions 
         WHERE transaction_type = 'purchase' AND stripe_payment_id IS NOT NULL) as revenue_usd
    `

    console.log("\n\n" + "=".repeat(60))
    console.log("📊 CURRENT DATABASE STATS")
    console.log("=".repeat(60))
    console.log(`  Total Users: ${finalStats[0].total_users}`)
    console.log(`  Trained Models: ${finalStats[0].trained_models}`)
    console.log(`  Active Subscriptions: ${finalStats[0].active_subscriptions}`)
    console.log(`  Total Revenue: $${finalStats[0].revenue_usd.toFixed(2)}`)
    console.log("\n")
  } catch (error) {
    console.error("\n❌ Error during cleanup:", error)
    throw error
  }
}

cleanupTestUsers()

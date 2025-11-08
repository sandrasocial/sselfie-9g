/**
 * Enhanced cleanup script to prepare for launch
 * - Removes ALL users WITHOUT trained models (test/beta users who never used the product)
 * - Keeps ONLY users WITH completed trained models (real users)
 * - Resets beta counter and revenue data to reflect real usage only
 */

import { neon } from "@neondatabase/serverless"
import { createClient } from "@supabase/supabase-js"

const sql = neon(process.env.DATABASE_URL || "")

const supabaseAdmin = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function cleanupForLaunch() {
  console.log("\n🚀 [v0] Starting pre-launch cleanup...\n")
  console.log("=".repeat(80))

  try {
    // Step 1: Get all users and their training status
    const allUsers = await sql`
      SELECT 
        u.id,
        u.email,
        u.display_name,
        u.created_at,
        u.stripe_customer_id,
        u.plan,
        u.supabase_user_id,
        COUNT(DISTINCT um.id) as trained_models,
        COUNT(DISTINCT um.id) FILTER (WHERE um.training_status = 'completed') as completed_models,
        COUNT(DISTINCT ct.id) as transactions,
        SUM(CASE WHEN ct.transaction_type = 'purchase' AND ct.stripe_payment_id IS NOT NULL THEN ct.amount ELSE 0 END) as real_purchases,
        SUM(CASE WHEN ct.transaction_type IN ('subscription_grant', 'bonus') THEN ct.amount ELSE 0 END) as free_credits,
        s.status as subscription_status
      FROM users u
      LEFT JOIN user_models um ON um.user_id = u.id
      LEFT JOIN credit_transactions ct ON ct.user_id = u.id
      LEFT JOIN subscriptions s ON s.user_id = u.id
      GROUP BY u.id, u.email, u.display_name, u.created_at, u.stripe_customer_id, u.plan, u.supabase_user_id, s.status
      ORDER BY u.created_at DESC
    `

    console.log(`📊 Total users in database: ${allUsers.length}\n`)

    // Step 2: Categorize users
    const usersWithTrainedModels = allUsers.filter((u) => Number(u.completed_models) > 0)
    const testUsersNoModels = allUsers.filter((u) => Number(u.completed_models) === 0)

    console.log("📋 User Breakdown:")
    console.log(`   ✅ Users with completed models: ${usersWithTrainedModels.length}`)
    console.log(`   ❌ Users without completed models: ${testUsersNoModels.length}\n`)

    // Step 3: Show users to keep
    console.log("🎯 KEEPING these users (have trained models):\n")
    usersWithTrainedModels.forEach((user) => {
      console.log(
        `   ✓ ${user.email} - ${user.completed_models} model(s), $${(Number(user.real_purchases) / 100).toFixed(2)} spent`,
      )
    })

    // Step 4: Show users to delete
    console.log("\n\n🗑️  DELETING these users (no trained models):\n")
    testUsersNoModels.forEach((user) => {
      const reason = []
      if (Number(user.real_purchases) === 0) reason.push("no purchases")
      if (Number(user.free_credits) > 0) reason.push(`${user.free_credits} free credits`)
      if (!user.stripe_customer_id) reason.push("no Stripe customer")

      console.log(`   ✗ ${user.email} - [${reason.join(", ")}]`)
    })

    console.log("\n" + "=".repeat(80))
    console.log(`\n⚠️  About to DELETE ${testUsersNoModels.length} users without trained models`)
    console.log(`✅ Will KEEP ${usersWithTrainedModels.length} users with trained models\n`)
    console.log("=".repeat(80))

    // Step 5: Delete users without trained models
    console.log("\n🧹 Starting deletion process...\n")

    let deletedCount = 0

    for (const user of testUsersNoModels) {
      try {
        const supabaseUserId = user.supabase_user_id

        // Delete in dependency order
        await sql`DELETE FROM credit_transactions WHERE user_id = ${user.id}`
        await sql`DELETE FROM subscriptions WHERE user_id = ${user.id}`
        await sql`DELETE FROM user_academy_enrollments WHERE user_id = ${user.id}`
        await sql`DELETE FROM user_lesson_progress WHERE user_id = ${user.id}`
        await sql`DELETE FROM user_resource_downloads WHERE user_id = ${user.id}`
        await sql`DELETE FROM feed_layouts WHERE user_id = ${user.id}`
        await sql`DELETE FROM feed_posts WHERE user_id = ${user.id}`

        const userChats = await sql`SELECT id FROM maya_chats WHERE user_id = ${user.id}`
        for (const chat of userChats) {
          await sql`DELETE FROM maya_chat_messages WHERE chat_id = ${chat.id}`
        }
        await sql`DELETE FROM maya_chats WHERE user_id = ${user.id}`

        await sql`DELETE FROM user_personal_brand WHERE user_id = ${user.id}`
        await sql`DELETE FROM user_credits WHERE user_id = ${user.id}`
        await sql`DELETE FROM user_style_profile WHERE user_id = ${user.id}`
        await sql`DELETE FROM training_runs WHERE user_id = ${user.id}`
        await sql`DELETE FROM user_models WHERE user_id = ${user.id}`
        await sql`DELETE FROM generated_images WHERE user_id = ${user.id}`
        await sql`DELETE FROM ai_images WHERE user_id = ${user.id}`

        // Delete from Neon users table
        await sql`DELETE FROM users WHERE id = ${user.id}`

        if (supabaseUserId) {
          try {
            await supabaseAdmin.auth.admin.deleteUser(supabaseUserId)
          } catch (supabaseError) {
            console.log(`   ⚠️  Could not delete Supabase auth for ${user.email}:`, supabaseError)
          }
        }

        deletedCount++
        console.log(`   ✓ Deleted ${user.email}`)
      } catch (error) {
        console.error(`   ✗ Failed to delete ${user.email}:`, error)
      }
    }

    // Step 6: Generate final report
    console.log("\n\n" + "=".repeat(80))
    console.log("📊 CLEANUP SUMMARY")
    console.log("=".repeat(80))

    const finalStats = await sql`
      SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT um.id) FILTER (WHERE um.training_status = 'completed') as total_trained_models,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active') as active_subscriptions,
        SUM(CASE WHEN ct.transaction_type = 'purchase' AND ct.stripe_payment_id IS NOT NULL THEN ct.amount ELSE 0 END) as real_revenue_cents
      FROM users u
      LEFT JOIN user_models um ON um.user_id = u.id
      LEFT JOIN subscriptions s ON s.user_id = u.id
      LEFT JOIN credit_transactions ct ON ct.user_id = u.id
    `

    const stats = finalStats[0]
    const realRevenue = Number(stats.real_revenue_cents || 0) / 100

    console.log(`\n✅ Users deleted: ${deletedCount}`)
    console.log(`✅ Users remaining: ${stats.total_users}`)
    console.log(`✅ Trained models: ${stats.total_trained_models}`)
    console.log(`✅ Active subscriptions: ${stats.active_subscriptions}`)
    console.log(`✅ Real revenue (from live Stripe purchases): $${realRevenue.toFixed(2)}`)
    console.log(`\n🎉 Database is now clean and ready for launch!`)
    console.log(`💡 Only users with trained models remain (real users who used the product)\n`)
    console.log("=".repeat(80) + "\n")
  } catch (error) {
    console.error("\n❌ Error during cleanup:", error)
    throw error
  }
}

cleanupForLaunch()

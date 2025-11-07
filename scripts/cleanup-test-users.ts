/**
 * Script to clean up test users from the database
 * Run this to remove test users before launch and reset beta counter to 100
 */

import { neon } from "@neondatabase/serverless"
import { createClient } from "@supabase/supabase-js"

const sql = neon(process.env.DATABASE_URL!)

const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function cleanupTestUsers() {
  console.log("[v0] Starting test user cleanup...")

  try {
    // Get all users to review
    const allUsers = await sql`
      SELECT 
        u.id,
        u.email,
        u.display_name,
        u.created_at,
        u.stripe_customer_id,
        COUNT(ct.id) as transaction_count,
        SUM(CASE WHEN ct.description LIKE '%beta%' OR ct.description LIKE '%One-time session%' THEN 1 ELSE 0 END) as beta_purchases
      FROM users u
      LEFT JOIN credit_transactions ct ON ct.user_id = u.id
      GROUP BY u.id, u.email, u.display_name, u.created_at, u.stripe_customer_id
      ORDER BY u.created_at DESC
    `

    console.log(`\n[v0] Found ${allUsers.length} total users\n`)

    // Identify test users (you can add more criteria)
    const testUsers = allUsers.filter((user) => {
      const isTestEmail =
        user.email?.includes("yopmail") ||
        user.email?.includes("test") ||
        user.email?.includes("+test") ||
        user.email?.includes("example.com")
      return isTestEmail
    })

    console.log(`[v0] Identified ${testUsers.length} test users to delete:\n`)
    testUsers.forEach((user) => {
      console.log(`  - ${user.email} (${user.transaction_count} transactions)`)
    })

    if (testUsers.length === 0) {
      console.log("\n[v0] No test users found. Exiting.")
      return
    }

    console.log("\n[v0] Deleting test users from Neon database...")

    for (const user of testUsers) {
      // Delete in order: dependencies first
      await sql`DELETE FROM credit_transactions WHERE user_id = ${user.id}`
      await sql`DELETE FROM subscriptions WHERE user_id = ${user.id}`
      await sql`DELETE FROM feed_layouts WHERE user_id = ${user.id}`
      await sql`DELETE FROM feed_posts WHERE user_id = ${user.id}`
      await sql`DELETE FROM maya_chats WHERE user_id = ${user.id}`
      await sql`DELETE FROM user_personal_brand WHERE user_id = ${user.id}`
      await sql`DELETE FROM user_credits WHERE user_id = ${user.id}`
      await sql`DELETE FROM training_runs WHERE user_id = ${user.id}`
      await sql`DELETE FROM user_models WHERE user_id = ${user.id}`
      await sql`DELETE FROM users WHERE id = ${user.id}`

      // Delete from Supabase Auth if they have supabase_user_id
      if (user.supabase_user_id) {
        await supabaseAdmin.auth.admin.deleteUser(user.supabase_user_id)
      }

      console.log(`  ✓ Deleted ${user.email}`)
    }

    // Get updated count
    const remainingUsers = await sql`
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      INNER JOIN credit_transactions ct ON ct.user_id = u.id
      WHERE ct.description LIKE '%beta%' OR ct.description LIKE '%One-time session%'
    `

    const remaining = Number.parseInt(remainingUsers[0]?.count || "0")

    console.log(`\n[v0] ✅ Cleanup complete!`)
    console.log(`[v0] Deleted: ${testUsers.length} test users`)
    console.log(`[v0] Remaining beta users: ${remaining}/100`)
    console.log(`[v0] Available beta spots: ${100 - remaining}`)
  } catch (error) {
    console.error("[v0] Error during cleanup:", error)
    throw error
  }
}

cleanupTestUsers()

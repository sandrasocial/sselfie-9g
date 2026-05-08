import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL!)

async function checkUserCreditsStatus() {
  const userId = process.argv[2]

  if (!userId) {
    console.error("Usage: pnpm exec tsx scripts/migrations/check-user-credits-status.ts <user_id>")
    process.exit(1)
  }

  console.log(`[Check] Checking credit status for user: ${userId}\n`)

  try {
    // Get user info
    const user = await sql`
      SELECT id, email, display_name, created_at, supabase_user_id
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `

    if (user.length === 0) {
      console.log(`❌ User ${userId} not found`)
      return
    }

    console.log(`✅ User found:`)
    console.log(`   Email: ${user[0].email}`)
    console.log(`   Created: ${user[0].created_at}`)
    console.log(`   Supabase User ID: ${user[0].supabase_user_id}\n`)

    // Check subscription
    const subscription = await sql`
      SELECT id, product_type, status, created_at
      FROM subscriptions
      WHERE user_id = ${userId} AND status = 'active'
    `

    console.log(`📊 Active Subscriptions: ${subscription.length}`)
    if (subscription.length > 0) {
      subscription.forEach((sub: any) => {
        console.log(`   - ${sub.product_type} (${sub.status})`)
      })
    }
    console.log()

    // Check credits
    const credits = await sql`
      SELECT balance, total_purchased, total_used, created_at, updated_at
      FROM user_credits
      WHERE user_id = ${userId}
      LIMIT 1
    `

    console.log(`💰 Credits Record:`)
    if (credits.length === 0) {
      console.log(`   ❌ No credits record found`)
    } else {
      console.log(`   Balance: ${credits[0].balance}`)
      console.log(`   Total Purchased: ${credits[0].total_purchased}`)
      console.log(`   Total Used: ${credits[0].total_used}`)
      console.log(`   Created: ${credits[0].created_at}`)
      console.log(`   Updated: ${credits[0].updated_at}`)
    }
    console.log()

    // Check bonus transactions
    const bonusTransactions = await sql`
      SELECT id, amount, transaction_type, description, balance_after, created_at
      FROM credit_transactions
      WHERE user_id = ${userId}
      AND transaction_type = 'bonus'
      AND description = 'Free blueprint credits (welcome bonus)'
      ORDER BY created_at DESC
    `

    console.log(`🎁 Welcome Bonus Transactions: ${bonusTransactions.length}`)
    if (bonusTransactions.length === 0) {
      console.log(`   ❌ No welcome bonus transaction found`)
      console.log(`   ✅ User is eligible for welcome bonus!`)
    } else {
      bonusTransactions.forEach((tx: any, idx: number) => {
        console.log(`   ${idx + 1}. ID: ${tx.id}, Amount: ${tx.amount}, Balance After: ${tx.balance_after}, Created: ${tx.created_at}`)
      })
      console.log(`   ⏭️ User already received welcome bonus - not eligible`)
    }
    console.log()

    // Check all transactions
    const allTransactions = await sql`
      SELECT id, amount, transaction_type, description, balance_after, created_at
      FROM credit_transactions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 10
    `

    console.log(`📜 Recent Transactions (last 10):`)
    if (allTransactions.length === 0) {
      console.log(`   No transactions found`)
    } else {
      allTransactions.forEach((tx: any) => {
        console.log(`   - ${tx.transaction_type}: ${tx.amount > 0 ? '+' : ''}${tx.amount} (${tx.description}) | Balance: ${tx.balance_after} | ${tx.created_at}`)
      })
    }
  } catch (error) {
    console.error("❌ Error checking user credits:", error)
    if (error instanceof Error) {
      console.error("Stack:", error.stack)
    }
  }
}

checkUserCreditsStatus()
  .then(() => {
    console.log("\n✅ Check complete!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Error:", error)
    process.exit(1)
  })

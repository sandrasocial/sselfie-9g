import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

async function addCreditsToUser() {
  try {
    console.log("[v0] Searching for user: Kuki Buksurnar")

    // Search for user by display_name, first_name, last_name, or email
    const users = await sql`
      SELECT id, email, display_name, first_name, last_name
      FROM users
      WHERE 
        LOWER(display_name) LIKE LOWER('%Kuki%') OR
        LOWER(display_name) LIKE LOWER('%Buksurnar%') OR
        LOWER(first_name) LIKE LOWER('%Kuki%') OR
        LOWER(last_name) LIKE LOWER('%Buksurnar%') OR
        LOWER(email) LIKE LOWER('%kuki%') OR
        LOWER(email) LIKE LOWER('%buksurnar%')
    `

    if (users.length === 0) {
      console.log("[v0] ❌ No user found matching 'Kuki Buksurnar'")
      return
    }

    console.log(`[v0] Found ${users.length} user(s):`)
    users.forEach((user) => {
      console.log(`  - ${user.display_name || user.email} (${user.first_name} ${user.last_name})`)
    })

    // Add credits to each matching user
    for (const user of users) {
      console.log(`\n[v0] Processing user: ${user.email}`)

      // Check current balance
      const creditResult = await sql`
        SELECT balance FROM user_credits WHERE user_id = ${user.id}
      `

      const currentBalance = creditResult.length > 0 ? creditResult[0].balance : 0
      console.log(`[v0] Current balance: ${currentBalance} credits`)

      // Add 100 credits
      const creditsToAdd = 100
      const newBalance = currentBalance + creditsToAdd

      // Update or insert credits
      await sql`
        INSERT INTO user_credits (user_id, balance, total_purchased, total_used, updated_at)
        VALUES (${user.id}, ${creditsToAdd}, ${creditsToAdd}, 0, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          balance = user_credits.balance + ${creditsToAdd},
          total_purchased = user_credits.total_purchased + ${creditsToAdd},
          updated_at = NOW()
      `

      // Record transaction
      await sql`
        INSERT INTO credit_transactions (
          user_id, 
          amount, 
          type, 
          description, 
          balance_after,
          created_at
        )
        VALUES (
          ${user.id},
          ${creditsToAdd},
          'bonus',
          'Manual credit addition - Fix for Stripe purchase issue (Kuki Buksurnar)',
          ${newBalance},
          NOW()
        )
      `

      console.log(`[v0] ✅ Added ${creditsToAdd} credits to ${user.email}`)
      console.log(`[v0] New balance: ${newBalance} credits`)
    }

    console.log("\n[v0] ✅ Credit addition complete!")
  } catch (error) {
    console.error("[v0] ❌ Error adding credits:", error)
  }
}

addCreditsToUser()

import { neon } from "@neondatabase/serverless"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error("[v0] ❌ DATABASE_URL environment variable is not set")
  process.exit(1)
}

const sql = neon(DATABASE_URL)

async function addCreditsToUsers() {
  try {
    console.log('[v0] 🔍 Searching for users "bjarki" and "thorir"...')

    const users = await sql`
      SELECT id, email, first_name, last_name, display_name
      FROM users
      WHERE 
        LOWER(email) LIKE '%bjarki%' OR 
        LOWER(email) LIKE '%thorir%' OR
        LOWER(first_name) LIKE '%bjarki%' OR
        LOWER(first_name) LIKE '%thorir%' OR
        LOWER(last_name) LIKE '%bjarki%' OR
        LOWER(last_name) LIKE '%thorir%' OR
        LOWER(display_name) LIKE '%bjarki%' OR
        LOWER(display_name) LIKE '%thorir%'
    `

    if (users.length === 0) {
      console.log('[v0] ⚠️  No users found matching "bjarki" or "thorir"')
      console.log("[v0] 💡 Tip: Check if they signed up with different names or emails")
      return
    }

    console.log(`[v0] ✅ Found ${users.length} user(s):`)
    users.forEach((user) => {
      console.log(`   - ${user.email} (${user.first_name} ${user.last_name || ""})`.trim())
    })

    // Add 100 credits to each user
    for (const user of users) {
      console.log(`\n[v0] 💳 Processing credits for ${user.email}...`)

      // Check current balance
      const currentBalance = await sql`
        SELECT balance FROM user_credits WHERE user_id = ${user.id}
      `

      const balanceBefore = currentBalance.length > 0 ? currentBalance[0].balance : 0
      console.log(`[v0]    Current balance: ${balanceBefore} credits`)

      // Add 100 credits
      const creditsToAdd = 100

      // Upsert user_credits
      await sql`
        INSERT INTO user_credits (user_id, balance, total_purchased, total_used, created_at, updated_at)
        VALUES (${user.id}, ${creditsToAdd}, ${creditsToAdd}, 0, NOW(), NOW())
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
          transaction_type, 
          description, 
          balance_after,
          created_at
        )
        VALUES (
          ${user.id},
          ${creditsToAdd},
          'bonus',
          'Manual credit addition - Fix for Stripe purchase issue (bjarki/thorir)',
          ${balanceBefore + creditsToAdd},
          NOW()
        )
      `

      console.log(`[v0] ✅ Added ${creditsToAdd} credits`)
      console.log(`[v0]    New balance: ${balanceBefore + creditsToAdd} credits`)
    }

    console.log("\n[v0] 🎉 All credits added successfully!")
  } catch (error) {
    console.error("[v0] ❌ Error adding credits:", error)
    process.exit(1)
  }
}

addCreditsToUsers()

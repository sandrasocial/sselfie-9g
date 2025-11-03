import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

async function addCreditsByEmail() {
  const email = "mcegill@hotmail.com"
  const creditsToAdd = 100

  try {
    console.log(`[v0] Looking up user with email: ${email}`)

    // Find user by email
    const users = await sql`
      SELECT id, email, display_name, first_name, last_name
      FROM users
      WHERE LOWER(email) = LOWER(${email})
    `

    if (users.length === 0) {
      console.log(`[v0] ❌ No user found with email: ${email}`)
      return
    }

    const user = users[0]
    console.log(`[v0] ✅ Found user:`, {
      id: user.id,
      email: user.email,
      name: user.display_name || `${user.first_name} ${user.last_name}`,
    })

    // Get current balance
    const creditResult = await sql`
      SELECT balance FROM user_credits WHERE user_id = ${user.id}
    `

    const currentBalance = creditResult.length > 0 ? creditResult[0].balance : 0
    console.log(`[v0] Current balance: ${currentBalance} credits`)

    // Add credits
    await sql`
      INSERT INTO user_credits (user_id, balance, total_purchased)
      VALUES (${user.id}, ${creditsToAdd}, ${creditsToAdd})
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        balance = user_credits.balance + ${creditsToAdd},
        total_purchased = user_credits.total_purchased + ${creditsToAdd},
        updated_at = NOW()
    `

    // Record transaction
    const newBalance = currentBalance + creditsToAdd
    await sql`
      INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after, created_at)
      VALUES (${user.id}, ${creditsToAdd}, 'bonus', 'Manual credit addition - Fix for Stripe purchase issue (mcegill@hotmail.com)', ${newBalance}, NOW())
    `

    console.log(`[v0] ✅ Successfully added ${creditsToAdd} credits`)
    console.log(`[v0] New balance: ${newBalance} credits`)
  } catch (error) {
    console.error("[v0] ❌ Error adding credits:", error)
  }
}

addCreditsByEmail()

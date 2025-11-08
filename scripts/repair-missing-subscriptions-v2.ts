import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function repairMissingSubscriptions() {
  console.log("[v0] Starting subscription repair for users with membership but no subscription record...\n")

  try {
    // Find users who have:
    // 1. plan = 'sselfie-studio'
    // 2. credits balance >= 100 (membership gives 150)
    // 3. BUT no subscription record
    const usersNeedingRepair = await sql`
      SELECT 
        u.id,
        u.email,
        u.display_name,
        u.plan,
        u.created_at as user_created_at,
        uc.balance as credit_balance
      FROM users u
      LEFT JOIN user_credits uc ON u.id = uc.user_id
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE u.plan = 'sselfie-studio'
        AND uc.balance >= 100
        AND s.id IS NULL
      ORDER BY u.created_at DESC
    `

    console.log(`[v0] Found ${usersNeedingRepair.length} users needing subscription repair:\n`)

    if (usersNeedingRepair.length === 0) {
      console.log("[v0] No users need repair. All Studio Membership users have subscription records.")
      return
    }

    // Display users that will be repaired
    usersNeedingRepair.forEach((user) => {
      console.log(`- ${user.email} (${user.display_name})`)
      console.log(`  User ID: ${user.id}`)
      console.log(`  Credits: ${user.credit_balance}`)
      console.log(`  Created: ${user.user_created_at}`)
      console.log("")
    })

    console.log(`\n[v0] Creating subscription records for ${usersNeedingRepair.length} users...\n`)

    // Create subscription records for each user
    let successCount = 0
    let errorCount = 0

    for (const user of usersNeedingRepair) {
      try {
        // Create subscription with 1 year validity from their account creation
        const startDate = new Date(user.user_created_at)
        const endDate = new Date(startDate)
        endDate.setFullYear(endDate.getFullYear() + 1)

        await sql`
          INSERT INTO subscriptions (
            user_id,
            product_type,
            plan,
            status,
            current_period_start,
            current_period_end,
            stripe_subscription_id,
            stripe_customer_id
          ) VALUES (
            ${user.id},
            'sselfie-studio',
            'sselfie-studio',
            'active',
            ${startDate.toISOString()},
            ${endDate.toISOString()},
            NULL,
            NULL
          )
          ON CONFLICT (user_id, product_type) 
          DO UPDATE SET
            status = 'active',
            current_period_end = ${endDate.toISOString()},
            updated_at = NOW()
        `

        console.log(`✓ Created subscription for ${user.email}`)
        successCount++
      } catch (error) {
        console.error(`✗ Failed to create subscription for ${user.email}:`, error)
        errorCount++
      }
    }

    console.log(`\n[v0] Repair complete!`)
    console.log(`[v0] Success: ${successCount}`)
    console.log(`[v0] Errors: ${errorCount}`)

    // Verify the repair worked
    console.log("\n[v0] Verifying repair...\n")

    const verifyResults = await sql`
      SELECT 
        u.email,
        u.plan,
        s.status as subscription_status,
        s.current_period_end,
        uc.balance as credits
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id AND s.product_type = 'sselfie-studio'
      LEFT JOIN user_credits uc ON u.id = uc.user_id
      WHERE u.plan = 'sselfie-studio'
      ORDER BY u.created_at DESC
    `

    console.log("Current state of Studio Membership users:")
    verifyResults.forEach((user) => {
      console.log(`- ${user.email}`)
      console.log(`  Subscription: ${user.subscription_status || "MISSING"}`)
      console.log(`  Credits: ${user.credits}`)
      console.log(`  Period End: ${user.current_period_end || "N/A"}`)
      console.log("")
    })
  } catch (error) {
    console.error("[v0] Repair script failed:", error)
    throw error
  }
}

repairMissingSubscriptions()

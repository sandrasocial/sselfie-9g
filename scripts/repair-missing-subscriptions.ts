import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

async function repairMissingSubscriptions() {
  console.log("[v0] Starting subscription repair...")

  try {
    // Find users with sselfie-studio plan but no subscription record
    const usersNeedingRepair = await sql`
      SELECT DISTINCT u.id, u.email, u.plan, u.created_at
      FROM users u
      WHERE u.plan = 'sselfie-studio'
      AND NOT EXISTS (
        SELECT 1 FROM subscriptions s 
        WHERE s.user_id = u.id 
        AND s.product_type = 'sselfie_studio_membership'
      )
      ORDER BY u.created_at DESC
    `

    console.log(`[v0] Found ${usersNeedingRepair.length} users needing repair:`)
    usersNeedingRepair.forEach((user: any) => {
      console.log(`  - ${user.email} (${user.id})`)
    })

    if (usersNeedingRepair.length === 0) {
      console.log("[v0] No users need repair. All good!")
      return
    }

    // Create subscription records for each user
    for (const user of usersNeedingRepair) {
      console.log(`\n[v0] Repairing subscription for ${user.email}...`)

      const now = new Date()
      const oneYearFromNow = new Date()
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)

      const result = await sql`
        INSERT INTO subscriptions (
          user_id,
          product_type,
          plan,
          status,
          stripe_subscription_id,
          current_period_start,
          current_period_end,
          created_at,
          updated_at
        ) VALUES (
          ${user.id},
          'sselfie_studio_membership',
          'sselfie-studio',
          'active',
          NULL,
          ${now.toISOString()},
          ${oneYearFromNow.toISOString()},
          ${now.toISOString()},
          ${now.toISOString()}
        )
        RETURNING *
      `

      console.log(`[v0] ✓ Created subscription for ${user.email}`)
      console.log(`  Subscription ID: ${result[0].id}`)
      console.log(`  Status: ${result[0].status}`)
      console.log(`  Period: ${result[0].current_period_start} → ${result[0].current_period_end}`)
    }

    console.log(`\n[v0] ✓ Successfully repaired ${usersNeedingRepair.length} subscription(s)`)
    console.log("[v0] Users should now have full Academy access!")
  } catch (error) {
    console.error("[v0] Error repairing subscriptions:", error)
    throw error
  }
}

repairMissingSubscriptions()

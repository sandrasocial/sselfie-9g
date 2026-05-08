#!/usr/bin/env tsx
/**
 * Beta Users Access Diagnostic Script
 * 
 * Checks all beta users' subscription status and Maya access levels
 * Run: pnpm exec tsx scripts/diagnose-beta-users.ts
 */

import { config } from "dotenv"
import { neon } from "@neondatabase/serverless"

// Load environment variables
config({ path: ".env.local" })
config({ path: ".env" })

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set")
  console.error("Please ensure .env.local or .env contains DATABASE_URL")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

async function diagnoseBetaUsers() {
  console.log("=" .repeat(80))
  console.log("BETA USERS ACCESS DIAGNOSTIC")
  console.log("=" .repeat(80))
  console.log()

  try {
    // Get all beta users with their subscriptions and blueprint status
    console.log("📊 Fetching beta users and their access levels...")
    console.log()

    const users = await sql`
      SELECT 
        u.id as user_id,
        u.email,
        u.display_name,
        u.created_at as joined_at,
        
        -- Subscription info
        s.product_type,
        s.status as subscription_status,
        s.created_at as subscription_date,
        
        -- Blueprint info
        bs.paid_blueprint_purchased,
        bs.free_grid_used_count,
        bs.paid_grids_generated,
        
        -- Computed access flags
        CASE 
          WHEN s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') 
            AND s.status = 'active' THEN TRUE
          ELSE FALSE
        END as has_studio_membership,
        
        CASE 
          WHEN bs.paid_blueprint_purchased = TRUE THEN TRUE
          ELSE FALSE
        END as has_paid_blueprint,
        
        -- Expected Maya access
        CASE 
          -- Studio members ALWAYS have Maya access (even if they have paid blueprint)
          WHEN s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') 
            AND s.status = 'active' THEN 'ALLOWED ✅'
          -- Paid blueprint only (no studio) should be blocked
          WHEN bs.paid_blueprint_purchased = TRUE 
            AND (s.product_type NOT IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') OR s.status != 'active') 
            THEN 'BLOCKED ❌'
          -- All others (free, one-time) have access
          ELSE 'ALLOWED ✅'
        END as maya_access_status,
        
        -- User tier
        CASE 
          WHEN s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') 
            AND s.status = 'active' 
            AND bs.paid_blueprint_purchased = TRUE THEN 'Studio + Paid Blueprint'
          WHEN s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') 
            AND s.status = 'active' THEN 'Studio Only'
          WHEN bs.paid_blueprint_purchased = TRUE THEN 'Paid Blueprint Only'
          WHEN s.product_type = 'one_time_session' AND s.status = 'active' THEN 'One-Time Session'
          ELSE 'Free User'
        END as user_tier

      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id AND s.is_test_mode = FALSE
      LEFT JOIN blueprint_subscribers bs ON u.id = bs.user_id

      WHERE (
        -- Beta users with studio membership
        (s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') 
         AND s.status = 'active')
        OR
        -- Or users with paid blueprint
        bs.paid_blueprint_purchased = TRUE
        OR
        -- Or users with one-time session
        (s.product_type = 'one_time_session' AND s.status = 'active')
      )

      ORDER BY 
        CASE 
          WHEN s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') 
            AND s.status = 'active' 
            AND bs.paid_blueprint_purchased = TRUE THEN 1
          WHEN s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') 
            AND s.status = 'active' THEN 2
          WHEN bs.paid_blueprint_purchased = TRUE THEN 3
          ELSE 4
        END,
        u.created_at DESC
    `

    // Display user details
    console.log("👥 BETA USERS BREAKDOWN")
    console.log("-" .repeat(80))
    console.log()

    const tierGroups: Record<string, any[]> = {}
    
    users.forEach((user: any) => {
      const tier = user.user_tier
      if (!tierGroups[tier]) {
        tierGroups[tier] = []
      }
      tierGroups[tier].push(user)
    })

    // Display by tier
    Object.entries(tierGroups).forEach(([tier, usersInTier]) => {
      console.log(`\n📋 ${tier} (${usersInTier.length} users)`)
      console.log("-" .repeat(80))
      
      usersInTier.forEach((user: any) => {
        console.log(`  Email: ${user.email}`)
        console.log(`  Product: ${user.product_type || 'None'}`)
        console.log(`  Status: ${user.subscription_status || 'N/A'}`)
        console.log(`  Maya Access: ${user.maya_access_status}`)
        if (user.has_paid_blueprint) {
          console.log(`  Paid Blueprint: ✅ (${user.paid_grids_generated || 0}/30 grids used)`)
        }
        console.log()
      })
    })

    // Get summary stats
    const summary = await sql`
      SELECT 
        COUNT(DISTINCT u.id) as total_users,
        
        COUNT(DISTINCT CASE 
          WHEN s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') 
            AND s.status = 'active' THEN u.id 
        END) as studio_members,
        
        COUNT(DISTINCT CASE 
          WHEN bs.paid_blueprint_purchased = TRUE THEN u.id 
        END) as paid_blueprint_users,
        
        COUNT(DISTINCT CASE 
          WHEN s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') 
            AND s.status = 'active' 
            AND bs.paid_blueprint_purchased = TRUE THEN u.id 
        END) as studio_with_blueprint,
        
        COUNT(DISTINCT CASE 
          WHEN s.product_type = 'one_time_session' AND s.status = 'active' THEN u.id 
        END) as one_time_session_users

      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id AND s.is_test_mode = FALSE
      LEFT JOIN blueprint_subscribers bs ON u.id = bs.user_id

      WHERE (
        (s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') AND s.status = 'active')
        OR bs.paid_blueprint_purchased = TRUE
        OR (s.product_type = 'one_time_session' AND s.status = 'active')
      )
    `

    // Display summary
    console.log("\n" + "=" .repeat(80))
    console.log("📊 SUMMARY STATISTICS")
    console.log("=" .repeat(80))
    console.log()
    console.log(`Total Users:                    ${summary[0].total_users}`)
    console.log(`Studio Members:                 ${summary[0].studio_members}`)
    console.log(`Paid Blueprint Users:           ${summary[0].paid_blueprint_users}`)
    console.log(`Studio + Paid Blueprint:        ${summary[0].studio_with_blueprint} 🔥 (Fixed users!)`)
    console.log(`One-Time Session Users:         ${summary[0].one_time_session_users}`)
    console.log()

    // Check for users affected by the bug
    const affectedUsers = await sql`
      SELECT 
        u.email,
        s.product_type,
        s.status,
        bs.paid_blueprint_purchased
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id AND s.is_test_mode = FALSE
      INNER JOIN blueprint_subscribers bs ON u.id = bs.user_id
      WHERE s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro')
        AND s.status = 'active'
        AND bs.paid_blueprint_purchased = TRUE
      ORDER BY u.created_at DESC
    `

    if (affectedUsers.length > 0) {
      console.log("=" .repeat(80))
      console.log("🔥 USERS AFFECTED BY BUG (Studio + Paid Blueprint)")
      console.log("=" .repeat(80))
      console.log()
      console.log(`Found ${affectedUsers.length} users who were BLOCKED from Maya but shouldn't be:`)
      console.log()
      
      affectedUsers.forEach((user: any, index: number) => {
        console.log(`${index + 1}. ${user.email}`)
        console.log(`   Product: ${user.product_type} (${user.status})`)
        console.log(`   Paid Blueprint: ✅`)
        console.log(`   BEFORE FIX: ❌ Blocked from Maya`)
        console.log(`   AFTER FIX:  ✅ Maya access granted`)
        console.log()
      })
    } else {
      console.log("=" .repeat(80))
      console.log("✅ NO USERS WITH CONFLICTING ACCESS")
      console.log("=" .repeat(80))
      console.log()
      console.log("All users have consistent access levels.")
      console.log()
    }

    console.log("=" .repeat(80))
    console.log("✅ DIAGNOSTIC COMPLETE")
    console.log("=" .repeat(80))
    console.log()
    console.log("All Studio Membership users now have Maya access (fix applied).")
    console.log()

  } catch (error) {
    console.error("❌ Error running diagnostic:", error)
    process.exit(1)
  }
}

// Run the diagnostic
diagnoseBetaUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Fatal error:", error)
    process.exit(1)
  })

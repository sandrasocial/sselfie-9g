/**
 * Test User Helper Utilities
 * 
 * Creates and manages test users with paid blueprint access for E2E testing
 * Bypasses Stripe checkout by directly setting up database records
 */

import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

// Get database connection (for test environment)
function getTestDb() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
      'Please ensure .env.local contains DATABASE_URL or set it in your environment.'
    )
  }
  return neon(dbUrl)
}

/**
 * Create or get test user and grant paid blueprint access
 * 
 * @param email - Test user email
 * @param name - Test user name (optional)
 * @returns User ID
 */
export async function createTestUser(email: string, name: string = 'Test User') {
  const sql = getTestDb()

  // 1. Get or create user (users table uses TEXT id - Supabase UUID)
  // Note: In tests, we need to create via Supabase auth first, then get the ID
  // For now, we'll assume user exists and just grant access
  const [user] = await sql`
    SELECT id FROM users WHERE email = ${email} LIMIT 1
  ` as any[]

  if (!user || !user.id) {
    throw new Error(
      `User with email ${email} not found. ` +
      'Please create account via sign up flow first, or create via Supabase auth.'
    )
  }

  const userId = user.id

  // 2. Create subscription record (paid_blueprint)
  const testSubscriptionId = `test_playwright_${Date.now()}_${Math.random().toString(36).substring(7)}`
  const testCustomerId = `test_customer_${Date.now()}`

  await sql`
    INSERT INTO subscriptions (
      user_id,
      stripe_subscription_id,
      stripe_customer_id,
      plan_name,
      status,
      current_period_start,
      current_period_end,
      created_at,
      updated_at
    )
    VALUES (
      ${userId},
      ${testSubscriptionId},
      ${testCustomerId},
      'paid_blueprint',
      'active',
      NOW(),
      NOW() + interval '1 year',
      NOW(),
      NOW()
    )
    ON CONFLICT (stripe_subscription_id) DO UPDATE SET
      status = 'active',
      updated_at = NOW()
  `

  // 3. Grant 60 credits
  await sql`
    INSERT INTO user_credits (user_id, balance, total_purchased, total_used)
    VALUES (${userId}, 60, 60, 0)
    ON CONFLICT (user_id)
    DO UPDATE SET
      balance = user_credits.balance + 60,
      total_purchased = user_credits.total_purchased + 60
  `

  // 4. Update blueprint_subscribers (if record exists)
  await sql`
    UPDATE blueprint_subscribers
    SET 
      paid_blueprint_purchased = TRUE,
      paid_blueprint_purchased_at = NOW(),
      updated_at = NOW()
    WHERE user_id = ${userId}
  `

  // 5. Reset welcome wizard flag (so it shows for first-time paid users)
  await sql`
    UPDATE user_personal_brand
    SET feed_planner_welcome_shown = FALSE
    WHERE user_id = ${userId}
  `

  console.log(`[Test Helper] ✅ Granted paid blueprint access to user ${userId} (${email})`)

  return userId
}

/**
 * Cleanup test user data
 * 
 * Removes test subscriptions and resets credits
 * Does NOT delete the user account (created via Supabase auth)
 * 
 * @param email - Test user email
 */
export async function cleanupTestUser(email: string) {
  const sql = getTestDb()

  const [user] = await sql`
    SELECT id FROM users WHERE email = ${email} LIMIT 1
  ` as any[]

  if (!user || !user.id) {
    console.log(`[Test Helper] User ${email} not found, skipping cleanup`)
    return
  }

  const userId = user.id

  // Delete test subscriptions
  await sql`
    DELETE FROM subscriptions
    WHERE user_id = ${userId}
    AND stripe_subscription_id LIKE 'test_playwright_%'
  `

  // Reset credits (but don't delete record - keep for history)
  await sql`
    UPDATE user_credits
    SET balance = 0, total_purchased = 0, total_used = 0
    WHERE user_id = ${userId}
  `

  // Reset blueprint subscriber
  await sql`
    UPDATE blueprint_subscribers
    SET 
      paid_blueprint_purchased = FALSE,
      paid_blueprint_purchased_at = NULL,
      updated_at = NOW()
    WHERE user_id = ${userId}
  `

  // Reset welcome wizard flag
  await sql`
    UPDATE user_personal_brand
    SET feed_planner_welcome_shown = FALSE
    WHERE user_id = ${userId}
  `

  console.log(`[Test Helper] ✅ Cleaned up test data for user ${userId} (${email})`)
}

/**
 * Set user credits to specific amount (for testing credit-based flows)
 * 
 * @param email - User email
 * @param balance - Credit balance to set
 * @param totalUsed - Total credits used (for upsell modal trigger)
 */
export async function setUserCredits(email: string, balance: number, totalUsed: number = 0) {
  const sql = getTestDb()

  const [user] = await sql`
    SELECT id FROM users WHERE email = ${email} LIMIT 1
  ` as any[]

  if (!user || !user.id) {
    throw new Error(`User with email ${email} not found`)
  }

  const userId = user.id

  await sql`
    INSERT INTO user_credits (user_id, balance, total_purchased, total_used)
    VALUES (${userId}, ${balance}, ${balance}, ${totalUsed})
    ON CONFLICT (user_id)
    DO UPDATE SET
      balance = ${balance},
      total_used = ${totalUsed}
  `

  console.log(`[Test Helper] ✅ Set credits for user ${userId}: balance=${balance}, total_used=${totalUsed}`)
}

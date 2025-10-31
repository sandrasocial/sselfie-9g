import { sql } from "@/lib/neon"

export type UserTier = "starter" | "pro" | "elite"

/**
 * Get user's subscription tier from the subscriptions table
 * This is the single source of truth for user tiers
 */
export async function getUserTier(userId: string): Promise<UserTier> {
  try {
    // First, check the subscriptions table (source of truth)
    const subscriptions = await sql`
      SELECT plan, status FROM subscriptions 
      WHERE user_id = ${userId} 
      AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (subscriptions.length > 0) {
      const plan = subscriptions[0].plan

      // Map plan names to tiers
      if (plan === "elite" || plan === "enterprise") return "elite"
      if (plan === "pro" || plan === "professional") return "pro"
      if (plan === "starter" || plan === "foundation") return "starter"
    }

    // Fallback: check users table for legacy plans
    const users = await sql`
      SELECT plan FROM users WHERE id = ${userId} LIMIT 1
    `

    if (users.length > 0 && users[0].plan) {
      const plan = users[0].plan

      // Map legacy plan names
      if (plan === "sselfie-studio" || plan === "elite" || plan === "enterprise") return "elite"
      if (plan === "pro" || plan === "professional") return "pro"
    }

    // Default to starter
    return "starter"
  } catch (error) {
    console.error("[v0] Error getting user tier:", error)
    return "starter"
  }
}

/**
 * Get user's subscription details
 */
export async function getUserSubscription(userId: string) {
  try {
    const subscriptions = await sql`
      SELECT * FROM subscriptions 
      WHERE user_id = ${userId} 
      AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (subscriptions.length > 0) {
      return subscriptions[0]
    }

    return null
  } catch (error) {
    console.error("[v0] Error getting user subscription:", error)
    return null
  }
}

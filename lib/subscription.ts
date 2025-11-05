import { sql } from "@/lib/neon"

export type ProductType = "one_time_session" | "sselfie_studio_membership"
export type SubscriptionStatus = "active" | "cancelled" | "expired"

/**
 * Get user's active product/subscription
 * Returns the product type and status
 */
export async function getUserSubscription(userId: string) {
  try {
    const subscriptions = await sql`
      SELECT 
        product_type,
        status,
        stripe_subscription_id,
        stripe_customer_id,
        current_period_start,
        current_period_end,
        created_at
      FROM subscriptions 
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

/**
 * Check if user has active Studio Membership
 */
export async function hasStudioMembership(userId: string): Promise<boolean> {
  try {
    const subscription = await getUserSubscription(userId)
    return subscription?.product_type === "sselfie_studio_membership" && subscription?.status === "active"
  } catch (error) {
    console.error("[v0] Error checking studio membership:", error)
    return false
  }
}

/**
 * Check if user has purchased a one-time session
 */
export async function hasOneTimeSession(userId: string): Promise<boolean> {
  try {
    const sessions = await sql`
      SELECT id FROM subscriptions 
      WHERE user_id = ${userId} 
      AND product_type = 'one_time_session'
      AND status = 'active'
      LIMIT 1
    `
    return sessions.length > 0
  } catch (error) {
    console.error("[v0] Error checking one-time session:", error)
    return false
  }
}

/**
 * Get user's product access level
 * Returns: null (no access), 'one_time_session', or 'sselfie_studio_membership'
 */
export async function getUserProductAccess(userId: string): Promise<ProductType | null> {
  try {
    const subscription = await getUserSubscription(userId)

    if (!subscription) {
      return null
    }

    return subscription.product_type as ProductType
  } catch (error) {
    console.error("[v0] Error getting user product access:", error)
    return null
  }
}

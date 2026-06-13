import { sql } from "@/lib/db/client"
import { SUBSCRIPTION_CREDITS, getUserCredits } from "@/lib/credits"
import { shouldEnforceLiveSubscriptionRows } from "@/lib/subscription"

type UpgradeType = "high_usage" | "frequent_topups" | "credit_depletion" | "unknown_plan"
type UpgradePriority = "high" | "medium" | "low"

export interface UpgradeOpportunity {
  type: UpgradeType
  priority: UpgradePriority
  message: string
  suggestedTier: "sselfie_studio_membership"
  context: Record<string, unknown>
  showUpgradePrompt: boolean
}

// Thresholds can be tuned without touching detection logic
const THRESHOLDS = {
  usageRatio: 0.8, // 80% of monthly grant
  topupsIn30Days: 3,
  lowCreditBalance: 50,
}

/**
 * Detect upgrade opportunities for a user based on credit usage and purchase patterns.
 * This is intentionally lightweight and safe: when data is missing, it returns no prompts.
 */
export async function detectUpgradeOpportunities(userId: string): Promise<UpgradeOpportunity[]> {
  try {
    const [subscription, currentBalance, usageLast30, topupsLast30] = await Promise.all([
      getActiveSubscription(userId),
      getUserCredits(userId),
      getUsageLast30Days(userId),
      getTopupsLast30Days(userId),
    ])

    const opportunities: UpgradeOpportunity[] = []
    const productType = subscription?.product_type as keyof typeof SUBSCRIPTION_CREDITS | undefined
    const monthlyGrant = productType ? SUBSCRIPTION_CREDITS[productType] ?? 0 : 0
    // Only suggest Creator Studio for users without subscriptions
    // Users already on Creator Studio should consider credit top-ups instead
    const suggestedTier = "sselfie_studio_membership"

    // High usage: using most of monthly allocation
    if (monthlyGrant > 0) {
      const usageRatio = monthlyGrant > 0 ? Math.abs(usageLast30) / monthlyGrant : 0
      if (usageRatio >= THRESHOLDS.usageRatio) {
        opportunities.push({
          type: "high_usage",
          priority: "high",
          message: "You’re consistently using most of your monthly credits—upgrade for more capacity.",
          suggestedTier,
          context: { usageLast30, monthlyGrant, usageRatio },
          showUpgradePrompt: true,
        })
      }
    }

    // Frequent top-ups: buying credits often
    if (topupsLast30 >= THRESHOLDS.topupsIn30Days) {
      opportunities.push({
        type: "frequent_topups",
        priority: "high",
        message: "You’re purchasing credits often—save with a higher tier that includes more credits.",
        suggestedTier,
        context: { topupsLast30 },
        showUpgradePrompt: true,
      })
    }

    // Low balance pattern: consistently running near empty
    if (currentBalance > 0 && currentBalance <= THRESHOLDS.lowCreditBalance) {
      opportunities.push({
        type: "credit_depletion",
        priority: "medium",
        message: "Avoid running out of credits—upgrade to increase your monthly balance.",
        suggestedTier,
        context: { currentBalance },
        showUpgradePrompt: true,
      })
    }

    // Users without a known plan but showing activity
    if (!productType && Math.abs(usageLast30) > 0) {
      opportunities.push({
        type: "unknown_plan",
        priority: "low",
        message: "Unlock full Studio access and monthly credits with a membership.",
        suggestedTier: "sselfie_studio_membership",
        context: { usageLast30 },
        showUpgradePrompt: true,
      })
    }

    return opportunities
  } catch (error) {
    console.error("[v0] [UPGRADE] Error detecting upgrade opportunities:", error)
    return []
  }
}

async function getActiveSubscription(userId: string) {
  const enforceLiveMode = shouldEnforceLiveSubscriptionRows()
  const result =
    (await sql`
      SELECT product_type, status 
      FROM subscriptions 
      WHERE user_id = ${userId} AND status = 'active'
        AND (${enforceLiveMode} = false OR COALESCE(is_test_mode, false) = false)
      ORDER BY created_at DESC
      LIMIT 1
    `) ?? []
  return result[0] || null
}

async function getUsageLast30Days(userId: string): Promise<number> {
  const result =
    (await sql`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM credit_transactions
      WHERE user_id = ${userId}
        AND amount < 0
        AND created_at >= NOW() - INTERVAL '30 days'
    `) ?? []
  return Number(result[0]?.total || 0) * -1 // amount is negative for usage
}

async function getTopupsLast30Days(userId: string): Promise<number> {
  const result =
    (await sql`
      SELECT COUNT(*) AS total
      FROM credit_transactions
      WHERE user_id = ${userId}
        AND transaction_type = 'purchase'
        AND created_at >= NOW() - INTERVAL '30 days'
    `) ?? []
  return Number(result[0]?.total || 0)
}

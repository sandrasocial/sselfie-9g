import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createServerClient } from "@/lib/supabase/server"
import {
  calculateTotalRevenue,
  calculateMRR,
  calculateCreditCost,
  calculateReferralBonusCost,
  calculateGrossMargin,
  estimateClaudeCostPerActiveUser,
  COST_PER_CREDIT,
  REFERRAL_BONUS_COST,
} from "@/lib/admin/metrics"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Check if user has admin access
 */
async function checkAdminAccess(): Promise<boolean> {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return false
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return false
    }

    const adminCheck = await sql`
      SELECT role FROM users WHERE id = ${user.id} LIMIT 1
    `

    if (!adminCheck[0] || adminCheck[0].role !== "admin") {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * GET /api/admin/growth-dashboard
 * 
 * Aggregates key business metrics for Growth Dashboard
 * Read-only queries from existing tables
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const isAdmin = await checkAdminAccess()
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    console.log("[v0] [Growth Dashboard] Starting metrics aggregation...")

    // 1. Revenue Metrics
    const totalRevenue = await calculateTotalRevenue()
    const mrr = await calculateMRR()

    // 2. User Metrics
    const [userStats] = await sql`
      SELECT 
        COUNT(*)::int as total_users,
        COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '30 days')::int as active_users
      FROM users
      WHERE email IS NOT NULL
    `

    const totalUsers = userStats?.total_users || 0
    const activeUsers = userStats?.active_users || 0

    // 3. Subscription Metrics
    const [subscriptionStats] = await sql`
      SELECT 
        COUNT(*)::int as active_subscriptions
      FROM subscriptions
      WHERE status = 'active'
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
    `

    const activeSubscriptions = subscriptionStats?.active_subscriptions || 0

    // 4. Credit Metrics
    const [creditStats] = await sql`
      SELECT 
        COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0)::int as total_issued,
        COALESCE(SUM(ABS(amount)) FILTER (WHERE amount < 0 AND transaction_type IN ('image', 'training', 'animation')), 0)::int as total_spent,
        COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'bonus' AND amount > 0), 0)::int as bonus_credits
      FROM credit_transactions
      WHERE (is_test_mode = FALSE OR is_test_mode IS NULL)
    `

    const totalCreditsIssued = creditStats?.total_issued || 0
    const totalCreditsSpent = creditStats?.total_spent || 0
    const bonusCredits = creditStats?.bonus_credits || 0
    const avgCreditUsage = activeUsers > 0 ? Math.round((totalCreditsSpent / activeUsers) * 100) / 100 : 0

    // 5. Credit Costs
    const creditCost = await calculateCreditCost()
    const referralBonusCost = await calculateReferralBonusCost()

    // 6. Referral Metrics
    const [referralStats] = await sql`
      SELECT 
        COUNT(*)::int as total_referrals,
        COUNT(*) FILTER (WHERE status = 'completed')::int as completed_referrals
      FROM referrals
    `

    const totalReferrals = referralStats?.total_referrals || 0
    const completedReferrals = referralStats?.completed_referrals || 0
    const referralConversionRate = totalReferrals > 0
      ? Math.round((completedReferrals / totalReferrals) * 100 * 100) / 100
      : 0

    // 7. Email Metrics
    const [emailStats] = await sql`
      SELECT 
        COUNT(*)::int as total_sends,
        COUNT(*) FILTER (WHERE email_type IN ('upsell-day-10', 'upsell-freebie-membership'))::int as upsell_emails
      FROM email_logs
    `

    const totalEmailSends = emailStats?.total_sends || 0
    const upsellEmails = emailStats?.upsell_emails || 0

    // 8. Claude API Cost Estimate
    const avgClaudeCost = await estimateClaudeCostPerActiveUser()
    const totalClaudeCost = activeUsers * avgClaudeCost

    // 9. Total Costs
    const totalCosts = creditCost + referralBonusCost + totalClaudeCost

    // 10. Gross Margin
    const grossMargin = calculateGrossMargin(totalRevenue, totalCosts)

    // 11. Automation Status (Environment Flags)
    const automationStatus = {
      milestoneBonuses: process.env.MILESTONE_BONUSES_ENABLED === "true",
      referralBonuses: process.env.REFERRAL_BONUSES_ENABLED === "true",
      creditGifts: process.env.CREDIT_GIFTS_ENABLED === "true",
    }

    // 12. Calculate ARPU (Average Revenue Per User)
    const arpu = totalUsers > 0 ? Math.round((totalRevenue / totalUsers) * 100) / 100 : 0

    // 13. Calculate Referral ROI
    // Revenue from referred users who converted (estimated: completed referrals × $97 MRR potential)
    // This is a simplified calculation - actual revenue would require tracking referred user purchases
    const referralRevenuePotential = completedReferrals * 97 // $97/month per conversion
    const referralROI = referralBonusCost > 0
      ? Math.round(((referralRevenuePotential - referralBonusCost) / referralBonusCost) * 100 * 100) / 100
      : 0

    const response = {
      summary: {
        revenue: Math.round(totalRevenue * 100) / 100,
        creditCost: Math.round(creditCost * 100) / 100,
        referralCost: Math.round(referralBonusCost * 100) / 100,
        claudeCost: Math.round(totalClaudeCost * 100) / 100,
        totalCosts: Math.round(totalCosts * 100) / 100,
        grossMargin: grossMargin,
      },
      metrics: {
        activeUsers,
        mrr: Math.round(mrr * 100) / 100,
        totalUsers,
        activeSubscriptions,
        referralConversionRate,
        avgCreditUsage,
        avgClaudeCost: Math.round(avgClaudeCost * 100) / 100,
        arpu: Math.round(arpu * 100) / 100,
        referralROI,
      },
      credits: {
        totalIssued: totalCreditsIssued,
        totalSpent: totalCreditsSpent,
        bonusCredits,
        avgUsagePerActiveUser: avgCreditUsage,
      },
      referrals: {
        total: totalReferrals,
        completed: completedReferrals,
        conversionRate: referralConversionRate,
        bonusCost: Math.round(referralBonusCost * 100) / 100,
        revenuePotential: referralRevenuePotential,
        roi: referralROI,
      },
      email: {
        totalSends: totalEmailSends,
        upsellEmails,
      },
      automation: automationStatus,
      timestamp: new Date().toISOString(),
    }

    console.log("[v0] [Growth Dashboard] Metrics aggregated successfully")

    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] [Growth Dashboard] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch metrics" },
      { status: 500 },
    )
  }
}

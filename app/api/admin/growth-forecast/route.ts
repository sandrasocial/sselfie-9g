import { type NextRequest, NextResponse } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createServerClient } from "@/lib/supabase/server"
import { neon } from "@neondatabase/serverless"
import { generateForecast } from "@/lib/admin/forecast"
import {
  calculateTotalRevenue,
  calculateMRR,
  calculateCreditCost,
  calculateReferralBonusCost,
  calculateGrossMargin,
  estimateClaudeCostPerActiveUser,
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
 * GET /api/admin/growth-forecast
 * 
 * Returns current metrics, forecast, and trend analysis
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const isAdmin = await checkAdminAccess()
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    console.log("[v0] [Growth Forecast] Generating forecast...")

    // Get current metrics
    const currentRevenue = await calculateTotalRevenue()
    const currentMRR = await calculateMRR()
    const currentCreditCost = await calculateCreditCost()
    const currentReferralCost = await calculateReferralBonusCost()
    const avgClaudeCost = await estimateClaudeCostPerActiveUser()

    const [userStats] = await sql`
      SELECT COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '30 days')::int as active_users
      FROM users
      WHERE email IS NOT NULL
    `
    const activeUsers = userStats?.active_users || 0
    const currentClaudeCost = activeUsers * avgClaudeCost
    const currentTotalCosts = currentCreditCost + currentReferralCost + currentClaudeCost
    const currentGrossMargin = calculateGrossMargin(currentRevenue, currentTotalCosts)

    // Get forecast
    const forecast = await generateForecast()

    // Calculate trend changes
    const mrrChange = currentMRR > 0
      ? ((forecast.mrrForecast - currentMRR) / currentMRR) * 100
      : 0
    const marginChange = forecast.grossMarginForecast - currentGrossMargin

    return NextResponse.json({
      success: true,
      current: {
        revenue: Math.round(currentRevenue * 100) / 100,
        mrr: Math.round(currentMRR * 100) / 100,
        creditCost: Math.round(currentCreditCost * 100) / 100,
        referralCost: Math.round(currentReferralCost * 100) / 100,
        claudeCost: Math.round(currentClaudeCost * 100) / 100,
        totalCosts: Math.round(currentTotalCosts * 100) / 100,
        grossMargin: Math.round(currentGrossMargin * 100) / 100,
      },
      forecast: {
        nextMonth: forecast.nextMonth,
        revenueForecast: forecast.revenueForecast,
        mrrForecast: forecast.mrrForecast,
        creditCostForecast: forecast.creditCostForecast,
        referralCostForecast: forecast.referralCostForecast,
        claudeCostForecast: forecast.claudeCostForecast,
        totalCostsForecast: forecast.totalCostsForecast,
        grossMarginForecast: forecast.grossMarginForecast,
        confidence: forecast.confidence,
        trend: forecast.trend,
      },
      trend: {
        mrrChange: `${mrrChange >= 0 ? "+" : ""}${mrrChange.toFixed(1)}%`,
        marginChange: `${marginChange >= 0 ? "+" : ""}${marginChange.toFixed(1)}%`,
        forecastConfidence: forecast.confidence,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] [Growth Forecast] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate forecast" },
      { status: 500 },
    )
  }
}

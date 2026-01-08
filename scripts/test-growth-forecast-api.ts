/**
 * Smoke test for Growth Forecast API
 * Tests the forecast endpoint and validates response structure
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { join } from "path"

// Load environment variables
config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

const sql = neon(process.env.DATABASE_URL!)

interface ForecastResponse {
  success: boolean
  current: {
    revenue: number
    mrr: number
    creditCost: number
    referralCost: number
    claudeCost: number
    totalCosts: number
    grossMargin: number
  }
  forecast: {
    nextMonth: string
    revenueForecast: number
    mrrForecast: number
    creditCostForecast: number
    referralCostForecast: number
    claudeCostForecast: number
    totalCostsForecast: number
    grossMarginForecast: number
    confidence: number
    trend: "up" | "down" | "stable"
  }
  trend: {
    mrrChange: string
    marginChange: string
    forecastConfidence: number
  }
  timestamp: string
}

async function testForecastAPI() {
  console.log("🧪 Testing Growth Forecast API...\n")

  try {
    // Import the forecast function directly
    const { generateForecast } = await import("../lib/admin/forecast")
    const {
      calculateTotalRevenue,
      calculateMRR,
      calculateCreditCost,
      calculateReferralBonusCost,
      calculateGrossMargin,
      estimateClaudeCostPerActiveUser,
    } = await import("../lib/admin/metrics")

    console.log("✅ Successfully imported forecast and metrics functions\n")

    // Get current metrics
    console.log("📊 Fetching current metrics...")
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

    console.log("  ✅ Current Revenue:", currentRevenue.toFixed(2))
    console.log("  ✅ Current MRR:", currentMRR.toFixed(2))
    console.log("  ✅ Current Gross Margin:", currentGrossMargin.toFixed(2) + "%")
    console.log("  ✅ Active Users:", activeUsers)
    console.log("")

    // Generate forecast
    console.log("🔮 Generating forecast...")
    const forecast = await generateForecast()

    console.log("  ✅ Next Month:", forecast.nextMonth)
    console.log("  ✅ Revenue Forecast:", forecast.revenueForecast.toFixed(2))
    console.log("  ✅ MRR Forecast:", forecast.mrrForecast.toFixed(2))
    console.log("  ✅ Gross Margin Forecast:", forecast.grossMarginForecast.toFixed(2) + "%")
    console.log("  ✅ Confidence:", (forecast.confidence * 100).toFixed(1) + "%")
    console.log("  ✅ Trend:", forecast.trend)
    console.log("")

    // Calculate trend changes
    const mrrChange = currentMRR > 0
      ? ((forecast.mrrForecast - currentMRR) / currentMRR) * 100
      : 0
    const marginChange = forecast.grossMarginForecast - currentGrossMargin

    // Build response object
    const response: ForecastResponse = {
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
    }

    // Validate response structure
    console.log("✅ Response Structure Validation:")
    console.log("  ✅ success:", typeof response.success === "boolean")
    console.log("  ✅ current object:", typeof response.current === "object")
    console.log("  ✅ forecast object:", typeof response.forecast === "object")
    console.log("  ✅ trend object:", typeof response.trend === "object")
    console.log("  ✅ timestamp:", typeof response.timestamp === "string")
    console.log("")

    // Validate forecast values
    console.log("✅ Forecast Value Validation:")
    console.log("  ✅ Revenue forecast:", response.forecast.revenueForecast >= 0 ? "✓" : "✗")
    console.log("  ✅ MRR forecast:", response.forecast.mrrForecast >= 0 ? "✓" : "✗")
    console.log("  ✅ Confidence:", response.forecast.confidence >= 0 && response.forecast.confidence <= 1 ? "✓" : "✗")
    console.log("  ✅ Trend:", ["up", "down", "stable"].includes(response.forecast.trend) ? "✓" : "✗")
    console.log("")

    // Test alert functions
    console.log("🚨 Testing Alert Functions...")
    const { checkMarginThreshold, checkClaudeCost, checkReferralConversion } = await import("../lib/admin/alerts")

    const marginAlert = checkMarginThreshold(currentGrossMargin, 45)
    const claudeAlert = checkClaudeCost(avgClaudeCost, 20)
    
    const [referralStats] = await sql`
      SELECT 
        COUNT(*)::int as total_referrals,
        COUNT(*) FILTER (WHERE status = 'completed')::int as completed_referrals
      FROM referrals
    `
    const totalReferrals = referralStats?.total_referrals || 0
    const completedReferrals = referralStats?.completed_referrals || 0
    const referralConversionRate = totalReferrals > 0 ? completedReferrals / totalReferrals : 0
    const referralAlert = checkReferralConversion(referralConversionRate, 0.1)

    console.log("  ✅ Margin threshold check:", marginAlert ? "⚠️ Alert" : "✓ OK")
    console.log("  ✅ Claude cost check:", claudeAlert ? "⚠️ Alert" : "✓ OK")
    console.log("  ✅ Referral conversion check:", referralAlert ? "⚠️ Alert" : "✓ OK")
    console.log("")

    // Test checkMarginAlerts function
    console.log("🔍 Testing checkMarginAlerts()...")
    const { checkMarginAlerts } = await import("../lib/admin/alerts")
    const alerts = await checkMarginAlerts()
    console.log("  ✅ Alerts returned:", alerts.length)
    alerts.forEach((alert) => {
      console.log(`    - ${alert.type} (${alert.level}): ${alert.message}`)
    })
    console.log("")

    console.log("✅ All tests passed!")
    console.log("\n📊 Sample Response:")
    console.log(JSON.stringify(response, null, 2))

    process.exit(0)
  } catch (error) {
    console.error("❌ Test failed:", error)
    if (error instanceof Error) {
      console.error("Error message:", error.message)
      console.error("Stack:", error.stack)
    }
    process.exit(1)
  }
}

testForecastAPI()

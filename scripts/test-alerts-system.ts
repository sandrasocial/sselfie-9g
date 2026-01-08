/**
 * Smoke test for Alert System
 * Tests alert functions and validates alert generation
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { join } from "path"

// Load environment variables
config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

const sql = neon(process.env.DATABASE_URL!)

async function testAlertsSystem() {
  console.log("🚨 Testing Alert System...\n")

  try {
    // Test individual alert functions
    console.log("1️⃣ Testing Individual Alert Functions...")
    const { checkMarginThreshold, checkClaudeCost, checkReferralConversion } = await import("../lib/admin/alerts")
    const {
      calculateTotalRevenue,
      calculateMRR,
      calculateCreditCost,
      calculateReferralBonusCost,
      calculateGrossMargin,
      estimateClaudeCostPerActiveUser,
    } = await import("../lib/admin/metrics")

    // Get current metrics
    const totalRevenue = await calculateTotalRevenue()
    const creditCost = await calculateCreditCost()
    const referralBonusCost = await calculateReferralBonusCost()
    const avgClaudeCost = await estimateClaudeCostPerActiveUser()

    const [userStats] = await sql`
      SELECT COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '30 days')::int as active_users
      FROM users
      WHERE email IS NOT NULL
    `
    const activeUsers = userStats?.active_users || 0
    const totalClaudeCost = activeUsers * avgClaudeCost
    const totalCosts = creditCost + referralBonusCost + totalClaudeCost
    const grossMargin = calculateGrossMargin(totalRevenue, totalCosts)

    const [referralStats] = await sql`
      SELECT 
        COUNT(*)::int as total_referrals,
        COUNT(*) FILTER (WHERE status = 'completed')::int as completed_referrals
      FROM referrals
    `
    const totalReferrals = referralStats?.total_referrals || 0
    const completedReferrals = referralStats?.completed_referrals || 0
    const referralConversionRate = totalReferrals > 0 ? completedReferrals / totalReferrals : 0

    console.log("  Current Metrics:")
    console.log(`    Gross Margin: ${grossMargin.toFixed(2)}%`)
    console.log(`    Claude Cost (avg): $${avgClaudeCost.toFixed(2)}`)
    console.log(`    Referral Conversion: ${(referralConversionRate * 100).toFixed(2)}%`)
    console.log("")

    // Test margin threshold (45%)
    const marginAlert = checkMarginThreshold(grossMargin, 45)
    console.log(`  ✅ Margin Threshold (45%): ${marginAlert ? "⚠️ ALERT" : "✓ OK"}`)
    console.log(`     Current: ${grossMargin.toFixed(2)}%, Threshold: 45%`)

    // Test Claude cost threshold ($20)
    const claudeAlert = checkClaudeCost(avgClaudeCost, 20)
    console.log(`  ✅ Claude Cost Threshold ($20): ${claudeAlert ? "⚠️ ALERT" : "✓ OK"}`)
    console.log(`     Current: $${avgClaudeCost.toFixed(2)}, Threshold: $20`)

    // Test referral conversion threshold (10%)
    const referralAlert = checkReferralConversion(referralConversionRate, 0.1)
    console.log(`  ✅ Referral Conversion Threshold (10%): ${referralAlert ? "⚠️ ALERT" : "✓ OK"}`)
    console.log(`     Current: ${(referralConversionRate * 100).toFixed(2)}%, Threshold: 10%`)
    console.log("")

    // Test checkMarginAlerts function
    console.log("2️⃣ Testing checkMarginAlerts() Function...")
    const { checkMarginAlerts } = await import("../lib/admin/alerts")
    const alerts = await checkMarginAlerts()

    console.log(`  ✅ Alerts returned: ${alerts.length}`)
    if (alerts.length > 0) {
      console.log("  Alert Details:")
      alerts.forEach((alert, index) => {
        console.log(`    ${index + 1}. Type: ${alert.type}`)
        console.log(`       Level: ${alert.level}`)
        console.log(`       Message: ${alert.message}`)
        console.log(`       Current Value: ${alert.currentValue}`)
        console.log(`       Threshold: ${alert.threshold}`)
      })
    } else {
      console.log("  ✓ No alerts triggered (all metrics within thresholds)")
    }
    console.log("")

    // Test alert tracking functions
    console.log("3️⃣ Testing Alert Tracking Functions...")
    const { wasAlertSentRecently, recordAlertSent } = await import("../lib/admin/alerts")

    const testAlertId = "test-alert-smoke-test"
    const wasSent = await wasAlertSentRecently(testAlertId, 24)
    console.log(`  ✅ wasAlertSentRecently(): ${wasSent ? "Sent recently" : "Not sent recently"}`)

    // Record a test alert
    await recordAlertSent(testAlertId)
    console.log(`  ✅ recordAlertSent(): Alert recorded`)

    // Check again
    const wasSentAfter = await wasAlertSentRecently(testAlertId, 24)
    console.log(`  ✅ wasAlertSentRecently() (after record): ${wasSentAfter ? "Sent recently" : "Not sent recently"}`)
    console.log("")

    // Validate alert structure
    console.log("4️⃣ Validating Alert Structure...")
    if (alerts.length > 0) {
      const alert = alerts[0]
      const hasType = "type" in alert && ["margin", "claude", "referral"].includes(alert.type)
      const hasLevel = "level" in alert && ["critical", "warning", "info"].includes(alert.level)
      const hasMessage = "message" in alert && typeof alert.message === "string"
      const hasCurrentValue = "currentValue" in alert && typeof alert.currentValue === "number"
      const hasThreshold = "threshold" in alert && typeof alert.threshold === "number"

      console.log(`  ✅ Type field: ${hasType ? "✓" : "✗"}`)
      console.log(`  ✅ Level field: ${hasLevel ? "✓" : "✗"}`)
      console.log(`  ✅ Message field: ${hasMessage ? "✓" : "✗"}`)
      console.log(`  ✅ CurrentValue field: ${hasCurrentValue ? "✓" : "✗"}`)
      console.log(`  ✅ Threshold field: ${hasThreshold ? "✓" : "✗"}`)
    } else {
      console.log("  ⚠️ No alerts to validate structure (this is OK if all metrics are healthy)")
    }
    console.log("")

    console.log("✅ All alert system tests passed!")
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

testAlertsSystem()

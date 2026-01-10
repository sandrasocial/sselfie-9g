#!/usr/bin/env tsx

/**
 * End-to-End Blueprint Checkout Test Runner
 * 
 * This script performs automated checks and guides manual testing
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })

const sql = neon(process.env.DATABASE_URL!)

interface TestResult {
  name: string
  passed: boolean
  message: string
  details?: any
}

async function runE2ETest(): Promise<TestResult[]> {
  const results: TestResult[] = []

  console.log("=".repeat(80))
  console.log("🔬 Blueprint Checkout End-to-End Test Suite")
  console.log("=".repeat(80))
  console.log()

  // Test 1: Feature Flag Check
  console.log("Test 1: Feature Flag Configuration")
  const envFlag = process.env.FEATURE_PAID_BLUEPRINT_ENABLED
  let dbFlag: any[] = []
  try {
    dbFlag = await sql`
      SELECT value FROM admin_feature_flags
      WHERE key = 'paid_blueprint_enabled'
    `
  } catch (e) {
    // DB flag check may fail if table doesn't exist
  }

  const featureEnabled = envFlag === "true" || envFlag === "1" || (dbFlag.length > 0 && (dbFlag[0].value === true || dbFlag[0].value === "true"))
  
  results.push({
    name: "Feature Flag Enabled",
    passed: featureEnabled,
    message: featureEnabled
      ? "✅ Feature flag is ENABLED - checkout route accessible"
      : "⚠️ Feature flag is DISABLED - checkout route will return 404. Set FEATURE_PAID_BLUEPRINT_ENABLED=true in .env.local",
    details: { envFlag, dbFlag: dbFlag[0]?.value }
  })

  // Test 2: Stripe Price ID Configuration
  console.log("\nTest 2: Stripe Price ID Configuration")
  const stripePriceId = process.env.STRIPE_PAID_BLUEPRINT_PRICE_ID
  
  results.push({
    name: "Stripe Price ID Configured",
    passed: !!stripePriceId,
    message: stripePriceId
      ? `✅ Stripe Price ID configured: ${stripePriceId.substring(0, 20)}...`
      : "❌ STRIPE_PAID_BLUEPRINT_PRICE_ID not set in .env.local",
    details: { priceId: stripePriceId ? `${stripePriceId.substring(0, 30)}...` : null }
  })

  // Test 3: Database Tables Structure
  console.log("\nTest 3: Database Tables Structure")
  
  // Check each table individually with proper SQL syntax
  const tableChecks = [
    { name: "subscriptions", query: sql`SELECT COUNT(*) as count FROM subscriptions LIMIT 1` },
    { name: "blueprint_subscribers", query: sql`SELECT COUNT(*) as count FROM blueprint_subscribers LIMIT 1` },
    { name: "user_credits", query: sql`SELECT COUNT(*) as count FROM user_credits LIMIT 1` },
    { name: "credit_transactions", query: sql`SELECT COUNT(*) as count FROM credit_transactions LIMIT 1` },
    { name: "stripe_payments", query: sql`SELECT COUNT(*) as count FROM stripe_payments LIMIT 1` },
  ]

  for (const { name, query } of tableChecks) {
    try {
      const count = await query
      results.push({
        name: `Table: ${name}`,
        passed: true,
        message: `✅ Table '${name}' accessible`,
      })
    } catch (e: any) {
      results.push({
        name: `Table: ${name}`,
        passed: false,
        message: `❌ Table '${name}' error: ${e.message.substring(0, 100)}`,
      })
    }
  }

  // Test 4: Code Path Verification (checkout routes exist)
  console.log("\nTest 4: Code Path Verification")
  const fs = await import("fs")
  const path = await import("path")

  const requiredFiles = [
    "app/checkout/blueprint/page.tsx",
    "components/checkout/success-content.tsx",
    "app/api/webhooks/stripe/route.ts",
    "app/actions/stripe.ts",
    "app/actions/landing-checkout.ts",
  ]

  for (const file of requiredFiles) {
    const filePath = path.resolve(process.cwd(), file)
    const exists = fs.existsSync(filePath)
    results.push({
      name: `File: ${file}`,
      passed: exists,
      message: exists ? `✅ ${file} exists` : `❌ ${file} missing`,
    })
  }

  // Test 5: Check for existing test data
  console.log("\nTest 5: Existing Test Data")
  try {
    const existingPurchases = await sql`
      SELECT COUNT(*) as count
      FROM blueprint_subscribers
      WHERE paid_blueprint_purchased = TRUE
    `
    results.push({
      name: "Existing Paid Blueprint Purchases",
      passed: true,
      message: `✅ Found ${existingPurchases[0].count} existing purchase(s) (from old system)`,
      details: { count: existingPurchases[0].count }
    })
  } catch (e: any) {
    results.push({
      name: "Existing Paid Blueprint Purchases",
      passed: false,
      message: `❌ Error checking purchases: ${e.message}`,
    })
  }

  // Test 6: Verify webhook handler has Decision 2 logic
  console.log("\nTest 6: Webhook Implementation Check")
  try {
    const webhookContent = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/webhooks/stripe/route.ts"),
      "utf-8"
    )
    const hasDecision2 = webhookContent.includes("Decision 2: Prioritize user_id") || 
                         webhookContent.includes("user_id from session.metadata")
    results.push({
      name: "Webhook Decision 2 Logic",
      passed: hasDecision2,
      message: hasDecision2
        ? "✅ Webhook includes Decision 2 user_id prioritization logic"
        : "⚠️ Webhook may not have Decision 2 updates",
    })
  } catch (e: any) {
    results.push({
      name: "Webhook Implementation Check",
      passed: false,
      message: `❌ Error reading webhook file: ${e.message}`,
    })
  }

  // Test 7: Verify success page has Decision 2 redirect
  console.log("\nTest 7: Success Page Implementation Check")
  try {
    const successContent = fs.readFileSync(
      path.resolve(process.cwd(), "components/checkout/success-content.tsx"),
      "utf-8"
    )
    const hasRedirect = successContent.includes("/studio?tab=blueprint&purchase=success") ||
                        successContent.includes("Decision 2")
    results.push({
      name: "Success Page Redirect Logic",
      passed: hasRedirect,
      message: hasRedirect
        ? "✅ Success page includes Decision 2 redirect to Studio"
        : "⚠️ Success page may not have Decision 2 redirect logic",
    })
  } catch (e: any) {
    results.push({
      name: "Success Page Implementation Check",
      passed: false,
      message: `❌ Error reading success page: ${e.message}`,
    })
  }

  return results
}

async function main() {
  const results = await runE2ETest()

  console.log()
  console.log("=".repeat(80))
  console.log("📊 Test Results Summary")
  console.log("=".repeat(80))
  console.log()

  let passedCount = 0
  let failedCount = 0
  let warningCount = 0

  results.forEach((result) => {
    const icon = result.passed ? "✅" : result.message.includes("⚠️") ? "⚠️" : "❌"
    console.log(`${icon} ${result.name}`)
    console.log(`   ${result.message}`)
    if (result.details) {
      console.log(`   Details:`, JSON.stringify(result.details, null, 2).split("\n").map(l => `   ${l}`).join("\n"))
    }
    console.log()

    if (result.passed && !result.message.includes("⚠️")) {
      passedCount++
    } else if (result.message.includes("⚠️")) {
      warningCount++
    } else {
      failedCount++
    }
  })

  console.log("=".repeat(80))
  console.log(`Summary: ${passedCount} passed, ${warningCount} warnings, ${failedCount} failed`)
  console.log("=".repeat(80))
  console.log()

  // Manual Testing Instructions
  if (failedCount === 0) {
    console.log("✅ All automated checks passed!")
    console.log()
    console.log("📋 Next Steps - Manual Testing:")
    console.log()
    console.log("1. ENABLE FEATURE FLAG (if not already):")
    console.log("   Add to .env.local:")
    console.log("   FEATURE_PAID_BLUEPRINT_ENABLED=true")
    console.log()
    console.log("2. START DEV SERVER:")
    console.log("   npm run dev")
    console.log()
    console.log("3. TEST AUTHENTICATED USER FLOW:")
    console.log("   a. Sign in to Studio")
    console.log("   b. Navigate to: http://localhost:3000/checkout/blueprint")
    console.log("   c. Complete checkout with test card: 4242 4242 4242 4242")
    console.log("   d. Verify redirect to: /studio?tab=blueprint&purchase=success")
    console.log("   e. Verify Blueprint tab is active")
    console.log("   f. Verify 60 credits granted")
    console.log()
    console.log("4. VERIFY DATABASE (after purchase):")
    console.log(`   npx tsx scripts/test-blueprint-checkout.ts --test=authenticated --user-id={USER_ID}`)
    console.log()
    console.log("5. TEST UNAUTHENTICATED USER FLOW:")
    console.log("   a. Sign out")
    console.log("   b. Navigate to: http://localhost:3000/checkout/blueprint")
    console.log("   c. Complete checkout with test card and email")
    console.log("   d. Verify account creation form")
    console.log("   e. Create account")
    console.log("   f. Verify redirect to Studio")
    console.log()
  } else {
    console.log("❌ Some checks failed. Please fix issues above before manual testing.")
    console.log()
  }

  if (failedCount > 0) {
    process.exit(1)
  }
}

main().catch(console.error)

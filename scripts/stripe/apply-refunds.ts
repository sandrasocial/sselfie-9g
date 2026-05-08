/**
 * STRIPE REFUND APPLICATION SCRIPT
 * 
 * Applies partial refunds to customers who were overcharged.
 * 
 * SAFETY FEATURES:
 * - DRY-RUN by default (no mutations unless APPLY_REFUNDS=true)
 * - Logs all actions to refund_execution_log.json
 * - Supports partial refunds
 * - Validates amounts before refunding
 * - Idempotent (checks if refund already exists)
 * 
 * Usage:
 *   # Dry-run (shows what would happen):
 *   pnpm exec tsx scripts/stripe/apply-refunds.ts
 * 
 *   # Execute refunds:
 *   APPLY_REFUNDS=true pnpm exec tsx scripts/stripe/apply-refunds.ts
 */

import Stripe from "stripe"
import { config } from "dotenv"
import { resolve } from "path"
import { readFileSync, writeFileSync } from "fs"

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

const APPLY_REFUNDS = process.env.APPLY_REFUNDS === "true"

interface RefundCandidate {
  userId: string | null
  email: string
  stripeCustomerId: string
  paymentIntentId: string | null
  invoiceId: string | null
  chargeAmount: number
  expectedAmount: number
  deltaAmount: number
  reason: string
  recommendedAction: string
  details: string
}

interface RefundExecution {
  timestamp: string
  customerId: string
  email: string
  paymentIntentId: string
  originalAmount: number
  refundAmount: number
  refundId: string | null
  status: string
  error: string | null
  dryRun: boolean
}

async function loadRefundCandidates(): Promise<RefundCandidate[]> {
  const csvPath = resolve(process.cwd(), "docs/_CANONICAL/stripe_refund_candidates.csv")
  
  try {
    const csvContent = readFileSync(csvPath, "utf-8")
    const lines = csvContent.split("\n")
    const headers = lines[0].split(",")
    
    const candidates: RefundCandidate[] = []
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue
      
      // Parse CSV line (handle quoted fields)
      const values: string[] = []
      let current = ""
      let inQuotes = false
      
      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j]
        
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === "," && !inQuotes) {
          values.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }
      values.push(current.trim())
      
      const candidate: RefundCandidate = {
        userId: values[0] || null,
        email: values[1],
        stripeCustomerId: values[2],
        paymentIntentId: values[4] || null,
        invoiceId: values[5] || null,
        chargeAmount: parseFloat(values[7]) * 100,
        expectedAmount: parseFloat(values[10]) * 100,
        deltaAmount: parseFloat(values[11]) * 100,
        reason: values[12],
        recommendedAction: values[13],
        details: values[14].replace(/^"|"$/g, ''),
      }
      
      candidates.push(candidate)
    }
    
    return candidates
  } catch (error: any) {
    console.error("Error loading refund candidates:", error.message)
    console.error("Please run: pnpm exec tsx scripts/stripe/find-affected-users.ts")
    process.exit(1)
  }
}

async function checkExistingRefunds(paymentIntentId: string): Promise<boolean> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    
    const chargeId = typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id
    
    if (!chargeId) {
      return false
    }
    
    const refunds = await stripe.refunds.list({
      charge: chargeId,
      limit: 100,
    })
    
    return refunds.data.length > 0
  } catch (error: any) {
    console.error(`Error checking existing refunds: ${error.message}`)
    return false
  }
}

async function applyRefund(candidate: RefundCandidate): Promise<RefundExecution> {
  const execution: RefundExecution = {
    timestamp: new Date().toISOString(),
    customerId: candidate.stripeCustomerId,
    email: candidate.email,
    paymentIntentId: candidate.paymentIntentId || "",
    originalAmount: candidate.chargeAmount / 100,
    refundAmount: Math.abs(candidate.deltaAmount) / 100,
    refundId: null,
    status: "pending",
    error: null,
    dryRun: !APPLY_REFUNDS,
  }
  
  try {
    // Validate
    if (!candidate.paymentIntentId) {
      execution.status = "error"
      execution.error = "No payment intent ID"
      return execution
    }
    
    if (candidate.deltaAmount <= 0) {
      execution.status = "skipped"
      execution.error = "Not overcharged (delta <= 0)"
      return execution
    }
    
    // Check for existing refunds
    const hasExistingRefund = await checkExistingRefunds(candidate.paymentIntentId)
    
    if (hasExistingRefund) {
      execution.status = "skipped"
      execution.error = "Refund already exists"
      return execution
    }
    
    // Get payment intent to get charge ID
    const paymentIntent = await stripe.paymentIntents.retrieve(candidate.paymentIntentId)
    
    const chargeId = typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id
    
    if (!chargeId) {
      execution.status = "error"
      execution.error = "No charge found for payment intent"
      return execution
    }
    
    if (APPLY_REFUNDS) {
      // EXECUTE REFUND
      const refund = await stripe.refunds.create({
        charge: chargeId,
        amount: Math.abs(candidate.deltaAmount),
        reason: "requested_by_customer",
        metadata: {
          reason: "billing_configuration_error",
          original_amount: (candidate.chargeAmount / 100).toFixed(2),
          expected_amount: (candidate.expectedAmount / 100).toFixed(2),
          refund_amount: (Math.abs(candidate.deltaAmount) / 100).toFixed(2),
          automated_refund: "true",
          script_version: "1.0",
        },
      })
      
      execution.refundId = refund.id
      execution.status = "success"
      
      console.log(`✅ REFUNDED ${candidate.email}: $${(Math.abs(candidate.deltaAmount) / 100).toFixed(2)} (Refund ID: ${refund.id})`)
    } else {
      // DRY-RUN
      execution.status = "dry_run"
      console.log(`[DRY-RUN] Would refund ${candidate.email}: $${(Math.abs(candidate.deltaAmount) / 100).toFixed(2)}`)
    }
  } catch (error: any) {
    execution.status = "error"
    execution.error = error.message
    console.error(`❌ Error processing ${candidate.email}: ${error.message}`)
  }
  
  return execution
}

async function main() {
  console.log("=" .repeat(80))
  console.log("🔁 STRIPE REFUND APPLICATION")
  console.log("=" .repeat(80))
  console.log()
  
  if (!APPLY_REFUNDS) {
    console.log("⚠️  DRY-RUN MODE (no refunds will be issued)")
    console.log("⚠️  To execute refunds, run: APPLY_REFUNDS=true pnpm exec tsx scripts/stripe/apply-refunds.ts")
    console.log()
  } else {
    console.log("🔴 LIVE MODE - REFUNDS WILL BE ISSUED")
    console.log()
  }
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("❌ STRIPE_SECRET_KEY not set")
    process.exit(1)
  }
  
  // Load candidates
  console.log("Loading refund candidates...")
  const candidates = await loadRefundCandidates()
  
  // Filter to only those requiring refunds
  const refundCandidates = candidates.filter(c => 
    c.recommendedAction === "refund_partial" && c.deltaAmount > 0
  )
  
  console.log(`Found ${refundCandidates.length} candidates requiring refunds`)
  console.log()
  
  if (refundCandidates.length === 0) {
    console.log("✅ No refunds needed")
    return
  }
  
  // Calculate total
  const totalRefundAmount = refundCandidates.reduce((sum, c) => sum + Math.abs(c.deltaAmount), 0)
  console.log(`Total refund amount: $${(totalRefundAmount / 100).toFixed(2)}`)
  console.log()
  
  // Process refunds
  console.log("Processing refunds...")
  console.log()
  
  const executions: RefundExecution[] = []
  
  for (const candidate of refundCandidates) {
    const execution = await applyRefund(candidate)
    executions.push(execution)
    
    // Brief delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  // Summary
  console.log()
  console.log("=" .repeat(80))
  console.log("SUMMARY")
  console.log("=" .repeat(80))
  console.log()
  
  const successCount = executions.filter(e => e.status === "success").length
  const errorCount = executions.filter(e => e.status === "error").length
  const skippedCount = executions.filter(e => e.status === "skipped").length
  const dryRunCount = executions.filter(e => e.status === "dry_run").length
  
  console.log(`Total candidates: ${refundCandidates.length}`)
  console.log(`Successfully refunded: ${successCount}`)
  console.log(`Errors: ${errorCount}`)
  console.log(`Skipped (already refunded): ${skippedCount}`)
  console.log(`Dry-run: ${dryRunCount}`)
  console.log()
  
  if (successCount > 0) {
    const totalRefunded = executions
      .filter(e => e.status === "success")
      .reduce((sum, e) => sum + e.refundAmount, 0)
    console.log(`Total amount refunded: $${totalRefunded.toFixed(2)}`)
    console.log()
  }
  
  // Save execution log
  const logPath = resolve(process.cwd(), "docs/_CANONICAL/refund_execution_log.json")
  
  const log = {
    executedAt: new Date().toISOString(),
    mode: APPLY_REFUNDS ? "LIVE" : "DRY_RUN",
    totalCandidates: refundCandidates.length,
    totalRefundAmount: totalRefundAmount / 100,
    summary: {
      success: successCount,
      error: errorCount,
      skipped: skippedCount,
      dryRun: dryRunCount,
    },
    executions,
  }
  
  writeFileSync(logPath, JSON.stringify(log, null, 2))
  console.log(`✅ Execution log written to: ${logPath}`)
  console.log()
  
  // Errors summary
  if (errorCount > 0) {
    console.log("⚠️  Errors encountered:")
    for (const execution of executions.filter(e => e.status === "error")) {
      console.log(`   ${execution.email}: ${execution.error}`)
    }
    console.log()
  }
  
  if (APPLY_REFUNDS) {
    console.log("=" .repeat(80))
    console.log("NEXT STEPS")
    console.log("=" .repeat(80))
    console.log()
    console.log("1. ✅ Refunds have been issued (will appear in 5-10 business days)")
    console.log("2. 📧 Send customer emails explaining the refund")
    console.log("3. 📝 Update remediation report with completion status")
    console.log("4. 🔍 Monitor Stripe Dashboard for successful refunds")
    console.log()
  } else {
    console.log("To execute refunds, run:")
    console.log("  APPLY_REFUNDS=true pnpm exec tsx scripts/stripe/apply-refunds.ts")
    console.log()
  }
}

main().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
})

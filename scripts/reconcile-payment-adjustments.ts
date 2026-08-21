#!/usr/bin/env tsx

/**
 * Read-only by default. Apply migration 72 before deploying webhook routing or using --record.
 * This command reads only Stripe payment objects and local payment references unless --record is
 * present. It never changes customers, gross payment rows, access, credits, or communications.
 */

import { loadEnvConfig } from "@next/env"

loadEnvConfig(process.cwd())

const record = process.argv.includes("--record")
const reportOnly = process.argv.includes("--report")
const usage =
  'Use --report, exact IDs with --livemode=live|test, or bounded discovery with --livemode=live|test --since="ISO" --until="ISO".'
const modeArgument = process.argv.find(argument => argument.startsWith("--livemode="))
const modeValue = modeArgument?.slice("--livemode=".length)
if (modeValue && modeValue !== "live" && modeValue !== "test") {
  throw new Error("--livemode must be live or test")
}

const targets = process.argv.flatMap(argument => {
  const match = argument.match(/^--(refund|dispute|charge)=(re_|dp_|ch_)([^\s]+)$/)
  if (!match) return []
  return [{ type: match[1] as "refund" | "dispute" | "charge", id: `${match[2]}${match[3]}` }]
})

const sinceValue = process.argv
  .find(argument => argument.startsWith("--since="))
  ?.slice("--since=".length)
const untilValue = process.argv
  .find(argument => argument.startsWith("--until="))
  ?.slice("--until=".length)

const {
  getPaymentAdjustmentReportProjection,
  getPaymentAdjustmentReviewQueue,
  reconcilePaymentAdjustmentTargets,
  reconcilePaymentAdjustmentWindow,
} = await import("@/lib/payments/lifecycle/payment-adjustments")

let output: unknown
if (reportOnly) {
  if (record || targets.length || sinceValue || untilValue) {
    throw new Error(`--report cannot be combined with reconciliation flags. ${usage}`)
  }
  output = {
    ...(await getPaymentAdjustmentReportProjection()),
    ...(await getPaymentAdjustmentReviewQueue()),
  }
} else {
  if (!modeValue)
    throw new Error(`An explicit --livemode=live or --livemode=test is required. ${usage}`)
  const expectedLivemode = modeValue === "live"
  if (targets.length) {
    if (sinceValue || untilValue) {
      throw new Error(`Exact ID targets cannot be combined with --since/--until. ${usage}`)
    }
    output = await reconcilePaymentAdjustmentTargets({ targets, expectedLivemode, record })
  } else {
    if (!sinceValue || !untilValue)
      throw new Error(`Bounded --since and --until are required. ${usage}`)
    output = await reconcilePaymentAdjustmentWindow({
      since: new Date(sinceValue),
      until: new Date(untilValue),
      expectedLivemode,
      record,
    })
  }
}

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)

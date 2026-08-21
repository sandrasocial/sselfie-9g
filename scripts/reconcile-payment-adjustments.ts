#!/usr/bin/env tsx

/**
 * Read-only by default. Apply migration 72 before deploying webhook routing or using --record.
 * This command reads only Stripe payment objects and local payment references unless --record is
 * present. It never changes customers, gross payment rows, access, credits, or communications.
 */

import { createRequire } from "node:module"
import { dirname } from "node:path"
import {
  PAYMENT_ADJUSTMENT_CLI_USAGE,
  runPaymentAdjustmentCli,
} from "@/lib/payments/payment-adjustment-cli"

const usage = PAYMENT_ADJUSTMENT_CLI_USAGE

function loadProjectEnv(): void {
  const projectRequire = createRequire(`${process.cwd()}/package.json`)
  const nextPackagePath = projectRequire.resolve("next/package.json")
  const envPackagePath = projectRequire.resolve("@next/env", {
    paths: [dirname(nextPackagePath)],
  })
  const envModule = projectRequire(envPackagePath) as {
    loadEnvConfig: (directory: string) => unknown
  }
  envModule.loadEnvConfig(process.cwd())
}

async function main(): Promise<void> {
  if (process.argv.includes("--help")) {
    process.stdout.write(`${usage}\n`)
    return
  }

  loadProjectEnv()
  const output = await runPaymentAdjustmentCli(process.argv, async () => {
    const {
      getPaymentAdjustmentReportProjection,
      getPaymentAdjustmentReviewQueue,
      reconcilePaymentAdjustmentTargets,
      reconcilePaymentAdjustmentWindow,
    } = await import("@/lib/payments/lifecycle/payment-adjustments")
    return {
      getPaymentAdjustmentReportProjection,
      getPaymentAdjustmentReviewQueue,
      reconcilePaymentAdjustmentTargets,
      reconcilePaymentAdjustmentWindow,
    }
  })

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
}

void main().catch(error => {
  const message = error instanceof Error ? error.message : "Unknown reconciliation failure"
  process.stderr.write(`Payment adjustment reconciliation failed: ${message}\n`)
  process.exitCode = 1
})

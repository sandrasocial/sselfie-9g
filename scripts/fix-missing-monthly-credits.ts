#!/usr/bin/env tsx

/**
 * RETIRED: this legacy repair used an unsafe local billing-period heuristic.
 *
 * Membership credits are now reconciled from verified payments through the canonical credit
 * reset policy. Use the current reconciliation workflow instead of issuing credits from a local
 * script.
 */

console.error(
  "RETIRED: use the payment-verified membership reconciliation workflow. No credits were changed.",
)
process.exitCode = 1

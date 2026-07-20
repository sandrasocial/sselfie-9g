#!/usr/bin/env tsx

/**
 * RETIRED: this version guessed renewal eligibility from days since the last grant.
 *
 * That rolling-window logic can issue credits without a matching paid billing period. Use the
 * current payment-verified reconciliation workflow instead.
 */

console.error(
  "RETIRED: use the payment-verified membership reconciliation workflow. No credits were changed.",
)
process.exitCode = 1

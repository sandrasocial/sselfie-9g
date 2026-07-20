#!/usr/bin/env tsx

/**
 * RETIRED: this standalone repair predates the canonical 100-credit reset and invoice-level
 * idempotency controls.
 *
 * Use the current payment-verified reconciliation workflow so purchased top-ups are preserved and
 * every reset is tied to one real billing period.
 */

console.error(
  "RETIRED: use the payment-verified membership reconciliation workflow. No credits were changed.",
)
process.exitCode = 1

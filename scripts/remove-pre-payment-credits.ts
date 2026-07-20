#!/usr/bin/env tsx

/**
 * RETIRED: this legacy script used date heuristics to remove customer credits.
 *
 * Credit corrections must be tied to verified Stripe payments and the current ledger policy. Use
 * the attended payment reconciliation workflow instead of changing balances from this script.
 */

console.error(
  "RETIRED: use the attended payment reconciliation workflow. No credits were changed.",
)
process.exitCode = 1

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Repair Tool: Reconcile Missing Credit Transactions
 * 
 * Finds cases where user_credits.balance doesn't match sum of credit_transactions
 * and creates missing transaction logs.
 * 
 * Usage: npx tsx scripts/repair-missing-credit-transactions.ts
 */
async function repairMissingTransactions() {
  console.log("[REPAIR] Starting credit transaction reconciliation...")

  // Find discrepancies: balance doesn't match transaction sum
  const discrepancies = await sql`
    SELECT 
      uc.user_id,
      uc.balance as current_balance,
      COALESCE(SUM(ct.amount), 0) as transaction_sum,
      (uc.balance - COALESCE(SUM(ct.amount), 0)) as difference
    FROM user_credits uc
    LEFT JOIN credit_transactions ct ON uc.user_id = ct.user_id
    GROUP BY uc.user_id, uc.balance
    HAVING uc.balance != COALESCE(SUM(ct.amount), 0)
    ORDER BY ABS(uc.balance - COALESCE(SUM(ct.amount), 0)) DESC
    LIMIT 100
  `

  if (discrepancies.length === 0) {
    console.log("[REPAIR] ✅ No discrepancies found")
    return
  }

  console.log(`[REPAIR] Found ${discrepancies.length} discrepancies`)

  let repaired = 0
  let errors = 0

  for (const disc of discrepancies) {
    try {
      const difference = Number(disc.difference)
      
      if (difference === 0) continue

      // Create reconciliation transaction
      await sql`
        INSERT INTO credit_transactions (
          user_id,
          amount,
          transaction_type,
          description,
          balance_after,
          created_at
        )
        VALUES (
          ${disc.user_id},
          ${difference},
          'refund',
          'Reconciliation: Missing transaction log repaired',
          ${disc.current_balance},
          NOW()
        )
      `

      console.log(`[REPAIR] ✅ Repaired user ${disc.user_id}: ${difference > 0 ? '+' : ''}${difference} credits`)
      repaired++
    } catch (error: any) {
      console.error(`[REPAIR] ❌ Error repairing user ${disc.user_id}:`, error.message)
      errors++
    }
  }

  console.log(`[REPAIR] Completed: ${repaired} repaired, ${errors} errors`)
}

repairMissingTransactions().catch(console.error)

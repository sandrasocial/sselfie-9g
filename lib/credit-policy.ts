export const MONTHLY_MEMBERSHIP_CREDITS = 100
export const VAULT_MAYA_MONTHLY_CREDITS = 30
export const MAYA_ESSENTIAL_MONTHLY_CREDITS = 30

export type MonthlyCreditReset = {
  currentBalance: number
  purchasedCreditsPreserved: number
  newBalance: number
  ledgerDelta: number
}

function safeCreditAmount(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

/**
 * Membership credits are use-it-or-lose-it. Verified purchased credits are treated as the
 * last credits consumed, so a renewal can expire the included remainder without deleting a
 * member's unused paid top-ups.
 */
export function calculateMonthlyCreditReset({
  currentBalance,
  purchasedCreditsRemaining,
}: {
  currentBalance: number
  purchasedCreditsRemaining: number
}): MonthlyCreditReset {
  const normalizedBalance = safeCreditAmount(currentBalance)
  const normalizedPurchased = safeCreditAmount(purchasedCreditsRemaining)
  const purchasedCreditsPreserved = Math.min(normalizedBalance, normalizedPurchased)
  const newBalance = purchasedCreditsPreserved + MONTHLY_MEMBERSHIP_CREDITS

  return {
    currentBalance: normalizedBalance,
    purchasedCreditsPreserved,
    newBalance,
    ledgerDelta: newBalance - normalizedBalance,
  }
}

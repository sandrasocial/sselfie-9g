const DAY_IN_MS = 24 * 60 * 60 * 1000
// Show the guided welcome flow for up to 7 days — users who don't open on day 1
// should still get the first-generation path on return visits.
const WELCOME_FLOW_WINDOW_MS = 7 * DAY_IN_MS

export function isWelcomeFlowEnabled(envValue: string | undefined): boolean {
  // Default ON when not explicitly disabled — prevents silent activation failure
  // Set FEATURE_NEW_WELCOME_FLOW=false to kill-switch in production
  if (envValue === "false" || envValue === "0") return false
  return true
}

export type WelcomeFlowDecisionInput = {
  enabled: boolean
  userCreatedAt?: string | Date | null
  hasAnyGeneration: boolean
  /** At least one credit_transaction with transaction_type = 'bonus' for this user */
  hasBonusCredits?: boolean
  /** No credit_transaction with transaction_type = 'image' for this user (no image-type spend yet) */
  hasNoImageSpend?: boolean
  now?: Date
}

/**
 * Gate for Maya First-Generation Guided Path (Slice 1.1).
 * Show when: feature enabled, user has bonus credits, zero image-type spend, and no generations yet.
 * Optional: limit to users created within 24h (when userCreatedAt provided).
 */
export function shouldShowWelcomeFirstGenerationFlow(input: WelcomeFlowDecisionInput): boolean {
  if (!input.enabled) return false
  if (input.hasAnyGeneration) return false

  // Require bonus credits — users who never received welcome grant are outside the flow
  if (input.hasBonusCredits !== true) return false
  // Require no prior image spend for this focused first-generation jumpstart.
  if (input.hasNoImageSpend !== true) return false

  if (input.userCreatedAt != null) {
    const createdAt =
      input.userCreatedAt instanceof Date ? input.userCreatedAt : new Date(input.userCreatedAt)
    if (Number.isNaN(createdAt.getTime())) return false

    const now = input.now ?? new Date()
    const ageMs = now.getTime() - createdAt.getTime()
    if (ageMs < 0) return false

    return ageMs <= WELCOME_FLOW_WINDOW_MS
  }

  return true
}

const DAY_IN_MS = 24 * 60 * 60 * 1000

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
  if (input.hasBonusCredits === false) return false
  // Note: hasNoImageSpend gate removed — it permanently blocked users after a single failed attempt,
  // causing 0% activation. The hasAnyGeneration gate above already prevents re-showing after success.

  if (input.userCreatedAt != null) {
    const createdAt =
      input.userCreatedAt instanceof Date ? input.userCreatedAt : new Date(input.userCreatedAt)
    if (Number.isNaN(createdAt.getTime())) return false

    const now = input.now ?? new Date()
    const ageMs = now.getTime() - createdAt.getTime()
    if (ageMs < 0) return false

    return ageMs <= DAY_IN_MS
  }

  return true
}


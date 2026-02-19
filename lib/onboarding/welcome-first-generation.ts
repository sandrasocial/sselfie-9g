const DAY_IN_MS = 24 * 60 * 60 * 1000

export function isWelcomeFlowEnabled(envValue: string | undefined): boolean {
  return envValue === "true" || envValue === "1"
}

type WelcomeFlowDecisionInput = {
  enabled: boolean
  userCreatedAt: string | Date | null | undefined
  hasAnyGeneration: boolean
  now?: Date
}

export function shouldShowWelcomeFirstGenerationFlow(input: WelcomeFlowDecisionInput): boolean {
  if (!input.enabled) return false
  if (input.hasAnyGeneration) return false
  if (!input.userCreatedAt) return false

  const createdAt = input.userCreatedAt instanceof Date ? input.userCreatedAt : new Date(input.userCreatedAt)
  if (Number.isNaN(createdAt.getTime())) return false

  const now = input.now ?? new Date()
  const ageMs = now.getTime() - createdAt.getTime()
  if (ageMs < 0) return false

  return ageMs <= DAY_IN_MS
}


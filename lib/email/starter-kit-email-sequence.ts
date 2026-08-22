export interface StarterKitEmailTouchDefinition {
  days: number
  emailType: StarterKitEmailType
}

export type StarterKitEmailType =
  | "starter-kit-day0-delivery"
  | "starter-kit-day1-quick-win"
  | "starter-kit-day3-story"
  | "starter-kit-day5-proof"
  | "starter-kit-day7-soft-masterclass"
  | "starter-kit-day10-masterclass-breakdown"
  | "starter-kit-day14-masterclass-offer"

// Active Starter Kit lifecycle is intentionally customer-success only.
// Legacy Masterclass bridge templates remain available for historical/audit purposes,
// while recurring ascension is handled by the dedicated paid-product membership bridge.
export const STARTER_KIT_EMAIL_TOUCHES: StarterKitEmailTouchDefinition[] = [
  { days: 0, emailType: "starter-kit-day0-delivery" },
  { days: 1, emailType: "starter-kit-day1-quick-win" },
  { days: 3, emailType: "starter-kit-day3-story" },
  { days: 5, emailType: "starter-kit-day5-proof" },
]

export interface StarterKitEmailTouchDefinition {
  days: number
  emailType: StarterKitEmailType
  excludeSuiteMembers?: boolean
}

export type StarterKitEmailType =
  | "starter-kit-day0-delivery"
  | "starter-kit-day1-quick-win"
  | "starter-kit-day3-story"
  | "starter-kit-day5-proof"
  | "starter-kit-day10-membership-bridge"
  | "starter-kit-day7-soft-masterclass"
  | "starter-kit-day10-masterclass-breakdown"
  | "starter-kit-day14-masterclass-offer"

// Customer success first, then one clear recurring next step.
// The legacy Masterclass bridge templates remain for historical/audit purposes only.
export const STARTER_KIT_EMAIL_TOUCHES: StarterKitEmailTouchDefinition[] = [
  { days: 0, emailType: "starter-kit-day0-delivery" },
  { days: 1, emailType: "starter-kit-day1-quick-win" },
  { days: 3, emailType: "starter-kit-day3-story" },
  { days: 5, emailType: "starter-kit-day5-proof" },
  {
    days: 10,
    emailType: "starter-kit-day10-membership-bridge",
    excludeSuiteMembers: true,
  },
]

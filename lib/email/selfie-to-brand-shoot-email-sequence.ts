export type SelfieToBrandShootEmailType =
  | "selfie-to-brand-shoot-day1-source-and-world"
  | "selfie-to-brand-shoot-day3-first-shoot"
  | "selfie-to-brand-shoot-day5-select-and-content"
  | "selfie-to-brand-shoot-day7-proof-request"

export interface SelfieToBrandShootEmailTouchDefinition {
  days: number
  emailType: SelfieToBrandShootEmailType
}

export const SELFIE_TO_BRAND_SHOOT_EMAIL_TOUCHES: SelfieToBrandShootEmailTouchDefinition[] = [
  { days: 1, emailType: "selfie-to-brand-shoot-day1-source-and-world" },
  { days: 3, emailType: "selfie-to-brand-shoot-day3-first-shoot" },
  { days: 5, emailType: "selfie-to-brand-shoot-day5-select-and-content" },
  { days: 7, emailType: "selfie-to-brand-shoot-day7-proof-request" },
]

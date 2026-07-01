export type SelfieAiPhotosKitEmailType =
  | "selfie-ai-photos-kit-day2-first-photo"
  | "selfie-ai-photos-kit-day4-vault-bridge"
  | "selfie-ai-photos-kit-day8-suite-trial"

export interface SelfieAiPhotosKitEmailTouchDefinition {
  days: number
  emailType: SelfieAiPhotosKitEmailType
  /** Skip buyers who already own the Prompt Vault (day-4 bridge only). */
  excludeVaultBuyers?: boolean
  /** Skip buyers who already hold an active or trialing SUITE membership (day-8 trial only). */
  excludeSuiteMembers?: boolean
}

export const SELFIE_AI_PHOTOS_KIT_EMAIL_TOUCHES: SelfieAiPhotosKitEmailTouchDefinition[] = [
  { days: 2, emailType: "selfie-ai-photos-kit-day2-first-photo" },
  { days: 4, emailType: "selfie-ai-photos-kit-day4-vault-bridge", excludeVaultBuyers: true },
  { days: 8, emailType: "selfie-ai-photos-kit-day8-suite-trial", excludeSuiteMembers: true },
]

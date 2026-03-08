export interface EmailTouchDefinition {
  days: number
  emailType: string
}

export const SELFIE_GUIDE_EMAIL_TOUCHES: EmailTouchDefinition[] = [
  { days: 0, emailType: "selfie-guide-activation-day0" },
]

export const FREEBIE_STRATEGY_EMAIL_TOUCHES: EmailTouchDefinition[] = [
  { days: 2, emailType: "nurture-freebie-n1" },
  { days: 5, emailType: "nurture-freebie-n2" },
  { days: 9, emailType: "nurture-freebie-n3" },
  { days: 14, emailType: "nurture-freebie-n4" },
  { days: 20, emailType: "nurture-freebie-n5" },
]

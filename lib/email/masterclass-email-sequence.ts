export interface MasterclassEmailTouchDefinition {
  days: number
  emailType: MasterclassEmailType
}

export type MasterclassEmailType =
  | "masterclass-day0-delivery"
  | "masterclass-day2-checkin"
  | "masterclass-day5-deepen"

export const MASTERCLASS_EMAIL_TOUCHES: MasterclassEmailTouchDefinition[] = [
  { days: 0, emailType: "masterclass-day0-delivery" },
  { days: 2, emailType: "masterclass-day2-checkin" },
  { days: 5, emailType: "masterclass-day5-deepen" },
]

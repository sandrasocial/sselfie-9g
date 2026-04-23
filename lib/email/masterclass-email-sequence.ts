export interface MasterclassEmailTouchDefinition {
  days: number
  emailType: MasterclassEmailType
}

export type MasterclassEmailType =
  | "masterclass-day0-delivery"
  | "masterclass-day2-checkin"
  | "masterclass-day5-deepen"
  | "masterclass-day7-soft-work-with-me"
  | "masterclass-day10-direct-invite"

export const MASTERCLASS_EMAIL_TOUCHES: MasterclassEmailTouchDefinition[] = [
  { days: 0, emailType: "masterclass-day0-delivery" },
  { days: 2, emailType: "masterclass-day2-checkin" },
  { days: 5, emailType: "masterclass-day5-deepen" },
  { days: 7, emailType: "masterclass-day7-soft-work-with-me" },
  { days: 10, emailType: "masterclass-day10-direct-invite" },
]

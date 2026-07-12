export type FreebieGuideEmailType =
  | "freebie-guide-day1-light-tip"
  | "freebie-guide-day3-edit-bridge"
  | "freebie-guide-day5-story"
  | "freebie-guide-day8-starter-kit-direct"

export interface FreebieGuideEmailTouchDefinition {
  days: number
  emailType: FreebieGuideEmailType
}

export const FREEBIE_GUIDE_EMAIL_TOUCHES: FreebieGuideEmailTouchDefinition[] = [
  { days: 1, emailType: "freebie-guide-day1-light-tip" },
  { days: 5, emailType: "freebie-guide-day5-story" },
]

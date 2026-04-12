/**
 * Selfie Guide email sequence — 5 timed touches + 1 event-based email
 *
 * Timed sequence (queued on purchase, processed by /api/cron/nurture-sequence):
 *   Day 0  — selfie-guide-activation-day0    Delivery + quick-start nudge
 *   Day 3  — selfie-guide-day3-checkin        "5 minutes, one window-light selfie"
 *   Day 7  — selfie-guide-day7-challenge      "Start the 7-day challenge today"
 *   Day 14 — selfie-guide-day14-maya-bridge   Maya demo + Studio CTA
 *   Day 21 — selfie-guide-day21-final         4-credit bonus offer, expires day 28
 *
 * Event-based (triggered from /api/selfie-guide/progress when guide_completed_at is first set):
 *   selfie-guide-complete — "You finished it." + Studio CTA
 *
 * Each template lives in lib/email/templates/selfie-guide-{emailType}.ts
 * Props: { firstName, guideAccessUrl } (completion email only needs firstName)
 */
export interface EmailTouchDefinition {
  days: number
  emailType: SelfieGuideEmailType
}

export type SelfieGuideEmailType =
  | "selfie-guide-activation-day0"
  | "selfie-guide-day3-checkin"
  | "selfie-guide-day7-challenge"
  | "selfie-guide-day14-maya-bridge"
  | "selfie-guide-day21-final"
  | "selfie-guide-complete"

export const SELFIE_GUIDE_EMAIL_TOUCHES: EmailTouchDefinition[] = [
  { days: 0, emailType: "selfie-guide-activation-day0" },
  { days: 3, emailType: "selfie-guide-day3-checkin" },
  { days: 7, emailType: "selfie-guide-day7-challenge" },
  { days: 14, emailType: "selfie-guide-day14-maya-bridge" },
  { days: 21, emailType: "selfie-guide-day21-final" },
]

export const FREEBIE_STRATEGY_EMAIL_TOUCHES: EmailTouchDefinition[] = [
  { days: 2, emailType: "nurture-strategy-n1" },
  { days: 5, emailType: "nurture-strategy-n2" },
  { days: 9, emailType: "nurture-strategy-n3" },
  { days: 14, emailType: "nurture-strategy-n4" },
  { days: 20, emailType: "nurture-strategy-n5" },
]

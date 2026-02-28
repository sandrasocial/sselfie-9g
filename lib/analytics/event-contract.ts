export const ALLOWED_ANALYTICS_EVENTS = [
  "landing_view",
  "pricing_view",
  "checkout_start",
  "purchase",
  "studio_opened",
  "tab_opened",
  "activation_jumpstart_opened",
  "activation_continue_clicked",
  "activation_selfie_uploaded",
  "signup_to_first_gen",
  "academy_opens_from_maya",
  "first_generation_guided_start",
  "first_generation_guided_complete",
  "first_image_generated",
  "onboarding_step_complete",
  "onboarding_abandoned",
  "onboarding_complete",
  "credits_used",
  "mode_selected",
] as const

export type AnalyticsEventName = (typeof ALLOWED_ANALYTICS_EVENTS)[number]

const ALLOWED_ANALYTICS_EVENT_SET = new Set<string>(ALLOWED_ANALYTICS_EVENTS)

export function isAllowedAnalyticsEventName(eventName: string): eventName is AnalyticsEventName {
  return ALLOWED_ANALYTICS_EVENT_SET.has(eventName)
}

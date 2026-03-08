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
  "feed_planner_quick_start_viewed",
  "feed_planner_quick_start_clicked",
  "signup_to_first_gen",
  "academy_opens_from_maya",
  "first_generation_guided_start",
  "first_generation_guided_complete",
  "first_image_generated",
  "maya_capabilities_opened",
  "maya_tool_invoked",
  "maya_asset_draft_created",
  "maya_asset_draft_updated",
  "maya_public_page_view",
  "maya_public_page_checkout_clicked",
  "maya_public_page_lead_captured",
  "maya_tool_blocked_low_credits",
  "maya_multi_step_executor_run",
  "onboarding_step_complete",
  "onboarding_abandoned",
  "onboarding_complete",
  "credits_used",
  "mode_selected",
  "brand_strategy_pack_upsell_view",
  "brand_strategy_pack_checkout_start",
  "brand_strategy_pack_checkout_success",
  "brand_strategy_pack_studio_click",
  "one_time_session_studio_click",
  "selfie_guide_entry_click",
  "selfie_guide_access_resolved",
  "selfie_guide_access_failed",
] as const

export type AnalyticsEventName = (typeof ALLOWED_ANALYTICS_EVENTS)[number]

const ALLOWED_ANALYTICS_EVENT_SET = new Set<string>(ALLOWED_ANALYTICS_EVENTS)

export function isAllowedAnalyticsEventName(eventName: string): eventName is AnalyticsEventName {
  return ALLOWED_ANALYTICS_EVENT_SET.has(eventName)
}

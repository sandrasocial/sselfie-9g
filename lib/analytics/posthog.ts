import "server-only"

import { createHash } from "node:crypto"
import { sanitizePostHogPathname } from "@/lib/analytics/posthog-browser"

type Primitive = string | number | boolean

export type PostHogCaptureInput = {
  eventName: string
  userId?: string | null
  anonId?: string | null
  path?: string | null
  attribution?: {
    source?: string | null
    medium?: string | null
    campaign?: string | null
  } | null
  properties?: Record<string, unknown> | null
}

export type PostHogCaptureResult =
  | { sent: true }
  | {
      sent: false
      reason:
        | "disabled"
        | "unmapped"
        | "test-event"
        | "anonymous-missing"
        | "invalid-host"
        | "provider-error"
    }

const EVENT_MAP: Readonly<Record<string, string>> = {
  studio_opened: "sselfie_app_opened",
  suite_home_viewed: "sselfie_app_opened",
  tab_opened: "sselfie_workspace_opened",
  activation_selfie_uploaded: "sselfie_reference_added",
  first_generation_guided_start: "sselfie_generation_started",
  first_generation_guided_complete: "sselfie_generation_completed",
  suite_image_generated: "sselfie_generation_completed",
  suite_generation_failed: "sselfie_generation_failed",
  suite_image_downloaded: "sselfie_result_saved",
  suite_edit_applied: "sselfie_edit_used",
  suite_ready_post_saved: "sselfie_content_completed",
  calendar_workspace_opened: "sselfie_calendar_action",
  calendar_photo_added: "sselfie_calendar_action",
  calendar_post_ready: "sselfie_calendar_action",
  calendar_post_published: "sselfie_calendar_action",
  trial_claimed: "sselfie_trial_started",
  checkout_start: "sselfie_checkout_started",
  brand_strategy_pack_checkout_success: "sselfie_purchase_observed",
  campaign_purchase: "sselfie_purchase_observed",
  masterclass_checkout_success: "sselfie_purchase_observed",
  presets_checkout_success: "sselfie_purchase_observed",
  prompt_vault_checkout_success: "sselfie_purchase_observed",
  purchase: "sselfie_purchase_observed",
  selfie_ai_photos_kit_checkout_success: "sselfie_purchase_observed",
  selfie_guide_checkout_success: "sselfie_purchase_observed",
  selfie_to_brand_shoot_checkout_success: "sselfie_purchase_observed",
  starter_kit_checkout_success: "sselfie_purchase_observed",
  work_with_me_checkout_success: "sselfie_purchase_observed",
}

const SAFE_PROPERTY_KEYS = new Set([
  "amount_cents",
  "calendar_action",
  "confidence",
  "credit_cost",
  "currency",
  "edit_type",
  "entry_point",
  "error_code",
  "format",
  "generation_mode",
  "image_count",
  "is_first",
  "is_rerun",
  "job_type",
  "model",
  "plan",
  "product",
  "provider",
  "source",
  "status",
  "tab",
  "variant",
  "workspace",
])

const SENSITIVE_KEY =
  /(address|auth|caption|content|cookie|email|header|ip|name|phone|prompt|referrer|secret|selfie|text|token|url|user_agent)/i

function safeDimension(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return /^[a-z0-9][a-z0-9._:-]{0,119}$/i.test(trimmed) ? trimmed : null
}

const APPROVED_UTM_SOURCES = new Set([
  "ai_prompts",
  "app",
  "buyer_home",
  "email",
  "instagram",
  "kit_access",
  "product",
  "prompt_vault",
  "presets_page",
  "resend",
  "site",
  "vault_maya",
  "website",
])

const APPROVED_EVENT_SOURCES = new Set([
  "app",
  "app-v3-edit",
  "app-v3-generate",
  "claim_page",
  "front_door",
  "gallery",
  "generated",
  "maya_concierge",
  "maya_drawer",
  "maya_selfie_manager",
  "maya_welcome_flow",
  "public_offer",
  "skool",
  "stripe_webhook",
  "suite-trial-expiry-cron",
  "selfie-ai-photos-kit-access",
])

const APPROVED_UTM_MEDIUMS = new Set([
  "access_page",
  "bio",
  "broadcast",
  "delivery",
  "email",
  "homepage",
  "in_app",
  "launch",
  "lifecycle",
  "manychat",
  "payment_recovery",
  "post_purchase",
  "preview",
  "prompt_pack",
  "repeat",
  "sales_page",
  "stories",
  "story",
  "studio",
  "upsell",
])

const APPROVED_UTM_CAMPAIGNS = new Set([
  "access_ending",
  "ai_prompts_to_prompt_vault",
  "ai_prompts_to_selfie_ai_photos_kit",
  "ai_prompts_to_selfie_guide",
  "blueprint_day1",
  "blueprint_day3",
  "blueprint_day7",
  "blueprint_day7_upsell",
  "campaign_outcome_test",
  "current_free_prompt_fallback",
  "dormant_member_reengagement",
  "free_user_day10",
  "free_user_day5",
  "free_welcome_day0",
  "high_intent_click_recovery",
  "latest_five_free_prompts",
  "latest_five_free_prompts_to_vault",
  "numbered_prompt",
  "numbered_prompt_fallback",
  "numbered_prompt_to_vault",
  "one_selfie_visibility_48h",
  "paid_blueprint",
  "post_activation_upgrade",
  "presets_launch",
  "prompt",
  "prompt_keyword",
  "prompt_vault_launch",
  "rejoin",
  "selfie_ai_photos_kit",
  "selfie_ai_photos_kit_day0_suite_bridge",
  "selfie_ai_photos_kit_day0_vault_bridge",
  "selfie_ai_photos_kit_suite_bridge",
  "selfie_ai_photos_kit_vault_bridge",
  "selfie_guide_to_masterclass",
  "selfie_guide_to_starter_kit",
  "selfie_keyword",
  "selfie_to_brand_shoot",
  "suite_day7_second_creation",
  "suite_keyword",
  "trial_cap_upgrade",
  "update_payment",
  "vault_keyword",
  "vault_maya_launch",
  "vault_maya_launch_list",
  "vault_maya_to_suite",
  "vault_to_presets",
  "vault_to_suite",
  "vault_to_suite_path",
  "win_back_day14",
  "win_back_day3",
  "win_back_day7",
])

function approvedAttribution(value: unknown, approved: ReadonlySet<string>): string | null {
  const dimension = safeDimension(value)?.toLowerCase() ?? null
  return dimension && approved.has(dimension) ? dimension : null
}

function cleanPath(path: string | null | undefined): string | null {
  if (!path) return null
  const value = path.trim()
  return sanitizePostHogPathname(value)
}

export function mapPostHogEvent(eventName: string): string | null {
  return EVENT_MAP[eventName] ?? null
}

function copyApprovedAttribution(
  output: Record<string, Primitive>,
  attribution: PostHogCaptureInput["attribution"]
) {
  const values = {
    utm_source: approvedAttribution(attribution?.source, APPROVED_UTM_SOURCES),
    utm_medium: approvedAttribution(attribution?.medium, APPROVED_UTM_MEDIUMS),
    utm_campaign: approvedAttribution(attribution?.campaign, APPROVED_UTM_CAMPAIGNS),
  }
  for (const [key, value] of Object.entries(values)) {
    if (value) output[key] = value
  }
}

function copyRevenueProperties(
  output: Record<string, Primitive>,
  eventName: string,
  properties: Record<string, unknown>
) {
  const product = safeDimension(properties.product_type)
  if (product) output.product = product

  const value = properties.value
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    output.revenue_value = value
  }

  if (mapPostHogEvent(eventName) === "sselfie_purchase_observed") {
    const providerId = [
      properties.stripe_payment_id,
      properties.stripe_invoice_id,
      properties.stripe_session_id,
      properties.checkout_session_id,
    ].find(candidate => typeof candidate === "string" && candidate.trim())
    if (typeof providerId === "string") {
      output.$insert_id = createHash("sha256")
        .update(`sselfie-purchase:${providerId.trim()}`)
        .digest("hex")
    }
  }
}

function copyGenerationProperties(
  output: Record<string, Primitive>,
  properties: Record<string, unknown>
) {
  const imageCount = properties.image_count ?? properties.images
  if (typeof imageCount === "number" && Number.isInteger(imageCount) && imageCount >= 0) {
    output.image_count = imageCount
  }

  const generationMode = safeDimension(properties.generation_mode ?? properties.mode)
  if (generationMode) output.generation_mode = generationMode

  const isRerun = properties.is_rerun ?? properties.rerun
  if (typeof isRerun === "boolean") output.is_rerun = isRerun
}

function copyFailureProperties(
  output: Record<string, Primitive>,
  eventName: string,
  properties: Record<string, unknown>
) {
  if (eventName !== "suite_generation_failed") return
  const errorCode = safeDimension(properties.error_code ?? properties.reason)
  if (errorCode) output.error_code = errorCode
}

function safeProperty(key: string, value: unknown): Primitive | null {
  if (!SAFE_PROPERTY_KEYS.has(key) || SENSITIVE_KEY.test(key)) return null
  if (typeof value === "string") {
    return key === "source"
      ? approvedAttribution(value, APPROVED_EVENT_SOURCES)
      : safeDimension(value)
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  return typeof value === "boolean" ? value : null
}

export function buildPostHogProperties(input: PostHogCaptureInput): Record<string, Primitive> {
  const output: Record<string, Primitive> = {
    source_event: input.eventName,
    $process_person_profile: false,
  }

  const path = cleanPath(input.path)
  if (path) output.path = path

  const rawProperties = input.properties ?? {}
  copyApprovedAttribution(output, {
    source: rawProperties.utm_source as string | null | undefined,
    medium: rawProperties.utm_medium as string | null | undefined,
    campaign: rawProperties.utm_campaign as string | null | undefined,
  })
  copyApprovedAttribution(output, input.attribution)
  copyRevenueProperties(output, input.eventName, rawProperties)
  copyGenerationProperties(output, rawProperties)
  copyFailureProperties(output, input.eventName, rawProperties)

  for (const [key, value] of Object.entries(rawProperties)) {
    const property = safeProperty(key, value)
    if (property !== null) output[key] = property
  }

  return output
}

function postHogConfig(): { key: string; host: string } | null {
  const key = (process.env.POSTHOG_PROJECT_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY || "").trim()
  if (!key) return null

  const host = (
    process.env.POSTHOG_HOST ||
    process.env.NEXT_PUBLIC_POSTHOG_HOST ||
    "https://eu.i.posthog.com"
  )
    .trim()
    .replace(/\/$/, "")

  return { key, host }
}

export function postHogDistinctId(input: PostHogCaptureInput): string | null {
  const userId = input.userId?.trim()
  if (userId) return `user:${userId}`

  const anonId = input.anonId?.trim()
  return anonId ? `anon:${anonId}` : null
}

export async function capturePostHogEvent(
  input: PostHogCaptureInput,
  fetchImpl: typeof fetch = fetch
): Promise<PostHogCaptureResult> {
  const event = mapPostHogEvent(input.eventName)
  if (!event) return { sent: false, reason: "unmapped" }
  if (event === "sselfie_purchase_observed" && input.properties?.is_test_mode === true) {
    return { sent: false, reason: "test-event" }
  }

  const distinctId = postHogDistinctId(input)
  if (!distinctId) return { sent: false, reason: "anonymous-missing" }

  const config = postHogConfig()
  if (!config) return { sent: false, reason: "disabled" }

  let endpoint: URL
  try {
    endpoint = new URL("/i/v0/e/", config.host)
    if (endpoint.protocol !== "https:" && endpoint.protocol !== "http:") {
      return { sent: false, reason: "invalid-host" }
    }
  } catch {
    return { sent: false, reason: "invalid-host" }
  }

  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: config.key,
        event,
        properties: {
          ...buildPostHogProperties(input),
          distinct_id: distinctId,
        },
      }),
      signal: AbortSignal.timeout(750),
    })

    if (!response.ok) return { sent: false, reason: "provider-error" }
    return { sent: true }
  } catch {
    return { sent: false, reason: "provider-error" }
  }
}

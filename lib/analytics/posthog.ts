import "server-only"

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
      reason: "disabled" | "unmapped" | "anonymous-missing" | "invalid-host" | "provider-error"
    }

const EVENT_MAP: Readonly<Record<string, string>> = {
  studio_opened: "sselfie_app_opened",
  suite_home_viewed: "sselfie_app_opened",
  tab_opened: "sselfie_workspace_opened",
  activation_selfie_uploaded: "sselfie_reference_added",
  suite_inline_selfie_uploaded: "sselfie_reference_added",
  first_generation_guided_start: "sselfie_generation_started",
  suite_maya_job_started: "sselfie_generation_started",
  first_generation_guided_complete: "sselfie_generation_completed",
  first_image_generated: "sselfie_generation_completed",
  suite_image_generated: "sselfie_generation_completed",
  suite_generation_path_completed: "sselfie_generation_completed",
  suite_maya_job_finished: "sselfie_generation_completed",
  suite_generation_failed: "sselfie_generation_failed",
  suite_image_downloaded: "sselfie_result_saved",
  suite_edit_applied: "sselfie_edit_used",
  suite_post_finished: "sselfie_content_completed",
  calendar_workspace_opened: "sselfie_calendar_action",
  calendar_photo_added: "sselfie_calendar_action",
  calendar_post_ready: "sselfie_calendar_action",
  calendar_post_published: "sselfie_calendar_action",
  trial_claimed: "sselfie_trial_started",
  checkout_start: "sselfie_checkout_started",
  purchase: "sselfie_purchase_observed",
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

function cleanPath(path: string | null | undefined): string | null {
  if (!path) return null
  const value = path.trim()
  if (!value.startsWith("/")) return null
  const clean = value.split(/[?#]/, 1)[0]
  return clean ? clean.slice(0, 300) : null
}

export function mapPostHogEvent(eventName: string): string | null {
  return EVENT_MAP[eventName] ?? null
}

export function buildPostHogProperties(input: PostHogCaptureInput): Record<string, Primitive> {
  const output: Record<string, Primitive> = {
    source_event: input.eventName,
    $process_person_profile: false,
  }

  const path = cleanPath(input.path)
  if (path) output.path = path

  const attribution = {
    utm_source: safeDimension(input.attribution?.source),
    utm_medium: safeDimension(input.attribution?.medium),
    utm_campaign: safeDimension(input.attribution?.campaign),
  }
  for (const [key, value] of Object.entries(attribution)) {
    if (value) output[key] = value
  }

  for (const [key, value] of Object.entries(input.properties ?? {})) {
    if (!SAFE_PROPERTY_KEYS.has(key) || SENSITIVE_KEY.test(key)) continue
    if (typeof value === "string") {
      const dimension = safeDimension(value)
      if (dimension) output[key] = dimension
    } else if (typeof value === "number" && Number.isFinite(value)) {
      output[key] = value
    } else if (typeof value === "boolean") {
      output[key] = value
    }
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

function postHogDistinctId(input: PostHogCaptureInput): string | null {
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
        distinct_id: distinctId,
        properties: buildPostHogProperties(input),
      }),
      signal: AbortSignal.timeout(750),
    })

    if (!response.ok) return { sent: false, reason: "provider-error" }
    return { sent: true }
  } catch {
    return { sent: false, reason: "provider-error" }
  }
}

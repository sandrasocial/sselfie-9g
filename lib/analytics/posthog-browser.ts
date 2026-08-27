export const POSTHOG_TOKENIZED_PATH_PATTERN_SOURCE = String.raw`(\/(?:academy\/visibility-plan|access\/(?:presets|prompt-vault|selfie-to-ai-photos-kit|selfie-to-brand-shoot|starter-kit)|ai-prompts\/access|approve|brand-strategy\/setup|campaign\/order|claim|selfie-guide\/access|strategy)\/)[^\/"?#]+`

export const POSTHOG_APPROVED_UTM_SOURCES = [
  "ai_prompts",
  "app",
  "buyer_home",
  "email",
  "free_guide",
  "instagram",
  "kit_access",
  "product",
  "prompt_vault",
  "presets_landing",
  "presets_page",
  "resend",
  "site",
  "vault_maya",
  "website",
] as const

export const POSTHOG_APPROVED_UTM_MEDIUMS = [
  "access_page",
  "bio",
  "broadcast",
  "checkout_recovery",
  "delivery",
  "email",
  "guide",
  "homepage",
  "in_app",
  "launch",
  "lifecycle",
  "manychat",
  "newsletter",
  "nurture",
  "payment_recovery",
  "post_purchase",
  "preview",
  "prompt_pack",
  "repeat",
  "sales_page",
  "site",
  "stories",
  "story",
  "studio",
  "upsell",
] as const

export const POSTHOG_APPROVED_UTM_CAMPAIGNS = [
  "access_ending",
  "ai_prompts_day7",
  "ai_prompts_to_prompt_vault",
  "ai_prompts_to_selfie_ai_photos_kit",
  "ai_prompts_to_selfie_guide",
  "blueprint_day1",
  "blueprint_day3",
  "blueprint_day7",
  "blueprint_day7_upsell",
  "campaign_outcome_test",
  "current_free_prompt",
  "current_free_prompt_fallback",
  "dormant_member_reengagement",
  "free_user_day10",
  "free_user_day5",
  "free_welcome_day0",
  "freebie_guide_day8_starter_kit_direct",
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
  "prompt_vault_checkout_recovery",
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
  "starter_kit_checkout_recovery",
  "suite_day7_second_creation",
  "suite_keyword",
  "trial_cap_upgrade",
  "update_payment",
  "vault_collection_drop",
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
] as const

const TOKENIZED_PATH = new RegExp(`^${POSTHOG_TOKENIZED_PATH_PATTERN_SOURCE}`)
const TOKENIZED_PATH_IN_PAYLOAD = new RegExp(POSTHOG_TOKENIZED_PATH_PATTERN_SOURCE, "g")
const CUSTOMER_OBJECT_PATH = /^(\/(?:maya\/asset|api\/maya\/generated-assets)\/)[^/"?#]+/
const POSTHOG_BROWSER_ATTRIBUTION_ALLOWLISTS: Readonly<Record<string, readonly string[]>> = {
  utm_source: POSTHOG_APPROVED_UTM_SOURCES,
  utm_medium: POSTHOG_APPROVED_UTM_MEDIUMS,
  utm_campaign: POSTHOG_APPROVED_UTM_CAMPAIGNS,
}

function browserAttributionKey(key: string | undefined): string | null {
  if (!key) return null
  const normalized = key.replace(/^\$/, "").toLowerCase()
  return /^utm_(?:source|medium|campaign|content|term)$/.test(normalized) ? normalized : null
}

export function normalizePostHogApiHost(apiHost: string): string | null {
  const normalized = apiHost.trim().replace(/\/+$/, "")
  if (normalized === "/ingest") return normalized
  try {
    const parsed = new URL(normalized)
    return parsed.origin === "https://eu.i.posthog.com" && parsed.pathname === "/"
      ? parsed.origin
      : null
  } catch {
    return null
  }
}

export function shouldResetPostHogIdentity(
  persistedDistinctId: string | null | undefined,
  serverDistinctId: string
): boolean {
  return Boolean(
    persistedDistinctId?.startsWith("user:") && persistedDistinctId !== serverDistinctId
  )
}

export function sanitizePostHogPathname(pathname: string): string | null {
  if (!pathname.startsWith("/")) return null
  const clean = pathname.split(/[?#]/, 1)[0]

  return clean
    .replace(TOKENIZED_PATH, "$1[token]")
    .replace(CUSTOMER_OBJECT_PATH, "$1[id]")
    .slice(0, 300)
}

export function sanitizePostHogEventPayload<T>(event: T): T | null {
  try {
    const scrub = (value: unknown, key?: string): unknown => {
      if (Array.isArray(value)) {
        return value.map(nested => scrub(nested, key)).filter(nested => nested !== undefined)
      }
      if (value && typeof value === "object") {
        return Object.fromEntries(
          Object.entries(value)
            .map(([nestedKey, nested]) => [nestedKey, scrub(nested, nestedKey)] as const)
            .filter((entry): entry is readonly [string, unknown] => entry[1] !== undefined)
        )
      }
      if (typeof value !== "string") return value

      const attributionKey = browserAttributionKey(key)
      if (attributionKey) {
        // Browser-controlled content/term fields are intentionally not sent to
        // PostHog. Source, medium and campaign must match the same finite static
        // values used by server capture, including SDK-owned $utm_* aliases.
        const allowlist = POSTHOG_BROWSER_ATTRIBUTION_ALLOWLISTS[attributionKey]
        const normalized = value.trim().toLowerCase()
        return allowlist?.includes(normalized) ? normalized : undefined
      }

      const tokenSafe = value.replace(TOKENIZED_PATH_IN_PAYLOAD, "$1[token]")
      if (!/^https?:\/\//i.test(tokenSafe) && !tokenSafe.startsWith("/")) return tokenSafe

      try {
        const absolute = /^https?:\/\//i.test(tokenSafe)
        const parsed = new URL(tokenSafe, "https://sselfie.invalid")
        return `${absolute ? parsed.origin : ""}${parsed.pathname}`
      } catch {
        return tokenSafe.split(/[?#]/, 1)[0]
      }
    }

    const sanitized = scrub(event) as T
    if (sanitized && typeof sanitized === "object") {
      const eventRecord = sanitized as Record<string, unknown>
      const properties = eventRecord.properties
      if (properties && typeof properties === "object" && !Array.isArray(properties)) {
        const propertyRecord = properties as Record<string, unknown>
        if (eventRecord.event === "$exception") {
          const exceptionDimension = (value: unknown) => {
            if (typeof value !== "string") return null
            const clean = value.trim()
            return /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(clean) ? clean : null
          }
          const exceptionList = Array.isArray(propertyRecord.$exception_list)
            ? propertyRecord.$exception_list
            : []
          const firstException =
            exceptionList[0] &&
            typeof exceptionList[0] === "object" &&
            !Array.isArray(exceptionList[0])
              ? (exceptionList[0] as Record<string, unknown>)
              : null
          const mechanism =
            firstException?.mechanism &&
            typeof firstException.mechanism === "object" &&
            !Array.isArray(firstException.mechanism)
              ? (firstException.mechanism as Record<string, unknown>)
              : null
          const exceptionType = exceptionDimension(
            propertyRecord.$exception_type ?? firstException?.type
          )
          const exceptionSource = exceptionDimension(
            propertyRecord.$exception_source ?? firstException?.source ?? mechanism?.type
          )
          for (const key of Object.keys(propertyRecord)) {
            if (/exception|error|message|stack/i.test(key)) delete propertyRecord[key]
          }
          if (exceptionType) propertyRecord.$exception_type = exceptionType
          if (exceptionSource) propertyRecord.$exception_source = exceptionSource
        } else {
          for (const key of Object.keys(propertyRecord)) {
            if (/^\$exception_/i.test(key)) delete propertyRecord[key]
          }
        }
      }
    }

    return sanitized
  } catch {
    return null
  }
}

export const MAYA_CHAT_TYPE_DEFAULT = "maya"
export const MAYA_CHAT_TYPE_PRO = "pro"
export const MAYA_CHAT_TYPE_FEED_PLANNER = "feed_planner"
export const MAYA_CHAT_TYPE_PROMPT_BUILDER = "prompt_builder"
export const MAYA_CHAT_TYPE_PRO_PHOTOSHOOT = "pro-photoshoot"

const FEED_PLANNER_CHAT_TYPE_ALIASES = [
  MAYA_CHAT_TYPE_FEED_PLANNER,
  "feed-planner",
  "feed_designer",
  "feed-designer",
] as const

function sanitizeChatType(value?: string | null): string {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

export function normalizeMayaChatType(
  value?: string | null,
  fallback: string = MAYA_CHAT_TYPE_DEFAULT,
): string {
  const sanitized = sanitizeChatType(value)

  if (!sanitized) return fallback
  if (FEED_PLANNER_CHAT_TYPE_ALIASES.includes(sanitized as (typeof FEED_PLANNER_CHAT_TYPE_ALIASES)[number])) {
    return MAYA_CHAT_TYPE_FEED_PLANNER
  }
  if (sanitized === "prompt-builder") return MAYA_CHAT_TYPE_PROMPT_BUILDER
  if (sanitized === "pro_photoshoot") return MAYA_CHAT_TYPE_PRO_PHOTOSHOOT

  return sanitized
}

export function getMayaChatTypeAliases(value?: string | null): string[] {
  const normalized = normalizeMayaChatType(value)

  if (normalized === MAYA_CHAT_TYPE_FEED_PLANNER) {
    return [...FEED_PLANNER_CHAT_TYPE_ALIASES]
  }

  return [normalized]
}

export function isFeedPlannerChatType(value?: string | null): boolean {
  return normalizeMayaChatType(value, "") === MAYA_CHAT_TYPE_FEED_PLANNER
}

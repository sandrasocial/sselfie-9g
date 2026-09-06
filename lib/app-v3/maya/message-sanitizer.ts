const BASE_TOOL_NAMES = new Set([
  "find_photos",
  "emit_concepts",
  "revise_carousel",
  "ask_clarify",
  "set_format",
  "remember",
  "save_brand_profile",
])

const CALENDAR_TOOL_NAMES = new Set(["show_feed_plan"])

const ADMIN_TOOL_NAMES = new Set([
  "show_admin_content_sources",
  "remember_admin_decision",
  "create_admin_carousel",
  "create_admin_tutorial_carousel",
  "create_admin_story_sequence",
  "publish_admin_shoot_to_vault",
  "show_admin_vault_drop_handoff",
])

type SanitizeOptions = {
  admin?: boolean
  calendar?: boolean
  maxMessages?: number
}

function toolNameFromPart(part: Record<string, unknown>): string | null {
  if (typeof part.toolName === "string") return part.toolName
  if (typeof part.type === "string" && part.type.startsWith("tool-")) {
    return part.type.slice("tool-".length)
  }
  return null
}

function isAllowedToolPart(
  part: Record<string, unknown>,
  { admin, calendar }: Required<Pick<SanitizeOptions, "admin" | "calendar">>
): boolean {
  const toolName = toolNameFromPart(part)
  if (!toolName) return false
  if (BASE_TOOL_NAMES.has(toolName)) return true
  if (calendar && CALENDAR_TOOL_NAMES.has(toolName)) return true
  return admin && ADMIN_TOOL_NAMES.has(toolName)
}

function sanitizePart(
  part: unknown,
  permissions: Required<Pick<SanitizeOptions, "admin" | "calendar">>
): unknown | null {
  if (!part || typeof part !== "object") return null
  const item = part as Record<string, unknown>
  const type = item.type

  if (type === "text") return typeof item.text === "string" ? item : null
  if (type === "file") return item
  if (type === "step-start") return item
  if (type === "dynamic-tool") return isAllowedToolPart(item, permissions) ? item : null
  if (typeof type === "string" && type.startsWith("tool-")) {
    return isAllowedToolPart(item, permissions) ? item : null
  }

  // Image/file parts from user messages have changed names across AI SDK releases.
  // Preserve non-tool parts, but be strict about retired/unknown tool calls.
  return item
}

function sanitizeMessage(
  message: unknown,
  permissions: Required<Pick<SanitizeOptions, "admin" | "calendar">>
): unknown | null {
  if (!message || typeof message !== "object") return null
  const item = message as Record<string, unknown>
  const role = item.role
  if (role !== "user" && role !== "assistant" && role !== "system" && role !== "tool") return null

  if (Array.isArray(item.parts)) {
    const parts = item.parts.map(part => sanitizePart(part, permissions)).filter(Boolean)
    if (parts.length === 0 && typeof item.content !== "string") return null
    return { ...item, parts }
  }

  if (typeof item.content === "string") return item
  return null
}

export function sanitizeMayaMessages(
  messages: unknown[],
  { admin = false, calendar = false, maxMessages = 24 }: SanitizeOptions = {}
): unknown[] {
  const permissions = { admin, calendar }
  const cleaned = messages.map(message => sanitizeMessage(message, permissions)).filter(Boolean)
  if (cleaned.length <= maxMessages) return cleaned
  return cleaned.slice(-maxMessages)
}

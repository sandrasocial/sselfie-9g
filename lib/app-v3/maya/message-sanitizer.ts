const BASE_TOOL_NAMES = new Set(["emit_concepts", "ask_clarify", "set_format", "remember"])

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
  maxMessages?: number
}

function toolNameFromPart(part: Record<string, unknown>): string | null {
  if (typeof part.toolName === "string") return part.toolName
  if (typeof part.type === "string" && part.type.startsWith("tool-")) {
    return part.type.slice("tool-".length)
  }
  return null
}

function isAllowedToolPart(part: Record<string, unknown>, admin: boolean): boolean {
  const toolName = toolNameFromPart(part)
  if (!toolName) return false
  if (BASE_TOOL_NAMES.has(toolName)) return true
  return admin && ADMIN_TOOL_NAMES.has(toolName)
}

function sanitizePart(part: unknown, admin: boolean): unknown | null {
  if (!part || typeof part !== "object") return null
  const item = part as Record<string, unknown>
  const type = item.type

  if (type === "text") return typeof item.text === "string" ? item : null
  if (type === "file") return item
  if (type === "step-start") return item
  if (type === "dynamic-tool") return isAllowedToolPart(item, admin) ? item : null
  if (typeof type === "string" && type.startsWith("tool-")) {
    return isAllowedToolPart(item, admin) ? item : null
  }

  // Image/file parts from user messages have changed names across AI SDK releases.
  // Preserve non-tool parts, but be strict about retired/unknown tool calls.
  return item
}

function sanitizeMessage(message: unknown, admin: boolean): unknown | null {
  if (!message || typeof message !== "object") return null
  const item = message as Record<string, unknown>
  const role = item.role
  if (role !== "user" && role !== "assistant" && role !== "system" && role !== "tool") return null

  if (Array.isArray(item.parts)) {
    const parts = item.parts.map(part => sanitizePart(part, admin)).filter(Boolean)
    if (parts.length === 0 && typeof item.content !== "string") return null
    return { ...item, parts }
  }

  if (typeof item.content === "string") return item
  return null
}

export function sanitizeMayaMessages(
  messages: unknown[],
  { admin = false, maxMessages = 24 }: SanitizeOptions = {}
): unknown[] {
  const cleaned = messages.map(message => sanitizeMessage(message, admin)).filter(Boolean)
  if (cleaned.length <= maxMessages) return cleaned
  return cleaned.slice(-maxMessages)
}


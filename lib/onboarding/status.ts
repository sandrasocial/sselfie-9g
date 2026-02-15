export interface BlueprintExtensionRecord {
  formData?: unknown
  dreamClient?: string | null
  feedStyle?: string | null
}

function parseFormData(value: unknown): Record<string, unknown> | null {
  if (!value) return null
  if (typeof value === "object") return value as Record<string, unknown>
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>
    } catch {
      return null
    }
  }
  return null
}

/**
 * Avatar images are the canonical selfie source for onboarding and generation.
 * This stays independent of blueprint state to avoid under-reporting completion.
 */
export function deriveHasSelfies(avatarImageCount: number): boolean {
  return Number(avatarImageCount || 0) > 0
}

/**
 * Blueprint extension is complete when dream client + feed style are both present.
 */
export function deriveHasExtensionData(record: BlueprintExtensionRecord | null | undefined): boolean {
  if (!record) return false
  const formData = parseFormData(record.formData)
  const dreamClientFromForm = formData?.dreamClient
  const dreamClient = (typeof dreamClientFromForm === "string" && dreamClientFromForm.trim()) || record.dreamClient
  const feedStyle = record.feedStyle
  return Boolean(dreamClient && typeof feedStyle === "string" && feedStyle.trim())
}

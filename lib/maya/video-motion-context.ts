import type { MayaUserSnapshot } from "@/lib/maya/user-snapshot"

const MAX_MEMORY_NOTES = 4

/** Matches `/api/maya/generate-motion-prompt` vision input rules. */
export function isMotionPromptReferenceImageUrl(value: unknown): value is string {
  if (typeof value !== "string") return false
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")
}

/**
 * When gallery rows or chat shares omit `prompt`, motion generation still needs scene text.
 * Aligns with Maya chat tool fallback ("Cinematic lifestyle scene").
 */
export const DEFAULT_MOTION_FLUX_PROMPT = "Cinematic lifestyle scene"

/**
 * Resolves the FLUX / scene string sent to motion prompt generation.
 * Prefers stored prompt, then description, then a safe default when an image URL is present.
 */
export function resolveFluxPromptForMotion(input: {
  fluxPrompt?: unknown
  description?: unknown
  imageUrl?: unknown
}): string {
  if (typeof input.fluxPrompt === "string") {
    const trimmed = input.fluxPrompt.replace(/\s+/g, " ").trim()
    if (trimmed) return trimmed
  }
  if (typeof input.description === "string") {
    const trimmed = input.description.replace(/\s+/g, " ").trim()
    if (trimmed) return trimmed
  }
  if (isMotionPromptReferenceImageUrl(input.imageUrl)) {
    return DEFAULT_MOTION_FLUX_PROMPT
  }
  return ""
}

function normalizeLine(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.replace(/\s+/g, " ").trim()
}

function readPreferenceNotes(snapshot: MayaUserSnapshot | null | undefined): string[] {
  if (!snapshot || !snapshot.memoryData || typeof snapshot.memoryData !== "object") return []
  const rawNotes = (snapshot.memoryData as Record<string, unknown>).user_preference_notes
  if (!Array.isArray(rawNotes)) return []

  return rawNotes
    .map((note) => normalizeLine(note))
    .filter(Boolean)
    .slice(0, MAX_MEMORY_NOTES)
}

function summarizeOfferBrief(snapshot: MayaUserSnapshot | null | undefined): string {
  if (!snapshot) return ""
  const prefill = snapshot.offerBrief?.prefill || {}

  const coreFields: string[] = []
  if (normalizeLine(prefill.offerType)) coreFields.push(`Offer: ${normalizeLine(prefill.offerType)}`)
  if (normalizeLine(prefill.transformation)) coreFields.push(`Transformation: ${normalizeLine(prefill.transformation)}`)
  if (normalizeLine(prefill.idealClient)) coreFields.push(`Audience: ${normalizeLine(prefill.idealClient)}`)
  if (normalizeLine(prefill.uniqueMethod)) coreFields.push(`Method: ${normalizeLine(prefill.uniqueMethod)}`)

  return coreFields.join(" | ")
}

export function buildMayaMotionSnapshotContext(snapshot: MayaUserSnapshot | null): string {
  if (!snapshot) return ""

  const lines: string[] = []
  const uploads = snapshot.uploads?.total || 0
  const recommendedSource = snapshot.generation?.recommendedSource || "base_model"
  lines.push(`User has ${uploads} saved visual assets. Recommended visual source: ${recommendedSource}.`)

  const offerSummary = summarizeOfferBrief(snapshot)
  if (offerSummary) {
    lines.push(`Brand summary: ${offerSummary}`)
  }

  const notes = readPreferenceNotes(snapshot)
  if (notes.length > 0) {
    lines.push(`Voice/style notes to respect: ${notes.join(" | ")}`)
  }

  return lines.join("\n")
}

export function buildMayaMotionPromptInput(input: {
  fluxPrompt: string
  description?: string
  category?: string
  imageUrl?: string
  snapshot: MayaUserSnapshot | null
}): string {
  const parts: string[] = [
    `Scene: "${normalizeLine(input.fluxPrompt)}"`,
  ]

  const description = normalizeLine(input.description)
  if (description) {
    parts.push(`Mood/intent: ${description}`)
  }

  const category = normalizeLine(input.category)
  if (category) {
    parts.push(`Content category: ${category}`)
  }

  if (normalizeLine(input.imageUrl)) {
    parts.push("Reference image is provided and should drive the motion details.")
  }

  const snapshotContext = buildMayaMotionSnapshotContext(input.snapshot)
  if (snapshotContext) {
    parts.push(`User context:\n${snapshotContext}`)
  }

  parts.push(
    "Write one motion prompt for Wan 2.5 I2V. Keep it natural, cinematic, and specific to what is visible in the image.",
    "Return a single line only. No markdown, no numbering, no labels.",
  )

  return parts.join("\n")
}

export function cleanGeneratedMotionPrompt(rawPrompt: string): string {
  const fallback = "Standing naturally, subtle breathing motion visible"
  const normalized = normalizeLine(rawPrompt)
  if (!normalized) return fallback

  const lines = rawPrompt.split("\n")

  for (const line of lines) {
    let cleaned = line.trim()
    if (!cleaned) continue

    cleaned = cleaned.replace(/\*\*[^*]+:\*\*/g, "")
    cleaned = cleaned.replace(/^[-*•]\s*/g, "")
    cleaned = cleaned.replace(/^["'`]|["'`]$/g, "")
    cleaned = cleaned.replace(/\*/g, "")
    cleaned = cleaned.replace(/^(motion|prompt|description):\s*/i, "")
    cleaned = cleaned.replace(/\s+/g, " ").trim()

    if (cleaned) return cleaned
  }

  return fallback
}


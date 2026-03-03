import { sql } from "@/lib/db/client"

const MAX_MEMORY_NOTE_LENGTH = 320
const MAX_MEMORY_NOTES = 20

const REMEMBER_COMMAND_REGEX = /^\s*(?:remember(?:\s+this)?|please remember|don't forget(?:\s+this)?)\b[\s,:-]*(.+)$/i
const STYLE_FEEDBACK_REGEX =
  /\b(this (?:doesn't|does not) sound like me|this is not me|not my (?:voice|style|vibe)|from now on|i (?:don't|do not) want|avoid)\b/i

export interface MayaRememberIntent {
  note: string
  source: "remember_command" | "style_feedback"
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function trimOuterQuotes(value: string): string {
  return value.replace(/^["'`]+/, "").replace(/["'`]+$/, "")
}

function sanitizeMemoryNote(value: string): string {
  const normalized = trimOuterQuotes(normalizeWhitespace(value))
  if (!normalized) return ""
  if (normalized.length <= MAX_MEMORY_NOTE_LENGTH) return normalized
  return `${normalized.slice(0, MAX_MEMORY_NOTE_LENGTH).trimEnd()}...`
}

function normalizeForDedupe(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim()
}

function parseNoteArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === "string" ? sanitizeMemoryNote(item) : ""))
    .filter(Boolean)
}

export function mergePreferenceNotes(existing: unknown, incoming: string): string[] {
  const nextNote = sanitizeMemoryNote(incoming)
  if (!nextNote) return parseNoteArray(existing).slice(0, MAX_MEMORY_NOTES)

  const existingNotes = parseNoteArray(existing)
  const dedupeIncoming = normalizeForDedupe(nextNote)

  const withoutDuplicate = existingNotes.filter((note) => normalizeForDedupe(note) !== dedupeIncoming)
  return [nextNote, ...withoutDuplicate].slice(0, MAX_MEMORY_NOTES)
}

export function detectMayaRememberIntent(userText: string): MayaRememberIntent | null {
  if (!userText || userText.trim().length === 0) return null

  const commandMatch = userText.match(REMEMBER_COMMAND_REGEX)
  if (commandMatch?.[1]) {
    const note = sanitizeMemoryNote(commandMatch[1])
    if (note) {
      return {
        note,
        source: "remember_command",
      }
    }
  }

  if (STYLE_FEEDBACK_REGEX.test(userText)) {
    const note = sanitizeMemoryNote(userText)
    if (note) {
      return {
        note,
        source: "style_feedback",
      }
    }
  }

  return null
}

export interface PersistMayaMemoryResult {
  note: string
  notes: string[]
}

export async function persistMayaRememberedPreference(
  userId: string | number,
  note: string,
): Promise<PersistMayaMemoryResult> {
  const normalizedUserId = String(userId || "").trim()
  if (!normalizedUserId) {
    throw new Error("Cannot persist Maya memory without a user id")
  }

  const sanitizedNote = sanitizeMemoryNote(note)
  if (!sanitizedNote) {
    throw new Error("Cannot persist an empty Maya memory note")
  }

  const existingRows = await sql`
    SELECT memory_data
    FROM maya_personal_memory
    WHERE user_id = ${normalizedUserId}
    LIMIT 1
  `

  const existingMemoryData = ((existingRows[0] as any)?.memory_data as Record<string, unknown> | undefined) ?? {}
  const notes = mergePreferenceNotes(existingMemoryData.user_preference_notes, sanitizedNote)
  const nowIso = new Date().toISOString()

  const memoryPatch = {
    user_preference_notes: notes,
    last_user_preference_note: sanitizedNote,
    remembered_preference_updated_at: nowIso,
  }

  await sql`
    INSERT INTO maya_personal_memory (user_id, memory_data, updated_at)
    VALUES (${normalizedUserId}, ${JSON.stringify(memoryPatch)}::jsonb, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET
      memory_data = COALESCE(maya_personal_memory.memory_data, '{}'::jsonb) || ${JSON.stringify(memoryPatch)}::jsonb,
      updated_at = NOW()
  `

  return {
    note: sanitizedNote,
    notes,
  }
}

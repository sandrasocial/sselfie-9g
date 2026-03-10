import { sql } from "@/lib/db/client"
import type { MayaOfferBrief } from "@/lib/maya/offer-brief"
import { mergeMayaMemoryData } from "@/lib/maya/memory-store"

const MAX_MEMORY_NOTE_LENGTH = 320
const MAX_MEMORY_NOTES = 20
const MAX_ASSET_INSTRUCTION_LENGTH = 500
const MAX_ASSET_HISTORY = 25

const REMEMBER_COMMAND_REGEX = /^\s*(?:remember(?:\s+this)?|please remember|don't forget(?:\s+this)?)\b[\s,:-]*(.+)$/i
const STYLE_FEEDBACK_REGEX =
  /\b(this (?:doesn't|does not) sound like me|this is not me|not my (?:voice|style|vibe)|from now on|i (?:don't|do not) want|avoid)\b/i
const ASSET_EDIT_ACTION_REGEX = /\b(edit|update|revise|change|rewrite|refresh|adjust|improve|fix)\b/i
const ASSET_CREATE_ACTION_REGEX = /\b(create|build|generate|make|draft|design|write)\b/i
const SOFT_CREATE_ACTION_REGEX = /\b(need|want|show me|give me|can you|could you|help me|make me)\b/i
const ASSET_CONTINUE_HINT_REGEX = /\b(headline|subheadline|section|cta|copy|layout|design|hook|title)\b/i
const IMAGE_EDIT_REGEX = /\b(photo|image|picture|selfie|concept|prompt)\b/i
const PAGE_ASSET_REGEX = /\b(landing page|landing pages|sales page|sales pages|homepage|home page|strategy page|strategy pages|web page|web pages)\b/i
const CALENDAR_ASSET_REGEX = /\b(content calendar|calendar|feed planner|planner|schedule)\b/i
const PDF_ASSET_REGEX = /\b(pdf|workbook|ebook|guide|cheatsheet|download)\b/i

export interface MayaRememberIntent {
  note: string
  source: "remember_command" | "style_feedback"
}

export type MayaAssetType = "page" | "calendar" | "pdf"

export interface MayaActiveAssetContext {
  assetType: MayaAssetType
  assetLabel: string
  assetId?: string
  lastInstruction?: string
  updatedAt: string
}

export interface MayaAssetEditIntent {
  assetType: MayaAssetType
  assetLabel: string
  instruction: string
  mode: "start" | "continue"
}

export interface MayaAssetCreateIntent {
  assetType: MayaAssetType
  instruction: string
}

export type MayaAssetIntentClass = MayaAssetType | "none"

export interface MayaAssetIntentResult {
  intentClass: MayaAssetIntentClass
  confidence: number
  missingFields: Array<"action_verb" | "asset_target">
  createIntent: MayaAssetCreateIntent | null
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

function sanitizeAssetInstruction(value: string): string {
  const normalized = trimOuterQuotes(normalizeWhitespace(value))
  if (!normalized) return ""
  if (normalized.length <= MAX_ASSET_INSTRUCTION_LENGTH) return normalized
  return `${normalized.slice(0, MAX_ASSET_INSTRUCTION_LENGTH).trimEnd()}...`
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

function inferAssetType(userText: string): MayaAssetType | null {
  if (PDF_ASSET_REGEX.test(userText)) return "pdf"
  if (CALENDAR_ASSET_REGEX.test(userText)) return "calendar"
  if (PAGE_ASSET_REGEX.test(userText)) return "page"
  return null
}

function defaultAssetLabel(assetType: MayaAssetType): string {
  if (assetType === "calendar") return "Content Calendar"
  if (assetType === "pdf") return "Workbook"
  return "Landing Page"
}

function parseActiveAssetContext(value: unknown): MayaActiveAssetContext | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const assetType =
    record.assetType === "page" || record.assetType === "calendar" || record.assetType === "pdf"
      ? (record.assetType as MayaAssetType)
      : null
  if (!assetType) return null
  const assetLabel =
    typeof record.assetLabel === "string" && record.assetLabel.trim().length > 0
      ? sanitizeMemoryNote(record.assetLabel)
      : defaultAssetLabel(assetType)
  const lastInstruction =
    typeof record.lastInstruction === "string" ? sanitizeAssetInstruction(record.lastInstruction) : undefined
  const assetId =
    typeof record.assetId === "string" && record.assetId.trim().length > 0 ? record.assetId.trim() : undefined
  const updatedAt =
    typeof record.updatedAt === "string" && record.updatedAt.trim().length > 0
      ? record.updatedAt
      : new Date(0).toISOString()

  return {
    assetType,
    assetLabel,
    assetId,
    lastInstruction,
    updatedAt,
  }
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

export function detectMayaAssetEditIntent(
  userText: string,
  activeAssetContext: MayaActiveAssetContext | null,
): MayaAssetEditIntent | null {
  if (!userText || userText.trim().length === 0) return null

  const sanitizedInstruction = sanitizeAssetInstruction(userText)
  if (!sanitizedInstruction) return null

  const explicitAssetType = inferAssetType(sanitizedInstruction)
  const hasEditAction = ASSET_EDIT_ACTION_REGEX.test(sanitizedInstruction)

  if (explicitAssetType && hasEditAction) {
    return {
      assetType: explicitAssetType,
      assetLabel: defaultAssetLabel(explicitAssetType),
      instruction: sanitizedInstruction,
      mode: "start",
    }
  }

  if (!activeAssetContext) return null
  if (explicitAssetType && !hasEditAction) return null
  if (IMAGE_EDIT_REGEX.test(sanitizedInstruction)) return null

  const canContinue = hasEditAction || ASSET_CONTINUE_HINT_REGEX.test(sanitizedInstruction)
  if (!canContinue) return null

  return {
    assetType: activeAssetContext.assetType,
    assetLabel: activeAssetContext.assetLabel || defaultAssetLabel(activeAssetContext.assetType),
    instruction: sanitizedInstruction,
    mode: "continue",
  }
}

export function detectMayaAssetCreateIntent(userText: string): MayaAssetCreateIntent | null {
  if (!userText || userText.trim().length === 0) return null
  const instruction = sanitizeAssetInstruction(userText)
  if (!instruction) return null
  if (IMAGE_EDIT_REGEX.test(instruction)) return null

  const assetType = inferAssetType(instruction)
  if (!assetType) return null
  if (!ASSET_CREATE_ACTION_REGEX.test(instruction)) {
    if (!((assetType === "page" || assetType === "calendar") && SOFT_CREATE_ACTION_REGEX.test(instruction))) {
      if (ASSET_EDIT_ACTION_REGEX.test(instruction)) return null
      return null
    }
  } else if (ASSET_EDIT_ACTION_REGEX.test(instruction)) {
    return null
  }

  return {
    assetType,
    instruction,
  }
}

function clampConfidence(value: number): number {
  if (Number.isNaN(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return Number(value.toFixed(2))
}

export function detectMayaAssetIntentResult(userText: string): MayaAssetIntentResult {
  if (!userText || userText.trim().length === 0) {
    return {
      intentClass: "none",
      confidence: 0,
      missingFields: ["asset_target", "action_verb"],
      createIntent: null,
    }
  }

  const instruction = sanitizeAssetInstruction(userText)
  if (!instruction) {
    return {
      intentClass: "none",
      confidence: 0,
      missingFields: ["asset_target", "action_verb"],
      createIntent: null,
    }
  }

  const assetType = inferAssetType(instruction)
  if (!assetType || IMAGE_EDIT_REGEX.test(instruction)) {
    return {
      intentClass: "none",
      confidence: 0.05,
      missingFields: ["asset_target", "action_verb"],
      createIntent: null,
    }
  }

  const hasCreateAction = ASSET_CREATE_ACTION_REGEX.test(instruction)
  const hasSoftCreateAction = SOFT_CREATE_ACTION_REGEX.test(instruction)
  const hasEditAction = ASSET_EDIT_ACTION_REGEX.test(instruction)

  let confidence = 0.55
  if (hasCreateAction) confidence += 0.28
  else if (hasSoftCreateAction) confidence += 0.12
  if (hasEditAction) confidence -= 0.22

  const missingFields: MayaAssetIntentResult["missingFields"] = []
  if (!hasCreateAction && !hasSoftCreateAction) {
    missingFields.push("action_verb")
  }

  return {
    intentClass: assetType,
    confidence: clampConfidence(confidence),
    missingFields,
    createIntent: detectMayaAssetCreateIntent(instruction),
  }
}

export interface PersistMayaMemoryResult {
  note: string
  notes: string[]
}

export interface PersistMayaActiveAssetResult {
  activeAsset: MayaActiveAssetContext
  historyCount: number
}

export interface PersistMayaOfferBriefResult {
  brief: MayaOfferBrief
  updatedAt: string
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

  await mergeMayaMemoryData(normalizedUserId, memoryPatch)

  return {
    note: sanitizedNote,
    notes,
  }
}

export async function persistMayaOfferBrief(
  userId: string | number,
  brief: MayaOfferBrief,
): Promise<PersistMayaOfferBriefResult> {
  const normalizedUserId = String(userId || "").trim()
  if (!normalizedUserId) {
    throw new Error("Cannot persist Maya offer brief without a user id")
  }

  const nowIso = new Date().toISOString()
  const memoryPatch = {
    latest_offer_brief: brief,
    last_offer_brief_updated_at: nowIso,
  }

  await mergeMayaMemoryData(normalizedUserId, memoryPatch)

  return {
    brief,
    updatedAt: nowIso,
  }
}

export async function getMayaActiveAssetContext(
  userId: string | number,
): Promise<MayaActiveAssetContext | null> {
  const normalizedUserId = String(userId || "").trim()
  if (!normalizedUserId) return null

  const rows = await sql`
    SELECT memory_data
    FROM maya_personal_memory
    WHERE user_id = ${normalizedUserId}
    LIMIT 1
  `

  const memoryData = ((rows[0] as any)?.memory_data as Record<string, unknown> | undefined) ?? {}
  return parseActiveAssetContext(memoryData.active_asset_context)
}

export async function persistMayaActiveAssetContext(
  userId: string | number,
  input: {
    assetType: MayaAssetType
    assetLabel?: string
    assetId?: string
    instruction: string
  },
): Promise<PersistMayaActiveAssetResult> {
  const normalizedUserId = String(userId || "").trim()
  if (!normalizedUserId) {
    throw new Error("Cannot persist active Maya asset without a user id")
  }

  const assetLabel = sanitizeMemoryNote(input.assetLabel || defaultAssetLabel(input.assetType)) || defaultAssetLabel(input.assetType)
  const instruction = sanitizeAssetInstruction(input.instruction)
  if (!instruction) {
    throw new Error("Cannot persist empty asset instruction")
  }

  const existingRows = await sql`
    SELECT memory_data
    FROM maya_personal_memory
    WHERE user_id = ${normalizedUserId}
    LIMIT 1
  `

  const existingMemoryData = ((existingRows[0] as any)?.memory_data as Record<string, unknown> | undefined) ?? {}
  const existingHistoryRaw = Array.isArray(existingMemoryData.asset_edit_history) ? existingMemoryData.asset_edit_history : []
  const existingHistory = existingHistoryRaw
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const record = entry as Record<string, unknown>
      return {
        assetType:
          record.assetType === "page" || record.assetType === "calendar" || record.assetType === "pdf"
            ? (record.assetType as MayaAssetType)
            : input.assetType,
        assetLabel:
          typeof record.assetLabel === "string" && record.assetLabel.trim().length > 0
            ? sanitizeMemoryNote(record.assetLabel)
            : assetLabel,
        assetId:
          typeof record.assetId === "string" && record.assetId.trim().length > 0
            ? record.assetId.trim()
            : undefined,
        instruction:
          typeof record.instruction === "string" ? sanitizeAssetInstruction(record.instruction) : "",
        updatedAt:
          typeof record.updatedAt === "string" && record.updatedAt.trim().length > 0
            ? record.updatedAt
            : new Date(0).toISOString(),
      }
    })
    .filter((entry) => entry.instruction.length > 0)

  const nowIso = new Date().toISOString()
  const assetId = typeof input.assetId === "string" && input.assetId.trim().length > 0 ? input.assetId.trim() : undefined
  const activeAsset: MayaActiveAssetContext = {
    assetType: input.assetType,
    assetLabel,
    assetId,
    lastInstruction: instruction,
    updatedAt: nowIso,
  }

  const nextHistory = [
    {
      assetType: input.assetType,
      assetLabel,
      assetId,
      instruction,
      updatedAt: nowIso,
    },
    ...existingHistory,
  ].slice(0, MAX_ASSET_HISTORY)

  const memoryPatch = {
    active_asset_context: activeAsset,
    asset_edit_history: nextHistory,
    last_asset_edit_instruction: instruction,
    asset_context_updated_at: nowIso,
  }

  await mergeMayaMemoryData(normalizedUserId, memoryPatch)

  return {
    activeAsset,
    historyCount: nextHistory.length,
  }
}

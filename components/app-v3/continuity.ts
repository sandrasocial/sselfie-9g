import type { AppV3Section } from "@/lib/app-v3/navigation"
import {
  sanitizeServerMayaDraftSnapshot,
  type ServerMayaDraftSnapshot,
} from "@/lib/app-v3/maya/draft-snapshot"
import { sanitizeMayaMessages } from "@/lib/app-v3/maya/message-sanitizer"
import type { ConciergeSession, OutputFormat } from "./types"
import type { ConceptGenState } from "./concept-card"
import { sanitizeTextOverlaySpec } from "@/lib/app-v3/text-overlay"

export const APP_SECTION_STORAGE_KEY = "sselfie.appV3.section.v1"
export const CONCIERGE_STORAGE_KEY = "sselfie.appV3.concierge.v1"
export const MAYA_DRAFT_STORAGE_KEY = "sselfie.appV3.mayaDraft.v1"

const VALID_SECTIONS: AppV3Section[] = ["create", "photos", "content", "library", "account"]
const VALID_FORMATS: OutputFormat[] = [
  "photo",
  "photoshoot",
  "reel-cover",
  "carousel",
  "story-slide",
  "story-sequence",
  "video",
]
const MAX_SNAPSHOT_AGE_MS = 1000 * 60 * 60 * 24 * 14

export type ConciergeSnapshot = {
  isOpen: boolean
  session: ConciergeSession
  savedAt: number
}

export type MayaDraftSnapshot = {
  chatId: string
  sessionStartedAt: number
  savedAt: number
  messages: unknown[]
  genState: Record<string, ConceptGenState>
  generatedOnce: boolean
  setupOpen: boolean
}

function nowish(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isFinite(value) && Date.now() - value < MAX_SNAPSHOT_AGE_MS
  )
}

function readJson(key: string): unknown | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage may be full or disabled */
  }
}

export function coerceStoredAppSection(value: unknown, fallback: AppV3Section): AppV3Section {
  return VALID_SECTIONS.includes(value as AppV3Section) ? (value as AppV3Section) : fallback
}

export function readStoredAppSection(fallback: AppV3Section): AppV3Section {
  return coerceStoredAppSection(readJson(APP_SECTION_STORAGE_KEY), fallback)
}

export function saveStoredAppSection(section: AppV3Section) {
  writeJson(APP_SECTION_STORAGE_KEY, section)
}

export function buildStoredSectionHref(section: AppV3Section): string {
  return section === "create" ? "/app" : `/app?view=${section}`
}

function sanitizeSession(value: unknown): ConciergeSession | null {
  if (!value || typeof value !== "object") return null
  const session = value as Record<string, unknown>
  const aesthetic = session.aesthetic as Record<string, unknown> | null
  if (!aesthetic || typeof aesthetic !== "object") return null
  if (typeof aesthetic.id !== "string" || typeof aesthetic.name !== "string") return null
  if (typeof aesthetic.blurb !== "string" || typeof aesthetic.intent !== "string") return null
  if (typeof session.startedAt !== "number" || !Number.isFinite(session.startedAt)) return null
  const outputFormat = VALID_FORMATS.includes(session.outputFormat as OutputFormat)
    ? (session.outputFormat as OutputFormat)
    : null
  const referenceSelfieUrl =
    typeof session.referenceSelfieUrl === "string" ? session.referenceSelfieUrl : null
  const videoSourceUrl =
    typeof session.videoSourceUrl === "string" ? session.videoSourceUrl : null
  const seedPrompt = typeof session.seedPrompt === "string" ? session.seedPrompt : null

  return {
    aesthetic: {
      id: aesthetic.id,
      name: aesthetic.name,
      blurb: aesthetic.blurb,
      coverImage: typeof aesthetic.coverImage === "string" ? aesthetic.coverImage : "",
      thumbnails: Array.isArray(aesthetic.thumbnails)
        ? aesthetic.thumbnails.filter((item): item is string => typeof item === "string")
        : [],
      shotCount: typeof aesthetic.shotCount === "number" ? aesthetic.shotCount : 0,
      intent: aesthetic.intent,
    },
    outputFormat,
    referenceSelfieUrl,
    videoSourceUrl,
    graphicText:
      session.graphicText && typeof session.graphicText === "object"
        ? (session.graphicText as ConciergeSession["graphicText"])
        : null,
    seedPrompt,
    startedAt: session.startedAt,
  }
}

export function sanitizeConciergeSnapshot(value: unknown): ConciergeSnapshot | null {
  if (!value || typeof value !== "object") return null
  const snapshot = value as Record<string, unknown>
  if (!nowish(snapshot.savedAt)) return null
  const session = sanitizeSession(snapshot.session)
  if (!session) return null
  return { isOpen: snapshot.isOpen === true, session, savedAt: snapshot.savedAt }
}

export function readConciergeSnapshot(): ConciergeSnapshot | null {
  return sanitizeConciergeSnapshot(readJson(CONCIERGE_STORAGE_KEY))
}

export function saveConciergeSnapshot(snapshot: {
  isOpen: boolean
  session: ConciergeSession | null
}) {
  if (!snapshot.session) return
  writeJson(CONCIERGE_STORAGE_KEY, { ...snapshot, savedAt: Date.now() })
}

function sanitizeGenState(value: unknown): Record<string, ConceptGenState> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const out: Record<string, ConceptGenState> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (!item || typeof item !== "object") continue
    const state = item as Record<string, unknown>
    if (state.status === "done" && typeof state.videoUrl === "string") {
      out[key] = {
        status: "done",
        videoUrl: state.videoUrl,
      }
    } else if (state.status === "done" && Array.isArray(state.imageUrls) && state.imageUrls.length > 0) {
      const textOverlaySpecs = Array.isArray(state.textOverlaySpecs)
        ? state.textOverlaySpecs
            .map(sanitizeTextOverlaySpec)
            .filter((spec): spec is NonNullable<ReturnType<typeof sanitizeTextOverlaySpec>> =>
              Boolean(spec)
            )
        : undefined
      out[key] = {
        status: "done",
        imageUrls: state.imageUrls.filter((url): url is string => typeof url === "string"),
        ...(textOverlaySpecs?.length ? { textOverlaySpecs } : {}),
      }
    } else if (
      state.status === "idle" ||
      state.status === "generating" ||
      state.status === "error"
    ) {
      out[key] = { status: "idle" }
    }
  }
  return out
}

export function sanitizeMayaDraftForSession(
  value: unknown,
  sessionStartedAt: number | null | undefined
): MayaDraftSnapshot | null {
  if (!value || typeof value !== "object" || typeof sessionStartedAt !== "number") return null
  const draft = value as Record<string, unknown>
  if (!nowish(draft.savedAt)) return null
  if (draft.sessionStartedAt !== sessionStartedAt) return null
  if (typeof draft.chatId !== "string" || draft.chatId.length === 0) return null
  if (!Array.isArray(draft.messages)) return null
  return {
    chatId: draft.chatId,
    sessionStartedAt,
    savedAt: draft.savedAt,
    messages: sanitizeMayaMessages(draft.messages, { admin: true }),
    genState: sanitizeGenState(draft.genState),
    generatedOnce: draft.generatedOnce === true,
    setupOpen: draft.setupOpen === true,
  }
}

export function readMayaDraftForSession(
  sessionStartedAt: number | null | undefined
): MayaDraftSnapshot | null {
  return sanitizeMayaDraftForSession(readJson(MAYA_DRAFT_STORAGE_KEY), sessionStartedAt)
}

export function saveMayaDraft(snapshot: Omit<MayaDraftSnapshot, "savedAt">) {
  writeJson(MAYA_DRAFT_STORAGE_KEY, { ...snapshot, savedAt: Date.now() })
}

export function clearMayaDraft() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(MAYA_DRAFT_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function cacheServerMayaDraftSnapshot(value: unknown): ServerMayaDraftSnapshot | null {
  const snapshot = sanitizeServerMayaDraftSnapshot(value)
  if (!snapshot) return null
  const session = snapshot.session as ConciergeSession
  saveConciergeSnapshot({ isOpen: snapshot.isOpen, session })
  saveMayaDraft({
    chatId: snapshot.chatId,
    sessionStartedAt: session.startedAt,
    messages: sanitizeMayaMessages(snapshot.messages, { admin: true }),
    genState: snapshot.genState as Record<string, ConceptGenState>,
    generatedOnce: snapshot.generatedOnce,
    setupOpen: snapshot.setupOpen,
  })
  return snapshot
}

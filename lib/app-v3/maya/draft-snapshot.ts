import { sanitizeMayaMessages } from "@/lib/app-v3/maya/message-sanitizer"
import { sanitizeTextOverlaySpec, type TextOverlaySpec } from "@/lib/app-v3/text-overlay"

export type ServerOutputFormat =
  | "photo"
  | "photoshoot"
  | "reel-cover"
  | "carousel"
  | "story-slide"
  | "story-sequence"
  | "video"

export type ServerCreationIntentSource =
  | "typed"
  | "starter_chip"
  | "content_card"
  | "vault_shot"
  | "gallery_action"
  | "manual"

export type ServerCreationIntentSnapshot = {
  format: ServerOutputFormat | null
  source: ServerCreationIntentSource
  confidence: "high" | "needs_clarify"
}

export type ServerAestheticSnapshot = {
  id: string
  name: string
  blurb: string
  coverImage: string
  thumbnails: string[]
  shotCount: number
  selectedShot?: {
    id: string
    title: string
    image: string
    whenToUse?: string
    mood?: string
    stylePrompt?: string
  } | null
  intent: string
}

export type ServerConciergeSessionSnapshot = {
  aesthetic: ServerAestheticSnapshot
  outputFormat: ServerOutputFormat | null
  referenceSelfieUrl: string | null
  videoSourceUrl: string | null
  graphicText: unknown | null
  seedPrompt?: string | null
  creationIntent?: ServerCreationIntentSnapshot | null
  startedAt: number
}

export type ServerConceptGenState = {
  status: string
  imageUrls?: string[]
  textOverlaySpecs?: TextOverlaySpec[]
  /** TEXT-STUDIO-01: per-image baked text renders, index-aligned with imageUrls. */
  bakedImageUrls?: Array<string | null>
  /** Gallery row ids, index-aligned with imageUrls. Without these, a bake/edit started
   * from a RESTORED card loses its variant_of lineage (parent id unknown after reload). */
  aiImageId?: number | null
  aiImageIds?: Array<number | null>
  videoUrl?: string
  error?: string
  previewUrl?: string
}

export type ServerMayaDraftSnapshot = {
  isOpen: boolean
  chatId: string
  session: ServerConciergeSessionSnapshot
  savedAt: number
  messages: unknown[]
  genState: Record<string, ServerConceptGenState>
  generatedOnce: boolean
  setupOpen: boolean
}

const VALID_FORMATS: ServerOutputFormat[] = [
  "photo",
  "photoshoot",
  "reel-cover",
  "carousel",
  "story-slide",
  "story-sequence",
  "video",
]
const VALID_INTENT_SOURCES: ServerCreationIntentSource[] = [
  "typed",
  "starter_chip",
  "content_card",
  "vault_shot",
  "gallery_action",
  "manual",
]
const MAX_SNAPSHOT_AGE_MS = 1000 * 60 * 60 * 24 * 14

function nowish(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isFinite(value) && Date.now() - value < MAX_SNAPSHOT_AGE_MS
  )
}

function sanitizeAestheticShot(value: unknown): ServerAestheticSnapshot["selectedShot"] {
  if (!value || typeof value !== "object") return null
  const shot = value as Record<string, unknown>
  if (typeof shot.id !== "string" || typeof shot.title !== "string") return null
  if (typeof shot.image !== "string" || shot.image.length === 0) return null
  return {
    id: shot.id,
    title: shot.title,
    image: shot.image,
    whenToUse: typeof shot.whenToUse === "string" ? shot.whenToUse : undefined,
    mood: typeof shot.mood === "string" ? shot.mood : undefined,
    stylePrompt: typeof shot.stylePrompt === "string" ? shot.stylePrompt : undefined,
  }
}

function sanitizeAesthetic(value: unknown): ServerAestheticSnapshot | null {
  if (!value || typeof value !== "object") return null
  const aesthetic = value as Record<string, unknown>
  if (typeof aesthetic.id !== "string" || typeof aesthetic.name !== "string") return null
  if (typeof aesthetic.blurb !== "string" || typeof aesthetic.intent !== "string") return null
  return {
    id: aesthetic.id,
    name: aesthetic.name,
    blurb: aesthetic.blurb,
    coverImage: typeof aesthetic.coverImage === "string" ? aesthetic.coverImage : "",
    thumbnails: Array.isArray(aesthetic.thumbnails)
      ? aesthetic.thumbnails.filter((item): item is string => typeof item === "string")
      : [],
    shotCount: typeof aesthetic.shotCount === "number" ? aesthetic.shotCount : 0,
    selectedShot: sanitizeAestheticShot(aesthetic.selectedShot),
    intent: aesthetic.intent,
  }
}

function sanitizeCreationIntent(value: unknown): ServerCreationIntentSnapshot | null {
  if (!value || typeof value !== "object") return null
  const intent = value as Record<string, unknown>
  const format = VALID_FORMATS.includes(intent.format as ServerOutputFormat)
    ? (intent.format as ServerOutputFormat)
    : null
  const source = VALID_INTENT_SOURCES.includes(intent.source as ServerCreationIntentSource)
    ? (intent.source as ServerCreationIntentSource)
    : "manual"
  const confidence = intent.confidence === "high" ? "high" : "needs_clarify"
  return { format, source, confidence }
}

function sanitizeSession(value: unknown): ServerConciergeSessionSnapshot | null {
  if (!value || typeof value !== "object") return null
  const session = value as Record<string, unknown>
  const aesthetic = sanitizeAesthetic(session.aesthetic)
  if (!aesthetic) return null
  if (typeof session.startedAt !== "number" || !Number.isFinite(session.startedAt)) return null
  if (
    session.outputFormat !== null &&
    !VALID_FORMATS.includes(session.outputFormat as ServerOutputFormat)
  ) {
    return null
  }
  return {
    aesthetic,
    outputFormat: (session.outputFormat as ServerOutputFormat | null) ?? null,
    referenceSelfieUrl:
      typeof session.referenceSelfieUrl === "string" ? session.referenceSelfieUrl : null,
    videoSourceUrl: typeof session.videoSourceUrl === "string" ? session.videoSourceUrl : null,
    graphicText:
      session.graphicText && typeof session.graphicText === "object" ? session.graphicText : null,
    seedPrompt: typeof session.seedPrompt === "string" ? session.seedPrompt : null,
    creationIntent: sanitizeCreationIntent(session.creationIntent),
    startedAt: session.startedAt,
  }
}

export function sanitizeServerGenState(value: unknown): Record<string, ServerConceptGenState> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const out: Record<string, ServerConceptGenState> = {}
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
            .filter((spec): spec is TextOverlaySpec => Boolean(spec))
        : undefined
      // TEXT-STUDIO-01: baked renders survive with their specs (index-aligned, https only).
      const bakedImageUrls = Array.isArray(state.bakedImageUrls)
        ? state.bakedImageUrls.map(url =>
            typeof url === "string" && url.startsWith("https://") ? url : null
          )
        : undefined
      // Variant lineage survives reloads: keep gallery row ids alongside their URLs.
      const aiImageIds = Array.isArray(state.aiImageIds)
        ? state.aiImageIds.map(id => (typeof id === "number" && Number.isInteger(id) ? id : null))
        : undefined
      const aiImageId =
        typeof state.aiImageId === "number" && Number.isInteger(state.aiImageId)
          ? state.aiImageId
          : null
      out[key] = {
        status: "done",
        imageUrls: state.imageUrls.filter((url): url is string => typeof url === "string"),
        ...(textOverlaySpecs?.length ? { textOverlaySpecs } : {}),
        ...(bakedImageUrls?.some(Boolean) ? { bakedImageUrls } : {}),
        ...(aiImageId != null ? { aiImageId } : {}),
        ...(aiImageIds?.some(id => id != null) ? { aiImageIds } : {}),
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

export function sanitizeServerMayaDraftSnapshot(value: unknown): ServerMayaDraftSnapshot | null {
  if (!value || typeof value !== "object") return null
  const draft = value as Record<string, unknown>
  if (!nowish(draft.savedAt)) return null
  if (typeof draft.chatId !== "string" || draft.chatId.length === 0) return null
  if (!Array.isArray(draft.messages)) return null
  const session = sanitizeSession(draft.session)
  if (!session) return null
  return {
    isOpen: draft.isOpen === true,
    chatId: draft.chatId,
    session,
    savedAt: draft.savedAt,
    messages: sanitizeMayaMessages(draft.messages, { admin: true }),
    genState: sanitizeServerGenState(draft.genState),
    generatedOnce: draft.generatedOnce === true,
    setupOpen: draft.setupOpen === true,
  }
}

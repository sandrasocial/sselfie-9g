import { sanitizeMayaMessages } from "@/lib/app-v3/maya/message-sanitizer"
import {
  sanitizeTextOverlaySpec,
  type OverlayStyleId,
  type TextOverlaySpec,
} from "@/lib/app-v3/text-overlay"

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

export type ServerShotDirectorSnapshot = {
  mode: "recreate-shot" | "more-angles" | "collection-shoot" | "new-shoot"
  requestedShotCount: 6 | 8 | 9
}

export type ServerGenerationSourceSnapshot = "selfie" | "trained-model"

export type ServerLastGenerationSnapshot = {
  format: ServerOutputFormat
  imageCount: number
  styleName: string | null
  conceptTitle: string | null
  usedInspiration: boolean
  usedTrainedModel: boolean
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
  shotDirector?: ServerShotDirectorSnapshot | null
  generationSource?: ServerGenerationSourceSnapshot | null
  initialSetupAction?: "selfie_manager" | null
  /** The member's carried idea (structured context, never a replayed message). */
  creationIdea?: string | null
  startedAt: number
}

export type ServerConceptGenState = {
  status: string
  imageUrls?: string[]
  textOverlaySpecs?: TextOverlaySpec[]
  /** TEXT-STUDIO-01: per-image baked text renders, index-aligned with imageUrls. */
  bakedImageUrls?: Array<string | null>
  /** Persisted gallery ids for baked text variants, index-aligned with bakedImageUrls. */
  bakedAiImageIds?: Array<number | null>
  /** Gallery row ids, index-aligned with imageUrls. Without these, a bake/edit started
   * from a RESTORED card loses its variant_of lineage (parent id unknown after reload). */
  aiImageId?: number | null
  aiImageIds?: Array<number | null>
  videoUrl?: string
  videoAssetId?: string | null
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
  lastGeneration?: ServerLastGenerationSnapshot | null
  textOverlayMode?: "with-text" | "without-text" | null
  textStyleChoice?: OverlayStyleId | null
  textStyleAdjustments?: string | null
  generationSource?: ServerGenerationSourceSnapshot | null
  valueUsed?: boolean
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
const VALID_SHOT_DIRECTOR_MODES: ServerShotDirectorSnapshot["mode"][] = [
  "recreate-shot",
  "more-angles",
  "collection-shoot",
  "new-shoot",
]
const VALID_GENERATION_SOURCES: ServerGenerationSourceSnapshot[] = ["selfie", "trained-model"]
const VALID_TEXT_OVERLAY_MODES = ["with-text", "without-text"] as const
const VALID_TEXT_STYLE_CHOICES: OverlayStyleId[] = [
  "editorial-serif-center",
  "lower-third-accent",
  "top-band-minimal",
  "quote-statement",
  "series-cover",
  "cutout-editorial",
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

function sanitizeShotDirector(value: unknown): ServerShotDirectorSnapshot | null {
  if (!value || typeof value !== "object") return null
  const director = value as Record<string, unknown>
  if (!VALID_SHOT_DIRECTOR_MODES.includes(director.mode as ServerShotDirectorSnapshot["mode"])) {
    return null
  }
  const requestedShotCount =
    director.requestedShotCount === 8 || director.requestedShotCount === 9
      ? director.requestedShotCount
      : 6
  return {
    mode: director.mode as ServerShotDirectorSnapshot["mode"],
    requestedShotCount,
  }
}

function sanitizeGenerationSource(value: unknown): ServerGenerationSourceSnapshot | null {
  return VALID_GENERATION_SOURCES.includes(value as ServerGenerationSourceSnapshot)
    ? (value as ServerGenerationSourceSnapshot)
    : null
}

function sanitizeLastGeneration(value: unknown): ServerLastGenerationSnapshot | null {
  if (!value || typeof value !== "object") return null
  const generation = value as Record<string, unknown>
  if (!VALID_FORMATS.includes(generation.format as ServerOutputFormat)) return null
  if (
    typeof generation.imageCount !== "number" ||
    !Number.isInteger(generation.imageCount) ||
    generation.imageCount < 1 ||
    generation.imageCount > 12
  ) {
    return null
  }

  const boundedText = (candidate: unknown, max: number): string | null => {
    if (typeof candidate !== "string") return null
    const clean = candidate.replace(/\s+/g, " ").trim().slice(0, max)
    return clean || null
  }

  return {
    format: generation.format as ServerOutputFormat,
    imageCount: generation.imageCount,
    styleName: boundedText(generation.styleName, 80),
    conceptTitle: boundedText(generation.conceptTitle, 120),
    usedInspiration: generation.usedInspiration === true,
    usedTrainedModel: generation.usedTrainedModel === true,
  }
}

function sanitizeTextOverlayMode(value: unknown): (typeof VALID_TEXT_OVERLAY_MODES)[number] | null {
  return VALID_TEXT_OVERLAY_MODES.includes(value as (typeof VALID_TEXT_OVERLAY_MODES)[number])
    ? (value as (typeof VALID_TEXT_OVERLAY_MODES)[number])
    : null
}

function sanitizeTextStyleChoice(value: unknown): OverlayStyleId | null {
  return VALID_TEXT_STYLE_CHOICES.includes(value as OverlayStyleId)
    ? (value as OverlayStyleId)
    : null
}

function sanitizeTextStyleAdjustments(value: unknown): string | null {
  if (typeof value !== "string") return null
  const clean = value.replace(/\s+/g, " ").trim().slice(0, 220)
  return clean || null
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
    shotDirector: sanitizeShotDirector(session.shotDirector),
    generationSource: sanitizeGenerationSource(session.generationSource),
    // initialSetupAction is a one-shot launch instruction, never durable state: restoring it
    // would re-open the selfie manager on every reload of this draft.
    initialSetupAction: null,
    // The carried idea IS durable session state: it must survive a reload so Maya keeps
    // the member's context without her restating it.
    creationIdea:
      typeof session.creationIdea === "string" && session.creationIdea.trim()
        ? session.creationIdea.slice(0, 400)
        : null,
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
      const videoAssetId =
        typeof state.videoAssetId === "string" && /^video_[1-9]\d*$/.test(state.videoAssetId)
          ? state.videoAssetId
          : null
      out[key] = {
        status: "done",
        videoUrl: state.videoUrl,
        ...(videoAssetId ? { videoAssetId } : {}),
      }
    } else if (
      state.status === "done" &&
      Array.isArray(state.imageUrls) &&
      state.imageUrls.length > 0
    ) {
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
      const bakedAiImageIds = Array.isArray(state.bakedAiImageIds)
        ? state.bakedAiImageIds.map(id =>
            typeof id === "number" && Number.isInteger(id) ? id : null
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
        ...(bakedAiImageIds?.some(id => id != null) ? { bakedAiImageIds } : {}),
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
    lastGeneration: sanitizeLastGeneration(draft.lastGeneration),
    textOverlayMode: sanitizeTextOverlayMode(draft.textOverlayMode),
    textStyleChoice: sanitizeTextStyleChoice(draft.textStyleChoice),
    textStyleAdjustments: sanitizeTextStyleAdjustments(draft.textStyleAdjustments),
    generationSource: sanitizeGenerationSource(draft.generationSource),
    valueUsed: draft.valueUsed === true,
  }
}

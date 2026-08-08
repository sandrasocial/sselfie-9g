import type { AppV3Section } from "@/lib/app-v3/navigation"
import {
  sanitizeServerMayaDraftSnapshot,
  type ServerMayaDraftSnapshot,
} from "@/lib/app-v3/maya/draft-snapshot"
import { sanitizeMayaContextEnvelope } from "@/lib/app-v3/maya/context-envelope"
import { sanitizeMayaMessages } from "@/lib/app-v3/maya/message-sanitizer"
import type {
  AestheticShot,
  CalendarPostTarget,
  ConciergeSession,
  CreationIntent,
  CreationIntentSource,
  GenerationSource,
  LastGenerationSnapshot,
  OutputFormat,
  ShotDirectorIntent,
  ShotDirectorMode,
} from "./types"
import type { ConceptGenState } from "./concept-card"
import { sanitizeTextOverlaySpec, type OverlayStyleId } from "@/lib/app-v3/text-overlay"

export const APP_SECTION_STORAGE_KEY = "sselfie.appV3.section.v1"
export const CONCIERGE_STORAGE_KEY = "sselfie.appV3.concierge.v1"
export const MAYA_DRAFT_STORAGE_KEY = "sselfie.appV3.mayaDraft.v1"
export const MAYA_TASK_DRAFTS_STORAGE_KEY = "sselfie.appV3.mayaTasks.v1"
export const MAYA_LAST_ACTIVE_TASK_STORAGE_KEY = "sselfie.maya.last-active-task.v1"

const VALID_SECTIONS: AppV3Section[] = [
  "create",
  "photos",
  "content",
  "calendar",
  "library",
  "account",
]
const VALID_FORMATS: OutputFormat[] = [
  "photo",
  "photoshoot",
  "reel-cover",
  "carousel",
  "story-slide",
  "story-sequence",
  "video",
]
const VALID_INTENT_SOURCES: CreationIntentSource[] = [
  "typed",
  "starter_chip",
  "content_card",
  "vault_shot",
  "gallery_action",
  "manual",
]
const VALID_SHOT_DIRECTOR_MODES: ShotDirectorMode[] = [
  "recreate-shot",
  "more-angles",
  "collection-shoot",
  "new-shoot",
]
const VALID_GENERATION_SOURCES: GenerationSource[] = ["selfie", "trained-model"]
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
  lastGeneration?: LastGenerationSnapshot | null
  textOverlayMode?: "with-text" | "without-text" | null
  textStyleChoice?: OverlayStyleId | null
  textStyleAdjustments?: string | null
  generationSource?: GenerationSource | null
  valueUsed?: boolean
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

export function readMayaLastActiveTaskId(): string | null {
  if (typeof window === "undefined") return null
  try {
    const value = window.localStorage.getItem(MAYA_LAST_ACTIVE_TASK_STORAGE_KEY)
    return value?.trim() || null
  } catch {
    return null
  }
}

export function saveMayaLastActiveTaskId(taskId: string) {
  if (typeof window === "undefined" || !taskId.trim()) return
  try {
    window.localStorage.setItem(MAYA_LAST_ACTIVE_TASK_STORAGE_KEY, taskId)
  } catch {
    /* storage may be full or disabled */
  }
}

function sanitizeAestheticShot(value: unknown): AestheticShot | null {
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

function sanitizeCreationIntent(value: unknown): CreationIntent | null {
  if (!value || typeof value !== "object") return null
  const intent = value as Record<string, unknown>
  const format = VALID_FORMATS.includes(intent.format as OutputFormat)
    ? (intent.format as OutputFormat)
    : null
  const source = VALID_INTENT_SOURCES.includes(intent.source as CreationIntentSource)
    ? (intent.source as CreationIntentSource)
    : "manual"
  const confidence = intent.confidence === "high" ? "high" : "needs_clarify"
  return { format, source, confidence }
}

function sanitizeShotDirector(value: unknown): ShotDirectorIntent | null {
  if (!value || typeof value !== "object") return null
  const director = value as Record<string, unknown>
  if (!VALID_SHOT_DIRECTOR_MODES.includes(director.mode as ShotDirectorMode)) return null
  const requestedShotCount =
    director.requestedShotCount === 8 || director.requestedShotCount === 9
      ? director.requestedShotCount
      : 6
  return {
    mode: director.mode as ShotDirectorMode,
    requestedShotCount,
  }
}

function sanitizeGenerationSource(value: unknown): GenerationSource | null {
  return VALID_GENERATION_SOURCES.includes(value as GenerationSource)
    ? (value as GenerationSource)
    : null
}

function sanitizeCalendarPostTarget(value: unknown): CalendarPostTarget | null {
  if (!value || typeof value !== "object") return null
  const target = value as Record<string, unknown>
  const positiveInteger = (candidate: unknown): candidate is number =>
    typeof candidate === "number" && Number.isInteger(candidate) && candidate > 0
  if (
    typeof target.requestId !== "string" ||
    target.requestId.length === 0 ||
    target.requestId.length > 160 ||
    !positiveInteger(target.feedId) ||
    !positiveInteger(target.postId) ||
    !positiveInteger(target.position)
  ) {
    return null
  }
  const cleanText = (candidate: unknown, max: number): string | null => {
    if (typeof candidate !== "string") return null
    const clean = candidate.replace(/\s+/g, " ").trim().slice(0, max)
    return clean || null
  }
  const cleanUrls = (candidate: unknown): string[] =>
    Array.isArray(candidate)
      ? candidate
          .filter(
            (url): url is string =>
              typeof url === "string" && url.startsWith("https://") && url.length <= 4096
          )
          .slice(0, 10)
      : []
  const rawDelivery =
    target.delivery && typeof target.delivery === "object"
      ? (target.delivery as Record<string, unknown>)
      : null
  const delivery =
    rawDelivery &&
    typeof rawDelivery.generationRequestId === "string" &&
    rawDelivery.generationRequestId.length > 0 &&
    rawDelivery.generationRequestId.length <= 160 &&
    typeof rawDelivery.imageUrl === "string" &&
    rawDelivery.imageUrl.startsWith("https://")
      ? {
          generationRequestId: rawDelivery.generationRequestId,
          imageUrl: rawDelivery.imageUrl,
          imageUrls: cleanUrls(rawDelivery.imageUrls),
          aiImageId:
            typeof rawDelivery.aiImageId === "number" &&
            Number.isInteger(rawDelivery.aiImageId) &&
            rawDelivery.aiImageId > 0
              ? rawDelivery.aiImageId
              : null,
          previousImageUrl:
            typeof rawDelivery.previousImageUrl === "string" &&
            rawDelivery.previousImageUrl.startsWith("https://")
              ? rawDelivery.previousImageUrl
              : null,
          previousMediaUrls: cleanUrls(rawDelivery.previousMediaUrls),
          previousAiImageId:
            typeof rawDelivery.previousAiImageId === "number" &&
            Number.isInteger(rawDelivery.previousAiImageId) &&
            rawDelivery.previousAiImageId > 0
              ? rawDelivery.previousAiImageId
              : null,
          previousCaption: Object.prototype.hasOwnProperty.call(rawDelivery, "previousCaption")
            ? cleanText(rawDelivery.previousCaption, 2200)
            : cleanText(target.caption, 2200),
          deliveredCaption: Object.prototype.hasOwnProperty.call(rawDelivery, "deliveredCaption")
            ? cleanText(rawDelivery.deliveredCaption, 2200)
            : cleanText(target.caption, 2200),
        }
      : null
  return {
    requestId: target.requestId,
    feedId: target.feedId,
    postId: target.postId,
    position: target.position,
    caption: cleanText(target.caption, 400),
    contentPillar: cleanText(target.contentPillar, 240),
    scheduledAt: cleanText(target.scheduledAt, 80),
    plannedFormat: VALID_FORMATS.includes(target.plannedFormat as OutputFormat)
      ? (target.plannedFormat as OutputFormat)
      : "photo",
    hasImage: target.hasImage === true,
    imageUrl:
      typeof target.imageUrl === "string" && target.imageUrl.startsWith("https://")
        ? target.imageUrl
        : null,
    mediaUrls: cleanUrls(target.mediaUrls),
    aiImageId:
      typeof target.aiImageId === "number" &&
      Number.isInteger(target.aiImageId) &&
      target.aiImageId > 0
        ? target.aiImageId
        : null,
    feedTitle: cleanText(target.feedTitle, 120),
    requestedAction:
      target.requestedAction === "redo_caption" || target.requestedAction === "improve_caption"
        ? target.requestedAction
        : "create",
    actionPreviousCaption: Object.prototype.hasOwnProperty.call(target, "actionPreviousCaption")
      ? cleanText(target.actionPreviousCaption, 2200)
      : undefined,
    captionActionStatus:
      target.captionActionStatus === "succeeded" || target.captionActionStatus === "undone"
        ? target.captionActionStatus
        : undefined,
    announced: target.announced === true,
    delivery,
  }
}

function sanitizeLastGeneration(value: unknown): LastGenerationSnapshot | null {
  if (!value || typeof value !== "object") return null
  const generation = value as Record<string, unknown>
  if (!VALID_FORMATS.includes(generation.format as OutputFormat)) return null
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
    format: generation.format as OutputFormat,
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
  const videoSourceUrl = typeof session.videoSourceUrl === "string" ? session.videoSourceUrl : null
  const inspirationImageUrl =
    typeof session.inspirationImageUrl === "string" ? session.inspirationImageUrl : null
  const seedPrompt = typeof session.seedPrompt === "string" ? session.seedPrompt : null

  return {
    mayaContext: sanitizeMayaContextEnvelope(session.mayaContext),
    aesthetic: {
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
    },
    outputFormat,
    referenceSelfieUrl,
    videoSourceUrl,
    inspirationImageUrl,
    graphicText:
      session.graphicText && typeof session.graphicText === "object"
        ? (session.graphicText as ConciergeSession["graphicText"])
        : null,
    seedPrompt,
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
    calendarTarget: sanitizeCalendarPostTarget(session.calendarTarget),
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
            .filter((spec): spec is NonNullable<ReturnType<typeof sanitizeTextOverlaySpec>> =>
              Boolean(spec)
            )
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
      // Variant lineage survives reloads: gallery row ids stay with their URLs so a
      // bake/edit from a restored card still records variant_of.
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
      state.status === "generating" &&
      state.pendingRequest &&
      typeof state.pendingRequest === "object"
    ) {
      const pending = state.pendingRequest as Record<string, unknown>
      const pendingFormat = VALID_FORMATS.includes(pending.format as OutputFormat)
        ? (pending.format as OutputFormat)
        : null
      if (
        typeof pending.clientRequestId === "string" &&
        pending.clientRequestId.length > 0 &&
        typeof pending.startedAt === "number" &&
        Date.now() - pending.startedAt < 1000 * 60 * 60 * 6 &&
        pendingFormat
      ) {
        out[key] = {
          status: "generating",
          pendingRequest: {
            clientRequestId: pending.clientRequestId.slice(0, 120),
            startedAt: pending.startedAt,
            format: pendingFormat,
            expectedCount:
              typeof pending.expectedCount === "number" && Number.isInteger(pending.expectedCount)
                ? Math.max(1, Math.min(9, pending.expectedCount))
                : 1,
          },
        }
      } else {
        out[key] = { status: "idle" }
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
    lastGeneration: sanitizeLastGeneration(draft.lastGeneration),
    textOverlayMode: sanitizeTextOverlayMode(draft.textOverlayMode),
    textStyleChoice: sanitizeTextStyleChoice(draft.textStyleChoice),
    textStyleAdjustments: sanitizeTextStyleAdjustments(draft.textStyleAdjustments),
    generationSource: sanitizeGenerationSource(draft.generationSource),
    valueUsed: draft.valueUsed === true,
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

function projectServerTaskDraft(snapshot: ServerMayaDraftSnapshot): MayaDraftSnapshot {
  return {
    chatId: snapshot.chatId,
    sessionStartedAt: snapshot.session.startedAt,
    savedAt: snapshot.savedAt,
    messages: snapshot.messages,
    genState: snapshot.genState as Record<string, ConceptGenState>,
    generatedOnce: snapshot.generatedOnce,
    setupOpen: snapshot.setupOpen,
    lastGeneration: snapshot.lastGeneration,
    textOverlayMode: snapshot.textOverlayMode,
    textStyleChoice: snapshot.textStyleChoice,
    textStyleAdjustments: snapshot.textStyleAdjustments,
    generationSource: snapshot.generationSource,
    valueUsed: snapshot.valueUsed,
  }
}

/** Task-scoped local continuity for the Sandra-only operating layer. Legacy single-draft
 * storage remains untouched so disabling the flag is an immediate rollback. */
export function readMayaTaskDraft(taskId: string): ServerMayaDraftSnapshot | null {
  const stored = readJson(MAYA_TASK_DRAFTS_STORAGE_KEY)
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return null
  const snapshot = sanitizeServerMayaDraftSnapshot((stored as Record<string, unknown>)[taskId])
  if (!snapshot || snapshot.chatId !== taskId || snapshot.session.mayaContext?.taskId !== taskId) {
    return null
  }
  return snapshot
}

export function readMayaTaskDraftState(taskId: string): MayaDraftSnapshot | null {
  const snapshot = readMayaTaskDraft(taskId)
  return snapshot ? projectServerTaskDraft(snapshot) : null
}

export function saveMayaTaskDraft(snapshot: ServerMayaDraftSnapshot) {
  const sanitized = sanitizeServerMayaDraftSnapshot(snapshot)
  const taskId = sanitized?.session.mayaContext?.taskId
  if (!sanitized || !taskId || sanitized.chatId !== taskId) return

  const current = readJson(MAYA_TASK_DRAFTS_STORAGE_KEY)
  const drafts =
    current && typeof current === "object" && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {}
  drafts[taskId] = sanitized

  const retained = Object.entries(drafts)
    .map(([id, value]) => ({ id, snapshot: sanitizeServerMayaDraftSnapshot(value) }))
    .filter((entry): entry is { id: string; snapshot: ServerMayaDraftSnapshot } =>
      Boolean(entry.snapshot)
    )
    .sort((a, b) => b.snapshot.savedAt - a.snapshot.savedAt)
    .slice(0, 30)
  writeJson(MAYA_TASK_DRAFTS_STORAGE_KEY, Object.fromEntries(retained.map(x => [x.id, x.snapshot])))
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
    lastGeneration: snapshot.lastGeneration,
    textOverlayMode: snapshot.textOverlayMode,
    textStyleChoice: snapshot.textStyleChoice,
    textStyleAdjustments: snapshot.textStyleAdjustments,
    generationSource: snapshot.generationSource,
    valueUsed: snapshot.valueUsed,
  })
  if (snapshot.session.mayaContext?.taskId === snapshot.chatId) saveMayaTaskDraft(snapshot)
  return snapshot
}

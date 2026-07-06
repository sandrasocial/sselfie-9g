// SSELFIE Studio 3.0 - shared types.
// Strict, self-contained. This tree must NOT import from components/sselfie/.

/** The output format the user is creating. The OpenAI engine renders all of these
 *  natively in one synchronous call (photo, or structured marketing graphics). */
export type OutputFormat =
  | "photo"
  | "photoshoot"
  | "reel-cover"
  | "carousel"
  | "story-slide"
  | "story-sequence"
  | "video"

export type CreationIntentSource =
  | "typed"
  | "starter_chip"
  | "content_card"
  | "vault_shot"
  | "gallery_action"
  | "manual"

export type CreationIntentConfidence = "high" | "needs_clarify"

export interface CreationIntent {
  format: OutputFormat | null
  source: CreationIntentSource
  confidence: CreationIntentConfidence
}

export type ShotDirectorMode = "recreate-shot" | "more-angles" | "collection-shoot" | "new-shoot"

export interface ShotDirectorIntent {
  mode: ShotDirectorMode
  requestedShotCount: 6 | 8 | 9
}

export type GenerationSource = "selfie" | "trained-model"

export type InlineActionKind =
  | "upload_selfie"
  | "choose_format"
  | "choose_vibe"
  | "choose_shot"
  | "generate"
  | "next_action"

export interface AestheticShot {
  id: string
  title: string
  image: string
  whenToUse?: string
  mood?: string
  /** Stripped styling DNA from the Vault prompt. Identity text is not included. */
  stylePrompt?: string
}

/** A single aesthetic the user can pick from the Visual Front Door. Derived from the
 *  existing Prompt Vault collections so the grid always reflects the real vault. */
export interface Aesthetic {
  /** Stable id, e.g. "quiet-luxury-london". */
  id: string
  /** Display name, e.g. "Quiet Luxury London". */
  name: string
  /** One-line vibe description shown under the name. */
  blurb: string
  /** Representative cover image (from the vault collection). */
  coverImage: string
  /** A few thumbnails for hover/masonry interest. */
  thumbnails: string[]
  /** Number of looks in the underlying vault collection. */
  shotCount: number
  /** Individual shot references inside this Vault collection. */
  shots?: AestheticShot[]
  /** The exact shot the user chose before handing off to Maya. */
  selectedShot?: AestheticShot | null
  /** The styling intent handed to Maya + the prompt compiler when this vibe is chosen. */
  intent: string
}

/** On-image text for the graphic formats (reel-cover, story-slide, carousel). */
export interface GraphicTextSpec {
  headline?: string
  subline?: string
  /** Carousel: one entry per slide (capped at MAX_CAROUSEL_SLIDES). */
  slides?: { heading: string; body?: string }[]
  cta?: string
}

/** A finished generation returned by the engine. Carousels hold multiple images. */
export interface GeneratedResult {
  images: string[]
  outputFormat: OutputFormat
  createdAt: number
}

/** State carried through the Concierge Handoff once a vibe is chosen. */
export interface ConciergeSession {
  aesthetic: Aesthetic
  /** Chosen at the start of the concierge conversation. */
  outputFormat: OutputFormat | null
  /** URL of the uploaded reference selfie (written to user_avatar_images server-side). */
  referenceSelfieUrl: string | null
  /** URL of the still image selected for image-to-video generation. */
  videoSourceUrl: string | null
  /** On-image text for graphic formats. */
  graphicText: GraphicTextSpec | null
  /** Optional first message to seed Maya with (e.g. a Content recommendation idea). */
  seedPrompt?: string | null
  /** Structured session context: the member's idea carried across a style/session relay.
   * Rides the chat request body, never rendered as a user message (2026 UX contract:
   * selection = structured context, intent = visible turn). */
  creationIdea?: string | null
  /** How the creation started, so Maya can route without making the member navigate. */
  creationIntent?: CreationIntent | null
  /** Maya director choice after a Vault shot is selected. */
  shotDirector?: ShotDirectorIntent | null
  /** Optional explicit engine choice. Normal sessions default to selfie; trained model is opt-in. */
  generationSource?: GenerationSource | null
  /** Optional one-shot setup action Maya should open after the drawer mounts. */
  initialSetupAction?: "selfie_manager" | null
  startedAt: number
}

/** Authoritative snapshot of the most recent completed render in this session. Sent with every
 * chat turn so Maya's belief about "what just rendered" is ground truth, never thread inference. */
export interface LastGenerationSnapshot {
  format: OutputFormat
  imageCount: number
  styleName: string | null
  conceptTitle: string | null
  usedInspiration: boolean
  usedTrainedModel: boolean
}

/** Options when opening the concierge from a surface (format preselect + an idea to start on). */
export interface OpenConciergeOptions {
  format?: OutputFormat
  /** A specific idea Maya should create (the first turn), e.g. a Content recommendation. */
  seed?: string
  /** Optional already-saved image to use as the active reference when opening Maya. */
  referenceSelfieUrl?: string | null
  /** Optional gallery/uploaded image to animate when opening Maya in video mode. */
  videoSourceUrl?: string | null
  /** Deterministic client-side routing hint for Maya-first creation. */
  creationIntent?: CreationIntent | null
  /** Optional director decision for a selected Vault shot. */
  shotDirector?: ShotDirectorIntent | null
  /** Explicitly open the legacy trained-model path. Normal Maya opens default to selfie. */
  generationSource?: GenerationSource | null
  /** Optional one-shot setup action Maya should open after the drawer mounts. */
  initialSetupAction?: "selfie_manager" | null
  /** Carry the member's idea into the new session as structured context (not a replayed message). */
  creationIdea?: string | null
}

export type AppV3AnalyticsCohort = "member" | "trial" | "limited" | "admin"

export interface ConciergeContextValue {
  session: ConciergeSession | null
  isOpen: boolean
  /** True when a saved active session exists and can be continued intentionally. */
  hasSavedSession: boolean
  /** Reopen the current conversation, or start a blank general Maya session if none exists. */
  open: () => void
  /** Start a clean guided Maya thread instead of restoring the active draft. */
  openFresh: () => void
  /** Open the drawer WITH the chat-history list showing: "continue" means picking a real
   * past thread, not just re-showing whatever is in memory. Increments on every request. */
  openHistory: () => void
  historyRequestId: number
  /** Open the concierge with a chosen aesthetic preloaded (the Handoff). */
  openWithAesthetic: (aesthetic: Aesthetic, opts?: OpenConciergeOptions) => void
  /** Start a clean thread while keeping the active reference image available. */
  resetCurrentSession: () => void
  /** Pass null to return to the uncommitted state (no format chosen, no auto-pull). */
  setOutputFormat: (format: OutputFormat | null) => void
  setReferenceSelfieUrl: (url: string | null) => void
  setVideoSourceUrl: (url: string | null) => void
  setGraphicText: (spec: GraphicTextSpec) => void
  close: () => void
}

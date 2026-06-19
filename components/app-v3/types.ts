// SSELFIE Studio 3.0 — shared types.
// Strict, self-contained. This tree must NOT import from components/sselfie/.

/** The output format the user is creating. The OpenAI engine renders all of these
 *  natively in one synchronous call (photo, or structured marketing graphics). */
export type OutputFormat = "photo" | "photoshoot" | "reel-cover" | "carousel" | "story-slide" | "video"

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
  startedAt: number
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
}

export interface ConciergeContextValue {
  session: ConciergeSession | null
  isOpen: boolean
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

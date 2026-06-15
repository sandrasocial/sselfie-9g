// SSELFIE Studio 3.0 — app-v3 Maya concept types.
// Shared contract between the streaming chat route (Stage 1 — Maya writes the brief),
// the prompt compiler (Stage 2 — deterministic), and the concierge UI.
// Strict + self-contained. Must NOT import from components/sselfie/.

import type { OutputFormat } from "@/components/app-v3/types"

/**
 * The structured creative brief Maya produces for ONE concept.
 * Every field feeds the Vault-aligned compiler (see prompt-compiler.compileConceptJobs).
 * Maya MUST fill these with specific, named language — exact brand names, a named camera
 * body, a named lighting setup — never generic ("luxury sweater", "soft light").
 */
export interface CreativeBrief {
  /** 2 — Outfit/brand. Exact brand + garment, e.g. "The Row cream cashmere turtleneck". */
  outfit: string
  /** 3 — Setting/environment, e.g. "north-facing London apartment, marble console". */
  setting: string
  /** 3 — Emotional register, e.g. "calm, assured, caught mid-thought". */
  mood: string
  /** 3 — Simple natural pose, e.g. "seated at the edge of a linen sofa, looking off-camera". */
  pose: string
  /** 4 — Named camera body + lens, e.g. "Hasselblad X2D 100C, 55mm f/2.5". */
  cameraSpec: string
  /** 4 — Named lighting setup, e.g. "soft north-facing window light, gentle falloff". */
  lighting: string
  /** Optional on-image graphic direction for non-photo formats. */
  graphic?: ConceptGraphicSpec
}

/** On-image text/graphic direction for reel-cover / story-slide / carousel concepts. */
export interface ConceptGraphicSpec {
  /** Slide role in a carousel narrative. */
  role?: "hook" | "value" | "cta"
  /** Primary on-image headline, spelled exactly as it should render. */
  headline?: string
  /** Optional supporting line. */
  subline?: string
  /** Per-slide copy for carousels (one entry per slide). `visual` picks the slide type
   *  (identity = she appears, max 1-2 per set; detail = object shot from her world, no people;
   *  text-only = designed typographic slide). `detailSubject` grounds detail slides. */
  slides?: {
    heading: string
    body?: string
    role?: "hook" | "value" | "cta"
    visual?: "identity" | "detail" | "text-only"
    detailSubject?: string
  }[]
  /** Carousel design system id (lib/app-v3/maya/carousel-design-systems). Maya picks per concept. */
  designSystem?: string
}

/**
 * An inline clarifying question (the Content Requirements Engine). When Maya is missing ONE
 * required detail to make on-brand content (e.g. the reel topic), she asks this instead of
 * generating something generic. Rendered as tappable chips, not a chat prompt or a form.
 */
export interface ClarifyPrompt {
  /** One short question, e.g. "What's this reel about?" */
  question: string
  /** 2 to 5 short tappable options, drawn from the user's brand (not generic). */
  options: string[]
  /** Whether to also offer a free-text path ("tell me in your own words"). */
  allowFreeText?: boolean
}

/** A single concept direction Maya proposes. The `brief` is what the user "clicks". */
export interface ConceptCard {
  /** Stable id Maya assigns, used by the client to fire generation for this card. */
  id: string
  /** Short editorial title, e.g. "Quiet-Luxury Morning Desk". */
  title: string
  /** 1–2 sentences in Maya's voice describing what the user will see. */
  description: string
  /** The structured payload the compiler consumes. */
  brief: CreativeBrief
}

/** Optional saved brand kit, pulled from the user's record when it exists. */
export interface BrandKit {
  colors?: string[]
  fonts?: string[]
  vibe?: string
}

/** Request body posted to /api/app-v3/maya/chat on every turn (client owns history). */
export interface MayaChatRequestExtras {
  /** Styling intent from the chosen aesthetic tile. */
  aestheticIntent: string
  /** Display name of the chosen aesthetic. */
  aestheticName: string
  /** Front-door aesthetic id (lets the look recipe stay consistent). */
  aestheticId?: string
  /** What the user is creating. */
  format: OutputFormat
  /** The uploaded reference selfie URL (identity anchor source). */
  referenceSelfieUrl?: string | null
  /** Optional inspiration image — Maya reads its pose + wardrobe into the briefs. */
  inspirationImageUrl?: string | null
  /** Optional saved brand kit. */
  brandKit?: BrandKit | null
}

/** Request body posted to /api/app-v3/maya/generate when a concept card is generated. */
export interface MayaGenerateConceptRequest {
  /** Single-image jobs only: stream progressive partial previews over SSE. */
  stream?: boolean
  brief: CreativeBrief
  format: OutputFormat
  /** Front-face selfie — required identity anchor. */
  referenceSelfieUrl: string
  /** Optional extra identity angles (side profile, full body) for better fidelity. */
  referenceSelfieUrls?: string[]
  /** Front-door aesthetic id, so the compiler injects the vision-extracted look. */
  aestheticId?: string
  conceptTitle?: string
}

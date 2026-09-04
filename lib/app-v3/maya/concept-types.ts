// SSELFIE Studio 3.0 — app-v3 Maya concept types.
// Shared contract between the streaming chat route (Stage 1 — Maya writes the brief),
// the prompt compiler (Stage 2 — deterministic), and the concierge UI.
// Strict + self-contained. Must NOT import from components/sselfie/.

import type { OutputFormat } from "@/components/app-v3/types"
import type { CreativePlan, CreativeUseCase } from "@/lib/app-v3/maya/creative-plan"
import type { ShootShotRole } from "@/lib/content-kit/types"

export const CAPTURE_STYLES = [
  "candid-phone",
  "friend-took-it",
  "documentary",
  "lifestyle",
  "street",
  "polished-brand",
  "cinematic",
  "editorial",
  "photoshoot",
] as const

export type CaptureStyle = (typeof CAPTURE_STYLES)[number]
export type PolishLevel = "everyday" | "refined" | "campaign"

/**
 * The structured creative brief Maya produces for ONE concept.
 * Every field feeds the Vault-aligned compiler (see prompt-compiler.compileConceptJobs).
 * Maya MUST fill these with specific, visual language — garment shape/material/color, a named camera
 * body, a named lighting setup — never generic ("luxury sweater", "soft light").
 */
export interface CreativeBrief {
  /** The capture treatment chosen for this specific story. */
  captureStyle?: CaptureStyle
  /** Amount of creative polish, independent of technical render quality. */
  polishLevel?: PolishLevel
  /** Vault collection selected when the member did not explicitly choose one. */
  vaultCollectionId?: string
  /** 2 — Specific outfit: silhouette, material, color, styling, and brand only when supported. */
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
  /** Optional full-shoot role. Required when Maya is planning a cohesive 6-9 shot photoshoot. */
  shotRole?: ShootShotRole
  /** Feed Planner template grounding (2026-07-07): the hand-approved scene template for the
   *  member's next calendar slot, copied VERBATIM from Maya's context. The compiler injects
   *  this text directly into the image prompt so the template's craft language (realism
   *  block, lens, lighting, scene detail) reaches the image model unparaphrased. */
  sceneTemplate?: string
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
  /** Motion direction for video/image-to-video concepts. */
  motionPrompt?: string
  /** Shared Maya Creative Brain plan. Phase 2 wires this for customer-facing carousel only. */
  creativePlan?: CreativePlan
  /** The user's actual carousel topic/request, kept for validation in the render route. */
  carouselTitle?: string
  /** Planner classification for adaptive slide count and validation. */
  contentType?: CreativeUseCase
  /** The job this carousel is meant to do: teach, sell, explain, inspire, build trust, etc. */
  desiredOutcome?: string
  /** Planned slide count. Must match slides.length when present. */
  slideCount?: number
  /** One-line story arc before individual slides. */
  storyArc?: string
  /** The overall visual/design direction for the set. */
  designDirection?: string
  /** Vault styles/prompts this carousel uses as creative context when relevant. */
  relevantVaultStyles?: {
    name: string
    mood?: string
    reason?: string
  }[]
  /** Per-slide copy for carousels (one entry per slide). Customer slides are always real-image
   *  redesigns featuring the person or a real reference frame, with text baked into the image. */
  slides?: {
    heading: string
    body?: string
    role?: "hook" | "value" | "cta"
    /** Why this slide exists in the carousel arc. */
    purpose?: string
    /** Slide-specific visual idea before image generation. */
    visualConcept?: string
    /** Detailed image prompt ingredients for this slide. */
    imagePrompt?: string
    /** Alias used by the shared Creative Plan contract. */
    imagePromptDirection?: string
    /** Reference handling for this slide. */
    referenceImageStrategy?: CreativePlan["outputs"][number]["referenceImageStrategy"]
    /** Why the visual matches the slide meaning. */
    visualReason?: string
    /** Alias used by the shared Creative Plan contract. */
    reasonThisMatchesUserIntent?: string
    /** Text-safe area used by graphic formats. */
    textSafeArea?: CreativePlan["outputs"][number]["textSafeArea"]
  }[]
  /** Carousel design system id (lib/app-v3/maya/carousel-design-systems). Maya picks per concept. */
  designSystem?: string
  /** Text-overlay style id (lib/app-v3/text-overlay). Maya picks per concept when the
   *  composited overlay layer is on; the member can switch it after generation. */
  overlayStyle?: string
}

/**
 * An inline clarifying question (the Content Requirements Engine). When Maya is missing ONE
 * required detail to make on-brand content (e.g. the reel topic), she asks this instead of
 * generating something generic. Rendered as tappable chips, not a chat prompt or a form.
 */
export interface ClarifyPrompt {
  /** Format is the only clarification allowed to change the active output format. */
  kind?: "format" | "detail"
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
  /** Client-generated id used to recover this exact request after a dropped mobile response. */
  clientRequestId?: string
  /** Single-image jobs only: stream progressive partial previews over SSE. */
  stream?: boolean
  brief: CreativeBrief
  format: OutputFormat
  /** Front-face selfie — required identity anchor. */
  referenceSelfieUrl: string
  /** Optional extra identity angles (three-quarter, side profile, full body) for better fidelity. */
  referenceSelfieUrls?: string[]
  /** Optional pose/style reference. Never identity; attached after selfie references. */
  inspirationImageUrl?: string | null
  /** Vault Maya only: the tapped look is the exact visual target, not a loose style accent. */
  referenceMode?: "vault-look-recreation" | null
  /** Front-door aesthetic id, so the compiler injects the vision-extracted look. */
  aestheticId?: string
  conceptTitle?: string
}

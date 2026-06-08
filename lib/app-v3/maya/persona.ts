// SSELFIE Studio 3.0 — app-v3 Maya persona entry point.
// Single source of truth for Maya's brain stays at lib/maya/core-personality.ts.
// This module re-exports it and owns ONLY the app-v3 system-prompt assembly + the
// concept-card output contract. No personality prose is duplicated here, and nothing
// Flux/LoRA/trigger-word related leaks in (gpt-image is instruction-following).

import {
  MAYA_VOICE,
  MAYA_CORE_INTELLIGENCE,
  MAYA_PROMPT_PHILOSOPHY,
} from "@/lib/maya/core-personality"
import type { OutputFormat } from "@/components/app-v3/types"
import type { BrandKit } from "./concept-types"
import { CAMERA_SPECS, LIGHTING_OPTIONS, QUIET_LUXURY_FALLBACK } from "./ingredients"

// Re-export the brain so app-v3 imports it from one place.
export { MAYA_VOICE, MAYA_CORE_INTELLIGENCE, MAYA_PROMPT_PHILOSOPHY }

export interface AppV3SystemPromptContext {
  aestheticName: string
  aestheticIntent: string
  format: OutputFormat
  brandKit?: BrandKit | null
}

const FORMAT_GUIDANCE: Record<OutputFormat, string> = {
  photo:
    "The user wants a single editorial brand photograph. Each concept is a photo direction; do not add on-image text.",
  "reel-cover":
    "The user wants a Reel cover (a vertical image plus a short on-image headline). Each concept's brief.graphic.headline must hold the exact words to render.",
  "story-slide":
    "The user wants a vertical Story slide with on-image text. Each concept's brief.graphic.headline (and optional subline) must hold the exact words to render.",
  carousel:
    "The user wants a cohesive multi-slide carousel. Give each concept a brief.graphic.slides array (3–5 slides) with a hook slide, value slides, and a CTA slide; set each slide's role.",
}

function brandKitLine(brandKit?: BrandKit | null): string {
  if (brandKit && (brandKit.colors?.length || brandKit.fonts?.length || brandKit.vibe)) {
    const colors = brandKit.colors?.length ? `Colors: ${brandKit.colors.join(", ")}. ` : ""
    const fonts = brandKit.fonts?.length ? `Fonts: ${brandKit.fonts.join(", ")}. ` : ""
    const vibe = brandKit.vibe ? `Vibe: ${brandKit.vibe}.` : ""
    return `The user HAS a saved brand kit — honor it on any on-image graphics. ${colors}${fonts}${vibe}`
  }
  return (
    "The user has NO saved brand kit. For any on-image graphics, default to the Quiet Luxury palette so it always looks high-end: " +
    `${QUIET_LUXURY_FALLBACK.colors.join(", ")}; ${QUIET_LUXURY_FALLBACK.fonts.join(" and ")}; ${QUIET_LUXURY_FALLBACK.vibe}.`
  )
}

/**
 * The app-v3 output contract. This is the ONLY app-v3-specific text in the system prompt:
 * it tells Maya to converse warmly, then emit exactly 3 structured concept cards via the
 * emit_concepts tool — each brief filled with specific, named language the compiler needs.
 */
function appV3OutputContract(ctx: AppV3SystemPromptContext): string {
  const cameraPalette = Object.entries(CAMERA_SPECS)
    .filter(([k]) => k !== "selfie")
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n")
  const lightingPalette = Object.entries(LIGHTING_OPTIONS)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n")

  return `---

## YOUR CURRENT JOB (SSELFIE Studio /app)

You are helping the user create content in the **${ctx.aestheticName}** look.
Chosen styling intent: ${ctx.aestheticIntent}

${FORMAT_GUIDANCE[ctx.format]}

${brandKitLine(ctx.brandKit)}

### How you respond

1. Talk to the user like a friend and creative director — warm, specific, confident. Two or three short sentences. No corporate tone.
2. Once you understand what they want (their request alone is usually enough — don't over-ask), present **exactly 3 distinct concept directions** by calling the **emit_concepts** tool. Never more than 3 (we protect them from decision fatigue), never fewer.
3. Keep your streamed message short and human; the 3 concepts live in the tool call, not in your prose. Do not also list the concepts as text.
4. On a follow-up ("make the second one warmer", "shot outdoors"), reply in character and call emit_concepts again with the revised 3 — it is a real conversation, not a silent regenerate.

### Each concept's brief MUST be production-grade (this is non-negotiable)

- **outfit** — exact brand + garment. "The Row cream cashmere turtleneck", "Alo Yoga ribbed set in bone", "Toteme tailored camel coat". NEVER "luxury sweater" or "nice outfit".
- **setting** — a concrete place with real detail.
- **mood** — the emotional register, in a few words.
- **pose** — one simple, natural pose (a real moment, not a stiff pose).
- **cameraSpec** — a NAMED camera body + lens chosen to match the positioning. Pick from:
${cameraPalette}
- **lighting** — a NAMED lighting setup, not "soft light". Pick from or adapt:
${lightingPalette}
- **NEVER describe hair color** — the attached reference photo carries that.
- Make the 3 concepts genuinely different from each other (vary photography style: an iPhone-candid, a candid-lifestyle, an editorial — mix per what fits the request).

Stay inside this job: concept directions for ${ctx.format}. You do not generate the image yourself — the user clicks a concept to generate it.`
}

/**
 * Assemble the app-v3 Maya system prompt. Mirrors getMayaSystemPrompt() from
 * mode-adapters.ts (voice → intelligence → philosophy → mode contract), trimmed to
 * app-v3's single concept-generation job. No Flux/Pro-mode branching.
 */
export function getAppV3MayaSystemPrompt(ctx: AppV3SystemPromptContext): string {
  return [
    MAYA_VOICE,
    MAYA_CORE_INTELLIGENCE,
    MAYA_PROMPT_PHILOSOPHY,
    appV3OutputContract(ctx),
  ].join("\n\n")
}

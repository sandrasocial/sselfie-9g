/**
 * Maya 3.0 FLUX Prompt Blueprint
 *
 * Builds the final FLUX prompt with all components in the optimal structure.
 * Short, clean, structured format optimized for FLUX Dev.
 */

import type { MoodBlock } from "./mood-engine-v3"
import type { LightingBlock } from "./lighting-engine-v3"
import type { CompositionBlock } from "./composition-engine-v3"
import type { ScenarioBlock } from "./scenario-engine-v3"
import type { StyleBlendBlock } from "./style-blend-engine"
import type { NegativePromptBlock } from "./dynamic-negative-prompts"

export interface FluxPromptOptions {
  // Core identity
  triggerWord: string
  ethnicity?: string

  // Creative blocks
  mood: MoodBlock
  scenario: ScenarioBlock
  composition: CompositionBlock
  lighting: LightingBlock
  styleBlend: StyleBlendBlock

  // Camera & technical
  cameraStyle?: string

  // User concept
  concept?: string
  actionPose?: string
  outfit?: string

  // LoRA and technical
  loraWeight?: number
  negativePrompts: NegativePromptBlock

  // Emotional tone
  emotionalTone?: string
}

export interface FluxPromptResult {
  prompt: string
  negativePrompt: string
  structure: {
    identity: string
    scene: string
    action: string
    lighting: string
    camera: string
    mood: string
    styling: string
    details: string
    texture: string
    technical: string
  }
}

export function buildFluxPromptV3(options: FluxPromptOptions): FluxPromptResult {
  const {
    triggerWord,
    ethnicity,
    mood,
    scenario,
    composition,
    lighting,
    styleBlend,
    cameraStyle = "professional photography",
    concept,
    actionPose,
    outfit,
    loraWeight = 1.0,
    negativePrompts,
    emotionalTone,
  } = options

  // Build structured sections
  const sections = {
    // Identity: trigger word + ethnicity
    identity: ethnicity ? `${triggerWord}, ${ethnicity} woman` : `${triggerWord}`,

    // Scene: environment from scenario
    scene: scenario.environment,

    // Action: composition positioning + action pose or concept
    action: [composition.bodyPositioning, actionPose || scenario.motionSuggestions[0], emotionalTone]
      .filter(Boolean)
      .join(", "),

    // Lighting: from lighting block
    lighting: [lighting.keywords[0], lighting.angle, lighting.skinTreatment].join(", "),

    // Camera: composition framing + camera style
    camera: [composition.framing, composition.focalDistance, cameraStyle].join(", "),

    // Mood: from mood block
    mood: [mood.atmosphere, mood.energy, ...mood.keywords.slice(0, 2)].join(", "),

    // Styling: outfit + wardrobe hints
    styling: [outfit, ...styleBlend.wardrobeKeywords.slice(0, 2)].filter(Boolean).join(", "),

    // Details: props from scenario
    details: scenario.props.slice(0, 3).join(", "),

    // Texture: mood texture + lighting texture
    texture: [mood.texture, lighting.texture].join(", "),

    // Technical: LoRA weight
    technical: `<lora:flux_realism:${loraWeight}>`,
  }

  // Assemble final prompt in structured format
  const promptParts = [
    sections.identity,
    sections.scene,
    sections.action,
    sections.lighting,
    sections.camera,
    sections.mood,
    sections.styling,
    sections.details,
    sections.texture,
    sections.technical,
  ]

  const finalPrompt = promptParts.filter((part) => part && part.trim()).join("; ")

  let cleanedPrompt = finalPrompt.replace(/\s+/g, " ").trim()
  cleanedPrompt = cleanedPrompt.replace(/,+/g, ",")

  // Format negative prompts
  const negativePrompt = [...negativePrompts.base, ...negativePrompts.contextSpecific].join(", ")

  return {
    prompt: cleanedPrompt,
    negativePrompt,
    structure: sections,
  }
}

export function explainPromptStructure(result: FluxPromptResult): string {
  return `
Prompt Structure Breakdown:

Identity: ${result.structure.identity}
Scene: ${result.structure.scene}
Action: ${result.structure.action}
Lighting: ${result.structure.lighting}
Camera: ${result.structure.camera}
Mood: ${result.structure.mood}
Styling: ${result.structure.styling}
Details: ${result.structure.details}
Texture: ${result.structure.texture}
Technical: ${result.structure.technical}

Full Prompt:
${result.prompt}

Negative Prompt:
${result.negativePrompt}
  `.trim()
}

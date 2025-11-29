/**
 * Maya 3.0 Dynamic Negative Prompts
 *
 * Context-aware negative prompts that adapt based on scene,
 * mood, and composition to prevent common AI generation issues.
 */

export interface NegativePromptBlock {
  base: string[]
  contextSpecific: string[]
}

const BASE_NEGATIVE_PROMPTS = [
  "deformed face",
  "distorted proportions",
  "extra limbs",
  "extra fingers",
  "missing limbs",
  "fused fingers",
  "mutated hands",
  "duplicate faces",
  "multiple heads",
  "malformed body",
  "unnatural anatomy",
  "warped perspective",
  "melted features",
  "blurry face",
  "low quality",
  "jpeg artifacts",
  "watermark",
  "text overlay",
  "signature",
]

const SCENE_SPECIFIC_NEGATIVES: Record<string, string[]> = {
  portrait: [
    "plastic skin",
    "oversaturated skin",
    "artificial skin texture",
    "wrong eye direction",
    "asymmetrical eyes",
    "unnatural smile",
    "exaggerated features",
  ],

  fullBody: [
    "wrong proportions",
    "unrealistic pose",
    "twisted limbs",
    "floating body parts",
    "disconnected joints",
    "awkward stance",
  ],

  indoor: [
    "inconsistent lighting direction",
    "multiple light sources conflict",
    "unnatural shadows indoor",
    "wrong ambient light",
    "floating objects",
  ],

  outdoor: [
    "indoor lighting on outdoor scene",
    "wrong time of day lighting",
    "artificial shadows outdoor",
    "inconsistent natural light",
  ],

  action: ["motion blur on static elements", "frozen unnatural pose", "physics defying movement", "awkward motion"],
}

const MOOD_SPECIFIC_NEGATIVES: Record<string, string[]> = {
  cinematic: ["flat lighting", "no depth", "amateur composition", "snapshot quality"],

  natural: ["over-processed", "heavy filters", "artificial enhancement", "fake bokeh"],

  commercial: ["amateur lighting", "unpolished look", "inconsistent quality", "unprofessional setup"],

  lifestyle: ["staged pose", "unnatural interaction", "forced expression", "studio feel"],
}

export function getDynamicNegativePrompts(scene = "portrait", mood = "natural"): NegativePromptBlock {
  const sceneKey = scene.toLowerCase().replace(/\s+/g, "")
  const moodKey = mood.toLowerCase().replace(/\s+/g, "-").split("-")[0]

  const contextSpecific: string[] = []

  // Add scene-specific negatives
  if (SCENE_SPECIFIC_NEGATIVES[sceneKey]) {
    contextSpecific.push(...SCENE_SPECIFIC_NEGATIVES[sceneKey])
  }

  // Add mood-specific negatives
  if (MOOD_SPECIFIC_NEGATIVES[moodKey]) {
    contextSpecific.push(...MOOD_SPECIFIC_NEGATIVES[moodKey])
  }

  // Default to portrait negatives if no match
  if (contextSpecific.length === 0) {
    contextSpecific.push(...SCENE_SPECIFIC_NEGATIVES.portrait)
  }

  return {
    base: BASE_NEGATIVE_PROMPTS,
    contextSpecific: [...new Set(contextSpecific)],
  }
}

export function formatNegativePromptsForFlux(negatives: NegativePromptBlock): string {
  const allNegatives = [...negatives.base, ...negatives.contextSpecific]
  return allNegatives.join(", ")
}

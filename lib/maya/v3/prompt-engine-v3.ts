/**
 * Maya 3.0 Prompt Engine
 *
 * Main orchestrator that brings together all engines to generate
 * optimized FLUX prompts based on user context and concepts.
 */

import { getMayaPersonalityV3, type MayaPersonalityV3 } from "./personality-v3"
import { getMoodBlock, scoreMoodWithTags, type MoodBlock } from "./mood-engine-v3"
import { getLightingBlock, scoreLightingWithTags, type LightingBlock } from "./lighting-engine-v3"
import { getCompositionBlock, scoreCompositionWithTags, type CompositionBlock } from "./composition-engine-v3"
import { getScenarioBlock, scoreScenarioWithTags, type ScenarioBlock } from "./scenario-engine-v3"
import { getStyleBlendBlocks, type StyleBlendBlock } from "./style-blend-engine" // Import StyleBlendBlock
import { getDynamicNegativePrompts } from "./dynamic-negative-prompts"
import { analyzeConceptV3, type ConceptProfile } from "./concept-engine-v3"
import { buildIdentityLock, extractUserFeatures } from "./identity-lock-engine-v1"
import { selectPoseV1, type PoseBlock } from "./pose-engine-v1"
import { selectFashionV1, type FashionBlock } from "./fashion-engine-v1"

export interface UserContext {
  triggerWord: string
  gender?: string
  ethnicity?: string
  personalStyles?: string[]
  preferredMoods?: string[]
  loraWeight?: number
  colorPalette?: string[]
}

export interface ConceptInput {
  text: string
  mood?: string
  scenario?: string
  composition?: string
  lighting?: string
  outfit?: string
  emotionalTone?: string
}

export interface PromptGenerationResult {
  finalPrompt: string
  negativePrompt: string
  moodBlock: MoodBlock
  lightingBlock: LightingBlock
  compositionBlock: CompositionBlock
  scenarioBlock: ScenarioBlock
  styleBlend: StyleBlendBlock
  creativeDirection: {
    mood?: string
    scene?: string
    composition?: string
    lighting?: string
    pose?: string
    fashion?: string
  }
  explanation?: string
  appliedModules: {
    mood: string
    scenario: string
    composition: string
    lighting: string
    personality: string
    pose: string
    fashion: string
  }
  raw?: {
    moodBlock: MoodBlock
    scenarioBlock: ScenarioBlock
    compositionBlock: CompositionBlock
    lightingBlock: LightingBlock
    styleBlend: StyleBlendBlock
    poseBlock: PoseBlock
    fashionBlock: FashionBlock
  }
  // Legacy fields for backward compatibility
  prompt?: string
  debugInfo?: {
    moodBlock: MoodBlock
    scenarioBlock: ScenarioBlock
    compositionBlock: CompositionBlock
    lightingBlock: LightingBlock
    styleBlend: StyleBlendBlock
    poseBlock: PoseBlock
    fashionBlock: FashionBlock
  }
}

/**
 * Build FLUX LoRA optimized prompt
 * Simplified structure optimized for LoRA training and inference
 */
interface FluxLoraPromptParams {
  triggerWord: string
  ethnicity?: string
  compositionBlock: CompositionBlock
  poseBlock: CompositionBlock // Using composition for now until pose-engine-v3 exists
  lightingBlock: LightingBlock
  scenarioBlock: ScenarioBlock
  styleBlock: StyleBlendBlock
  moodBlock: MoodBlock
}

function buildFluxLoraPromptV3(params: FluxLoraPromptParams): string {
  const { triggerWord, ethnicity, compositionBlock, poseBlock, lightingBlock, scenarioBlock, styleBlock, moodBlock } =
    params

  const wardrobe = styleBlock?.wardrobeKeywords?.join(", ") || ""
  const textures = "" // Removed texture mixing from mood/lighting blocks

  const promptParts = [
    // Identity
    ethnicity ? `${triggerWord}; ${ethnicity} woman;` : `${triggerWord} woman;`,
    // Composition
    `${compositionBlock.framing}; ${compositionBlock.cameraHeight};`,
    // Pose
    poseBlock?.bodyPositioning || compositionBlock.bodyPositioning,
    // Lighting
    `${lightingBlock.description};`,
    // Scene - ONLY use scenarioBlock.environment, nothing else
    `${scenarioBlock.environment};`,
    // Styling
    wardrobe ? `${wardrobe};` : "",
    // Atmosphere - ONLY from moodBlock.atmosphere
    `${moodBlock.atmosphere};`,
    // LoRA
    "<lora:flux_realism:1>",
  ]

  return promptParts
    .filter((part) => part && part.trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/;+/g, ";")
    .trim()
}

/**
 * Build FLUX LoRA V4 optimized prompt
 * Final architecture with Fashion + Pose + Identity Lock
 */
interface FluxLoraPromptV4Params {
  triggerWord: string
  gender?: string
  ethnicity?: string
  userFeatures?: string[]
  compositionBlock: CompositionBlock
  poseBlock: PoseBlock
  lightingBlock: LightingBlock
  scenarioBlock: ScenarioBlock
  fashionBlock: FashionBlock
  moodBlock: MoodBlock
}

function buildFluxLoraPromptV4(params: FluxLoraPromptV4Params): string {
  const {
    triggerWord,
    gender,
    ethnicity,
    userFeatures,
    compositionBlock,
    poseBlock,
    lightingBlock,
    scenarioBlock,
    fashionBlock,
    moodBlock,
  } = params

  // 1. IDENTITY (trigger + gender + ethnicity)
  const genderText = gender || "person"
  const identityPart = ethnicity ? `${triggerWord}, ${gender}, ${ethnicity}` : `${triggerWord}, ${genderText}`

  // 2. IDENTITY LOCK (lightweight user features)
  const identityLock = buildIdentityLock({ userFeatures, gender, ethnicity })

  // 3. POSE (from pose engine)
  const posePart = poseBlock.description

  // 4. COMPOSITION (framing + camera height)
  const compositionPart = `${compositionBlock.framing}; ${compositionBlock.cameraHeight}`

  // 5. LIGHTING (description only)
  const lightingPart = lightingBlock.description

  // 6. ENVIRONMENT (ONLY from scenario.environment)
  const environmentPart = scenarioBlock.environment

  // 7. FASHION (wardrobe keywords + materials)
  const fashionPart = [...fashionBlock.wardrobeKeywords, ...fashionBlock.materials].join(", ")

  // 8. TEXTURES/MATERIALS (from fashion only)
  const texturesPart = fashionBlock.materials.join(", ")

  // 9. VIBE (from mood atmosphere)
  const vibePart = moodBlock.atmosphere

  // 10. LORA TAG
  const loraPart = "<lora:flux_realism:1>"

  // Assemble in exact order
  const parts = [
    identityPart,
    identityLock,
    posePart,
    compositionPart,
    lightingPart,
    environmentPart,
    fashionPart,
    vibePart,
    loraPart,
  ]

  // Clean and join
  const finalPrompt = parts
    .filter((p) => p && p.trim())
    .join("; ")
    .replace(/\s+/g, " ") // Remove extra spaces
    .replace(/;+/g, ";") // Remove duplicate semicolons
    .replace(/,+/g, ",") // Remove duplicate commas
    .trim()

  // Limit to 120 words
  const words = finalPrompt.split(" ")
  return words.length > 120 ? words.slice(0, 120).join(" ") : finalPrompt
}

/**
 * Main prompt generation function for Maya 3.0
 */
export async function generatePromptV3(
  userContext: UserContext,
  concept: ConceptInput,
): Promise<PromptGenerationResult> {
  // Load Maya 3.0 personality
  const personality = getMayaPersonalityV3()

  const conceptProfile = analyzeConceptV3(concept.text)

  const selectedMood = concept.mood || autoSelectMoodV3(conceptProfile)
  const moodBlock = getMoodBlock(selectedMood)

  const selectedScenario = concept.scenario || autoSelectScenarioV3(conceptProfile)
  const scenarioBlock = getScenarioBlock(selectedScenario, userContext)

  const selectedComposition = concept.composition || autoSelectCompositionV3(conceptProfile)
  const compositionBlock = getCompositionBlock(selectedComposition)

  const selectedLighting = concept.lighting || autoSelectLightingV3(conceptProfile, moodBlock, scenarioBlock)
  const lightingBlock = getLightingBlock(selectedLighting)

  // Extract user features for identity lock
  const userFeatures = extractUserFeatures(userContext)

  // Select pose based on scenario
  const poseBlock = selectPoseV1(selectedScenario, conceptProfile.keywords)

  // Select fashion based on scenario (avoid repetition)
  const userPalette = userContext.colorPalette || []
  const fashionBlock = selectFashionV1(selectedScenario, conceptProfile.keywords, userPalette)

  // Merge user aesthetic with current trends (keep for legacy compatibility)
  const styleBlend = getStyleBlendBlocks(userContext.personalStyles || ["minimalist"])

  // Get context-aware negative prompts (FLUX LoRA doesn't use these but keep for compatibility)
  const negativePrompts = getDynamicNegativePrompts(compositionBlock.name, moodBlock.name)

  const finalPrompt = buildFluxLoraPromptV4({
    triggerWord: userContext.triggerWord,
    gender: userContext.gender,
    ethnicity: userContext.ethnicity,
    userFeatures,
    compositionBlock,
    poseBlock,
    lightingBlock,
    scenarioBlock,
    fashionBlock,
    moodBlock,
  })

  const negativePrompt = [...negativePrompts.base, ...negativePrompts.contextSpecific].join(", ")

  // Generate explanation
  const explanation = generateExplanation(personality, moodBlock, scenarioBlock, compositionBlock, lightingBlock)

  return {
    // Primary fields expected by UI
    finalPrompt,
    negativePrompt,
    moodBlock,
    lightingBlock,
    compositionBlock,
    scenarioBlock,
    styleBlend,
    poseBlock,
    fashionBlock,
    identityLock: buildIdentityLock({ userFeatures, gender: userContext.gender, ethnicity: userContext.ethnicity }),
    creativeDirection: {
      mood: moodBlock?.description,
      scene: scenarioBlock?.description,
      composition: compositionBlock?.description,
      lighting: lightingBlock?.description,
      pose: poseBlock?.description,
      fashion: fashionBlock.wardrobeKeywords.join(", "),
    },
    explanation,
    appliedModules: {
      mood: selectedMood,
      scenario: selectedScenario,
      composition: selectedComposition,
      lighting: selectedLighting,
      pose: poseBlock.name,
      fashion: fashionBlock.category,
      personality: personality.systemPrompt.split("\n")[0],
    },
    // Raw debug data
    raw: {
      moodBlock,
      scenarioBlock,
      compositionBlock,
      lightingBlock,
      styleBlend,
      poseBlock,
      fashionBlock,
    },
    // Legacy fields for backward compatibility
    prompt: finalPrompt,
    debugInfo: {
      moodBlock,
      scenarioBlock,
      compositionBlock,
      lightingBlock,
      styleBlend,
      poseBlock,
      fashionBlock,
    },
  }
}

function autoSelectMoodV3(conceptProfile: ConceptProfile): string {
  const moods = [
    { key: "cinematic-luxury" },
    { key: "soft-morning-light" },
    { key: "candid-lifestyle" },
    { key: "moody-night-energy" },
    { key: "nordic-clean" },
    { key: "instagram-glossy" },
    { key: "romantic-warm" },
    { key: "editorial-high-fashion" },
    { key: "commercial-beauty-light" },
    { key: "power-woman-energy" },
    { key: "night-drama-luxury" },
    { key: "paris-midnight-editorial" },
    { key: "urban-noir-energy" },
    { key: "luxury-hotel-elegance" },
    { key: "airport-lounge-wealthy" },
    { key: "street-fashion-power" },
    { key: "mirror-selfie-cinematic" },
    { key: "high-rise-rooftop-glow" },
    { key: "clean-luxury-morning-light" },
    { key: "high-fashion-cold-lighting" },
    { key: "warm-cozy-opulence" },
    { key: "gym-editorial-aesthetic" },
  ]

  const allTags = [...conceptProfile.keywords, ...conceptProfile.energy, ...conceptProfile.aesthetic]

  const scored = moods
    .map((m) => ({
      key: m.key,
      score: scoreMoodWithTags(m.key, allTags) + scoreMoodFromConcept(m.key, getMoodBlock(m.key), conceptProfile),
    }))
    .sort((a, b) => b.score - a.score)

  return scored[0].score > 0 ? scored[0].key : "cinematic-luxury"
}

function autoSelectScenarioV3(conceptProfile: ConceptProfile): string {
  const scenarios = [
    { key: "cafe" },
    { key: "rooftop" },
    { key: "workspace" },
    { key: "bedroom-cozy" },
    { key: "boutique-store" },
    { key: "street-style" },
    { key: "gym-lifestyle" },
    { key: "beach" },
    { key: "airport" },
    { key: "home-office" },
    { key: "luxury-interior" },
    { key: "elevator-scene" },
    { key: "hotel-bathroom-vanity" },
    { key: "luxury-hotel-hallway" },
    { key: "rooftop-city-lights" },
    { key: "parisian-street-night" },
    { key: "cafe-night-interior" },
    { key: "airport-lounge-editorial" },
    { key: "gym-mirror-bay" },
    { key: "walk-in-closet" },
    { key: "car-interior-selfie" },
    { key: "high-end-office-lobby" },
    { key: "shopping-mall-glass" },
    { key: "metro-platform" },
    { key: "outdoor-balcony-golden" },
    { key: "nightclub-neon" },
    { key: "minimalist-apartment" },
    { key: "scandinavian-interior" },
    { key: "restaurant-bar-booth" },
    { key: "marble-lobby" },
    { key: "beauty-studio-vanity" },
  ]

  const allTags = [...conceptProfile.keywords, conceptProfile.coreScene || "", conceptProfile.environment || ""].filter(
    Boolean,
  )

  const scored = scenarios
    .map((s) => ({
      key: s.key,
      score:
        scoreScenarioWithTags(s.key, allTags) +
        scoreScenarioFromConcept(s.key, getScenarioBlock(s.key), conceptProfile),
    }))
    .sort((a, b) => b.score - a.score)

  return scored[0].score > 0 ? scored[0].key : "cafe"
}

function autoSelectCompositionV3(conceptProfile: ConceptProfile): string {
  const compositions = [
    { key: "rule-of-thirds" },
    { key: "center-power-pose" },
    { key: "cinematic-wide" },
    { key: "close-up-beauty" },
    { key: "three-quarter-body" },
    { key: "over-shoulder" },
    { key: "lifestyle-candid" },
    { key: "symmetrical" },
    { key: "micro-detail" },
    { key: "elevator-symmetry" },
    { key: "mirror-split-composition" },
    { key: "tight-vertical-frame" },
    { key: "fashion-crop" },
    { key: "shoulder-up-cinematic" },
    { key: "wide-room-editorial" },
    { key: "golden-hour-backlit" },
    { key: "street-diagonal-motion" },
    { key: "vanity-mirror-centered" },
  ]

  const allTags = [...conceptProfile.keywords, ...conceptProfile.energy]

  const scored = compositions
    .map((c) => ({
      key: c.key,
      score:
        scoreCompositionWithTags(c.key, allTags) +
        scoreCompositionFromConcept(c.key, getCompositionBlock(c.key), conceptProfile),
    }))
    .sort((a, b) => b.score - a.score)

  return scored[0].score > 0 ? scored[0].key : "rule-of-thirds"
}

function autoSelectLightingV3(conceptProfile: ConceptProfile): string {
  const lightingOptions = [
    { key: "rembrandt" },
    { key: "golden-hour" },
    { key: "window-natural" },
    { key: "overcast-diffused" },
    { key: "beauty-dish" },
    { key: "cinematic-edge" },
    { key: "boutique-warm" },
    { key: "soft-dusk" },
    { key: "neon-rim-light" },
    { key: "metal-reflection-glow" },
    { key: "elevator-panel-light" },
    { key: "hotel-vanity-soft" },
    { key: "city-light-bounce" },
    { key: "golden-hour-soft-editorial" },
    { key: "cinematic-low-key-night" },
    { key: "harsh-fashion-flash" },
    { key: "diffused-mirror-glow" },
    { key: "lux-apartment-ambient" },
    { key: "paris-street-lamp" },
    { key: "rooftop-twilight-glow" },
  ]

  const allTags = [...conceptProfile.keywords, conceptProfile.timeOfDay || "", ...conceptProfile.energy].filter(Boolean)

  const scored = lightingOptions
    .map((l) => ({
      key: l.key,
      score:
        scoreLightingWithTags(l.key, allTags) +
        scoreLightingFromConcept(l.key, getLightingBlock(l.key), conceptProfile),
    }))
    .sort((a, b) => b.score - a.score)

  // If concept-based score is high, use it
  if (scored[0].score >= 5) {
    return scored[0].key
  }

  // Otherwise use context fallback
  return autoSelectLighting()
}

function scoreMoodFromConcept(moodKey: string, block: MoodBlock, concept: ConceptProfile): number {
  let score = 0

  // Energy match = +2 per energy tag
  for (const energy of concept.energy) {
    if (energy === "mysterious" && moodKey === "moody-night-energy") score += 3
    if (energy === "dramatic" && moodKey === "cinematic-luxury") score += 3
    if (energy === "confident" && moodKey === "power-woman-energy") score += 3
    if (energy === "playful" && moodKey === "instagram-glossy") score += 2
    if (energy === "calm" && moodKey === "nordic-clean") score += 2
    if (energy === "romantic" && moodKey === "romantic-warm") score += 3
  }

  // Aesthetic match = +2
  for (const aesthetic of concept.aesthetic) {
    if (aesthetic === "editorial" && moodKey === "editorial-high-fashion") score += 3
    if (aesthetic === "moody" && moodKey === "moody-night-energy") score += 3
    if (aesthetic === "cinematic" && moodKey === "cinematic-luxury") score += 3
    if (aesthetic === "clean-girl" && moodKey === "nordic-clean") score += 3
    if (aesthetic === "luxury" && moodKey === "cinematic-luxury") score += 2
    if (aesthetic === "instagram-glossy" && moodKey === "instagram-glossy") score += 3
    if (aesthetic === "candid-lifestyle" && moodKey === "candid-lifestyle") score += 3
  }

  // Keyword fallback = +1
  for (const kw of concept.keywords) {
    if (block.keywords.some((bkw) => bkw.includes(kw) || kw.includes(bkw))) score += 1
  }

  return score
}

function scoreScenarioFromConcept(scenarioKey: string, block: ScenarioBlock, concept: ConceptProfile): number {
  let score = 0

  // Core scene EXACT match = +5
  if (concept.coreScene && scenarioKey.includes(concept.coreScene)) {
    score += 5
  }

  // Environment match = +3
  if (
    (concept.environment === "cozy-interior" && scenarioKey.includes("bedroom")) ||
    (concept.environment === "luxury-suite" && scenarioKey === "luxury-interior") ||
    (concept.environment === "outdoors-urban" && scenarioKey.includes("rooftop")) ||
    (concept.environment === "modern-fitness" && scenarioKey.includes("gym"))
  ) {
    score += 3
  }

  // Keyword fallback = +1
  for (const kw of concept.keywords) {
    if (block.keywords.some((bkw) => bkw.includes(kw) || kw.includes(bkw))) score += 1
  }

  return score
}

function scoreCompositionFromConcept(compositionKey: string, block: CompositionBlock, concept: ConceptProfile): number {
  let score = 0

  // Environment-based composition scoring = +2
  if (concept.environment === "indoors-metal" && compositionKey === "symmetrical") score += 2
  if (concept.environment === "vehicle-interior" && compositionKey === "close-up-beauty") score += 2

  // Energy-based composition
  if (concept.energy.includes("confident") && compositionKey === "center-power-pose") score += 2
  if (concept.energy.includes("dramatic") && compositionKey === "cinematic-wide") score += 2

  // Keyword fallback = +1
  for (const kw of concept.keywords) {
    if (block.keywords.some((bkw) => bkw.includes(kw) || kw.includes(bkw))) score += 1
  }

  return score
}

function scoreLightingFromConcept(lightingKey: string, block: LightingBlock, concept: ConceptProfile): number {
  let score = 0

  // Time of day = +3
  if (concept.timeOfDay === "night" && lightingKey === "cinematic-edge") score += 3
  if (concept.timeOfDay === "golden-hour" && lightingKey === "golden-hour") score += 3
  if (concept.timeOfDay === "morning" && lightingKey === "window-natural") score += 2
  if (concept.timeOfDay === "dusk" && lightingKey === "soft-dusk") score += 3

  // Energy match
  if (concept.energy.includes("mysterious") && lightingKey === "rembrandt") score += 2
  if (concept.energy.includes("dramatic") && lightingKey === "cinematic-edge") score += 2

  // Keyword fallback = +1
  for (const kw of concept.keywords) {
    if (block.keywords.some((bkw) => bkw.includes(kw) || kw.includes(bkw))) score += 1
  }

  return score
}

/**
 * Helper function to extract keywords from user input
 */
function extractKeywords(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * Scoring function for weighted matching
 */
function scoreMatch(block: { keywords: string[]; name: string }, userKeywords: string[]): number {
  let score = 0
  const blockNameLower = block.name.toLowerCase()

  for (const userKw of userKeywords) {
    // Exact keyword match = 3 points
    if (block.keywords.some((kw) => kw.includes(userKw) || userKw.includes(kw))) {
      score += 3
    }
    // Block name starts with user keyword = 2 points
    else if (blockNameLower.includes(userKw) || userKw.includes(blockNameLower.split(" ")[0])) {
      score += 2
    }
  }

  return score
}

function autoSelectMood(conceptText: string): string {
  const text = conceptText.toLowerCase()

  if (text.includes("dramatic") || text.includes("powerful") || text.includes("bold")) {
    return "cinematic-luxury"
  }
  if (text.includes("soft") || text.includes("gentle") || text.includes("warm")) {
    return "soft-morning-light"
  }
  if (text.includes("natural") || text.includes("authentic") || text.includes("candid")) {
    return "candid-lifestyle"
  }
  if (text.includes("night") || text.includes("evening") || text.includes("moody")) {
    return "moody-night-energy"
  }
  if (text.includes("clean") || text.includes("minimal") || text.includes("simple")) {
    return "nordic-clean"
  }
  if (text.includes("instagram") || text.includes("social") || text.includes("glossy")) {
    return "instagram-glossy"
  }
  if (text.includes("romantic") || text.includes("dreamy") || text.includes("feminine")) {
    return "romantic-warm"
  }
  if (text.includes("fashion") || text.includes("editorial") || text.includes("magazine")) {
    return "editorial-high-fashion"
  }
  if (text.includes("professional") || text.includes("commercial") || text.includes("beauty")) {
    return "commercial-beauty-light"
  }

  // Default to cinematic luxury
  return "cinematic-luxury"
}

/**
 * Auto-select scenario based on concept text analysis
 */
function autoSelectScenario(conceptText: string): string {
  const text = conceptText.toLowerCase()

  if (text.includes("cafe") || text.includes("coffee")) return "cafe"
  if (text.includes("rooftop") || text.includes("skyline")) return "rooftop"
  if (text.includes("office") || text.includes("desk") || text.includes("work")) return "workspace"
  if (text.includes("bedroom") || text.includes("bed") || text.includes("cozy")) return "bedroom-cozy"
  if (text.includes("boutique") || text.includes("shopping") || text.includes("store")) return "boutique-store"
  if (text.includes("street") || text.includes("urban") || text.includes("city")) return "street-style"
  if (text.includes("gym") || text.includes("workout") || text.includes("fitness")) return "gym-lifestyle"
  if (text.includes("beach") || text.includes("ocean") || text.includes("sand")) return "beach"
  if (text.includes("airport") || text.includes("travel") || text.includes("flight")) return "airport"
  if (text.includes("luxury") || text.includes("elegant") || text.includes("sophisticated")) return "luxury-interior"

  // Default to cafe
  return "cafe"
}

/**
 * Auto-select composition based on concept text analysis
 */
function autoSelectComposition(conceptText: string): string {
  const text = conceptText.toLowerCase()

  if (text.includes("close-up") || text.includes("face") || text.includes("beauty")) return "close-up-beauty"
  if (text.includes("full body") || text.includes("outfit") || text.includes("fashion")) return "three-quarter-body"
  if (text.includes("wide") || text.includes("environment") || text.includes("scene")) return "cinematic-wide"
  if (text.includes("power") || text.includes("confident") || text.includes("centered")) return "center-power-pose"
  if (text.includes("detail") || text.includes("macro") || text.includes("texture")) return "micro-detail"
  if (text.includes("candid") || text.includes("movement") || text.includes("natural")) return "lifestyle-candid"
  if (text.includes("symmetrical") || text.includes("balanced") || text.includes("centered")) return "symmetrical"

  // Default to rule of thirds
  return "rule-of-thirds"
}

/**
 * Auto-select lighting based on mood and scenario
 */
function autoSelectLighting(): string {
  // Match lighting to mood and scenario
  // Placeholder for logic to match lighting to mood and scenario
  return "window-natural"
}

/**
 * Extract action/pose from concept text
 */
function extractActionPose(conceptText: string): string {
  const text = conceptText.toLowerCase()

  // Common actions
  if (text.includes("sitting")) return "sitting comfortably"
  if (text.includes("standing")) return "standing confidently"
  if (text.includes("walking")) return "walking naturally"
  if (text.includes("leaning")) return "leaning casually"
  if (text.includes("looking")) return "gazing naturally"
  if (text.includes("working")) return "working focused"
  if (text.includes("reading")) return "reading relaxed"
  if (text.includes("drinking") || text.includes("coffee")) return "enjoying coffee"

  // Default to natural pose
  return "natural relaxed pose"
}

/**
 * Generate human-readable explanation of creative choices
 */
function generateExplanation(
  personality: MayaPersonalityV3,
  mood: MoodBlock,
  scenario: ScenarioBlock,
  composition: CompositionBlock,
  lighting: LightingBlock,
): string {
  return `
I've crafted this concept using Maya 3.0's creative direction:

Mood: ${mood.name} - ${mood.description}
The ${mood.atmosphere} atmosphere creates ${mood.energy} energy.

Scene: ${scenario.name} - ${scenario.description}
${scenario.environment}

Composition: ${composition.name} - ${composition.description}
${composition.framing}

Lighting: ${lighting.name} - ${lighting.description}
${lighting.angle}, creating ${lighting.shadows}

This combination creates a cohesive visual story that's both aspirational and authentic.
  `.trim()
}

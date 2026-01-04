/**
 * Motion Similarity Checking - Semantic similarity detection for motion prompts
 * 
 * Uses advanced text analysis to detect semantically similar motion prompts,
 * even when worded differently.
 */

/**
 * Extract key motion concepts from a prompt
 */
function extractMotionConcepts(prompt: string): {
  bodyParts: string[]
  actions: string[]
  cameraMovement: string
  intensity: string
  triggers: string[]
} {
  const lower = prompt.toLowerCase()
  
  const bodyParts = ["head", "eyes", "fingers", "hands", "shoulders", "hair", "lips", "arms", "chest", "neck"]
    .filter(part => lower.includes(part))
  
  const actions = ["lift", "turn", "close", "open", "adjust", "reach", "touch", "sip", "gaze", "smile", "breathe", "blink", "tuck", "smooth"]
    .filter(action => lower.includes(action))
  
  const cameraMatch = lower.match(/camera\s+([^;]+)/)
  const cameraMovement = cameraMatch ? cameraMatch[1].trim() : "fixed"
  
  let intensity = "moderate"
  if (lower.includes("slowly") || lower.includes("gently") || lower.includes("subtly")) {
    intensity = "subtle"
  } else if (lower.includes("quickly") || lower.includes("dramatically") || lower.includes("energetic")) {
    intensity = "dynamic"
  }
  
  const triggers = ["breeze", "light", "sound", "warmth", "shadow", "reflection", "temperature"]
    .filter(trigger => lower.includes(trigger))
  
  return { bodyParts, actions, cameraMovement, intensity, triggers }
}

/**
 * Calculate concept similarity between two prompts
 */
function calculateConceptSimilarity(concepts1: ReturnType<typeof extractMotionConcepts>, concepts2: ReturnType<typeof extractMotionConcepts>): number {
  // Body parts overlap
  const bodyOverlap = concepts1.bodyParts.filter(bp => concepts2.bodyParts.includes(bp)).length
  const bodyUnion = new Set([...concepts1.bodyParts, ...concepts2.bodyParts]).size
  const bodySimilarity = bodyUnion > 0 ? bodyOverlap / bodyUnion : 0
  
  // Actions overlap
  const actionOverlap = concepts1.actions.filter(a => concepts2.actions.includes(a)).length
  const actionUnion = new Set([...concepts1.actions, ...concepts2.actions]).size
  const actionSimilarity = actionUnion > 0 ? actionOverlap / actionUnion : 0
  
  // Camera movement similarity
  const cameraSimilarity = concepts1.cameraMovement === concepts2.cameraMovement ? 1 : 0.3
  
  // Intensity similarity
  const intensitySimilarity = concepts1.intensity === concepts2.intensity ? 1 : 0.5
  
  // Triggers overlap
  const triggerOverlap = concepts1.triggers.filter(t => concepts2.triggers.includes(t)).length
  const triggerUnion = new Set([...concepts1.triggers, ...concepts2.triggers]).size
  const triggerSimilarity = triggerUnion > 0 ? triggerOverlap / triggerUnion : 0
  
  // Weighted combination
  return (
    bodySimilarity * 0.25 +
    actionSimilarity * 0.25 +
    cameraSimilarity * 0.2 +
    intensitySimilarity * 0.15 +
    triggerSimilarity * 0.15
  )
}

/**
 * Check if two motion prompts are semantically similar
 * Returns similarity score 0-1, where >0.65 is considered similar
 */
export async function checkMotionSimilarity(
  prompt1: string,
  prompt2: string
): Promise<number> {
  if (!prompt1 || !prompt2) return 0
  
  // Quick string-based check first (faster)
  const normalized1 = prompt1.toLowerCase().trim()
  const normalized2 = prompt2.toLowerCase().trim()
  
  if (normalized1 === normalized2) return 1.0
  
  // Check for high word overlap (Jaccard similarity)
  const words1 = new Set(normalized1.split(/\s+/))
  const words2 = new Set(normalized2.split(/\s+/))
  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])
  const jaccardSimilarity = intersection.size / union.size
  
  // If Jaccard similarity is very low, they're definitely different
  if (jaccardSimilarity < 0.15) return jaccardSimilarity
  
  // Extract motion concepts for deeper analysis
  const concepts1 = extractMotionConcepts(prompt1)
  const concepts2 = extractMotionConcepts(prompt2)
  
  // Calculate concept-based similarity
  const conceptSimilarity = calculateConceptSimilarity(concepts1, concepts2)
  
  // Combine Jaccard and concept similarity
  // Jaccard catches exact word matches, concept catches semantic similarity
  const combinedSimilarity = (jaccardSimilarity * 0.4) + (conceptSimilarity * 0.6)
  
  return combinedSimilarity
}

/**
 * Check if a new prompt is too similar to recent prompts
 * Returns true if too similar (should be avoided)
 */
export async function isTooSimilarToRecent(
  newPrompt: string,
  recentPrompts: string[],
  threshold: number = 0.65
): Promise<boolean> {
  if (recentPrompts.length === 0) return false
  
  // Check against last 5 prompts
  const promptsToCheck = recentPrompts.slice(0, 5)
  
  for (const recentPrompt of promptsToCheck) {
    const similarity = await checkMotionSimilarity(newPrompt, recentPrompt)
    if (similarity > threshold) {
      console.log(`[v0] Motion prompt too similar (${similarity.toFixed(2)}):`, {
        new: newPrompt.substring(0, 50),
        recent: recentPrompt.substring(0, 50),
      })
      return true
    }
  }
  
  return false
}

/**
 * Find the most different prompt from a list of options
 */
export async function findMostDifferentPrompt(
  options: string[],
  recentPrompts: string[]
): Promise<string> {
  if (options.length === 0) return ""
  if (options.length === 1) return options[0]
  
  // Calculate similarity scores for each option
  const scores = await Promise.all(
    options.map(async (option) => {
      let maxSimilarity = 0
      for (const recent of recentPrompts.slice(0, 5)) {
        const similarity = await checkMotionSimilarity(option, recent)
        maxSimilarity = Math.max(maxSimilarity, similarity)
      }
      return { prompt: option, similarity: maxSimilarity }
    })
  )
  
  // Return the one with lowest similarity (most different)
  scores.sort((a, b) => a.similarity - b.similarity)
  return scores[0].prompt
}


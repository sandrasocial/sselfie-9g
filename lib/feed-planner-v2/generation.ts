import { getApprovedPreviewPrompt, getApprovedScenePrompts, type ScenePromptV2 } from "./prompt-loader"

export async function getPreviewPromptForStyle(styleId: number, variationId?: number | null): Promise<string> {
  return getApprovedPreviewPrompt(styleId, variationId)
}

export async function selectScenePromptsForFullFeed(
  styleId: number,
  variationId?: number | null,
): Promise<ScenePromptV2[]> {
  const approvedPrompts = await getApprovedScenePrompts(styleId, variationId)
  const promptsByPosition = new Map<number, ScenePromptV2[]>()
  
  for (const prompt of approvedPrompts) {
    const list = promptsByPosition.get(prompt.position) || []
    list.push(prompt)
    promptsByPosition.set(prompt.position, list)
  }
  
  const selections: ScenePromptV2[] = []
  for (let position = 1; position <= 9; position += 1) {
    const options = promptsByPosition.get(position) || []
    if (options.length === 0) {
      throw new Error(`No approved prompts found for position ${position}.`)
    }
    
    // CRITICAL FIX: Prefer specific variation prompts over generic ones
    // If variationId is provided, prioritize prompts that match that variation
    let selectedPrompt: ScenePromptV2
    if (variationId !== null && variationId !== undefined) {
      const specificVariationPrompts = options.filter((prompt) => prompt.variation_id === variationId)
      if (specificVariationPrompts.length > 0) {
        console.log(`[v0] [GENERATION] Using specific variation prompts for position ${position}, variationId=${variationId} (${specificVariationPrompts.length} options)`)
        // Still randomize among specific variation prompts (in case there are multiple)
        const randomIndex = Math.floor(Math.random() * specificVariationPrompts.length)
        selectedPrompt = specificVariationPrompts[randomIndex]
      } else {
        // If no specific variation prompts found, log warning and fall back to generic
        console.warn(`[v0] [GENERATION] No specific prompts found for variationId=${variationId}, position=${position}, falling back to generic prompts`)
        const randomIndex = Math.floor(Math.random() * options.length)
        selectedPrompt = options[randomIndex]
      }
    } else {
      // No variation specified, use any available prompt
      const randomIndex = Math.floor(Math.random() * options.length)
      selectedPrompt = options[randomIndex]
    }
    
    selections.push(selectedPrompt)
  }
  
  return selections
}

export async function selectPromptForPosition(
  styleId: number,
  position: number,
  variationId?: number | null,
): Promise<ScenePromptV2> {
  const approvedPrompts = await getApprovedScenePrompts(styleId, variationId)
  const options = approvedPrompts.filter((prompt) => prompt.position === position)
  if (options.length === 0) {
    throw new Error(`No approved prompts found for position ${position}.`)
  }
  
  // CRITICAL FIX: Prefer specific variation prompts over generic ones
  // If variationId is provided, prioritize prompts that match that variation
  // This ensures user's selected variation is always used, not randomly mixed
  if (variationId !== null && variationId !== undefined) {
    const specificVariationPrompts = options.filter((prompt) => prompt.variation_id === variationId)
    if (specificVariationPrompts.length > 0) {
      console.log(`[v0] [GENERATION] Using specific variation prompt for position ${position}, variationId=${variationId} (${specificVariationPrompts.length} options)`)
      // Still randomize among specific variation prompts (in case there are multiple)
      const randomIndex = Math.floor(Math.random() * specificVariationPrompts.length)
      return specificVariationPrompts[randomIndex]
    }
    // If no specific variation prompts found, log warning and fall back to generic
    console.warn(`[v0] [GENERATION] No specific prompts found for variationId=${variationId}, position=${position}, falling back to generic prompts`)
  }
  
  // Fallback: Use generic prompts (variation_id IS NULL) or any available prompt
  console.log(`[v0] [GENERATION] Using generic/fallback prompt for position ${position} (${options.length} options)`)
  const randomIndex = Math.floor(Math.random() * options.length)
  return options[randomIndex]
}

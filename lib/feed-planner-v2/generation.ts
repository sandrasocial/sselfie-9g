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
    const randomIndex = Math.floor(Math.random() * options.length)
    selections.push(options[randomIndex])
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
  const randomIndex = Math.floor(Math.random() * options.length)
  return options[randomIndex]
}

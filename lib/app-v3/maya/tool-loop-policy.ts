type MayaToolStep = {
  toolCalls?: Array<{ toolName?: string | null }> | null
}

const CONTINUATION_TOOLS = new Set(["save_brand_profile", "remember"])
const MAX_TOOL_STEPS = 3

/**
 * Persistence tools are invisible to the member. Let Maya take one more step so she can
 * acknowledge what she heard and ask the next question instead of ending on a silent tool call.
 * Visible UI tools still finish immediately, preserving the existing concept-card flow.
 */
export function shouldStopAppV3MayaToolLoop({
  steps,
}: {
  steps: MayaToolStep[]
}): boolean {
  if (steps.length >= MAX_TOOL_STEPS) return true

  const toolCalls = steps.at(-1)?.toolCalls ?? []
  if (toolCalls.length === 0) return false

  return toolCalls.some(call => !call.toolName || !CONTINUATION_TOOLS.has(call.toolName))
}

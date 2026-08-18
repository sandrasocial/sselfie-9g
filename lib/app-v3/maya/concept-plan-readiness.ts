import type { OutputFormat } from "@/components/app-v3/types"

/**
 * Streaming input can be shown as a preview, but only an executed tool output has passed
 * the chat route's schema and semantic validation. Credits stay locked until that output
 * exists, matches the visible format, and Maya has finished the turn.
 */
export function isConceptPlanReady(
  part: unknown,
  expectedFormat: OutputFormat,
  isThinking: boolean
): boolean {
  if (isThinking || !part || typeof part !== "object") return false
  const output = (part as { output?: unknown }).output
  if (!output || typeof output !== "object") return false
  const plan = output as { format?: unknown; concepts?: unknown }
  return plan.format === expectedFormat && Array.isArray(plan.concepts) && plan.concepts.length > 0
}

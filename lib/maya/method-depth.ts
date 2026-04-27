import type { MethodDepth } from "@/lib/maya/sselfie-method-content"

/**
 * Resolves how deeply Maya should surface Sandra's method insights
 * based on what the user has purchased.
 *
 * No new DB calls — flags already computed in get-user-context.ts.
 */
export function resolveMethodDepth(input: {
  hasMembership: boolean
  hasMasterclass: boolean
}): MethodDepth {
  if (input.hasMembership) return "full_plus_execution"
  if (input.hasMasterclass) return "full"
  return "teaser"
}

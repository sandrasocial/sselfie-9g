// Feed Planner Phase 2b — posting cadence resolver.
// Cadence (posts/week) is the one input the auto-draft genuinely lacks from
// getUserContextForMaya() today. No stored preference exists yet anywhere in the
// schema, so this always returns the default. Isolated in its own file so a future
// "Maya learns/asks cadence" change touches only this function, never the draft route.

export const DEFAULT_POSTS_PER_WEEK = 3
export const MIN_POSTS_PER_WEEK = 1
export const MAX_POSTS_PER_WEEK = 7

export async function resolvePostingCadence(_userId: number | string): Promise<number> {
  return DEFAULT_POSTS_PER_WEEK
}

/** Posts in a normal (4-week) month at a given weekly cadence. */
export function postsPerMonthForCadence(postsPerWeek: number): number {
  const clamped = Math.min(MAX_POSTS_PER_WEEK, Math.max(MIN_POSTS_PER_WEEK, postsPerWeek))
  return clamped * 4
}

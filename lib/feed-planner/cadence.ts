// Feed Planner Phase 2b/2c - posting cadence resolver.
// Cadence (posts/week) is the one auto-draft input Maya can't infer from the brand profile.
// She LEARNS it in conversation: when a member mentions how often she posts ("I post twice a
// week"), the chat `remember` tool saves it to maya_personal_memory.memory_data via
// savePostingCadence, and every later month's auto-draft uses it. Until she's said anything,
// the default is 3x/week - never a blocking question.

import { sql } from "@/lib/db/client"
import { mergeMayaMemoryData } from "@/lib/maya/memory-store"

export const DEFAULT_POSTS_PER_WEEK = 3
export const MIN_POSTS_PER_WEEK = 1
export const MAX_POSTS_PER_WEEK = 7

const MEMORY_KEY = "posting_cadence_per_week"

function clampCadence(value: number): number {
  return Math.min(MAX_POSTS_PER_WEEK, Math.max(MIN_POSTS_PER_WEEK, Math.round(value)))
}

export async function resolvePostingCadence(userId: number | string): Promise<number> {
  try {
    // Direct SQL, not getUserPersonalMemory: that helper is redis-cached and a cadence she
    // just told Maya must apply to the very next draft, not after the cache expires.
    const [row] = await sql`
      SELECT memory_data->>${MEMORY_KEY} AS cadence
      FROM maya_personal_memory
      WHERE user_id = ${String(userId)}
      LIMIT 1
    `
    const stored = Number(row?.cadence)
    if (Number.isFinite(stored) && stored >= MIN_POSTS_PER_WEEK) return clampCadence(stored)
  } catch (e) {
    console.error("[cadence] read skipped:", e)
  }
  return DEFAULT_POSTS_PER_WEEK
}

/** Persist a cadence the member expressed in conversation. Invalid values are ignored. */
export async function savePostingCadence(userId: number | string, postsPerWeek: number): Promise<boolean> {
  const value = Number(postsPerWeek)
  if (!Number.isFinite(value) || value < MIN_POSTS_PER_WEEK || value > MAX_POSTS_PER_WEEK) return false
  await mergeMayaMemoryData(userId, { [MEMORY_KEY]: clampCadence(value) })
  return true
}

/** Posts in a normal (4-week) month at a given weekly cadence. */
export function postsPerMonthForCadence(postsPerWeek: number): number {
  return clampCadence(postsPerWeek) * 4
}

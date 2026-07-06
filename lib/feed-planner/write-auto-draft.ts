// Feed Planner Phase 2b — persistence for Maya's auto-drafted month plan.
//
// IMPORTANT, discovered while building this (not assumed): Feed Planner's live generation path
// (app/api/feed/[feedId]/generate-single/route.ts) forces Pro Mode for every Feed Planner user
// regardless of post.generation_mode, and Pro Mode's prompt comes ENTIRELY from
// selectPromptForPosition(feed_style_id, position, variation_id) - a curated, pre-approved
// scene template per style+position (scene_prompts_v2). Per-post "creative brief" text
// (outfit/setting/mood/pose/camera/lighting) is never read by generation in this pipeline - the
// code even comments "Database prompts are stored for logging/debugging only, never reused."
// So the auto-draft does NOT invent a CreativeBrief per post (unlike the main Maya emit_concepts
// flow) - it resolves ONE feed_style for the whole month and writes real planning/caption
// metadata per post. That's what's actually consumed: scheduling, content_pillar, and caption.

import { sql } from "@/lib/db/client"
import { CuratedFeedStyleName } from "@/lib/style-presets"

export interface FeedPlanPost {
  position: number
  /** ISO date (YYYY-MM-DD) within the target month. */
  plannedDate: string
  contentPillar: string
  /** Short editorial label shown on the grid tile, e.g. "Monday tutorial". */
  title: string
  caption: string
}

export interface FeedMonthPlan {
  themeSummary: string
  schedulingRationale: string
  posts: FeedPlanPost[]
}

const MAX_POSTS = 31 // one calendar month, worst case one post/day

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isValidDateInMonth(value: unknown, periodMonth: string): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && value.startsWith(periodMonth)
}

/** Defensive parse, mirrors the array-filter pattern in /api/app-v3/maya/recommendations. */
export function validateFeedMonthPlan(raw: unknown, periodMonth: string): FeedMonthPlan | null {
  if (!raw || typeof raw !== "object") return null
  const obj = raw as Record<string, unknown>
  const themeSummary = isNonEmptyString(obj.themeSummary) ? obj.themeSummary.trim() : ""
  const schedulingRationale = isNonEmptyString(obj.schedulingRationale) ? obj.schedulingRationale.trim() : ""
  if (!Array.isArray(obj.posts)) return null

  const seenPositions = new Set<number>()
  const posts: FeedPlanPost[] = []
  for (const item of obj.posts as unknown[]) {
    if (!item || typeof item !== "object") continue
    const p = item as Record<string, unknown>
    const position = Number(p.position)
    if (!Number.isInteger(position) || position < 1 || seenPositions.has(position)) continue
    if (!isNonEmptyString(p.title) || !isNonEmptyString(p.contentPillar) || !isNonEmptyString(p.caption)) continue
    if (!isValidDateInMonth(p.plannedDate, periodMonth)) continue
    seenPositions.add(position)
    posts.push({
      position,
      plannedDate: p.plannedDate,
      contentPillar: p.contentPillar.trim(),
      title: p.title.trim(),
      caption: p.caption.trim(),
    })
    if (posts.length >= MAX_POSTS) break
  }

  if (posts.length === 0) return null
  posts.sort((a, b) => a.position - b.position)
  return { themeSummary, schedulingRationale, posts }
}

/** Cyclic shot-type hint from the resolved style's own curated grid pattern (post_type is
 *  NOT NULL on feed_posts) - reuses the existing curated pattern instead of inventing a new one.
 *  Exported: also used by the Phase 2c place-photo route when it appends a brand-new slot. */
export function postTypeForPosition(grid: readonly string[], position: number): string {
  const idx = (position - 1) % grid.length
  return grid[idx] ?? "selfie"
}

/** YYYY-MM for "now". Shared by the auto-draft route and the Phase 2c place-photo route so
 *  both agree on what "this month" means. */
export function currentPeriodMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export interface WriteAutoDraftInput {
  userId: number | string
  periodMonth: string
  plan: FeedMonthPlan
  feedStyle: CuratedFeedStyleName
  styleId: number
  variationId: number | null
  grid: readonly string[]
}

export interface WriteAutoDraftResult {
  feedLayoutId: number
  postIds: number[]
}

export async function writeAutoDraft(input: WriteAutoDraftInput): Promise<WriteAutoDraftResult> {
  const { userId, periodMonth, plan, feedStyle, styleId, variationId } = input

  const [layoutRow] = await sql`
    INSERT INTO feed_layouts (
      user_id, title, description, layout_type, status,
      feed_style, feed_style_variation_id, period_month,
      overall_vibe, strategic_rationale
    ) VALUES (
      ${userId}, ${`Feed plan - ${periodMonth}`}, ${plan.themeSummary}, 'grid_3x3', 'draft',
      ${feedStyle}, ${variationId}, ${periodMonth},
      ${plan.themeSummary}, ${plan.schedulingRationale}
    )
    RETURNING id
  `
  const feedLayoutId = Number(layoutRow.id)

  // The shared `sql` client (lib/db/client.ts) wraps the raw neon client as a plain tagged-
  // template function and does not forward `.transaction`/`.query` - so these are sequential
  // inserts, not an atomic batch, matching how the rest of lib/feed-planner already writes
  // multi-row data. `feed_posts.feed_layout_id` has ON DELETE CASCADE, so deleting the layout
  // row on any failure below cleans up every post inserted so far in the same call.
  try {
    const postIds: number[] = []
    for (const post of plan.posts) {
      const [row] = await sql`
        INSERT INTO feed_posts (
          feed_layout_id, user_id, position, post_type, caption,
          content_pillar, scheduled_at, generation_status
        ) VALUES (
          ${feedLayoutId}, ${userId}, ${post.position}, ${postTypeForPosition(input.grid, post.position)},
          ${post.caption}, ${post.contentPillar}, ${post.plannedDate}, 'pending'
        )
        RETURNING id
      `
      postIds.push(Number(row.id))
    }
    return { feedLayoutId, postIds }
  } catch (error) {
    // Compensating cleanup: never leave an orphaned feed_layouts row with a partial post set.
    await sql`DELETE FROM feed_layouts WHERE id = ${feedLayoutId} AND user_id = ${userId}`.catch(() => {})
    throw error
  }
}

/**
 * True if this user already has a plan for this month - the auto-draft must never run again.
 * Covers two cases: (1) a plan this feature itself already drafted (period_month is set), and
 * (2) a legacy/manual plan (period_month is NULL, since it predates this column) that was
 * created this calendar month and already has real content - a generated image or a
 * generation in flight. Case (2) matters because a legacy row is otherwise invisible to a
 * plain period_month match, and silently drafting a second plan on top of one with real
 * generated images is exactly the overwrite this guard exists to prevent.
 */
export async function hasPlanForMonth(userId: number | string, periodMonth: string): Promise<boolean> {
  const rows = await sql`
    SELECT fl.id
    FROM feed_layouts fl
    WHERE fl.user_id = ${userId}
      AND (
        fl.period_month = ${periodMonth}
        OR (
          fl.period_month IS NULL
          AND to_char(fl.created_at, 'YYYY-MM') = ${periodMonth}
          AND EXISTS (
            SELECT 1 FROM feed_posts fp
            WHERE fp.feed_layout_id = fl.id
              AND (fp.image_url IS NOT NULL OR fp.generation_status = 'generating')
          )
        )
      )
    LIMIT 1
  `
  return rows.length > 0
}

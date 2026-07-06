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
  /** Fill INTO this existing layout (a place-photo stub for the month) instead of creating a
   *  new one. Days already occupied by her posts are skipped, her rows are never touched. */
  existingLayoutId?: number
}

export interface WriteAutoDraftResult {
  feedLayoutId: number
  postIds: number[]
}

export async function writeAutoDraft(input: WriteAutoDraftInput): Promise<WriteAutoDraftResult> {
  const { userId, periodMonth, plan, feedStyle, styleId, variationId, existingLayoutId } = input

  let feedLayoutId: number
  let positionOffset = 0
  let occupiedDates = new Set<string>()

  if (existingLayoutId) {
    // Stub created by place-photo (she saved a chat photo before any plan existed). Fill the
    // month's plan in around what's already there: update the plan metadata, then only add
    // posts on days she hasn't already used.
    feedLayoutId = existingLayoutId
    await sql`
      UPDATE feed_layouts
      SET description = ${plan.themeSummary}, overall_vibe = ${plan.themeSummary},
          strategic_rationale = ${plan.schedulingRationale}
      WHERE id = ${feedLayoutId} AND user_id = ${userId}
    `
    const existingPosts = await sql`
      SELECT position, scheduled_at FROM feed_posts WHERE feed_layout_id = ${feedLayoutId}
    `
    positionOffset = existingPosts.reduce((max: number, p: any) => Math.max(max, Number(p.position) || 0), 0)
    occupiedDates = new Set(
      existingPosts
        .map((p: any) => (p.scheduled_at ? new Date(p.scheduled_at).toISOString().slice(0, 10) : null))
        .filter((d: string | null): d is string => !!d),
    )
  } else {
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
    feedLayoutId = Number(layoutRow.id)
  }

  // The shared `sql` client (lib/db/client.ts) wraps the raw neon client as a plain tagged-
  // template function and does not forward `.transaction`/`.query` - so these are sequential
  // inserts, not an atomic batch, matching how the rest of lib/feed-planner already writes
  // multi-row data.
  const postIds: number[] = []
  try {
    let insertIndex = 0
    for (const post of plan.posts) {
      if (occupiedDates.has(post.plannedDate)) continue
      insertIndex += 1
      const position = positionOffset + insertIndex
      const [row] = await sql`
        INSERT INTO feed_posts (
          feed_layout_id, user_id, position, post_type, caption,
          content_pillar, scheduled_at, generation_status
        ) VALUES (
          ${feedLayoutId}, ${userId}, ${position}, ${postTypeForPosition(input.grid, position)},
          ${post.caption}, ${post.contentPillar}, ${post.plannedDate}, 'pending'
        )
        RETURNING id
      `
      postIds.push(Number(row.id))
    }
    return { feedLayoutId, postIds }
  } catch (error) {
    // Compensating cleanup. Fresh layout: drop it (ON DELETE CASCADE clears its posts). Stub
    // fill-in: only remove the rows THIS call inserted - her placed photo must survive.
    if (existingLayoutId) {
      for (const id of postIds) {
        await sql`DELETE FROM feed_posts WHERE id = ${id}`.catch(() => {})
      }
    } else {
      await sql`DELETE FROM feed_layouts WHERE id = ${feedLayoutId} AND user_id = ${userId}`.catch(() => {})
    }
    throw error
  }
}

/**
 * How this month stands for the auto-draft:
 * - "planned": a real plan exists (drafted with strategic_rationale set, or a legacy/manual
 *   plan from this month that already has real content). Never draft again.
 * - "stub": place-photo created a bare month layout (strategic_rationale IS NULL) because she
 *   saved a chat photo before any plan existed. The draft should FILL this layout in around
 *   her photo, not create a competing one.
 * - "none": nothing for this month - draft fresh.
 */
export async function getMonthPlanState(
  userId: number | string,
  periodMonth: string,
): Promise<{ state: "planned" | "stub" | "none"; layoutId: number | null }> {
  const [thisMonth] = await sql`
    SELECT id, strategic_rationale FROM feed_layouts
    WHERE user_id = ${userId} AND period_month = ${periodMonth}
    ORDER BY created_at ASC
    LIMIT 1
  `
  if (thisMonth) {
    const isStub = thisMonth.strategic_rationale == null
    return { state: isStub ? "stub" : "planned", layoutId: Number(thisMonth.id) }
  }

  // Legacy/manual plan (period_month IS NULL, predates the column) created this calendar
  // month with real content - a generated image or a generation in flight. Silently drafting
  // a second plan on top of one with real generated images is exactly the overwrite this
  // guard exists to prevent.
  const legacy = await sql`
    SELECT fl.id
    FROM feed_layouts fl
    WHERE fl.user_id = ${userId}
      AND fl.period_month IS NULL
      AND to_char(fl.created_at, 'YYYY-MM') = ${periodMonth}
      AND EXISTS (
        SELECT 1 FROM feed_posts fp
        WHERE fp.feed_layout_id = fl.id
          AND (fp.image_url IS NOT NULL OR fp.generation_status = 'generating')
      )
    LIMIT 1
  `
  if (legacy.length > 0) return { state: "planned", layoutId: Number(legacy[0].id) }
  return { state: "none", layoutId: null }
}

/** True if this user already has a plan for this month - kept as the simple yes/no wrapper. */
export async function hasPlanForMonth(userId: number | string, periodMonth: string): Promise<boolean> {
  const { state } = await getMonthPlanState(userId, periodMonth)
  return state === "planned"
}

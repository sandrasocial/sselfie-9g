import "server-only"

import { sql } from "@/lib/db/client"

export type ContentPlannerStatus = "idea" | "drafted" | "ready" | "posted"

export type ContentPlannerSlot = {
  id: string
  coverUrl: string
  title: string
  hook: string
  captionDraft: string
  cta: string
  offerBridge: string
  status: ContentPlannerStatus
  scheduledDate: string
}

export type RecentInstagramPost = {
  id: number
  instagramPostId: string
  thumbnailUrl: string
  mediaUrl: string
  permalink: string
  caption: string
  postType: string
  postedAt: string
  likes: number
  comments: number
  saves: number
  shares: number
  reach: number
  signalLabel: string
}

export type ContentBoardData = {
  recentPosts: RecentInstagramPost[]
  plannerSlots: ContentPlannerSlot[]
  instagramSource: "instagram_posts" | "empty" | "unavailable"
  plannerSource: "content_calendars" | "default"
}

const PLANNER_CREATED_BY = "admin:morning-board"
const PLANNER_TITLE = "SSELFIE Morning Board 3x3 Planner"

const STATUSES: ContentPlannerStatus[] = ["idea", "drafted", "ready", "posted"]

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function toStatus(value: unknown): ContentPlannerStatus {
  return STATUSES.includes(value as ContentPlannerStatus) ? (value as ContentPlannerStatus) : "idea"
}

function numberValue(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export function normalizePlannerSlots(value: unknown): ContentPlannerSlot[] {
  const source = Array.isArray(value) ? value : []
  const normalized = Array.from({ length: 9 }).map((_, index) => {
    const slot =
      source[index] && typeof source[index] === "object"
        ? (source[index] as Record<string, unknown>)
        : {}
    return {
      id: toStringValue(slot.id) || `slot-${index + 1}`,
      coverUrl: toStringValue(slot.coverUrl),
      title: toStringValue(slot.title),
      hook: toStringValue(slot.hook),
      captionDraft: toStringValue(slot.captionDraft),
      cta: toStringValue(slot.cta),
      offerBridge: toStringValue(slot.offerBridge) || "Free preview to Vault",
      status: toStatus(slot.status),
      scheduledDate: toStringValue(slot.scheduledDate),
    }
  })

  return normalized
}

function deriveSignalLabel(post: {
  comments: number
  saves: number
  shares: number
  reach: number
  likes: number
}): string {
  if (post.comments >= 50 || post.comments > post.likes) return "High comment intent"
  if (post.saves >= 25) return "Save-worthy angle"
  if (post.shares > 0) return "Share signal"
  if (post.reach >= 2500) return "Reach signal"
  return "Recent visual signal"
}

function normalizeInstagramPost(row: Record<string, unknown>): RecentInstagramPost {
  const comments = numberValue(row.comments ?? row.comment_count)
  const saves = numberValue(row.saves)
  const shares = numberValue(row.shares)
  const reach = numberValue(row.reach)
  const likes = numberValue(row.likes ?? row.like_count)

  return {
    id: numberValue(row.id),
    instagramPostId: toStringValue(row.instagram_post_id),
    thumbnailUrl: toStringValue(row.thumbnail_url) || toStringValue(row.media_url),
    mediaUrl: toStringValue(row.media_url),
    permalink: toStringValue(row.permalink),
    caption: toStringValue(row.caption),
    postType: toStringValue(row.post_type),
    postedAt:
      row.posted_at instanceof Date ? row.posted_at.toISOString() : toStringValue(row.posted_at),
    likes,
    comments,
    saves,
    shares,
    reach,
    signalLabel: deriveSignalLabel({ comments, saves, shares, reach, likes }),
  }
}

export async function getRecentInstagramPosts(limit = 6): Promise<{
  posts: RecentInstagramPost[]
  source: ContentBoardData["instagramSource"]
}> {
  try {
    const rows = await sql`
      SELECT *
      FROM instagram_posts
      ORDER BY posted_at DESC NULLS LAST, created_at DESC
      LIMIT ${limit}
    `

    const posts = rows.map(row => normalizeInstagramPost(row as Record<string, unknown>))
    return {
      posts,
      source: posts.length > 0 ? "instagram_posts" : "empty",
    }
  } catch (error) {
    console.error("[ContentPlanner] Failed to load instagram_posts:", error)
    return { posts: [], source: "unavailable" }
  }
}

export async function getPlannerSlots(): Promise<{
  slots: ContentPlannerSlot[]
  source: ContentBoardData["plannerSource"]
}> {
  try {
    const rows = await sql`
      SELECT id, calendar_data
      FROM content_calendars
      WHERE created_by = ${PLANNER_CREATED_BY}
      ORDER BY updated_at DESC
      LIMIT 1
    `

    if (rows.length === 0) {
      return {
        slots: normalizePlannerSlots([]),
        source: "default",
      }
    }

    const data = rows[0].calendar_data as { slots?: unknown } | null
    return {
      slots: normalizePlannerSlots(data?.slots),
      source: "content_calendars",
    }
  } catch (error) {
    console.error("[ContentPlanner] Failed to load content planner:", error)
    return {
      slots: normalizePlannerSlots([]),
      source: "default",
    }
  }
}

export async function savePlannerSlots(slots: unknown): Promise<ContentPlannerSlot[]> {
  const normalized = normalizePlannerSlots(slots)
  const today = new Date()
  const endDate = new Date(today)
  endDate.setDate(today.getDate() + 45)

  const payload = {
    version: "morning-board-visual-planner-v1",
    slots: normalized,
    updatedAt: new Date().toISOString(),
  }

  const existing = await sql`
    SELECT id
    FROM content_calendars
    WHERE created_by = ${PLANNER_CREATED_BY}
    ORDER BY updated_at DESC
    LIMIT 1
  `

  if (existing.length > 0) {
    await sql`
      UPDATE content_calendars
      SET calendar_data = ${JSON.stringify(payload)}::jsonb,
          total_posts = ${normalized.filter(slot => slot.title || slot.coverUrl || slot.hook).length},
          updated_at = NOW()
      WHERE id = ${existing[0].id}
    `
  } else {
    await sql`
      INSERT INTO content_calendars (
        title,
        description,
        duration,
        start_date,
        end_date,
        platform,
        calendar_data,
        content_pillars,
        total_posts,
        created_by
      )
      VALUES (
        ${PLANNER_TITLE},
        ${"Simple visual 3x3 planner for Sandra's Morning Board."},
        ${"rolling"},
        ${dateOnly(today)},
        ${dateOnly(endDate)},
        ${"instagram"},
        ${JSON.stringify(payload)}::jsonb,
        ${["ai-photoshoot", "prompt-vault", "selfie-to-brand-shoot"]},
        ${normalized.filter(slot => slot.title || slot.coverUrl || slot.hook).length},
        ${PLANNER_CREATED_BY}
      )
    `
  }

  return normalized
}

type GraphMedia = {
  id: string
  caption?: string
  media_type?: string
  media_url?: string
  thumbnail_url?: string
  permalink?: string
  timestamp?: string
  like_count?: number
  comments_count?: number
}

export async function refreshInstagramPostsFromGraph(limit = 9): Promise<{
  synced: number
  error?: string
}> {
  const [connection] = await sql`
    SELECT id, user_id, instagram_user_id, access_token, page_access_token
    FROM instagram_connections
    WHERE is_active = true
    ORDER BY updated_at DESC
    LIMIT 1
  `

  if (!connection?.instagram_user_id) {
    return { synced: 0, error: "No active Instagram connection found." }
  }

  const token = connection.page_access_token || connection.access_token
  if (!token) {
    return { synced: 0, error: "No Instagram access token found." }
  }

  const fields =
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count"
  const url = new URL(`https://graph.facebook.com/v21.0/${connection.instagram_user_id}/media`)
  url.searchParams.set("fields", fields)
  url.searchParams.set("limit", String(limit))
  url.searchParams.set("access_token", String(token))

  const response = await fetch(url)
  const data = (await response.json()) as { data?: GraphMedia[]; error?: { message?: string } }

  if (!response.ok || data.error) {
    return {
      synced: 0,
      error: data.error?.message || "Instagram Graph media fetch failed.",
    }
  }

  const media = Array.isArray(data.data) ? data.data : []

  for (const item of media) {
    await sql`
      INSERT INTO instagram_posts (
        connection_id,
        user_id,
        instagram_post_id,
        post_type,
        caption,
        media_url,
        permalink,
        posted_at,
        likes,
        comments,
        last_synced_at
      )
      VALUES (
        ${connection.id},
        ${connection.user_id},
        ${item.id},
        ${item.media_type || null},
        ${item.caption || null},
        ${item.thumbnail_url || item.media_url || null},
        ${item.permalink || null},
        ${item.timestamp ? new Date(item.timestamp).toISOString() : null},
        ${item.like_count || 0},
        ${item.comments_count || 0},
        NOW()
      )
      ON CONFLICT (instagram_post_id)
      DO UPDATE SET
        post_type = EXCLUDED.post_type,
        caption = EXCLUDED.caption,
        media_url = EXCLUDED.media_url,
        permalink = EXCLUDED.permalink,
        posted_at = EXCLUDED.posted_at,
        likes = EXCLUDED.likes,
        comments = EXCLUDED.comments,
        last_synced_at = NOW()
    `
  }

  return { synced: media.length }
}

export async function getContentBoardData(): Promise<ContentBoardData> {
  const [instagram, planner] = await Promise.all([getRecentInstagramPosts(), getPlannerSlots()])

  return {
    recentPosts: instagram.posts,
    plannerSlots: planner.slots,
    instagramSource: instagram.source,
    plannerSource: planner.source,
  }
}

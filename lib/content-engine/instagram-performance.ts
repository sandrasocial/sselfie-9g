import "server-only"

import { sql } from "@/lib/db/client"

const GRAPH_BASE = "https://graph.facebook.com/v21.0"

export type InstagramPostPerformance = {
  id: string
  permalink: string
  format: "reel" | "carousel" | "feed" | "other"
  postedAt: string
  caption: string
  hookLine: string
  likes: number
  comments: number
  views: number | null
  reach: number | null
  saves: number | null
  shares: number | null
  engagementScore: number
}

export type InstagramPerformanceSnapshot = {
  username: string
  followers: number | null
  postsAnalyzed: number
  insightsLevel: "basic" | "full"
  topPosts: InstagramPostPerformance[]
  allPosts: InstagramPostPerformance[]
}

type ConnectionRow = {
  access_token: string
  instagram_user_id: string
  instagram_username: string
}

async function getActiveConnection(): Promise<ConnectionRow | null> {
  const rows = (await sql`
    SELECT access_token, instagram_user_id, instagram_username
    FROM instagram_connections
    WHERE is_active = true
    ORDER BY id DESC
    LIMIT 1
  `) as ConnectionRow[]
  return rows[0] || null
}

function classifyFormat(mediaType: string | undefined, productType: string | undefined): InstagramPostPerformance["format"] {
  if (productType === "REELS") return "reel"
  if (mediaType === "CAROUSEL_ALBUM") return "carousel"
  if (productType === "FEED" || mediaType === "IMAGE" || mediaType === "VIDEO") return "feed"
  return "other"
}

function extractHookLine(caption: string): string {
  const firstLine = caption.split("\n").find((line) => line.trim().length > 0) || ""
  return firstLine.trim().slice(0, 160)
}

async function fetchMediaInsights(
  mediaId: string,
  productType: string | undefined,
  token: string,
): Promise<{ views: number | null; reach: number | null; saves: number | null; shares: number | null } | null> {
  // "views" is only a valid metric for reels; other formats reject it.
  const metrics = productType === "REELS" ? "views,reach,saved,shares" : "reach,saved,shares"
  try {
    const res = await fetch(
      `${GRAPH_BASE}/${mediaId}/insights?metric=${metrics}&access_token=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    )
    const json = await res.json()
    if (json?.error) return null
    const byName: Record<string, number> = {}
    for (const item of json?.data || []) {
      byName[item.name] = Number(item?.values?.[0]?.value ?? 0)
    }
    return {
      views: Number.isFinite(byName.views) ? byName.views : null,
      reach: Number.isFinite(byName.reach) ? byName.reach : null,
      saves: Number.isFinite(byName.saved) ? byName.saved : null,
      shares: Number.isFinite(byName.shares) ? byName.shares : null,
    }
  } catch {
    return null
  }
}

export async function collectInstagramPerformance(input?: {
  postLimit?: number
  topCount?: number
}): Promise<InstagramPerformanceSnapshot | null> {
  const connection = await getActiveConnection()
  if (!connection) return null

  const token = connection.access_token
  const igUserId = connection.instagram_user_id
  const postLimit = Math.min(input?.postLimit ?? 40, 50)
  const topCount = input?.topCount ?? 8

  const mediaRes = await fetch(
    `${GRAPH_BASE}/${igUserId}/media?fields=id,caption,media_type,media_product_type,timestamp,like_count,comments_count,permalink&limit=${postLimit}&access_token=${encodeURIComponent(token)}`,
    { cache: "no-store" },
  )
  const mediaJson = await mediaRes.json()
  if (mediaJson?.error) {
    throw new Error(`Instagram media fetch failed: ${mediaJson.error.message || "unknown"}`)
  }

  let followers: number | null = null
  try {
    const profileRes = await fetch(
      `${GRAPH_BASE}/${igUserId}?fields=followers_count&access_token=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    )
    const profileJson = await profileRes.json()
    if (Number.isFinite(profileJson?.followers_count)) followers = profileJson.followers_count
  } catch {
    // follower count is nice-to-have only
  }

  // Probe insights once on the newest post. If the token lacks
  // instagram_manage_insights this fails for every post, so skip the rest.
  const rawPosts: any[] = mediaJson?.data || []
  let insightsLevel: "basic" | "full" = "basic"
  if (rawPosts.length > 0) {
    const probe = await fetchMediaInsights(rawPosts[0].id, rawPosts[0].media_product_type, token)
    if (probe) insightsLevel = "full"
  }

  const posts: InstagramPostPerformance[] = []
  for (const raw of rawPosts) {
    const caption = String(raw.caption || "")
    const likes = Number(raw.like_count || 0)
    const comments = Number(raw.comments_count || 0)
    let views: number | null = null
    let reach: number | null = null
    let saves: number | null = null
    let shares: number | null = null

    if (insightsLevel === "full") {
      const insights = await fetchMediaInsights(raw.id, raw.media_product_type, token)
      views = insights?.views ?? null
      reach = insights?.reach ?? null
      saves = insights?.saves ?? null
      shares = insights?.shares ?? null
    }

    // Saves and shares signal intent far harder than likes, so they weigh more.
    const engagementScore =
      likes + comments * 2 + (saves ?? 0) * 3 + (shares ?? 0) * 4

    posts.push({
      id: String(raw.id),
      permalink: String(raw.permalink || ""),
      format: classifyFormat(raw.media_type, raw.media_product_type),
      postedAt: String(raw.timestamp || ""),
      caption: caption.slice(0, 600),
      hookLine: extractHookLine(caption),
      likes,
      comments,
      views,
      reach,
      saves,
      shares,
      engagementScore,
    })
  }

  const ranked = [...posts].sort((a, b) => b.engagementScore - a.engagementScore)

  return {
    username: connection.instagram_username,
    followers,
    postsAnalyzed: posts.length,
    insightsLevel,
    topPosts: ranked.slice(0, topCount),
    allPosts: posts,
  }
}

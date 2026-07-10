import { NextResponse } from "next/server"

import { createCronLogger } from "@/lib/cron-logger"
import { sql } from "@/lib/db/client"
import { resolveInstagramGraphBase } from "@/lib/instagram/connection-mode"

// IG-GROWTH-01: nightly snapshot of the last 60 Instagram posts into ig_media_snapshots.
// History is what the live Graph API can't give us: day-7 verdicts, winner decay,
// repost-due detection for the Monday content brief. Reads the same active
// instagram_connections row the content engine uses.
//
// Insights need the instagram_manage_insights permission on the stored token.
// Until that's granted the sync still runs and stores likes/comments
// (insights_level 'basic'); it upgrades itself to 'full' automatically.

export const dynamic = "force-dynamic"
export const maxDuration = 300

const POST_LIMIT = 60

type ConnectionRow = {
  access_token: string
  instagram_user_id: string
  instagram_username: string
  account_type: string | null
}

function classifyFormat(mediaType?: string, productType?: string): string {
  if (productType === "REELS") return "reel"
  if (mediaType === "CAROUSEL_ALBUM") return "carousel"
  if (productType === "FEED" || mediaType === "IMAGE" || mediaType === "VIDEO") return "feed"
  return "other"
}

function hookLine(caption: string): string {
  return (caption.split("\n").find((line) => line.trim().length > 0) || "").trim().slice(0, 160)
}

async function fetchInsights(mediaId: string, format: string, token: string, graphBase: string) {
  // "views" is only valid for reels; other formats take the smaller metric set.
  const metrics = format === "reel" ? "views,reach,saved,shares" : "reach,saved,shares"
  const res = await fetch(
    `${graphBase}/${mediaId}/insights?metric=${metrics}&access_token=${encodeURIComponent(token)}`,
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
}

export async function GET(request: Request) {
  const cronLogger = createCronLogger("ig-insights-sync")
  await cronLogger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isProduction =
      process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction) {
      if (!cronSecret) {
        await cronLogger.error(new Error("Unauthorized"), { reason: "CRON_SECRET not set in production" })
        return NextResponse.json({ error: "Unauthorized: CRON_SECRET required in production" }, { status: 401 })
      }
      if (authHeader !== `Bearer ${cronSecret}`) {
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const connections = (await sql`
      SELECT access_token, instagram_user_id, instagram_username, account_type
      FROM instagram_connections
      WHERE is_active = true
      ORDER BY id DESC
      LIMIT 1
    `) as ConnectionRow[]

    const connection = connections[0]
    if (!connection) {
      const summary = { connected: false, snapshots: 0 }
      await cronLogger.success(summary)
      return NextResponse.json({ success: true, ...summary })
    }

    const token = connection.access_token
    const graphBase = resolveInstagramGraphBase(connection)
    const mediaRes = await fetch(
      `${graphBase}/${connection.instagram_user_id}/media?fields=id,caption,media_type,media_product_type,timestamp,like_count,comments_count,permalink&limit=${POST_LIMIT}&access_token=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    )
    const mediaJson = await mediaRes.json()
    if (mediaJson?.error) {
      throw new Error(`Instagram media fetch failed: ${mediaJson.error.message || "unknown"}`)
    }

    const rawPosts: any[] = mediaJson?.data || []

    // Probe once: if insights fail on the newest post they fail everywhere
    // (missing instagram_manage_insights), so skip per-post calls.
    let insightsLevel: "basic" | "full" = "basic"
    if (rawPosts.length > 0) {
      const probeFormat = classifyFormat(rawPosts[0].media_type, rawPosts[0].media_product_type)
      if (await fetchInsights(rawPosts[0].id, probeFormat, token, graphBase)) insightsLevel = "full"
    }

    let written = 0
    for (const raw of rawPosts) {
      const format = classifyFormat(raw.media_type, raw.media_product_type)
      const insights = insightsLevel === "full" ? await fetchInsights(raw.id, format, token, graphBase) : null

      await sql`
        INSERT INTO ig_media_snapshots (
          media_id, instagram_username, permalink, format, posted_at, hook_line,
          likes, comments, views, reach, saves, shares, insights_level
        )
        VALUES (
          ${raw.id}, ${connection.instagram_username}, ${raw.permalink || null}, ${format},
          ${raw.timestamp || null}, ${hookLine(String(raw.caption || ""))},
          ${Number(raw.like_count || 0)}, ${Number(raw.comments_count || 0)},
          ${insights?.views ?? null}, ${insights?.reach ?? null},
          ${insights?.saves ?? null}, ${insights?.shares ?? null}, ${insightsLevel}
        )
        ON CONFLICT (media_id, captured_on)
        DO UPDATE SET
          likes = EXCLUDED.likes,
          comments = EXCLUDED.comments,
          views = COALESCE(EXCLUDED.views, ig_media_snapshots.views),
          reach = COALESCE(EXCLUDED.reach, ig_media_snapshots.reach),
          saves = COALESCE(EXCLUDED.saves, ig_media_snapshots.saves),
          shares = COALESCE(EXCLUDED.shares, ig_media_snapshots.shares),
          insights_level = EXCLUDED.insights_level
      `
      written += 1
    }

    const summary = {
      connected: true,
      username: connection.instagram_username,
      snapshots: written,
      insightsLevel,
    }
    await cronLogger.success(summary)
    return NextResponse.json({ success: true, ...summary })
  } catch (error: unknown) {
    await cronLogger.error(error, { step: "ig-insights-sync" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "IG insights sync failed" },
      { status: 500 },
    )
  }
}

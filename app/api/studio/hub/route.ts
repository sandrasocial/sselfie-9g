import { NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/with-auth"
import { sql } from "@/lib/db/client"

interface HubFeedRow {
  id: number
  title: string | null
  brand_name: string | null
  status: string | null
  layout_type: string | null
  updated_at: string | null
  created_at: string | null
  image_count: number | string | null
  post_count: number | string | null
}

interface HubPageRow {
  id: string
  title: string | null
  page_type: string | null
  status: string | null
  live_url: string | null
  version: number | string | null
  updated_at: string | null
}

interface HubPhotoRow {
  id: string | number
  image_url: string | null
  prompt: string | null
  source: string | null
  created_at: string | null
}

interface HubVideoRow {
  id: string | number
  video_url: string | null
  image_source: string | null
  motion_prompt: string | null
  created_at: string | null
}

function toInt(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.floor(parsed))
}

function toIso(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) return value
  return new Date(0).toISOString()
}

function isMissingRelationError(error: unknown): boolean {
  const err = error as { code?: string; message?: string }
  const code = typeof err?.code === "string" ? err.code : ""
  const message = String(err?.message || "").toLowerCase()
  return (
    code === "42P01" ||
    code === "42703" ||
    message.includes("does not exist") ||
    message.includes("undefined table") ||
    message.includes("undefined column")
  )
}

async function safeQueryRows<T>(queryFactory: () => Promise<T[]>, fallback: T[]): Promise<T[]> {
  try {
    return await queryFactory()
  } catch (error) {
    if (isMissingRelationError(error)) {
      return fallback
    }
    throw error
  }
}

async function safeCount(queryFactory: () => Promise<Array<{ count: number | string | null }>>): Promise<number> {
  const rows = await safeQueryRows(queryFactory, [{ count: 0 }])
  return toInt(rows[0]?.count)
}

async function handleGetStudioHub({
  user,
}: {
  user: { id: string | number }
}) {
  try {
    const userId = String(user.id)
    const landingPagesPaused = true

    const [feeds, pages, recentPhotos, recentVideos, generatedImageCount, aiImageCount, videoCount] = await Promise.all([
      safeQueryRows(async () => {
        const rows = await sql`
          SELECT
            fl.id,
            fl.title,
            fl.brand_name,
            fl.status,
            fl.layout_type,
            fl.updated_at,
            fl.created_at,
            COALESCE(posts.image_count, 0) AS image_count,
            COALESCE(posts.post_count, 0) AS post_count
          FROM feed_layouts fl
          LEFT JOIN (
            SELECT
              feed_layout_id,
              COUNT(*)::int AS post_count,
              COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END)::int AS image_count
            FROM feed_posts
            GROUP BY feed_layout_id
          ) posts ON posts.feed_layout_id = fl.id
          WHERE fl.user_id = ${userId}
            AND fl.status IN ('saved', 'completed', 'draft')
          ORDER BY fl.updated_at DESC NULLS LAST, fl.created_at DESC
          LIMIT 20
        `
        return rows as HubFeedRow[]
      }, [] as HubFeedRow[]),
      safeQueryRows(async () => {
        const rows = await sql`
          SELECT id, title, page_type, status, live_url, version, updated_at
          FROM personal_pages
          WHERE user_id = ${userId}
          ORDER BY updated_at DESC
          LIMIT 24
        `
        return rows as HubPageRow[]
      }, [] as HubPageRow[]),
      safeQueryRows(async () => {
        const rows = await sql`
          WITH combined AS (
            SELECT
              id::text AS id,
              image_url,
              COALESCE(prompt, 'Maya photo') AS prompt,
              'ai_images' AS source,
              created_at
            FROM ai_images
            WHERE user_id = ${userId}
              AND generation_status = 'completed'
              AND image_url IS NOT NULL

            UNION ALL

            SELECT
              id::text AS id,
              COALESCE(selected_url, (string_to_array(image_urls::text, ','))[1]) AS image_url,
              COALESCE(prompt, 'Generated photo') AS prompt,
              'generated_images' AS source,
              created_at
            FROM generated_images
            WHERE user_id = ${userId}
              AND (selected_url IS NOT NULL OR image_urls IS NOT NULL)

            UNION ALL

            SELECT
              id::text AS id,
              file_url AS image_url,
              COALESCE(description, file_name, 'Brand asset') AS prompt,
              'brand_assets' AS source,
              created_at
            FROM brand_assets
            WHERE user_id = ${userId}
              AND file_url IS NOT NULL
              AND (
                LOWER(COALESCE(file_type, '')) LIKE 'image/%'
                OR COALESCE(file_name, '') ~* '\\.(jpg|jpeg|png|webp|heic|heif)$'
              )
          ),
          dedup AS (
            SELECT
              id,
              image_url,
              prompt,
              source,
              created_at,
              ROW_NUMBER() OVER (PARTITION BY image_url ORDER BY created_at DESC) AS rn
            FROM combined
            WHERE image_url IS NOT NULL
          )
          SELECT id, image_url, prompt, source, created_at
          FROM dedup
          WHERE rn = 1
          ORDER BY created_at DESC
          LIMIT 10
        `
        return rows as HubPhotoRow[]
      }, [] as HubPhotoRow[]),
      safeQueryRows(async () => {
        const rows = await sql`
          SELECT id, video_url, image_source, motion_prompt, created_at
          FROM generated_videos
          WHERE user_id = ${userId}
            AND status = 'completed'
            AND video_url IS NOT NULL
          ORDER BY created_at DESC
          LIMIT 10
        `
        return rows as HubVideoRow[]
      }, [] as HubVideoRow[]),
      safeCount(async () => (await sql`
        SELECT COUNT(*)::int AS count
        FROM generated_images
        WHERE user_id = ${userId}
      `) as Array<{ count: number | string | null }>),
      safeCount(async () => (await sql`
        SELECT COUNT(*)::int AS count
        FROM ai_images
        WHERE user_id = ${userId}
      `) as Array<{ count: number | string | null }>),
      safeCount(async () => (await sql`
        SELECT COUNT(*)::int AS count
        FROM generated_videos
        WHERE user_id = ${userId}
          AND status = 'completed'
      `) as Array<{ count: number | string | null }>),
    ])

    const serializedFeeds = feeds.map((feed) => ({
      id: String(feed.id),
      title: feed.title || feed.brand_name || `Feed ${feed.id}`,
      status: feed.status || "draft",
      layoutType: feed.layout_type || "grid_3x3",
      imageCount: toInt(feed.image_count),
      postCount: toInt(feed.post_count),
      updatedAt: toIso(feed.updated_at || feed.created_at),
      openUrl: `/studio?tab=feed-planner&feedId=${feed.id}#feed-planner`,
      manageUrl: `/studio?tab=feed-planner&feedId=${feed.id}#feed-planner`,
    }))

    const serializedPages = pages.map((page) => ({
      id: page.id,
      title: page.title || "Untitled",
      pageType: page.page_type || "landing",
      status: page.status || "draft",
      liveUrl: page.live_url || "",
      version: toInt(page.version) || 1,
      updatedAt: toIso(page.updated_at),
      openInMayaUrl: "/studio?tab=maya#maya",
      canRegenerate: true,
      regenerateUrl: `/api/maya/personal-pages/${encodeURIComponent(page.id)}/regenerate`,
    }))

    const serializedRecentPhotos = recentPhotos.map((photo) => ({
      id: String(photo.id),
      imageUrl: photo.image_url || "",
      prompt: photo.prompt || "",
      source: photo.source || "ai_images",
      updatedAt: toIso(photo.created_at),
      openUrl: "/studio?tab=gallery#gallery",
    }))

    const serializedRecentVideos = recentVideos.map((video) => ({
      id: String(video.id),
      videoUrl: video.video_url || "",
      thumbnailUrl: video.image_source || "",
      motionPrompt: video.motion_prompt || "",
      updatedAt: toIso(video.created_at),
      openUrl: "/studio?tab=maya#maya/videos",
    }))

    const safePages = landingPagesPaused ? [] : serializedPages

    return NextResponse.json({
      success: true,
      landingPagesPaused,
      stats: {
        feedCount: serializedFeeds.length,
        pageCount: 0,
        photoCount: generatedImageCount + aiImageCount,
        videoCount,
      },
      feeds: serializedFeeds,
      pages: safePages,
      recentPhotos: serializedRecentPhotos,
      recentVideos: serializedRecentVideos,
    })
  } catch (error) {
    console.error("[Studio Hub] Failed to load hub data:", error)
    return NextResponse.json({ error: "Failed to load Studio Hub data" }, { status: 500 })
  }
}

export const GET = withAuth(handleGetStudioHub)

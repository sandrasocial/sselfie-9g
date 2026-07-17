import { sql } from "@/lib/db/client"
import {
  generateInstagramCaption,
  shouldRegenerateCaption,
  extractHashtagsFromCaption,
} from "@/lib/feed-planner/caption-writer"

export type FeedCaptionGenerationMode = "all" | "missing_or_weak"

export interface FeedCaptionGenerationResult {
  success: boolean
  feedId: number
  mode: FeedCaptionGenerationMode
  totalPosts: number
  targetedPosts: number
  captionsGenerated: number
  captionsFailed: number
  captionsNeedStory: number
  captionsSkipped: number
  failedPostIds: number[]
  needsStoryPostIds: number[]
}

type FeedPostRow = {
  id: number
  position: number
  prompt: string | null
  content_pillar: string | null
  post_type: string | null
  caption: string | null
}

function parseContentPillars(value: unknown): any[] {
  if (!value) return []

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value
    if (Array.isArray(parsed)) return parsed
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { pillars?: unknown[] }).pillars)
    ) {
      return (parsed as { pillars: unknown[] }).pillars
    }
  } catch {
    return []
  }

  return []
}

function getCaptionType(position: number): "story" | "value" | "motivational" {
  const pattern: Array<"story" | "value" | "motivational"> = [
    "story",
    "value",
    "motivational",
    "story",
    "value",
    "motivational",
    "story",
    "value",
    "motivational",
  ]
  return pattern[position - 1] || "story"
}

function getContentPillarForPost(
  position: number,
  postContentPillar: string | null,
  contentPillars: any[]
): { name: string; description?: string } {
  if (postContentPillar && postContentPillar.trim()) {
    return { name: postContentPillar.trim() }
  }

  if (contentPillars.length > 0) {
    const pillarIndex = (position - 1) % contentPillars.length
    const pillar = contentPillars[pillarIndex]
    return {
      name: pillar?.name || pillar || "lifestyle",
      description: pillar?.description || undefined,
    }
  }

  return { name: "lifestyle" }
}

export async function generateAndStoreFeedCaptions(input: {
  feedId: number | string
  userId: number | string
  mode?: FeedCaptionGenerationMode
}): Promise<FeedCaptionGenerationResult> {
  const normalizedFeedId = Number(input.feedId)
  const normalizedUserId = input.userId
  const mode: FeedCaptionGenerationMode = input.mode || "all"

  if (!Number.isFinite(normalizedFeedId) || normalizedFeedId <= 0) {
    throw new Error("Invalid feed ID")
  }

  const [feed] = await sql`
    SELECT id
    FROM feed_layouts
    WHERE id = ${normalizedFeedId}
    AND user_id = ${normalizedUserId}
    LIMIT 1
  `

  if (!feed) {
    throw new Error("Feed not found")
  }

  const posts = (await sql`
    SELECT
      id,
      position,
      prompt,
      content_pillar,
      post_type,
      caption
    FROM feed_posts
    WHERE feed_layout_id = ${normalizedFeedId}
    AND user_id = ${normalizedUserId}
    ORDER BY position ASC
  `) as FeedPostRow[]

  if (posts.length === 0) {
    throw new Error("No posts found for this feed")
  }

  const [brandProfile] = await sql`
    SELECT
      name,
      business_type,
      brand_vibe,
      brand_voice,
      target_audience,
      content_pillars,
      color_palette
    FROM user_personal_brand
    WHERE user_id = ${normalizedUserId}
    LIMIT 1
  `

  const [researchData] = await sql`
    SELECT
      research_summary,
      best_hooks,
      trending_hashtags,
      competitive_insights
    FROM content_research
    WHERE user_id = ${String(normalizedUserId)}
    ORDER BY created_at DESC
    LIMIT 1
  `

  const contentPillars = parseContentPillars(brandProfile?.content_pillars)
  const defaultAudience = brandProfile?.target_audience || "general audience"

  let targetedPosts = 0
  let captionsGenerated = 0
  let captionsFailed = 0
  let captionsNeedStory = 0
  let captionsSkipped = 0
  const failedPostIds: number[] = []
  const needsStoryPostIds: number[] = []
  const previousCaptions: Array<{ position: number; caption: string }> = []

  for (const post of posts) {
    const existingCaption = String(post.caption || "").trim()
    const shouldGenerate = mode === "all" || shouldRegenerateCaption(existingCaption)
    const pillarInfo = getContentPillarForPost(post.position, post.content_pillar, contentPillars)

    if (!shouldGenerate) {
      captionsSkipped += 1
      if (existingCaption) {
        previousCaptions.push({
          position: post.position,
          caption: existingCaption,
        })
      }
      continue
    }

    targetedPosts += 1
    const captionType = getCaptionType(post.position)

    if (captionType === "story" && !existingCaption) {
      captionsNeedStory += 1
      needsStoryPostIds.push(post.id)
      continue
    }

    try {
      const captionResult = await generateInstagramCaption({
        postPosition: post.position,
        shotType: post.post_type || "portrait",
        purpose: pillarInfo.name,
        emotionalTone:
          captionType === "motivational"
            ? "inspiring"
            : captionType === "value"
              ? "helpful"
              : "warm",
        brandProfile: brandProfile || {
          business_type: "Personal Brand",
          brand_vibe: "Strategic",
          brand_voice: "Authentic",
          target_audience: "Entrepreneurs",
        },
        targetAudience: defaultAudience,
        brandVoice: brandProfile?.brand_voice || "authentic",
        contentPillar: pillarInfo.name,
        previousCaptions,
        researchData: researchData || null,
        captionType,
        contentPillars,
        storySource: captionType === "story" ? existingCaption : null,
      })

      const finalCaption = String(captionResult.caption || "").trim()
      if (!finalCaption) {
        throw new Error("Caption provider returned an empty draft")
      }

      await sql`
        UPDATE feed_posts
        SET caption = ${finalCaption}, updated_at = NOW()
        WHERE id = ${post.id}
        AND feed_layout_id = ${normalizedFeedId}
        AND user_id = ${normalizedUserId}
      `

      captionsGenerated += 1
      previousCaptions.push({
        position: post.position,
        caption: finalCaption,
      })
    } catch (error) {
      console.error(`[FEED-CAPTIONS] Failed to generate caption for post ${post.position}:`, error)
      captionsFailed += 1
      failedPostIds.push(post.id)
      // Never turn a provider failure into invented filler. The post remains visibly
      // unfinished so the member can retry or give Maya the missing context.
    }
  }

  return {
    success: true,
    feedId: normalizedFeedId,
    mode,
    totalPosts: posts.length,
    targetedPosts,
    captionsGenerated,
    captionsFailed,
    captionsNeedStory,
    captionsSkipped,
    failedPostIds,
    needsStoryPostIds,
  }
}

export function countCaptionHashtags(caption: string): number {
  return extractHashtagsFromCaption(caption).length
}

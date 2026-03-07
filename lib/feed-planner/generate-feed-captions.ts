import { sql } from "@/lib/db/client"
import { generateInstagramCaption, shouldRegenerateCaption, extractHashtagsFromCaption } from "@/lib/feed-planner/caption-writer"

export type FeedCaptionGenerationMode = "all" | "missing_or_weak"

export interface FeedCaptionGenerationResult {
  success: boolean
  feedId: number
  mode: FeedCaptionGenerationMode
  totalPosts: number
  targetedPosts: number
  captionsGenerated: number
  captionsFailed: number
  captionsSkipped: number
  failedPostIds: number[]
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
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as { pillars?: unknown[] }).pillars)) {
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

function getContentPillarForPost(position: number, postContentPillar: string | null, contentPillars: any[]): { name: string; description?: string } {
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

function fallbackCaptionForPost(input: { pillar: string; audience: string }): string {
  const normalizedPillar = input.pillar || "your content"
  const normalizedAudience = input.audience || "your audience"
  return [
    `Real talk: if you're building ${normalizedPillar}, clarity beats perfection every single time.`,
    "",
    `Pick one story your ${normalizedAudience} can feel, then share one practical next step they can use today.`,
    "",
    "Save this for your next post and tell me what you're creating this week.",
    "",
    "#personalbrand #contentstrategy #instagramtips #storytelling #contentcreation",
  ].join("\n")
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
  let captionsSkipped = 0
  const failedPostIds: number[] = []
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

    try {
      const captionResult = await generateInstagramCaption({
        postPosition: post.position,
        shotType: post.post_type || "portrait",
        purpose: pillarInfo.name,
        emotionalTone: captionType === "motivational" ? "inspiring" : captionType === "value" ? "helpful" : "warm",
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
      })

      const generatedCaption = String(captionResult.caption || "").trim()
      const finalCaption = generatedCaption || fallbackCaptionForPost({
        pillar: pillarInfo.name,
        audience: defaultAudience,
      })

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

      const fallbackCaption = existingCaption && !shouldRegenerateCaption(existingCaption)
        ? existingCaption
        : fallbackCaptionForPost({
            pillar: pillarInfo.name,
            audience: defaultAudience,
          })

      await sql`
        UPDATE feed_posts
        SET caption = ${fallbackCaption}, updated_at = NOW()
        WHERE id = ${post.id}
        AND feed_layout_id = ${normalizedFeedId}
        AND user_id = ${normalizedUserId}
      `

      previousCaptions.push({
        position: post.position,
        caption: fallbackCaption,
      })
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
    captionsSkipped,
    failedPostIds,
  }
}

export function countCaptionHashtags(caption: string): number {
  return extractHashtagsFromCaption(caption).length
}

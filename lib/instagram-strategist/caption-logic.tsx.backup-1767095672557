import { neon } from "@neondatabase/serverless" // Declare the neon variable

export async function generateCaptionsForFeed({
  feedId,
  userId,
  brandVibe,
  businessType,
  colorPalette,
  feedStory,
  researchData,
  startPosition = 0, // Add startPosition parameter for adding rows
  count, // Add count parameter to limit how many captions to generate
}: {
  feedId: string
  userId: number
  brandVibe: string
  businessType: string
  colorPalette: string
  feedStory: string
  researchData?: string | null
  startPosition?: number // Optional starting position
  count?: number // Optional count limit
}): Promise<{
  success: boolean
  captionsGenerated: number
  totalPosts: number
  errors?: string[]
}> {
  console.log("[v0] [CAPTION STRATEGIST] Starting caption generation for feed:", feedId)
  console.log("[v0] [CAPTION STRATEGIST] Start position:", startPosition, "Count:", count || "all")

  const sql = neon(process.env.DATABASE_URL!)

  try {
    let posts
    if (count) {
      posts = await sql`
        SELECT id, position, prompt, post_type, caption
        FROM feed_posts
        WHERE feed_layout_id = ${feedId}
        AND user_id = ${userId}
        AND position >= ${startPosition}
        ORDER BY position ASC
        LIMIT ${count}
      `
    } else {
      posts = await sql`
        SELECT id, position, prompt, post_type, caption
        FROM feed_posts
        WHERE feed_layout_id = ${feedId}
        AND user_id = ${userId}
        AND position >= ${startPosition}
        ORDER BY position ASC
      `
    }

    return {
      success: true,
      captionsGenerated: posts.length,
      totalPosts: posts.length,
    }
  } catch (error) {
    console.error("[v0] [CAPTION STRATEGIST] Error generating captions:", error)
    return {
      success: false,
      captionsGenerated: 0,
      totalPosts: 0,
      errors: [error.message],
    }
  }
}

import { generateText } from "ai"
import { INSTAGRAM_STRATEGIST_SYSTEM_PROMPT } from "./personality"
import { neon } from "@neondatabase/serverless"

interface CaptionGenerationParams {
  feedId: string
  userId: string
  brandProfile?: any
  researchData?: any
  brandVibe: string
  businessType: string
  colorPalette: string
  feedStory: string
}

export async function generateCaptionsForFeed(params: CaptionGenerationParams) {
  const { feedId, userId, brandProfile, researchData, brandVibe, businessType, colorPalette, feedStory } = params

  console.log("[v0] [CAPTION STRATEGIST] Starting caption generation for feed:", feedId)

  const sql = neon(process.env.DATABASE_URL!)

  // Fetch all posts for this feed
  const posts = await sql`
    SELECT * FROM feed_posts
    WHERE feed_layout_id = ${feedId}
    AND user_id = ${userId}
    ORDER BY position ASC
  `

  console.log("[v0] [CAPTION STRATEGIST] Found", posts.length, "posts to generate captions for")

  if (posts.length === 0) {
    throw new Error("No posts found for this feed")
  }

  // Build context for the Caption Strategist
  let contextPrompt = `You are writing captions for a ${businessType} with this brand identity:
- Brand Vibe: ${brandVibe}
- Color Palette: ${colorPalette}
- Feed Story: ${feedStory}
`

  if (brandProfile) {
    contextPrompt += `\n**Brand Profile:**
- Brand Voice: ${brandProfile.brand_voice || "authentic and relatable"}
- Target Audience: ${brandProfile.target_audience || "not specified"}
- Content Pillars: ${brandProfile.content_pillars || "not specified"}
`
  }

  if (researchData) {
    contextPrompt += `\n**Research Insights:**
${researchData}
`
  }

  // Generate captions for each post individually
  const captionPromises = posts.map(async (post, index) => {
    const postNumber = index + 1
    const positionContext =
      postNumber <= 3
        ? "This is an opening post - focus on introduction and first impression"
        : postNumber <= 6
          ? "This is a middle post - focus on value and expertise"
          : "This is a closing post - focus on engagement and call-to-action"

    try {
      const { text: caption } = await generateText({
        model: "anthropic/claude-sonnet-4",
        temperature: 0.9, // High creativity for unique captions
        system: INSTAGRAM_STRATEGIST_SYSTEM_PROMPT,
        prompt: `${contextPrompt}

**Post ${postNumber} Details:**
- Type: ${post.post_type}
- Visual Concept: ${post.prompt}
- Position in Feed: ${positionContext}

Write a unique, authentic Instagram caption for this post that:
1. Uses SIMPLE, EVERYDAY LANGUAGE - like texting a friend
2. NEVER uses em dashes (—) - use periods or commas instead
3. Has a completely different structure from other captions
4. Feels natural and conversational, NOT like AI wrote it
5. Includes 2-3 strategic emojis throughout (not just at the end)
6. Uses double line breaks (\\n\\n) between paragraphs
7. Ends with relevant hashtags on a new line

**CRITICAL:** Each caption must be COMPLETELY DIFFERENT in:
- Opening style (question, statement, story, observation, etc.)
- Sentence structure and rhythm
- Tone and energy level
- Length and pacing
- Emoji placement and usage

Write the caption now:`,
      })

      console.log(`[v0] [CAPTION STRATEGIST] ✓ Generated caption for post ${postNumber}`)

      // Update the post with the new caption
      await sql`
        UPDATE feed_posts
        SET caption = ${caption}
        WHERE id = ${post.id}
        AND feed_layout_id = ${feedId}
        AND user_id = ${userId}
      `

      return { postNumber, caption, success: true }
    } catch (error) {
      console.error(`[v0] [CAPTION STRATEGIST] ✗ Error generating caption for post ${postNumber}:`, error)
      return { postNumber, caption: null, success: false, error }
    }
  })

  const results = await Promise.all(captionPromises)

  const successCount = results.filter((r) => r.success).length
  console.log(`[v0] [CAPTION STRATEGIST] ✓ Generated ${successCount}/${posts.length} captions successfully`)

  return {
    success: true,
    captionsGenerated: successCount,
    totalPosts: posts.length,
    results,
  }
}

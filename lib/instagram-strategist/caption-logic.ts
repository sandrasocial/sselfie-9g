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

  let contextPrompt = `You are writing captions for a ${businessType} with this brand identity:
- Brand Vibe: ${brandVibe}
- Color Palette: ${colorPalette}
- Feed Story: ${feedStory}

**CRITICAL INSTRUCTIONS:**
- Each caption must sound COMPLETELY DIFFERENT from the others
- Use double line breaks (\\n\\n) between paragraphs for visual rhythm
- Place 2-4 emojis strategically throughout (not clustered at end)
- Write in simple, conversational language like texting a friend
- NEVER use em dashes (—) - use periods or commas instead
- Vary opening hooks: bold statement, question, story, confession, observation
- Make each caption feel spontaneous and authentic, not scripted
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

  const captionPromises = posts.map(async (post, index) => {
    const postNumber = index + 1

    // Define different caption styles to enforce variety
    const captionStyles = [
      "vulnerable confession or personal story",
      "bold contrarian statement or hot take",
      "educational value with actionable insights",
      "relatable observation or shared experience",
      "inspiring transformation story",
      "entertaining behind-the-scenes moment",
      "thought-provoking question or reflection",
      "authentic struggle or lesson learned",
      "celebration or milestone moment",
    ]

    const assignedStyle = captionStyles[index % captionStyles.length]

    const positionContext =
      postNumber <= 3
        ? "Opening post - create strong first impression and hook new followers"
        : postNumber <= 6
          ? "Middle post - deliver core value and showcase expertise"
          : "Closing post - drive engagement and build community connection"

    try {
      const { text: caption } = await generateText({
        model: "anthropic/claude-sonnet-4",
        temperature: 0.95, // Higher creativity for more unique, human-like captions
        system: INSTAGRAM_STRATEGIST_SYSTEM_PROMPT,
        prompt: `${contextPrompt}

**Post ${postNumber} Details:**
- Type: ${post.post_type}
- Visual Concept: ${post.prompt}
- Position in Feed: ${positionContext}
- Required Style: ${assignedStyle}

**FORMATTING REQUIREMENTS:**
1. Use double line breaks (\\n\\n) between paragraphs
2. Keep paragraphs short: 2-3 sentences MAX per paragraph
3. Place 2-4 emojis at NATURAL BREAKS (not at the end)
4. End with hashtags on a new line (15-25 relevant hashtags)

**STRUCTURE EXAMPLE:**
Hook line that stops the scroll.\\n\\n
Story or value paragraph (2-3 sentences).\\n\\n
Insight or lesson (1-2 sentences).\\n\\n
Natural CTA question?\\n\\n
#hashtag #hashtag #hashtag

**VOICE REQUIREMENTS:**
- Write like texting a friend, not writing an essay
- Use simple words and short sentences
- Sound spontaneous and authentic
- Show personality and imperfections
- NEVER use em dashes (—)
- Make it feel like only THIS person could write this

**VARIETY ENFORCEMENT:**
This is caption ${postNumber} of 9. It MUST be completely different from the others in:
- Opening hook style (${assignedStyle})
- Length and pacing
- Energy level and tone
- Emoji placement pattern
- Sentence structure

Write the caption now (remember: double line breaks between paragraphs):`,
      })

      console.log(`[v0] [CAPTION STRATEGIST] ✓ Generated ${assignedStyle} caption for post ${postNumber}`)

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

import { generateObject } from "ai"
import { z } from "zod"
import { neon } from "@neondatabase/serverless"
import { getUserByAuthId } from "@/lib/user-mapping"
import { INSTAGRAM_STRATEGIST_SYSTEM_PROMPT } from "@/lib/instagram-strategist/personality"
import { getAuthenticatedUser } from "@/lib/auth-helper"

const sql = neon(process.env.DATABASE_URL!)

const CaptionSchema = z.object({
  caption: z
    .string()
    .describe(
      "Unique, authentic caption (150-200 words) that sounds like a real person. Use simple language, short sentences, and a conversational tone. NO templates or repeated structures.",
    ),
  hashtags: z
    .array(z.string())
    .describe("5-10 researched hashtags specific to THIS post's topic. Mix trending, niche, and branded tags."),
})

export async function POST(request: Request) {
  try {
    console.log("[v0] Instagram Strategist: Starting caption generation...")

    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return Response.json({ error: "Not authenticated" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return Response.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { feedId, brandVibe, businessType, colorPalette, feedStory, researchData } = body

    if (!feedId) {
      return Response.json({ error: "Missing required field: feedId" }, { status: 400 })
    }

    console.log(`[v0] Instagram Strategist: Generating captions for feed ${feedId}...`)
    if (researchData) {
      console.log("[v0] Instagram Strategist: Using research data for trending hooks and hashtags")
    }

    const posts = await sql`
      SELECT * FROM feed_posts
      WHERE feed_layout_id = ${feedId}
      AND user_id = ${neonUser.id}
      ORDER BY position ASC
    `

    if (posts.length === 0) {
      return Response.json({ error: "No posts found for this feed" }, { status: 404 })
    }

    const [brandProfile] = await sql`
      SELECT * FROM user_personal_brand
      WHERE user_id = ${neonUser.id}
      AND is_completed = true
      LIMIT 1
    `

    console.log(`[v0] Instagram Strategist: Found ${posts.length} posts to write captions for`)

    const captionResults = []

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i]
      const postNumber = i + 1

      console.log(`[v0] Instagram Strategist: Generating caption ${postNumber}/9...`)

      const researchContext = researchData
        ? `
## Research Insights (Use These!):
${researchData.research_summary ? `\n**Market Research:**\n${researchData.research_summary}\n` : ""}
${researchData.best_hooks && Array.isArray(researchData.best_hooks) && researchData.best_hooks.length > 0 ? `\n**Trending Hooks to Inspire You:**\n${researchData.best_hooks.slice(0, 5).join("\n")}\n` : ""}
${researchData.trending_hashtags && Array.isArray(researchData.trending_hashtags) && researchData.trending_hashtags.length > 0 ? `\n**Trending Hashtags:**\n${researchData.trending_hashtags.slice(0, 15).join(", ")}\n` : ""}
${researchData.competitive_insights ? `\n**How to Stand Out:**\n${researchData.competitive_insights.substring(0, 300)}...\n` : ""}
`
        : ""

      const postContext = `
## Post ${postNumber} of 9:
- Position in Feed: ${postNumber}
- Post Type: ${post.post_type}
- Visual Description: ${post.prompt}
- Purpose: This post should ${postNumber <= 3 ? "introduce the brand and build connection" : postNumber <= 6 ? "share expertise and provide value" : "engage community and inspire action"}

## Brand Context:
- Business: ${businessType}
- Brand Vibe: ${brandVibe}
- Color Palette: ${colorPalette}
- Feed Story: ${feedStory}
${brandProfile ? `- Brand Voice: ${brandProfile.brand_voice || "authentic and relatable"}` : ""}
${brandProfile ? `- Target Audience: ${brandProfile.target_audience || "personal brand enthusiasts"}` : ""}

${researchContext}

## Previous Captions (to ensure uniqueness):
${captionResults.map((r, idx) => `Post ${idx + 1}: ${r.caption.substring(0, 100)}...`).join("\n")}
`

      const result = await generateObject({
        model: "anthropic/claude-sonnet-4",
        schema: CaptionSchema,
        system: INSTAGRAM_STRATEGIST_SYSTEM_PROMPT,
        prompt: `You are writing an Instagram caption for post ${postNumber} of a 9-post feed.

${postContext}

## Your Task:
Write a completely unique caption that:
1. Has a SPECIFIC hook related to THIS post's visual and purpose (not generic)
${researchData ? "2. Uses insights from the research data (trending hooks, competitive insights)" : "2. Creates an engaging hook that stops the scroll"}
3. Tells a story or shares value in an authentic, conversational voice
4. Uses SIMPLE, EVERYDAY LANGUAGE - like texting a friend
5. Has a natural call-to-action that fits this specific post
6. Is COMPLETELY DIFFERENT in structure from the previous captions

## CRITICAL REQUIREMENTS:
- This caption MUST have a UNIQUE structure (don't follow the same pattern as previous posts)
- NO repeated phrases or templates
- NO signature lines like "As a ${businessType}..." or business name mentions
- Write like a REAL PERSON, not like AI
- Vary the style: ${postNumber <= 3 ? "storytelling and introduction" : postNumber <= 6 ? "educational and value-driven" : "community-focused and inspiring"}
- Keep it authentic and relatable
${researchData ? "- Draw inspiration from the trending hooks but make them YOUR OWN voice" : ""}

## Caption Style for Post ${postNumber}:
${
  postNumber === 1
    ? "Start with a bold statement or question that immediately grabs attention. Share your 'why' or origin story."
    : postNumber === 2
      ? "Share a personal lesson or transformation. Make it vulnerable and real."
      : postNumber === 3
        ? "Behind-the-scenes moment. Show the real, unfiltered side of your journey."
        : postNumber === 4
          ? "Educational content. Share a specific tip or strategy that provides immediate value."
          : postNumber === 5
            ? "Challenge a common belief or myth in your industry. Be bold and opinionated."
            : postNumber === 6
              ? "Share a client win or case study. Make it specific and results-focused."
              : postNumber === 7
                ? "Ask a thought-provoking question. Spark conversation and engagement."
                : postNumber === 8
                  ? "Share your values or mission. Connect on a deeper level."
                  : "Strong call-to-action. Invite them to take the next step with you."
}

${researchData && researchData.trending_hashtags ? `\n## Hashtag Strategy:\nSelect 5-10 hashtags from the trending list that are most relevant to THIS specific post's topic. Mix high-volume and niche-specific tags.\n` : ""}

Generate the caption now. Make it COMPLETELY different from the previous ${captionResults.length} captions.`,
        temperature: 0.9, // High temperature for more creativity and uniqueness
      })

      captionResults.push({
        postId: post.id,
        caption: result.object.caption,
        hashtags: result.object.hashtags,
      })

      await sql`
        UPDATE feed_posts
        SET 
          caption = ${result.object.caption},
          updated_at = NOW()
        WHERE id = ${post.id}
      `

      console.log(`[v0] Instagram Strategist: ✓ Caption ${postNumber}/9 generated and saved`)
    }

    console.log("[v0] Instagram Strategist: All captions generated successfully!")

    return Response.json({
      success: true,
      captions: captionResults,
    })
  } catch (error) {
    console.error("[v0] Instagram Strategist: Error generating captions:", error)
    return Response.json(
      {
        error: "Failed to generate captions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

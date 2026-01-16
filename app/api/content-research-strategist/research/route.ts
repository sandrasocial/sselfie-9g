import { streamText } from "ai"
import { neon } from "@neondatabase/serverless"
import { getUserByAuthId } from "@/lib/user-mapping"
import { CONTENT_RESEARCH_STRATEGIST_PROMPT } from "@/lib/content-research-strategist/personality"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { hasFullAccess } from "@/lib/subscription"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return new Response("Unauthorized", { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user?.id) {
      return new Response("Unauthorized", { status: 401 })
    }

    const featureEnabled = process.env.ENABLE_STRATEGIST_AI === "true"
    if (!featureEnabled) {
      const hasAccess = await hasFullAccess(user.id)
      if (!hasAccess) {
        return new Response("Endpoint disabled", { status: 410 })
      }
    }

    const { niche, brandProfile } = await request.json()
    const researchPrompt = `Research the Instagram landscape for this niche: ${niche}

Brand Profile Context:
${JSON.stringify(brandProfile, null, 2)}

Please conduct comprehensive research and provide:

1. **Top Creators Analysis** (Find 5-10 top creators in this niche)
   - Who are they?
   - What makes their content successful?
   - What's their unique angle?

2. **Best-Performing Hooks** (Identify 10-15 proven hooks)
   - Analyze viral captions and opening lines
   - What patterns make people stop scrolling?
   - Categorize by emotion/purpose (curiosity, controversy, value, story)

3. **Trending Hashtags** (Find 20-30 relevant hashtags)
   - Mix of high-volume and niche-specific
   - Currently trending in this space
   - Engagement potential

4. **Trending Audio & Formats**
   - Popular audio tracks in this niche
   - Content format trends (reels, carousels, single posts)
   - When to use each format

5. **Competitive Insights**
   - What's oversaturated in this niche?
   - What gaps exist?
   - How can this user stand out?

6. **Actionable Strategy**
   - Content mix recommendations
   - Posting frequency and timing
   - Growth tactics specific to this niche

Provide specific, actionable insights backed by current data.`

    // Stream research with web search enabled
    const result = streamText({
      model: "anthropic/claude-sonnet-4",
      prompt: researchPrompt,
      system: CONTENT_RESEARCH_STRATEGIST_PROMPT,
      experimental_toolCallStreaming: true,
      onFinish: async ({ text }) => {
        console.log("[v0] Content Research Strategist: Research complete, saving to database")

        // Parse the research results (simplified - in production, use structured output)
        const researchData = {
          top_creators: [],
          best_hooks: [],
          trending_hashtags: [],
          trending_audio: [],
          content_formats: {},
          competitive_insights: text,
          research_summary: text.substring(0, 500),
        }

        // Save research to database
        await sql`
          INSERT INTO content_research (
            user_id,
            niche,
            top_creators,
            best_hooks,
            trending_hashtags,
            trending_audio,
            content_formats,
            competitive_insights,
            research_summary
          ) VALUES (
            ${user.id},
            ${niche},
            ${JSON.stringify(researchData.top_creators)},
            ${JSON.stringify(researchData.best_hooks)},
            ${JSON.stringify(researchData.trending_hashtags)},
            ${JSON.stringify(researchData.trending_audio)},
            ${JSON.stringify(researchData.content_formats)},
            ${researchData.competitive_insights},
            ${researchData.research_summary}
          )
          ON CONFLICT (user_id, niche) 
          DO UPDATE SET
            top_creators = EXCLUDED.top_creators,
            best_hooks = EXCLUDED.best_hooks,
            trending_hashtags = EXCLUDED.trending_hashtags,
            trending_audio = EXCLUDED.trending_audio,
            content_formats = EXCLUDED.content_formats,
            competitive_insights = EXCLUDED.competitive_insights,
            research_summary = EXCLUDED.research_summary,
            updated_at = NOW()
        `

        console.log("[v0] Content Research Strategist: Research saved to database")
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[v0] Content Research Strategist error:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}

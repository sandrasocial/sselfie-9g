import { generateText } from "ai"
import { neon } from "@neondatabase/serverless"
import { CONTENT_RESEARCH_STRATEGIST_PROMPT } from "./personality"

const sql = neon(process.env.DATABASE_URL!)

export interface ResearchResult {
  topCreators: string[]
  bestHooks: string[]
  trendingHashtags: string[]
  trendingAudio: string[]
  contentFormats: Record<string, any>
  competitiveInsights: string
  researchSummary: string
}

export async function conductContentResearch(params: {
  userId: string
  niche: string
  brandProfile: any
}): Promise<ResearchResult> {
  const { userId, niche, brandProfile } = params

  console.log("[v0] Content Research: Starting research for niche:", niche)

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

  const { text } = await generateText({
    model: "anthropic/claude-sonnet-4",
    prompt: researchPrompt,
    system: CONTENT_RESEARCH_STRATEGIST_PROMPT,
  })

  console.log("[v0] Content Research: Research complete, parsing results...")

  // Parse research results (simplified - in production, use structured output)
  const researchData: ResearchResult = {
    topCreators: [],
    bestHooks: extractHooks(text),
    trendingHashtags: extractHashtags(text),
    trendingAudio: [],
    contentFormats: {},
    competitiveInsights: text,
    researchSummary: text.substring(0, 500),
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
      ${userId},
      ${niche},
      ${JSON.stringify(researchData.topCreators)},
      ${JSON.stringify(researchData.bestHooks)},
      ${JSON.stringify(researchData.trendingHashtags)},
      ${JSON.stringify(researchData.trendingAudio)},
      ${JSON.stringify(researchData.contentFormats)},
      ${researchData.competitiveInsights},
      ${researchData.researchSummary}
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

  console.log("[v0] Content Research: Research saved to database")

  return researchData
}

function extractHooks(text: string): string[] {
  // Simple extraction - look for numbered lists or bullet points
  const hooks: string[] = []
  const lines = text.split("\n")

  for (const line of lines) {
    // Match patterns like "1. Hook text" or "- Hook text" or "• Hook text"
    const match = line.match(/^[\d\-•]\s*\.?\s*(.+)/)
    if (match && match[1].length > 10 && match[1].length < 200) {
      hooks.push(match[1].trim())
    }
  }

  return hooks.slice(0, 15) // Return top 15 hooks
}

function extractHashtags(text: string): string[] {
  // Extract hashtags from text
  const hashtagMatches = text.match(/#\w+/g) || []
  const hashtags = hashtagMatches.map((tag) => tag.substring(1)) // Remove # symbol

  // Also look for hashtag lists
  const lines = text.split("\n")
  for (const line of lines) {
    if (line.toLowerCase().includes("hashtag")) {
      const words = line.split(/[\s,]+/)
      for (const word of words) {
        if (word.startsWith("#")) {
          hashtags.push(word.substring(1))
        } else if (word.match(/^[a-zA-Z0-9_]+$/) && word.length > 3) {
          hashtags.push(word)
        }
      }
    }
  }

  // Remove duplicates and return top 30
  return [...new Set(hashtags)].slice(0, 30)
}

import { generateText } from "ai"
import { neon } from "@neondatabase/serverless"
import { CONTENT_RESEARCH_STRATEGIST_PROMPT } from "./personality"

const sql = neon(process.env.DATABASE_URL || "")

export interface ResearchResult {
  topCreators: string[]
  bestHooks: string[]
  trendingHashtags: string[]
  trendingAudio: string[]
  contentFormats: Record<string, any>
  competitiveInsights: string
  researchSummary: string
}

async function searchWeb(query: string): Promise<string> {
  try {
    console.log("[v0] Content Research: Searching web for:", query)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout per search

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY || "",
        },
        signal: controller.signal,
      },
    )

    clearTimeout(timeoutId)

    console.log("[v0] Content Research: Brave Search API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] [SERVER] Brave Search API error:", response.status, errorText)
      throw new Error(`Brave Search API error: ${response.status}`)
    }

    const searchData = await response.json()
    const results = searchData.web?.results || []

    const summary = results
      .slice(0, 5)
      .map((result: any, index: number) => {
        return `${index + 1}. **${result.title}**\n${result.description}\n`
      })
      .join("\n")

    console.log("[v0] Content Research: Web search complete, found", results.length, "results")

    if (!summary) {
      throw new Error("No search results found")
    }

    return summary
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[v0] Content Research: Web search timeout after 60 seconds")
      throw new Error("Search timeout - please try again")
    }
    console.error("[v0] Content Research: Web search error:", error)
    throw error
  }
}

export async function conductContentResearch(params: {
  userId: string
  niche: string
  brandProfile: any
}): Promise<ResearchResult> {
  const { userId, niche, brandProfile } = params

  console.log("[v0] Content Research: Starting research for niche:", niche)
  console.log("[v0] Content Research: Brave API key present:", !!process.env.BRAVE_SEARCH_API_KEY)

  const searches = [
    `Instagram ${niche} content strategy 2025`,
    `best Instagram hooks for ${niche}`,
    `trending Instagram hashtags ${niche}`,
    `${niche} Instagram growth tactics`,
  ]

  console.log("[v0] Content Research: Performing", searches.length, "web searches...")

  const searchResults = await Promise.all(searches.map((query) => searchWeb(query)))

  console.log("[v0] Content Research: All web searches complete")

  const researchPrompt = `Analyze this web research data and provide strategic Instagram insights for the ${niche} niche:

Brand Profile Context:
${brandProfile ? JSON.stringify(brandProfile, null, 2) : "No brand profile available"}

Web Research Results:

**Content Strategy Research:**
${searchResults[0]}

**Hook Patterns Research:**
${searchResults[1]}

**Hashtag Research:**
${searchResults[2]}

**Growth Tactics Research:**
${searchResults[3]}

Based on this REAL web research data, provide:

1. **Content Strategy** for ${niche}
   - What types of content perform well (based on research)
   - Unique angles to stand out
   - Content mix recommendations

2. **Proven Hook Patterns** (10-15 examples from research)
   - Opening lines that stop scrolling
   - Categorize by emotion (curiosity, value, story)
   - Specific to ${niche}

3. **Hashtag Strategy** (20-30 hashtags from research)
   - Mix of broad and niche-specific
   - Categorized by reach potential
   - Relevant to ${niche}

4. **Competitive Positioning**
   - Common approaches in this niche (from research)
   - Opportunities to differentiate
   - Growth tactics

5. **Actionable Recommendations**
   - Posting strategy
   - Content pillars
   - Engagement tactics

Provide specific, actionable insights based on the web research data.`

  try {
    console.log("[v0] Content Research: Generating AI analysis of web research...")

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Research analysis timeout after 3 minutes")), 180000)
    })

    const researchPromise = generateText({
      model: "anthropic/claude-sonnet-4",
      prompt: researchPrompt,
      system: CONTENT_RESEARCH_STRATEGIST_PROMPT,
    })

    const { text } = await Promise.race([researchPromise, timeoutPromise])

    console.log("[v0] Content Research: AI analysis complete, parsing results...")

    const researchData: ResearchResult = {
      topCreators: [],
      bestHooks: extractHooks(text),
      trendingHashtags: extractHashtags(text),
      trendingAudio: [],
      contentFormats: {},
      competitiveInsights: text,
      researchSummary: text.substring(0, 500),
    }

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
  } catch (error) {
    console.error("[v0] Content Research: Error during AI analysis:", error)
    throw error
  }
}

function extractHooks(text: string): string[] {
  const hooks: string[] = []
  const lines = text.split("\n")

  for (const line of lines) {
    const match = line.match(/^[\d\-•]\s*\.?\s*(.+)/)
    if (match && match[1].length > 10 && match[1].length < 200) {
      hooks.push(match[1].trim())
    }
  }

  return hooks.slice(0, 15)
}

function extractHashtags(text: string): string[] {
  const hashtagMatches = text.match(/#\w+/g) || []
  const hashtags = hashtagMatches.map((tag) => tag.substring(1))

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

  return [...new Set(hashtags)].slice(0, 30)
}

export async function performContentResearch(params: {
  userId: string
  niche: string
  brandProfile?: any
}): Promise<{ success: boolean; research?: any; error?: string }> {
  console.log("[v0] [SERVER] performContentResearch called with:", { userId: params.userId, niche: params.niche })

  try {
    console.log("[v0] [SERVER] Starting conductContentResearch...")
    const research = await conductContentResearch({
      userId: params.userId,
      niche: params.niche,
      brandProfile: params.brandProfile || {},
    })

    console.log("[v0] [SERVER] conductContentResearch completed successfully")
    return {
      success: true,
      research,
    }
  } catch (error) {
    console.error("[v0] [SERVER] performContentResearch error:", error)
    if (error instanceof Error) {
      console.error("[v0] [SERVER] Error name:", error.name)
      console.error("[v0] [SERVER] Error message:", error.message)
      console.error("[v0] [SERVER] Error stack:", error.stack)
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

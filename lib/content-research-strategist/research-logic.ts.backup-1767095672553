import { generateText } from "ai"
import { CONTENT_RESEARCH_STRATEGIST_PROMPT } from "./personality"
import type { ContentResearchParams, ResearchResult } from "./types"

export async function conductContentResearch(params: ContentResearchParams): Promise<ResearchResult> {
  const { niche, brandProfile } = params

  console.log("[v0] Content Research: Starting research for", niche)

  const prompt = `Please search the web for current Instagram trends and then provide research insights.

**Research Focus:**
Niche: ${niche}
Business Type: ${brandProfile.business_type}
Target Audience: ${brandProfile.target_audience}

**Tasks:**
1. Search for trending ${niche} content on Instagram in 2025
2. Find viral post formats and storytelling techniques
3. Discover trending hashtags in this niche (find at least 30)
4. Research what the target audience engages with most
5. Find Instagram algorithm best practices

Provide:
- **Trend Summary:** What's working right now in this niche
- **Content Ideas:** Specific post concepts that resonate
- **Hashtag Strategy:** List 30 relevant trending hashtags (include the # symbol)
- **Best Practices:** Proven tactics for engagement
- **Competitor Insights:** What top creators are doing

Keep it practical and actionable. Focus on what will actually help create better content.`

  const { text } = await generateText({
    model: "anthropic/claude-sonnet-4.5",
    system: CONTENT_RESEARCH_STRATEGIST_PROMPT,
    prompt,
    temperature: 0.7,
  })

  console.log("[v0] Content Research: Analysis complete")

  const result = parseResearchResults(text, niche)

  return result
}

function parseResearchResults(text: string, niche: string): ResearchResult {
  const hashtagMatches = text.match(/#[\w]+/g) || []
  const uniqueHashtags = [...new Set(hashtagMatches)].slice(0, 30)

  const trendingHashtags =
    uniqueHashtags.length > 0
      ? uniqueHashtags
      : [
          `#${niche.toLowerCase().replace(/\s+/g, "")}`,
          "#instagramgrowth",
          "#contentcreator",
          "#socialmedia",
          "#branding",
          "#digitalmarketing",
          "#socialmediamarketing",
          "#instagramtips",
          "#contentmarketing",
          "#marketingstrategy",
        ]

  return {
    trendingTopics: extractTopics(text),
    audienceInsights: extractAudienceInsights(text),
    competitorAnalysis: extractCompetitorInsights(text),
    trendingHashtags,
    contentOpportunities: extractContentIdeas(text),
    researchSummary: text.substring(0, 1000),
  }
}

function extractTopics(text: string): string[] {
  // Implementation for extracting topics
  return []
}

function extractAudienceInsights(text: string): string {
  // Implementation for extracting audience insights
  return ""
}

function extractCompetitorInsights(text: string): string {
  // Implementation for extracting competitor insights
  return ""
}

function extractContentIdeas(text: string): string[] {
  // Implementation for extracting content ideas
  return []
}

/**
 * Research Content Strategy Tool
 * Researches content strategy, trending topics, hashtags, and competitive analysis
 */

import type { Tool, ToolResult } from '../../types'

interface ResearchContentStrategyInput {
  niche: string
  focus?: 'trends' | 'hashtags' | 'competitors' | 'content_ideas' | 'all'
}

export const researchContentStrategyTool: Tool<ResearchContentStrategyInput> = {
  name: "research_content_strategy",
  description: `Research content strategy, trending topics, hashtags, and competitive analysis for Instagram/social media. Use this when Sandra asks about content ideas, what's trending, competitor analysis, or hashtag research.`,

  input_schema: {
    type: "object",
    properties: {
      niche: {
        type: "string",
        description: "The niche or industry to research (e.g., 'fitness coaching', 'business coaching', 'photography')"
      },
      focus: {
        type: "string",
        enum: ['trends', 'hashtags', 'competitors', 'content_ideas', 'all'],
        description: "What to focus the research on"
      }
    },
    required: ["niche"]
  },

  async execute({ niche, focus = 'all' }: ResearchContentStrategyInput): Promise<ToolResult> {
    try {
      // Build focus areas based on focus parameter
      const focusAreas: string[] = []
      if (focus === 'trends' || focus === 'all') {
        focusAreas.push('- Current trending content formats and styles')
      }
      if (focus === 'hashtags' || focus === 'all') {
        focusAreas.push('- Trending hashtags (find at least 30 relevant hashtags)')
      }
      if (focus === 'competitors' || focus === 'all') {
        focusAreas.push('- Top creators in this niche and what they\'re doing')
      }
      if (focus === 'content_ideas' || focus === 'all') {
        focusAreas.push('- Specific content ideas that resonate with this audience')
      }

      const researchPrompt = `Research Instagram content strategy for ${niche} niche in 2025.

Focus on:
${focusAreas.join('\n')}

Provide actionable insights about:
- What content formats are performing best (reels, carousels, single posts)
- Trending topics and themes
- Hashtag strategy (include at least 30 relevant hashtags with #)
- Content opportunities and gaps
- Best practices for engagement

Keep it practical and data-driven.`

      return {
        success: true,
        researchPrompt,
        note: "Use web_search tool with this research prompt to get current data, then analyze the results to provide strategic recommendations.",
        data: {
          researchPrompt,
          niche,
          focus
        }
      }
    } catch (error: any) {
      console.error('[Alex] ❌ Error researching content strategy:', error)
      return {
        success: false,
        error: `Failed to research: ${error.message}`
      }
    }
  }
}


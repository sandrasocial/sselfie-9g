/**
 * Web Search Tool
 * Searches the web for current information, trends, and competitor analysis
 */

import type { Tool, ToolResult } from '../../types'

interface WebSearchInput {
  query: string
}

export const webSearchTool: Tool<WebSearchInput> = {
  name: "web_search",
  description: `Search the web for current information, trends, competitor analysis, and research.

Use this to:
- Research trending topics in personal branding, AI, or entrepreneurship
- Check competitor strategies and content
- Find real-time data and statistics
- Verify current information beyond your knowledge cutoff
- Get inspiration for content ideas

Examples:
- "What's trending in personal branding?"
- "Research competitor Instagram strategies"
- "Find statistics about AI adoption"
- "What are popular AI tools for entrepreneurs?"

Always use this when Sandra asks about:
- Current trends
- Competitor analysis
- Real-time data
- Content inspiration
- Market research`,

  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query (1-6 words for best results, be specific and concise)"
      }
    },
    required: ["query"]
  },

  async execute({ query }: WebSearchInput): Promise<ToolResult> {
    try {
      // Use Brave Search API if available
      if (process.env.BRAVE_SEARCH_API_KEY) {
        const response = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "Accept-Encoding": "gzip",
              "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY,
            },
          }
        )
        
        if (response.ok) {
          const searchData = await response.json()
          const results = searchData.web?.results || []
          const summary = results
            .slice(0, 5)
            .map((result: any, index: number) => {
              return `${index + 1}. **${result.title}**\n${result.description}\nURL: ${result.url}\n`
            })
            .join("\n")
          
          return {
            success: true,
            query: query,
            results: summary || "No specific results found, but I can help based on my knowledge.",
            resultCount: results.length
          }
        }
      }
      
      // Fallback if Brave Search not available
      return {
        success: false,
        query: query,
        note: "Web search API not configured. Claude's native web search is available when using the gateway model via streamText.",
        suggestion: "For real-time web search, the gateway model should be used instead of direct Anthropic SDK."
      }
    } catch (error: any) {
      return {
        success: false,
        query: query,
        error: error.message || "Web search failed",
        note: "Unable to perform web search at this time."
      }
    }
  }
}


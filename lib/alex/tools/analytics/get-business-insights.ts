/**
 * Get Business Insights Tool
 * Gets business insights, content patterns, and strategic recommendations from admin memory system
 */

import type { Tool, ToolResult } from '../../types'
import { sql } from '../../shared/dependencies'

interface GetBusinessInsightsInput {
  type?: 'all' | 'business_insight' | 'content_pattern' | 'user_behavior' | 'strategy'
  category?: string
}

export const getBusinessInsightsTool: Tool<GetBusinessInsightsInput> = {
  name: "get_business_insights",
  description: `Get business insights, content patterns, and strategic recommendations from admin memory system. Use this when Sandra asks about what's working, what patterns to follow, or strategic advice.`,

  input_schema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ['all', 'business_insight', 'content_pattern', 'user_behavior', 'strategy'],
        description: "Type of insights to retrieve"
      },
      category: {
        type: "string",
        description: "Filter by category (email, instagram, competitor, general)"
      }
    },
    required: []
  },

  async execute({ type = 'all', category }: GetBusinessInsightsInput): Promise<ToolResult> {
    try {
      // Get admin memory insights
      const memory = await sql`
        SELECT * FROM admin_memory
        WHERE is_active = true
          AND (${type} = 'all' OR memory_type = ${type})
          AND (${category || ''} = '' OR category = ${category || ''})
        ORDER BY confidence_score DESC, updated_at DESC
        LIMIT 20
      `

      // Get business insights
      const insights = await sql`
        SELECT * FROM admin_business_insights
        WHERE status IN ('new', 'reviewing')
        ORDER BY 
          CASE priority
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            ELSE 4
          END,
          created_at DESC
        LIMIT 10
      `

      // Get recent content performance
      const performance = await sql`
        SELECT * FROM admin_content_performance
        ORDER BY success_score DESC, analyzed_at DESC
        LIMIT 15
      `

      return {
        success: true,
        memory: memory || [],
        insights: insights || [],
        performance: performance || [],
        data: {
          memory: memory || [],
          insights: insights || [],
          performance: performance || []
        }
      }
    } catch (error: any) {
      console.error('[Alex] ❌ Error fetching business insights:', error)
      return {
        success: false,
        error: `Failed to fetch insights: ${error.message}`
      }
    }
  }
}


/**
 * Get Content Performance Tool
 * Gets content performance data - what content types perform best, engagement rates, and success patterns
 */

import type { Tool, ToolResult } from '../../types'
import { sql } from '../../shared/dependencies'

interface GetContentPerformanceInput {
  userId?: string
  contentType?: string
}

export const getContentPerformanceTool: Tool<GetContentPerformanceInput> = {
  name: "get_content_performance",
  description: `Get content performance data - what content types perform best, engagement rates, and success patterns. Use this when Sandra asks about what content works, engagement rates, or content strategy.`,

  input_schema: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "User ID to get performance for specific user, or omit for platform-wide"
      },
      contentType: {
        type: "string",
        description: "Filter by content type (email, instagram, etc.)"
      }
    },
    required: []
  },

  async execute({ userId, contentType = 'all' }: GetContentPerformanceInput): Promise<ToolResult> {
    try {
      if (userId) {
        // User-specific performance
        const performanceHistory = await sql`
          SELECT * FROM content_performance_history
          WHERE user_id = ${parseInt(userId)}
            AND (${contentType} = 'all' OR content_type = ${contentType})
          ORDER BY success_score DESC, analyzed_at DESC
          LIMIT 20
        `

        const topPerforming = await sql`
          SELECT 
            content_type,
            content_title,
            success_score,
            engagement_rate,
            what_worked,
            analyzed_at
          FROM content_performance_history
          WHERE user_id = ${parseInt(userId)}
            AND success_score > 70
          ORDER BY success_score DESC
          LIMIT 10
        `

        return {
          success: true,
          performanceHistory: performanceHistory || [],
          topPerforming: topPerforming || [],
          data: {
            performanceHistory: performanceHistory || [],
            topPerforming: topPerforming || []
          }
        }
      } else {
        // Platform-wide content performance
        const topContentPatterns = await sql`
          SELECT content_type, content_category, AVG(success_score) as avg_score, COUNT(*) as count
          FROM admin_content_performance
          WHERE success_score > 70
          GROUP BY content_type, content_category
          ORDER BY avg_score DESC
          LIMIT 10
        `

        const recentPerformance = await sql`
          SELECT * FROM admin_content_performance
          ORDER BY success_score DESC, analyzed_at DESC
          LIMIT 20
        `

        return {
          success: true,
          topContentPatterns: topContentPatterns || [],
          recentPerformance: recentPerformance || [],
          data: {
            topContentPatterns: topContentPatterns || [],
            recentPerformance: recentPerformance || []
          }
        }
      }
    } catch (error: any) {
      console.error('[Alex] ❌ Error fetching content performance:', error)
      return {
        success: false,
        error: `Failed to fetch performance: ${error.message}`
      }
    }
  }
}


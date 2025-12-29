/**
 * Get Email Recommendations Tool
 * Gets proactive email marketing recommendations based on current state
 */

import type { Tool, ToolResult } from '../../types'

interface GetEmailRecommendationsInput {
  includeReengagement?: boolean
}

export const getEmailRecommendationsTool: Tool<GetEmailRecommendationsInput> = {
  name: "get_email_recommendations",
  description: `Get proactive email marketing recommendations based on current state. Use this when Sandra asks about what emails to send, engagement opportunities, or email strategy suggestions.`,

  input_schema: {
    type: "object",
    properties: {
      includeReengagement: {
        type: "boolean",
        description: "Include re-engagement campaign recommendations"
      }
    },
    required: []
  },

  async execute({ includeReengagement = true }: GetEmailRecommendationsInput): Promise<ToolResult> {
    try {
      const { getEmailRecommendations } = await import('@/lib/admin/email-intelligence')
      const recommendations = await getEmailRecommendations()

      return {
        success: true,
        recommendations: recommendations || [],
        data: {
          recommendations: recommendations || []
        }
      }
    } catch (error: any) {
      console.error('[Alex] ❌ Error getting email recommendations:', error)
      return {
        success: false,
        error: `Failed to get recommendations: ${error.message}`
      }
    }
  }
}


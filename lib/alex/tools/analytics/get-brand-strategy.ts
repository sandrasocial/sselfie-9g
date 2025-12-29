/**
 * Get Brand Strategy Tool
 * Gets brand strategy recommendations for positioning, content pillars, audience development, and Instagram growth
 */

import type { Tool, ToolResult } from '../../types'
import { sql, ALEX_CONSTANTS } from '../../shared/dependencies'

interface GetBrandStrategyInput {
  focus?: 'positioning' | 'content_pillars' | 'audience' | 'growth' | 'all'
}

export const getBrandStrategyTool: Tool<GetBrandStrategyInput> = {
  name: "get_brand_strategy",
  description: `Get brand strategy recommendations for positioning, content pillars, audience development, and Instagram growth. Use this when Sandra asks about brand positioning, content strategy, audience growth, or how to stand out.`,

  input_schema: {
    type: "object",
    properties: {
      focus: {
        type: "string",
        enum: ['positioning', 'content_pillars', 'audience', 'growth', 'all'],
        description: "What aspect of brand strategy to focus on"
      }
    },
    required: []
  },

  async execute({ focus = 'all' }: GetBrandStrategyInput): Promise<ToolResult> {
    try {
      // Get brand data from database
      const brandData = await sql`
        SELECT 
          business_type,
          brand_voice,
          target_audience,
          content_pillars,
          origin_story,
          brand_vibe
        FROM user_personal_brand
        WHERE user_id = (SELECT id FROM users WHERE email = ${ALEX_CONSTANTS.ADMIN_EMAIL} LIMIT 1)
        LIMIT 1
      `

      const brand = brandData[0] || {}

      // Return strategic recommendations based on brand data
      const strategyAreas = []
      if (focus === 'positioning' || focus === 'all') {
        strategyAreas.push({
          area: 'positioning',
          recommendations: [
            'Define unique value proposition that differentiates from competitors',
            'Identify brand differentiators and core strengths',
            'Create compelling brand narrative and origin story',
            'Position for sustainable, authentic growth'
          ]
        })
      }

      if (focus === 'content_pillars' || focus === 'all') {
        strategyAreas.push({
          area: 'content_pillars',
          recommendations: [
            'Develop content pillars that showcase expertise naturally',
            'Balance educational, inspirational, and promotional content',
            'Create content calendar that builds authority over time',
            'Identify trending topics in your niche'
          ]
        })
      }

      if (focus === 'audience' || focus === 'all') {
        strategyAreas.push({
          area: 'audience',
          recommendations: [
            'Understand audience pain points and desires',
            'Create content that resonates with specific demographics',
            'Build authentic connections and community',
            'Convert followers into clients/customers'
          ]
        })
      }

      if (focus === 'growth' || focus === 'all') {
        strategyAreas.push({
          area: 'growth',
          recommendations: [
            'Optimize Instagram profile for conversions',
            'Use current algorithm insights for maximum reach',
            'Engage authentically to build genuine community',
            'Leverage Stories and Reels for discoverability'
          ]
        })
      }

      return {
        success: true,
        brandData: brand,
        strategyAreas,
        note: "Use web_search to get current Instagram algorithm insights and best practices, then provide specific recommendations based on this brand profile.",
        data: {
          brand,
          strategyAreas
        }
      }
    } catch (error: any) {
      console.error('[Alex] ❌ Error getting brand strategy:', error)
      return {
        success: false,
        error: `Failed to get strategy: ${error.message}`
      }
    }
  }
}


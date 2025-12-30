/**
 * Get Email Campaign Tool
 * Fetches email campaign HTML and metadata by campaign ID
 */

import type { Tool, ToolResult } from '../../types'
import { sql } from '../../shared/dependencies'

interface GetEmailCampaignInput {
  campaignId: number
}

export const getEmailCampaignTool: Tool<GetEmailCampaignInput> = {
  name: "get_email_campaign",
  description: `Fetch email campaign HTML and metadata by campaign ID. Use this when Sandra wants to edit an existing email - get the current HTML first, then use edit_email with previousEmailHtml and campaignId parameters.`,

  input_schema: {
    type: "object",
    properties: {
      campaignId: {
        type: "number",
        description: "Campaign ID from database"
      }
    },
    required: ["campaignId"]
  },

  async execute({ campaignId }: GetEmailCampaignInput): Promise<ToolResult> {
    try {
      console.log('[Alex] 📧 Fetching email campaign:', campaignId)

      const campaigns = await sql`
        SELECT 
          id, campaign_name, campaign_type, subject_line,
          body_html, body_text, status, target_audience,
          created_at, scheduled_for, resend_broadcast_id
        FROM admin_email_campaigns
        WHERE id = ${campaignId}
        LIMIT 1
      `

      if (campaigns.length === 0) {
        return {
          success: false,
          error: `Campaign ${campaignId} not found`
        }
      }

      const campaign = campaigns[0]

      return {
        success: true,
        data: {
          id: campaign.id,
          campaignName: campaign.campaign_name,
          campaignType: campaign.campaign_type,
          subjectLine: campaign.subject_line,
          html: campaign.body_html,
          text: campaign.body_text,
          status: campaign.status,
          targetAudience: campaign.target_audience,
          createdAt: campaign.created_at,
          scheduledFor: campaign.scheduled_for,
          resendBroadcastId: campaign.resend_broadcast_id
        },
        html: campaign.body_html,
        subjectLine: campaign.subject_line,
        message: `Found campaign "${campaign.campaign_name}"`
      }
    } catch (error: any) {
      console.error('[Alex] ❌ Error fetching campaign:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch campaign'
      }
    }
  }
}


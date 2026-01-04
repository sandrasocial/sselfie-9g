/**
 * List Email Drafts Tool
 * Lists all email drafts and their status
 */

import type { Tool, ToolResult } from '../../types'
import { sql } from '../../shared/dependencies'

interface ListEmailDraftsInput {
  status?: 'draft' | 'sent_flodesk' | 'archived' | 'all'
  limit?: number
}

export const listEmailDraftsTool: Tool<ListEmailDraftsInput> = {
  name: "list_email_drafts",
  description: `List all email drafts and their status. Use this when Sandra wants to see what emails have been drafted, sent, or archived.
      
Examples:
- "Show me all draft emails" → list_email_drafts with status='draft'
- "What emails have I sent?" → list_email_drafts with status='sent_flodesk'
- "List all my emails" → list_email_drafts with status='all'

Returns emails with their subject, status, sent date, campaign name, and analytics.`,

  input_schema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["draft", "sent_flodesk", "archived", "all"],
        description: "Filter by status (default: all)"
      },
      limit: {
        type: "number",
        description: "Number of emails to return (default: 10, max: 50)"
      }
    },
    required: []
  },

  async execute({ status = "all", limit = 10 }: ListEmailDraftsInput): Promise<ToolResult> {
    try {
      const safeLimit = Math.min(Math.max(limit, 1), 50) // Clamp between 1 and 50
      console.log('[Alex] 📋 Listing email drafts:', { status, limit: safeLimit })

      let emails: any[]

      if (status === "all") {
        emails = await sql`
          SELECT 
            id,
            email_preview_data->>'subjectLine' as subject,
            email_preview_data->>'subject' as subject_alt,
            email_preview_data->>'status' as status,
            email_preview_data->>'sentDate' as sent_date,
            email_preview_data->>'flodeskCampaignName' as campaign_name,
            email_preview_data->'analytics' as analytics,
            created_at
          FROM admin_agent_messages
          WHERE email_preview_data IS NOT NULL
            AND (email_preview_data->>'subjectLine' IS NOT NULL OR email_preview_data->>'subject' IS NOT NULL)
          ORDER BY created_at DESC
          LIMIT ${safeLimit}
        `
      } else {
        emails = await sql`
          SELECT 
            id,
            email_preview_data->>'subjectLine' as subject,
            email_preview_data->>'subject' as subject_alt,
            email_preview_data->>'status' as status,
            email_preview_data->>'sentDate' as sent_date,
            email_preview_data->>'flodeskCampaignName' as campaign_name,
            email_preview_data->'analytics' as analytics,
            created_at
          FROM admin_agent_messages
          WHERE email_preview_data IS NOT NULL
            AND email_preview_data->>'status' = ${status}
            AND (email_preview_data->>'subjectLine' IS NOT NULL OR email_preview_data->>'subject' IS NOT NULL)
          ORDER BY created_at DESC
          LIMIT ${safeLimit}
        `
      }

      const formattedEmails = emails.map(e => ({
        subject: e.subject || e.subject_alt,
        status: e.status || 'draft',
        sentDate: e.sent_date,
        campaignName: e.campaign_name,
        analytics: e.analytics,
        createdAt: e.created_at
      }))

      console.log('[Alex] ✅ Found', formattedEmails.length, 'emails')

      return {
        success: true,
        count: formattedEmails.length,
        status: status,
        emails: formattedEmails,
        data: formattedEmails
      }
    } catch (error: any) {
      console.error('[Alex] ❌ Error listing email drafts:', error)
      return {
        success: false,
        error: error.message || 'Failed to list email drafts',
        emails: []
      }
    }
  }
}


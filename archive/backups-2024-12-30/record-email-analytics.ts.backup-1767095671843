/**
 * Record Email Analytics Tool (Legacy Flodesk Tracking)
 * Records analytics for emails sent via external platforms
 */

import type { Tool, ToolResult } from '../../types'
import { sql } from '../../shared/dependencies'

interface RecordEmailAnalyticsInput {
  emailSubject: string
  sent: number
  opened?: number
  clicked?: number
}

export const recordEmailAnalyticsTool: Tool<RecordEmailAnalyticsInput> = {
  name: "record_email_analytics",
  description: `Record analytics for an email sent via another platform (legacy Flodesk tracking). Use this when Sandra reports performance metrics from external email platforms.
      
Examples:
- "The beta customer email got 24 opens out of 50 sent" → record_email_analytics with sent=50, opened=24
- "The welcome email had 150 sent, 75 opens, 20 clicks" → record_email_analytics with all metrics

This updates the analytics in the email_preview_data.`,

  input_schema: {
    type: "object",
    properties: {
      emailSubject: {
        type: "string",
        description: "Subject line of the email"
      },
      sent: {
        type: "number",
        description: "Number of emails sent"
      },
      opened: {
        type: "number",
        description: "Number of opens (default: 0)"
      },
      clicked: {
        type: "number",
        description: "Number of clicks (default: 0)"
      }
    },
    required: ["emailSubject", "sent"]
  },

  async execute({
    emailSubject,
    sent,
    opened = 0,
    clicked = 0
  }: RecordEmailAnalyticsInput): Promise<ToolResult> {
    try {
      console.log('[Alex] 📊 Recording email analytics:', { emailSubject, sent, opened, clicked })
      
      // Calculate rates
      const openRate = sent > 0 ? parseFloat(((opened / sent) * 100).toFixed(1)) : 0
      const clickRate = sent > 0 ? parseFloat(((clicked / sent) * 100).toFixed(1)) : 0
      
      // Find email by subject
      const emails = await sql`
        SELECT id, email_preview_data
        FROM admin_agent_messages
        WHERE email_preview_data IS NOT NULL
          AND (email_preview_data->>'subject' = ${emailSubject} OR email_preview_data->>'subjectLine' = ${emailSubject})
        ORDER BY created_at DESC
        LIMIT 1
      `
      
      if (emails.length === 0) {
        return {
          success: false,
          error: `Email not found with subject: "${emailSubject}"`
        }
      }
      
      // Update analytics in email_preview_data
      const currentData = emails[0].email_preview_data as any
      const updatedData = {
        ...currentData,
        analytics: {
          sent,
          opened,
          clicked,
          openRate,
          clickRate,
          recordedAt: new Date().toISOString()
        }
      }
      
      await sql`
        UPDATE admin_agent_messages
        SET email_preview_data = ${JSON.stringify(updatedData)}::jsonb
        WHERE id = ${emails[0].id}
      `
      
      console.log('[Alex] ✅ Analytics recorded:', { emailSubject, openRate, clickRate })

      return {
        success: true,
        message: `Analytics recorded! 📈 Here's what's working for "${emailSubject}"!`,
        analytics: {
          sent,
          opened,
          clicked,
          openRate: `${openRate}%`,
          clickRate: `${clickRate}%`
        }
      }
    } catch (error: any) {
      console.error('[Alex] ❌ Error recording analytics:', error)
      return {
        success: false,
        error: error.message || 'Failed to record analytics'
      }
    }
  }
}


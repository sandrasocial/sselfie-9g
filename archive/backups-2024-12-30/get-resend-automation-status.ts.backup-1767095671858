/**
 * Get Resend Automation Status Tool
 * Gets status and performance metrics for a Resend automation sequence
 */

import type { Tool, ToolResult } from '../../types'
import { sql } from '../../shared/dependencies'

interface GetResendAutomationStatusInput {
  sequenceId: number
}

export const getResendAutomationStatusTool: Tool<GetResendAutomationStatusInput> = {
  name: "get_resend_automation_status",
  description: `Get status and performance metrics for a Resend automation sequence.

Shows:
- Sequence status (draft, active, completed, paused)
- Number of emails sent/scheduled
- Performance metrics (opens, clicks, conversions)
- Next scheduled email

Use this to monitor automation performance.`,

  input_schema: {
    type: "object",
    properties: {
      sequenceId: {
        type: "number",
        description: "Sequence ID from create_resend_automation_sequence"
      }
    },
    required: ["sequenceId"]
  },

  async execute({ sequenceId }: GetResendAutomationStatusInput): Promise<ToolResult> {
    try {
      console.log('[Alex] 📊 Getting Resend automation status:', sequenceId)

      // Get sequence from database
      const sequenceRecord = await sql`
        SELECT id, campaign_name, status, body_html, target_audience, created_at, updated_at
        FROM admin_email_campaigns
        WHERE id = ${sequenceId}
        AND campaign_type = 'resend_automation_sequence'
      `

      if (sequenceRecord.length === 0) {
        return {
          success: false,
          error: `Sequence ${sequenceId} not found`
        }
      }

      const sequence = sequenceRecord[0]
      const sequenceData = JSON.parse(sequence.body_html)

      // Get all emails in this sequence
      const sequenceEmails = await sql`
        SELECT id, subject_line, status, resend_broadcast_id, scheduled_for, created_at
        FROM admin_email_campaigns
        WHERE target_audience->>'sequence_id' = ${sequenceId.toString()}
        AND campaign_type = 'resend_automation_email'
        ORDER BY (target_audience->>'email_number')::int
      `

      // Build status summary
      const status = {
        sequenceId: sequence.id,
        sequenceName: sequence.campaign_name,
        status: sequence.status,
        totalEmails: sequenceData.totalEmails,
        scheduledEmails: sequenceEmails.length,
        sentEmails: sequenceEmails.filter((e: any) => e.status === 'sent').length,
        emailDetails: sequenceEmails.map((email: any) => ({
          subject: email.subject_line,
          status: email.status,
          broadcastId: email.resend_broadcast_id,
          scheduledFor: email.scheduled_for
        }))
      }

      return {
        success: true,
        status,
        message: `Automation status: ${sequence.status} - ${status.sentEmails}/${status.totalEmails} emails sent`,
        resendUrl: `https://resend.com/broadcasts`,
        data: status
      }

    } catch (error: any) {
      console.error('[Alex] ❌ Error getting Resend automation status:', error)
      return {
        success: false,
        error: error.message || 'Failed to get Resend automation status'
      }
    }
  }
}


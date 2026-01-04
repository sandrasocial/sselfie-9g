/**
 * Schedule Resend Automation Tool
 * Schedules or triggers a Resend automation sequence
 */

import type { Tool, ToolResult } from '../../types'
import { sql, resend, ALEX_CONSTANTS } from '../../shared/dependencies'

interface ScheduleResendAutomationInput {
  sequenceId: number
  startTime: string
  triggerEvent?: string
}

export const scheduleResendAutomationTool: Tool<ScheduleResendAutomationInput> = {
  name: "schedule_resend_automation",
  description: `Schedule or trigger a Resend automation sequence.

Use this to activate an automation sequence created with create_resend_automation_sequence.

OPTIONS:
- immediate: Starts sequence immediately, emails sent based on their delay settings
- scheduled: Schedules sequence to start at a specific time
- event_based: Sets up sequence to trigger on events (requires additional setup)

For immediate sequences, the first email is sent immediately (if delayDays=0), and subsequent emails are scheduled based on their delays.`,

  input_schema: {
    type: "object",
    properties: {
      sequenceId: {
        type: "number",
        description: "Sequence ID from create_resend_automation_sequence"
      },
      startTime: {
        type: "string",
        description: "When to start sequence: 'now' for immediate, or ISO timestamp for scheduled start"
      },
      triggerEvent: {
        type: "string",
        description: "Event name that triggers sequence (for event_based sequences, optional)"
      }
    },
    required: ["sequenceId", "startTime"]
  },

  async execute({ 
    sequenceId, 
    startTime,
    triggerEvent
  }: ScheduleResendAutomationInput): Promise<ToolResult> {
    try {
      console.log('[Alex] ⏰ Scheduling Resend automation:', { sequenceId, startTime, triggerEvent })

      if (!resend) {
        return {
          success: false,
          error: 'Resend client not initialized. RESEND_API_KEY not configured.'
        }
      }

      // Get sequence from database
      const sequenceRecord = await sql`
        SELECT id, campaign_name, body_html, target_audience
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
      const audience = sequence.target_audience as any
      const segmentId = audience?.resend_segment_id

      if (!segmentId) {
        return {
          success: false,
          error: 'Sequence missing segment ID'
        }
      }

      // Calculate start time
      const startDate = startTime === 'now' ? new Date() : new Date(startTime)
      if (isNaN(startDate.getTime())) {
        return {
          success: false,
          error: 'Invalid start time format. Use "now" or ISO timestamp.'
        }
      }

      // Create scheduled broadcasts for each email
      const broadcastIds: string[] = []
      let cumulativeDelay = 0

      for (const email of sequenceData.emails) {
        const emailSendTime = new Date(startDate)
        emailSendTime.setDate(emailSendTime.getDate() + cumulativeDelay + email.delayDays)
        cumulativeDelay += email.delayDays

        try {
          // Create broadcast
          const broadcast = await resend.broadcasts.create({
            segmentId: segmentId,
            from: 'Sandra from SSELFIE <hello@sselfie.ai>',
            subject: email.subject,
            html: email.html
          })

          if (broadcast.error || !broadcast.data?.id) {
            console.error('[Alex] ❌ Failed to create broadcast for email:', email.subject)
            continue
          }

          const broadcastId = broadcast.data.id

          // Schedule broadcast
          await resend.broadcasts.send(broadcastId, {
            scheduledAt: emailSendTime.toISOString()
          })

          broadcastIds.push(broadcastId)

          // Save each email as campaign record
          await sql`
            INSERT INTO admin_email_campaigns (
              campaign_name, campaign_type, subject_line,
              body_html, body_text, status, resend_broadcast_id,
              target_audience, scheduled_for, created_by, created_at
            ) VALUES (
              ${`${sequence.campaign_name} - Email ${email.number}`}, 'resend_automation_email', ${email.subject},
              ${email.html}, '', 'scheduled', ${broadcastId},
              ${JSON.stringify({ 
                resend_segment_id: segmentId,
                sequence_id: sequenceId,
                email_number: email.number
              })}::jsonb,
              ${emailSendTime.toISOString()},
              ${ALEX_CONSTANTS.ADMIN_EMAIL}, NOW()
            )
          `
        } catch (emailError: any) {
          console.error('[Alex] ❌ Error scheduling email:', emailError)
        }
      }

      // Update sequence status
      await sql`
        UPDATE admin_email_campaigns
        SET status = 'active', updated_at = NOW()
        WHERE id = ${sequenceId}
      `

      return {
        success: true,
        sequenceId,
        broadcastIds,
        scheduledEmails: broadcastIds.length,
        startTime: startDate.toISOString(),
        message: `Automation scheduled! 🚀 ${broadcastIds.length} emails will be sent starting ${startTime === 'now' ? 'immediately' : startDate.toISOString()}`,
        data: {
          sequenceId,
          broadcastIds,
          scheduledEmails: broadcastIds.length,
          startTime: startDate.toISOString()
        }
      }

    } catch (error: any) {
      console.error('[Alex] ❌ Error scheduling Resend automation:', error)
      return {
        success: false,
        error: error.message || 'Failed to schedule Resend automation'
      }
    }
  }
}


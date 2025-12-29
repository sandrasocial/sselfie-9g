/**
 * Send Broadcast to Segment Tool
 * Sends or schedules email broadcasts to Resend segments - PRIMARY tool for sending emails to audiences
 */

import type { Tool, ToolResult } from '../../types'
import { sql, resend, stripHtml, validateBroadcastParams, sendTestEmailToSandra, checkResendConfig, logEmailError } from '../../shared/dependencies'
import { ALEX_CONSTANTS } from '../../constants'

interface SendBroadcastToSegmentInput {
  segmentId: string
  segmentName?: string
  subjectLine: string
  emailHtml: string
  campaignName: string
  campaignType?: string
  scheduledAt?: string
  sendTestFirst?: boolean
}

export const sendBroadcastToSegmentTool: Tool<SendBroadcastToSegmentInput> = {
  name: "send_broadcast_to_segment",
  description: `Send or schedule an email broadcast to a Resend segment. This is the PRIMARY tool for sending emails to audiences.

CRITICAL: Only report success if the tool returns success: true. If it returns success: false or an error, report the failure clearly.

WORKFLOW:
1. First, call get_resend_audience_data to see available segments
2. Get Sandra's approval for: which segment, subject line, and timing
3. Call this tool to send or schedule the broadcast

This tool handles EVERYTHING in one call:
- Creates broadcast in Resend with correct segmentId
- Sends immediately OR schedules for later
- Saves campaign record to database
- Returns Resend dashboard link for tracking

USE THIS WHEN SANDRA SAYS:
- "Send this to paying customers"
- "Schedule this email for tomorrow at 9am"
- "Blast this to everyone who joined this month"
- "Send to [segment name] now"

SCHEDULING OPTIONS:
- Immediate: Leave scheduledAt empty or use "now"
- Natural language: "in 1 hour", "tomorrow at 9am EST", "Friday at 3pm"
- ISO format: "2025-01-15T14:00:00Z"
- Can schedule up to 30 days in advance

ALWAYS confirm with Sandra before sending:
1. Which segment (show segment names and sizes)
2. Subject line approval
3. Send now or schedule for when?

RESPONSE HANDLING:
- If success: true → Report success with broadcast ID and Resend dashboard link
- If success: false → Report the error message clearly. Do NOT make up fake broadcast IDs.
- If error field exists → The broadcast failed, report the error to Sandra`,

  input_schema: {
    type: "object",
    properties: {
      segmentId: {
        type: "string",
        description: "Resend segment ID from get_resend_audience_data. REQUIRED."
      },
      segmentName: {
        type: "string",
        description: "Human-readable segment name for logging (e.g., 'Paying Customers')"
      },
      subjectLine: {
        type: "string",
        description: "Email subject line"
      },
      emailHtml: {
        type: "string",
        description: "Complete email HTML content (must include unsubscribe link)"
      },
      campaignName: {
        type: "string",
        description: "Internal campaign name for tracking"
      },
      campaignType: {
        type: "string",
        description: "Type of campaign: newsletter, announcement, reengagement, etc."
      },
      scheduledAt: {
        type: "string",
        description: "When to send: leave empty for immediate, or use natural language like 'tomorrow at 9am' or ISO timestamp"
      },
      sendTestFirst: {
        type: "boolean",
        description: "If true, send test email to Sandra before sending to segment. Default: false."
      }
    },
    required: ["segmentId", "subjectLine", "emailHtml", "campaignName"]
  },

  async execute({ 
    segmentId, 
    segmentName, 
    subjectLine, 
    emailHtml, 
    campaignName, 
    campaignType = 'broadcast',
    scheduledAt, 
    sendTestFirst = false 
  }: SendBroadcastToSegmentInput): Promise<ToolResult> {
    console.log('[Alex] 🎯 send_broadcast_to_segment called:', {
      segmentId,
      segmentName,
      subject: subjectLine.substring(0, 50),
      scheduledAt: scheduledAt || 'immediate',
      sendTestFirst,
      nodeEnv: process.env.NODE_ENV
    })

    try {
      // STEP 1: Check if we're in development mode
      const isDevelopment = process.env.NODE_ENV === 'development'
      if (isDevelopment) {
        console.log('[Alex] ℹ️ Running in development mode - broadcasts are allowed')
      }

      // STEP 2: Check Resend configuration
      const config = checkResendConfig()
      if (!config.configured) {
        return {
          success: false,
          error: 'Resend not properly configured',
          missingEnvVars: config.missing,
          message: `Missing environment variables: ${config.missing.join(', ')}`
        }
      }

      if (!resend) {
        return {
          success: false,
          error: "Resend client not initialized. RESEND_API_KEY not configured."
        }
      }

      // STEP 3: Validate all inputs
      const validation = validateBroadcastParams({
        segmentId,
        subjectLine,
        emailHtml,
        campaignName
      })

      if (!validation.valid) {
        console.error('[Alex] ❌ Validation failed:', validation.errors)
        return {
          success: false,
          error: 'Validation failed',
          validationErrors: validation.errors,
          message: `Cannot send broadcast: ${validation.errors.join(', ')}`
        }
      }

      // Auto-add unsubscribe link if missing (after validation passes)
      let finalEmailHtml = emailHtml
      if (!emailHtml.includes('RESEND_UNSUBSCRIBE_URL') && !emailHtml.includes('{{{RESEND_UNSUBSCRIBE_URL}}}')) {
        console.warn('[Alex] ⚠️ Email missing unsubscribe link - adding it')
        finalEmailHtml += '\n\n<p style="text-align: center; font-size: 12px; color: #666;"><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a></p>'
      }

      // STEP 4: Send test email if requested
      if (sendTestFirst) {
        const testResult = await sendTestEmailToSandra(subjectLine, finalEmailHtml)
        if (!testResult.success) {
          return {
            success: false,
            error: 'Test email failed',
            details: testResult.error,
            message: 'Could not send test email. Fix issues before broadcasting.'
          }
        }
      }

      // STEP 5: Create broadcast in Resend
      console.log('[Alex] 📝 Creating broadcast in Resend...')
      let broadcast: any
      let broadcastId: string | null = null

      try {
        console.log('[Alex] 📝 Creating broadcast with segmentId:', segmentId)
        broadcast = await resend.broadcasts.create({
          segmentId: segmentId,
          from: 'Sandra from SSELFIE <hello@sselfie.ai>',
          subject: subjectLine,
          html: finalEmailHtml
        })

        if (broadcast.error) {
          console.error('[Alex] ❌ Broadcast creation failed:', broadcast.error)
          return {
            success: false,
            error: `Failed to create broadcast: ${broadcast.error.message || JSON.stringify(broadcast.error)}`,
            details: broadcast.error,
            step: 'broadcast_creation'
          }
        }

        broadcastId = broadcast.data?.id || null
        if (!broadcastId) {
          console.error('[Alex] ❌ No broadcast ID in response:', broadcast)
          return {
            success: false,
            error: 'Broadcast creation returned no ID. Resend API may have changed or the request was invalid.',
            details: broadcast,
            step: 'broadcast_creation'
          }
        }

        console.log('[Alex] ✅ Broadcast created:', broadcastId)
      } catch (createError: any) {
        console.error('[Alex] ❌ Exception creating broadcast:', createError)
        return {
          success: false,
          error: `Exception creating broadcast: ${createError.message || 'Unknown error'}`,
          details: createError.stack,
          step: 'broadcast_creation'
        }
      }

      // STEP 6: Send broadcast (immediate or scheduled)
      console.log('[Alex] 📤 Sending broadcast:', scheduledAt && scheduledAt !== 'now' ? `scheduled for ${scheduledAt}` : 'immediately')

      const sendParams = scheduledAt && scheduledAt !== 'now' 
        ? { scheduledAt: scheduledAt }
        : {}

      let sendResult: any
      try {
        sendResult = await resend.broadcasts.send(broadcastId, sendParams)

        if (sendResult.error) {
          console.error('[Alex] ❌ Broadcast send failed:', sendResult.error)
          return {
            success: false,
            error: `Broadcast created but failed to send: ${sendResult.error.message || JSON.stringify(sendResult.error)}`,
            broadcastId,
            resendUrl: `https://resend.com/broadcasts/${broadcastId}`,
            note: 'You can manually send this broadcast from the Resend dashboard using the URL above.',
            step: 'broadcast_send'
          }
        }

        console.log('[Alex] ✅ Broadcast send API call succeeded')
      } catch (sendError: any) {
        console.error('[Alex] ❌ Exception sending broadcast:', sendError)
        return {
          success: false,
          error: `Exception sending broadcast: ${sendError.message || 'Unknown error'}`,
          broadcastId,
          resendUrl: broadcastId ? `https://resend.com/broadcasts/${broadcastId}` : null,
          details: sendError.stack,
          note: broadcastId ? 'You can manually send this broadcast from the Resend dashboard.' : null,
          step: 'broadcast_send'
        }
      }

      // Verify send was actually successful
      if (!sendResult || (!sendResult.data && !sendResult.success)) {
        console.error('[Alex] ❌ Broadcast send returned unexpected response:', sendResult)
        return {
          success: false,
          error: 'Broadcast send returned unexpected response. The send may have failed.',
          broadcastId,
          resendUrl: `https://resend.com/broadcasts/${broadcastId}`,
          details: sendResult,
          step: 'broadcast_send_verification'
        }
      }

      console.log('[Alex] ✅ Broadcast sent successfully')

      // STEP 7: Save campaign to database
      const status = scheduledAt && scheduledAt !== 'now' ? 'scheduled' : 'sent'
      const scheduledForDb = scheduledAt && scheduledAt !== 'now' ? scheduledAt : null

      const bodyText = stripHtml(finalEmailHtml)

      const campaign = await sql`
        INSERT INTO admin_email_campaigns (
          campaign_name, campaign_type, subject_line,
          body_html, body_text, status, resend_broadcast_id,
          target_audience, scheduled_for,
          created_by, created_at, updated_at
        ) VALUES (
          ${campaignName}, ${campaignType}, ${subjectLine},
          ${finalEmailHtml}, ${bodyText}, ${status}, ${broadcastId},
          ${JSON.stringify({ 
            resend_segment_id: segmentId,
            segment_name: segmentName 
          })}::jsonb,
          ${scheduledForDb},
          ${ALEX_CONSTANTS.ADMIN_EMAIL}, NOW(), NOW()
        )
        RETURNING id
      `

      const campaignId = campaign[0]?.id

      console.log('[Alex] 💾 Campaign saved to database:', campaignId)

      // STEP 8: Validate final state before returning success
      if (!broadcastId) {
        console.error('[Alex] ❌ CRITICAL: Attempting to return success without broadcastId!')
        return {
          success: false,
          error: 'CRITICAL ERROR: Broadcast ID is missing. The broadcast was not created successfully.',
          step: 'final_validation'
        }
      }

      // STEP 9: Return success with all details
      console.log('[Alex] ✅ Returning success response:', {
        success: true,
        broadcastId,
        campaignId,
        status
      })

      return {
        success: true,
        campaignId,
        broadcastId,
        status,
        message: scheduledAt && scheduledAt !== 'now'
          ? `Campaign scheduled! 🚀 It'll go out at ${scheduledAt}!`
          : `Campaign sent! 📧 Your audience is going to love this!`,
        resendUrl: `https://resend.com/broadcasts/${broadcastId}`,
        details: {
          segmentId,
          segmentName,
          subject: subjectLine,
          campaignName,
          scheduledFor: scheduledForDb,
          testSent: sendTestFirst
        }
      }

    } catch (error: any) {
      console.error('[Alex] ❌ Unexpected error in send_broadcast_to_segment:', {
        error: error.message,
        stack: error.stack,
        name: error.name,
        segmentId,
        subjectLine: subjectLine?.substring(0, 50)
      })

      // Log error to database for debugging
      await logEmailError('send_broadcast_to_segment', error, {
        segmentId,
        segmentName,
        subjectLine,
        campaignName,
        scheduledAt,
        sendTestFirst
      })

      // Return explicit error
      return {
        success: false,
        error: `Unexpected error occurred: ${error.message || 'Unknown error'}. The broadcast was NOT sent.`,
        details: `Error type: ${error.name || 'Error'}. Check server logs for full details.`,
        step: 'unexpected_error',
        note: 'This error occurred during broadcast processing. No email was sent. Please try again or check Resend configuration.'
      }
    }
  }
}


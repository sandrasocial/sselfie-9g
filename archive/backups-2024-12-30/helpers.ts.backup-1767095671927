/**
 * Helper functions for Alex tools
 */

import { sql, resend, stripHtml } from './dependencies'
import { generateText } from 'ai'
import { ALEX_CONSTANTS } from '../constants'

/**
 * Validates email broadcast parameters before sending
 */
export function validateBroadcastParams(params: {
  segmentId?: string
  subjectLine?: string
  emailHtml?: string
  campaignName?: string
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate segment ID format (UUID format)
  if (!params.segmentId) {
    errors.push('Segment ID is required')
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.segmentId)) {
    errors.push('Segment ID must be a valid UUID format')
  }

  // Validate subject line
  if (!params.subjectLine || params.subjectLine.trim() === '') {
    errors.push('Subject line is required')
  } else if (params.subjectLine.length > 200) {
    errors.push('Subject line too long (max 200 characters)')
  }

  // Validate email HTML
  if (!params.emailHtml || params.emailHtml.trim() === '') {
    errors.push('Email HTML content is required')
  } else {
    // Note: We auto-add unsubscribe link, so we don't require it here
    // But we check for basic HTML structure
    if (!params.emailHtml.includes('<') || !params.emailHtml.includes('>')) {
      errors.push('Email content should be HTML format')
    }
  }

  // Validate campaign name
  if (!params.campaignName || params.campaignName.trim() === '') {
    errors.push('Campaign name is required')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Sends a test email to Sandra for approval
 */
export async function sendTestEmailToSandra(
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[Alex] 📧 Sending test email to Sandra...')

    if (!resend) {
      return {
        success: false,
        error: 'Resend client not initialized'
      }
    }

    const result = await resend.emails.send({
      from: 'Sandra from SSELFIE <hello@sselfie.ai>',
      to: ALEX_CONSTANTS.ADMIN_EMAIL,
      subject: `[TEST] ${subject}`,
      html: html,
      tags: [
        { name: 'type', value: 'test' },
        { name: 'environment', value: process.env.NODE_ENV || 'unknown' }
      ]
    })

    if (result.error) {
      console.error('[Alex] ❌ Test email failed:', result.error)
      return {
        success: false,
        error: result.error.message || 'Failed to send test email'
      }
    }

    console.log('[Alex] ✅ Test email sent:', result.data?.id)
    return { success: true }

  } catch (error: any) {
    console.error('[Alex] ❌ Test email exception:', error)
    return {
      success: false,
      error: error.message || 'Unknown error sending test email'
    }
  }
}

/**
 * Checks if Resend is properly configured
 */
export function checkResendConfig(): { configured: boolean; missing: string[] } {
  const missing: string[] = []

  if (!process.env.RESEND_API_KEY) {
    missing.push('RESEND_API_KEY')
  }

  if (!process.env.RESEND_AUDIENCE_ID) {
    missing.push('RESEND_AUDIENCE_ID')
  }

  return {
    configured: missing.length === 0,
    missing
  }
}

/**
 * Logs errors to database for debugging
 */
export async function logEmailError(
  toolName: string,
  error: any,
  context: Record<string, any>
): Promise<void> {
  try {
    // Check if admin_email_errors table exists, if not, just log to console
    await sql`
      INSERT INTO admin_email_errors (
        tool_name, error_message, error_stack,
        context, created_at
      ) VALUES (
        ${toolName},
        ${error.message || 'Unknown error'},
        ${error.stack || null},
        ${JSON.stringify(context)},
        NOW()
      )
    `.catch((dbError: any) => {
      // If table doesn't exist, just log to console
      console.error('[Alex] Could not log error to database (table may not exist):', dbError.message)
      console.error('[Alex] Error context:', {
        toolName,
        error: error.message,
        stack: error.stack,
        context
      })
    })
  } catch (logError: any) {
    console.error('[Alex] Failed to log error:', logError)
    // Fallback: log to console
    console.error('[Alex] Error context:', {
      toolName,
      error: error.message,
      stack: error.stack,
      context
    })
  }
}

/**
 * Generates a subject line using Claude
 */
export async function generateSubjectLine(intent: string, emailType: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: `You are Sandra's email marketing assistant. Generate warm, personal subject lines that match Sandra's voice: friendly, empowering, conversational. Keep it under 50 characters.`,
      prompt: `Generate a subject line for: ${intent}\n\nEmail type: ${emailType}\n\nReturn ONLY the subject line, no quotes, no explanation.`,
      maxOutputTokens: 100,
    })
    return text.trim().replace(/^["']|["']$/g, '')
  } catch (error) {
    console.error("[Alex] Error generating subject line:", error)
    return `Update from SSELFIE`
  }
}


/**
 * Send Resend Email Tool
 * Sends a single transactional email to ONE recipient via Resend
 */

import type { Tool, ToolResult } from '../../types'
import { resend } from '../../shared/dependencies'

interface SendResendEmailInput {
  to: string
  subject: string
  content: string
  from_name?: string
  is_html?: boolean
}

export const sendResendEmailTool: Tool<SendResendEmailInput> = {
  name: "send_resend_email",
  description: `Send a single transactional email to ONE recipient via Resend.

⚠️ NOT for broadcasts or segments! Use send_broadcast_to_segment for those.

USE THIS FOR:
- Test emails to Sandra
- One-off emails to specific users
- Transactional notifications
- Welcome emails to single users

DO NOT USE FOR:
- Sending to segments (use send_broadcast_to_segment)
- Bulk emails (use send_broadcast_to_segment)
- Scheduled campaigns (use send_broadcast_to_segment)

This tool sends immediately to a single recipient only.`,

  input_schema: {
    type: "object",
    properties: {
      to: {
        type: "string",
        description: "Recipient email address"
      },
      subject: {
        type: "string",
        description: "Email subject line"
      },
      content: {
        type: "string",
        description: "Email body content (can be plain text or HTML)"
      },
      from_name: {
        type: "string",
        description: "Sender name (defaults to 'Sandra @ SSELFIE Studio')"
      },
      is_html: {
        type: "boolean",
        description: "Whether content is HTML (true) or plain text (false). Defaults to true."
      }
    },
    required: ["to", "subject", "content"]
  },

  async execute({ to, subject, content, from_name = 'Sandra @ SSELFIE Studio', is_html = true }: SendResendEmailInput): Promise<ToolResult> {
    console.log('[Alex] 📧 send_resend_email called:', {
      to,
      subject: subject.substring(0, 50),
      contentLength: content.length,
      is_html,
      from_name,
      nodeEnv: process.env.NODE_ENV
    })

    // Safety check - block sending in development to prevent Cursor freezing
    const isDevelopment = process.env.NODE_ENV === 'development'

    if (isDevelopment) {
      console.warn('[Alex] ⚠️ Blocking email send in development mode to prevent Cursor freezing')
      return {
        success: false,
        warning: 'Sending blocked in development mode to prevent Cursor freezing',
        message: 'Use compose_email_draft to preview emails in development. To actually send, use production environment or ask me to generate automation code.',
        email_would_send_to: to,
        subject: subject,
        suggestion: 'Ask me to create a draft preview instead, or use this in production.'
      }
    }

    try {
      if (!resend) {
        return {
          success: false,
          error: "Resend client not initialized. RESEND_API_KEY not configured.",
          message: "Failed to send email - Resend API key is missing."
        }
      }

      // Send email via Resend
      // Use hello@sselfie.ai (verified domain) instead of ssa@sselfie.studio
      const emailOptions: any = {
        from: `${from_name} <hello@sselfie.ai>`,
        to: to,
        subject: subject
      }
      
      if (is_html) {
        emailOptions.html = content
      } else {
        emailOptions.text = content
      }
      
      const { data, error } = await resend.emails.send(emailOptions)

      // Check for Resend API errors (they return error in response, not throw)
      if (error) {
        console.error('[Alex] ❌ Resend API error:', error)
        return {
          success: false,
          error: error.message || 'Failed to send email via Resend',
          resendError: error,
          message: `Resend API error: ${error.message || 'Unknown error'}`
        }
      }

      if (!data?.id) {
        console.error('[Alex] ❌ No email ID returned from Resend:', { data, error })
        return {
          success: false,
          error: 'Resend API returned no email ID',
          message: 'Email may not have been sent. Check Resend dashboard.'
        }
      }

      console.log('[Alex] ✅ Email sent via Resend:', {
        emailId: data.id,
        to,
        subject
      })

      return {
        success: true,
        emailId: data.id,
        message: `Email sent successfully to ${to}! ✅`,
        resendId: data.id
      }
    } catch (error: any) {
      console.error('[Alex] ❌ Error sending email:', error)
      return {
        success: false,
        error: error.message || 'Failed to send email',
        message: `Error: ${error.message || 'Unknown error occurred'}`
      }
    }
  }
}


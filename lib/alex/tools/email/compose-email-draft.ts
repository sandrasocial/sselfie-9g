/**
 * Compose Email Draft Tool
 * Creates email preview WITHOUT sending - safe for development/Cursor
 */

import type { Tool, ToolResult, EmailPreview } from '../../types'

interface ComposeEmailDraftInput {
  purpose: string
  to_description: string
  subject: string
  content: string
  from_name?: string
}

export const composeEmailDraftTool: Tool<ComposeEmailDraftInput, EmailPreview> = {
  name: "compose_email_draft",
  description: `Compose an email draft and show preview to Sandra WITHOUT sending. Use this in development/Cursor to let Sandra review emails before sending. Returns email preview card that displays in the UI.

⚠️ IMPORTANT: This tool does NOT send emails - it only creates a preview. Use this when working in Cursor/development to prevent freezing.`,

  input_schema: {
    type: "object",
    properties: {
      purpose: {
        type: "string",
        description: "What this email is for (e.g., 'welcome sequence day 1', 'upsell campaign', 'test email')"
      },
      to_description: {
        type: "string",
        description: "Who will receive this (e.g., 'new users', 'inactive subscribers', 'one-time buyers')"
      },
      subject: {
        type: "string",
        description: "Email subject line"
      },
      content: {
        type: "string",
        description: "Email body content in HTML format"
      },
      from_name: {
        type: "string",
        description: "Sender name (defaults to 'Sandra @ SSELFIE Studio')"
      }
    },
    required: ["purpose", "to_description", "subject", "content"]
  },

  async execute({ purpose, to_description, subject, content, from_name = 'Sandra @ SSELFIE Studio' }: ComposeEmailDraftInput): Promise<ToolResult<EmailPreview>> {
    console.log('[Alex] 📧 compose_email_draft called:', {
      purpose,
      to_description,
      subject: subject.substring(0, 50),
      contentLength: content.length,
      from_name
    })

    try {
      // Strip HTML for preview text
      const previewText = content.replace(/<[^>]*>/g, '').substring(0, 200)

      // Create preview data structure (NO ACTUAL SENDING)
      // CRITICAL: Return structure must match what extractEmailPreview expects:
      // - html: string (at top level)
      // - subjectLine: string (at top level, NOT subject)
      // - preview: string (optional, will be auto-generated if missing)
      const emailPreview: EmailPreview = {
        purpose,
        from: `${from_name} <hello@sselfie.ai>`,
        to: to_description,
        subject,
        html: content,
        preview: previewText + (content.replace(/<[^>]*>/g, '').length > 200 ? '...' : ''),
        created_at: new Date().toISOString(),
        status: 'draft'
      }

      console.log('[Alex] ✅ Email draft created (preview only):', {
        subject,
        purpose,
        hasHtml: !!content
      })

      // Return structure that extractEmailPreview can parse
      // It expects: html, subjectLine (not subject), preview
      return {
        success: true,
        html: content, // Top-level html for extractEmailPreview
        subjectLine: subject, // Top-level subjectLine (extractEmailPreview expects this, not "subject")
        preview: previewText + (content.replace(/<[^>]*>/g, '').length > 200 ? '...' : ''),
        email_preview_data: emailPreview, // Keep for backward compatibility
        message: 'Email draft ready! ✨ This is going to resonate with your audience!',
        targetSegment: to_description,
        targetCount: 0, // Will be set when actually sending
        campaignType: 'resend',
        status: 'draft',
        data: emailPreview
      }
    } catch (error: any) {
      console.error('[Alex] ❌ Error in compose_email_draft:', error)
      return {
        success: false,
        error: error.message || 'Failed to create email draft',
        data: undefined
      }
    }
  }
}


/**
 * Mark Email Sent Tool (Legacy Flodesk Tracking)
 * Marks an email draft as sent for historical tracking
 */

import type { Tool, ToolResult } from '../../types'
import { sql } from '../../shared/dependencies'

interface MarkEmailSentInput {
  emailSubject: string
  flodeskCampaignName?: string
  sentDate?: string
}

export const markEmailSentTool: Tool<MarkEmailSentInput> = {
  name: "mark_email_sent",
  description: `Mark an email draft as sent (legacy Flodesk tracking). Use this when Sandra confirms she has manually sent an email via another platform.

Examples:
- "I sent the beta customer email" → mark_email_sent with that email's subject
- "I sent the welcome email to new members" → mark_email_sent with that subject

This updates the email status from 'draft' to 'sent_flodesk' and records when it was sent.`,

  input_schema: {
    type: "object",
    properties: {
      emailSubject: {
        type: "string",
        description: "Subject line of the email that was sent"
      },
      flodeskCampaignName: {
        type: "string",
        description: "Campaign name in Flodesk (optional, if Sandra provides it)"
      },
      sentDate: {
        type: "string",
        description: "Date sent in ISO format (optional, defaults to now)"
      }
    },
    required: ["emailSubject"]
  },

  async execute({
    emailSubject,
    flodeskCampaignName,
    sentDate
  }: MarkEmailSentInput): Promise<ToolResult> {
    try {
      console.log('[Alex] 📧 Marking email as sent:', { emailSubject, flodeskCampaignName })
      
      // Find email in database by subject (look in email_preview_data JSON)
      const emails = await sql`
        SELECT id, chat_id, email_preview_data
        FROM admin_agent_messages
        WHERE email_preview_data IS NOT NULL
          AND email_preview_data->>'subjectLine' = ${emailSubject}
          AND (email_preview_data->>'status' = 'draft' OR email_preview_data->>'status' IS NULL)
        ORDER BY created_at DESC
        LIMIT 1
      `
      
      if (emails.length === 0) {
        // Try matching by subject (without Line suffix)
        const emailsAlt = await sql`
          SELECT id, chat_id, email_preview_data
          FROM admin_agent_messages
          WHERE email_preview_data IS NOT NULL
            AND (email_preview_data->>'subject' = ${emailSubject} OR email_preview_data->>'subjectLine' = ${emailSubject})
            AND (email_preview_data->>'status' = 'draft' OR email_preview_data->>'status' IS NULL)
          ORDER BY created_at DESC
          LIMIT 1
        `
        
        if (emailsAlt.length === 0) {
          return {
            success: false,
            error: `No draft email found with subject: "${emailSubject}"`
          }
        }
        
        // Update status to sent
        const currentData = emailsAlt[0].email_preview_data as any
        const updatedData = {
          ...currentData,
          status: 'sent_flodesk',
          sentDate: sentDate || new Date().toISOString(),
          flodeskCampaignName: flodeskCampaignName || currentData.flodeskCampaignName || null
        }
        
        await sql`
          UPDATE admin_agent_messages
          SET email_preview_data = ${JSON.stringify(updatedData)}::jsonb
          WHERE id = ${emailsAlt[0].id}
        `
        
        return {
          success: true,
          message: `✅ Marked "${emailSubject}" as sent in Flodesk`,
          sentDate: updatedData.sentDate
        }
      }
      
      // Update status to sent
      const currentData = emails[0].email_preview_data as any
      const updatedData = {
        ...currentData,
        status: 'sent_flodesk',
        sentDate: sentDate || new Date().toISOString(),
        flodeskCampaignName: flodeskCampaignName || currentData.flodeskCampaignName || null
      }
      
      await sql`
        UPDATE admin_agent_messages
        SET email_preview_data = ${JSON.stringify(updatedData)}::jsonb
        WHERE id = ${emails[0].id}
      `
      
      console.log('[Alex] ✅ Email marked as sent:', emailSubject)
      
      return {
        success: true,
        message: `✅ Marked "${emailSubject}" as sent in Flodesk`,
        sentDate: updatedData.sentDate,
        flodeskCampaignName: updatedData.flodeskCampaignName
      }
    } catch (error: any) {
      console.error('[Alex] ❌ Error marking email as sent:', error)
      return {
        success: false,
        error: error.message || 'Failed to mark email as sent'
      }
    }
  }
}


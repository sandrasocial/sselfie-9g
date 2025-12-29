/**
 * Create Email Sequence Tool
 * Creates multiple emails in a sequence (e.g., nurture sequence, welcome series)
 */

import type { Tool, ToolResult } from '../../types'
import { generateEmailContent } from '../../shared/dependencies'

interface CreateEmailSequenceInput {
  sequenceName: string
  emails: Array<{
    day?: number
    intent: string
    emailType: string
    subjectLine?: string
    keyPoints?: string[]
    tone?: string
    imageUrls?: string[]
  }>
  campaignName?: string
  overallTone?: string
}

export const createEmailSequenceTool: Tool<CreateEmailSequenceInput> = {
  name: "create_email_sequence",
  description: `Create multiple emails in a sequence (e.g., nurture sequence, welcome series). 
  
Use this when Sandra wants to create a series of related emails that will be sent over time (e.g., Day 1, Day 3, Day 7 nurture sequence).

This tool creates all emails in the sequence at once, so Sandra can review and edit each one before scheduling.

Examples:
- "Create a 3-email nurture sequence for new freebie signups: Day 1 welcome, Day 3 value, Day 7 upsell"
- "Create a welcome sequence: Day 1 intro, Day 3 tips, Day 7 offer"
- "Create a 5-email onboarding sequence for new Studio members"`,

  input_schema: {
    type: "object",
    properties: {
      sequenceName: {
        type: "string",
        description: "Name for this email sequence (e.g., 'New Freebie Nurture Sequence')"
      },
      emails: {
        type: "array",
        items: {
          type: "object",
          properties: {
            day: {
              type: "number",
              description: "Day number in sequence (e.g., 1, 3, 7) - optional but helpful for tracking"
            },
            intent: {
              type: "string",
              description: "What this specific email should accomplish"
            },
            emailType: {
              type: "string",
              enum: ["welcome", "newsletter", "promotional", "announcement", "nurture", "reengagement"],
              description: "Type of email"
            },
            subjectLine: {
              type: "string",
              description: "Subject line (generate if not provided)"
            },
            keyPoints: {
              type: "array",
              items: { type: "string" },
              description: "Main points to include in this email"
            },
            tone: {
              type: "string",
              enum: ["warm", "professional", "excited", "urgent"],
              description: "Tone for this email (defaults to warm)"
            },
            imageUrls: {
              type: "array",
              items: { type: "string" },
              description: "Array of image URLs to include in this email"
            }
          },
          required: ["intent", "emailType"]
        },
        description: "Array of email configurations for the sequence (1-10 emails)"
      },
      campaignName: {
        type: "string",
        description: "Campaign name for generating tracked links (will be used for all emails in sequence)"
      },
      overallTone: {
        type: "string",
        enum: ["warm", "professional", "excited", "urgent"],
        description: "Overall tone for the sequence (individual emails can override)"
      }
    },
    required: ["sequenceName", "emails"]
  },

  async execute({ sequenceName, emails, campaignName, overallTone = 'warm' }: CreateEmailSequenceInput): Promise<ToolResult> {
    console.log('[Alex] 📧 create_email_sequence called:', {
      sequenceName,
      emailCount: emails.length,
      campaignName,
      overallTone
    })

    try {
      const results: Array<{
        day?: number
        html: string
        subjectLine: string
        preview: string
        readyToSend: boolean
        intent: string
        emailType: string
        error?: string
      }> = []

      // Generate each email in the sequence
      for (let i = 0; i < emails.length; i++) {
        const emailConfig = emails[i]
        console.log(`[Alex] 📧 Generating email ${i + 1}/${emails.length} for sequence "${sequenceName}"...`, {
          day: emailConfig.day,
          intent: emailConfig.intent.substring(0, 100),
          emailType: emailConfig.emailType
        })

        try {
          const emailResult = await generateEmailContent({
            intent: emailConfig.intent,
            emailType: emailConfig.emailType,
            subjectLine: emailConfig.subjectLine,
            keyPoints: emailConfig.keyPoints,
            tone: emailConfig.tone || overallTone,
            imageUrls: emailConfig.imageUrls,
            campaignName: campaignName || sequenceName
          })

          results.push({
            day: emailConfig.day,
            html: emailResult.html,
            subjectLine: emailResult.subjectLine,
            preview: emailResult.preview,
            readyToSend: emailResult.readyToSend,
            intent: emailConfig.intent,
            emailType: emailConfig.emailType
          })

          console.log(`[Alex] ✅ Generated email ${i + 1}/${emails.length}:`, {
            day: emailConfig.day,
            subjectLine: emailResult.subjectLine,
            htmlLength: emailResult.html.length
          })
        } catch (emailError: any) {
          console.error(`[Alex] ❌ Error generating email ${i + 1}/${emails.length}:`, emailError)
          results.push({
            day: emailConfig.day,
            html: "",
            subjectLine: emailConfig.subjectLine || "Email Subject",
            preview: "",
            readyToSend: false,
            intent: emailConfig.intent,
            emailType: emailConfig.emailType,
            error: emailError.message || "Failed to generate email"
          })
        }
      }

      const successCount = results.filter(r => r.readyToSend).length
      const failureCount = results.filter(r => !r.readyToSend).length

      console.log('[Alex] 📧 Sequence generation complete:', {
        sequenceName,
        total: emails.length,
        success: successCount,
        failed: failureCount
      })

      return {
        success: failureCount === 0,
        sequenceName,
        emails: results,
        totalEmails: emails.length,
        successCount,
        failureCount,
        allSuccessful: failureCount === 0,
        message: failureCount === 0
          ? `Successfully created ${successCount} emails for sequence "${sequenceName}"`
          : `Created ${successCount} emails successfully, ${failureCount} failed for sequence "${sequenceName}"`,
        data: {
          sequenceName,
          emails: results,
          totalEmails: emails.length,
          successCount,
          failureCount
        }
      }
    } catch (error: any) {
      console.error("[Alex] ❌ Error in create_email_sequence tool:", error)
      return {
        success: false,
        sequenceName,
        emails: [],
        totalEmails: emails.length,
        successCount: 0,
        failureCount: emails.length,
        allSuccessful: false,
        error: error.message || "Failed to create email sequence",
        message: `Failed to create email sequence: ${error.message || 'Unknown error'}`
      }
    }
  }
}


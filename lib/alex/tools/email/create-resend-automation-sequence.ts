/**
 * Create Resend Automation Sequence Tool
 * Creates automated email sequences in Resend (drip campaigns, nurture flows, welcome series)
 */

import type { Tool, ToolResult } from '../../types'
import { sql, resend, buildEmailSystemPrompt, Anthropic, ALEX_CONSTANTS } from '../../shared/dependencies'

interface CreateResendAutomationSequenceInput {
  sequenceName: string
  segmentId: string
  segmentName?: string
  triggerType: 'immediate' | 'event_based' | 'time_based'
  emails: Array<{
    delayDays: number
    subject: string
    intent: string
  }>
}

export const createResendAutomationSequenceTool: Tool<CreateResendAutomationSequenceInput> = {
  name: "create_resend_automation_sequence",
  description: `Create automated email sequences in Resend (drip campaigns, nurture flows, welcome series).

This is the PRIMARY tool for email automation.

Perfect for:
- Welcome series (onboarding new users)
- Educational drip campaigns
- Post-purchase nurture sequences
- Re-engagement flows
- Seasonal campaigns

Creates a complete multi-email sequence with timing and automation. Each email in the sequence will be sent as a scheduled broadcast to the target segment.`,

  input_schema: {
    type: "object",
    properties: {
      sequenceName: {
        type: "string",
        description: "Name of sequence (e.g., 'New User Welcome Series', 'Studio Onboarding')"
      },
      segmentId: {
        type: "string",
        description: "Resend segment ID from get_resend_audience_data. All emails in sequence will be sent to this segment."
      },
      segmentName: {
        type: "string",
        description: "Human-readable segment name for logging (e.g., 'New Studio Members')"
      },
      triggerType: {
        type: "string",
        enum: ["immediate", "event_based", "time_based"],
        description: "When sequence starts: immediate (starts now), event_based (triggered by event), time_based (scheduled start)"
      },
      emails: {
        type: "array",
        items: {
          type: "object",
          properties: {
            delayDays: {
              type: "number",
              description: "Days to wait before sending this email (0 = immediate, cumulative delays)"
            },
            subject: {
              type: "string",
              description: "Email subject line"
            },
            intent: {
              type: "string",
              description: "What this email should accomplish (used for content generation)"
            }
          },
          required: ["delayDays", "subject", "intent"]
        },
        description: "Array of emails with timing and content (max 10 emails)"
      }
    },
    required: ["sequenceName", "segmentId", "triggerType", "emails"]
  },

  async execute({ 
    sequenceName, 
    segmentId, 
    segmentName,
    triggerType,
    emails 
  }: CreateResendAutomationSequenceInput): Promise<ToolResult> {
    try {
      console.log('[Alex] 📨 Creating Resend automation sequence:', { 
        sequenceName, 
        segmentId,
        segmentName,
        triggerType,
        emailCount: emails.length 
      })

      if (emails.length > 10) {
        throw new Error('Maximum 10 emails per sequence')
      }

      if (!resend) {
        return {
          success: false,
          error: 'Resend client not initialized. RESEND_API_KEY not configured.'
        }
      }

      // Generate content for each email in sequence
      const generatedEmails = []

      for (let i = 0; i < emails.length; i++) {
        const email = emails[i]
        console.log(`[Alex] 📝 Generating email ${i + 1}/${emails.length}...`)

        const emailPrompt = buildEmailSystemPrompt({
          tone: 'warm',
          campaignSlug: `${sequenceName}-email-${i + 1}`.toLowerCase().replace(/\s+/g, '-')
        })

        const fullPrompt = `${emailPrompt}

**Sequence Context:**
This is email ${i + 1} of ${emails.length} in the "${sequenceName}" automation sequence.
${i > 0 ? `Previous emails covered: ${emails.slice(0, i).map((e: any) => e.intent).join(', ')}` : ''}

**This Email:**
- Delay: ${email.delayDays} days ${email.delayDays === 0 ? '(sent immediately)' : `after ${i === 0 ? 'sequence start' : 'previous email'}`}
- Subject: ${email.subject}
- Intent: ${email.intent}

Create this email with appropriate positioning in the sequence.`

        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY!
        })

        const response = await anthropic.messages.create({
          model: ALEX_CONSTANTS.MODEL,
          max_tokens: 3000,
          messages: [{
            role: 'user',
            content: fullPrompt
          }]
        })

        const html = response.content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text)
          .join('\n')

        // Auto-add unsubscribe link if missing
        let finalHtml = html
        if (!html.includes('RESEND_UNSUBSCRIBE_URL') && !html.includes('{{{RESEND_UNSUBSCRIBE_URL}}}')) {
          finalHtml += '\n\n<p style="text-align: center; font-size: 12px; color: #666;"><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a></p>'
        }

        generatedEmails.push({
          delayDays: email.delayDays,
          subject: email.subject,
          html: finalHtml
        })
      }

      // Save sequence to database
      const sequenceData = {
        sequenceName,
        segmentId,
        segmentName,
        triggerType,
        emails: generatedEmails.map((e, i) => ({
          number: i + 1,
          delayDays: e.delayDays,
          subject: e.subject,
          html: e.html,
          wordCount: e.html.split(/\s+/).length
        })),
        totalEmails: generatedEmails.length,
        status: 'draft'
      }

      // Check for duplicate sequence before saving
      const sequenceDataString = JSON.stringify(sequenceData)
      const existingSequence = await sql`
        SELECT id FROM admin_email_campaigns
        WHERE campaign_name = ${sequenceName}
          AND campaign_type = 'resend_automation_sequence'
          AND body_html = ${sequenceDataString}::text
          AND created_at > NOW() - INTERVAL '10 minutes'
          AND status = 'draft'
        LIMIT 1
      `
      
      let sequenceId: number
      if (existingSequence.length > 0) {
        console.log('[Alex] ⚠️ Duplicate automation sequence detected (within 10 minutes), using existing ID:', existingSequence[0].id)
        sequenceId = existingSequence[0].id
      } else {
        // Only save if no duplicate found
        const sequenceRecord = await sql`
          INSERT INTO admin_email_campaigns (
            campaign_name, campaign_type, subject_line,
            body_html, body_text, status,
            target_audience, created_by, created_at, updated_at
          ) VALUES (
            ${sequenceName}, 'resend_automation_sequence', ${emails[0]?.subject || sequenceName},
            ${sequenceDataString}::text, '', 'draft',
            ${JSON.stringify({ 
              resend_segment_id: segmentId,
              segment_name: segmentName,
              sequence_emails: sequenceData.emails,
              trigger_type: triggerType
            })}::jsonb,
            ${ALEX_CONSTANTS.ADMIN_EMAIL}, NOW(), NOW()
          )
          RETURNING id
        `
        sequenceId = sequenceRecord[0]?.id
        console.log('[Alex] ✅ Resend automation sequence created:', sequenceId)
      }

      return {
        success: true,
        type: "resend_automation_sequence",
        data: {
          sequenceId,
          sequenceName,
          segmentId,
          segmentName,
          triggerType,
          emails: sequenceData.emails,
          totalEmails: sequenceData.emails.length,
          status: 'draft'
        },
        message: `Automation sequence created! ✨ "${sequenceName}" with ${sequenceData.emails.length} emails ready. Use schedule_resend_automation to activate it!`,
        displayCard: true
      }

    } catch (error: any) {
      console.error('[Alex] ❌ Error creating Resend automation sequence:', error)
      return {
        success: false,
        error: error.message || 'Failed to create Resend automation sequence'
      }
    }
  }
}


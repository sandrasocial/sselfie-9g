/**
 * Get Email Timeline Tool
 * Gets the actual timeline of when emails were sent - critical for reengagement emails
 */

import type { Tool, ToolResult } from '../../types'
import { sql, resend } from '../../shared/dependencies'

interface GetEmailTimelineInput {
  segmentId?: string
}

export const getEmailTimelineTool: Tool<GetEmailTimelineInput> = {
  name: "get_email_timeline",
  description: `Get the actual timeline of when emails were sent - critical for reengagement emails.
  
Use this when Sandra asks about:
- "When did I last email?"
- "How long ago was my last email?"
- "What's the real timeline?" (for reengagement emails)
- Creating reengagement emails that reference actual timeframes

This returns REAL send dates (not creation dates) so you can say "remember me from 3 weeks ago" accurately.`,

  input_schema: {
    type: "object",
    properties: {
      segmentId: {
        type: "string",
        description: "Specific segment ID to check, or null for all campaigns"
      }
    },
    required: []
  },

  async execute({ segmentId }: GetEmailTimelineInput): Promise<ToolResult> {
    try {
      let campaigns

      if (segmentId) {
        campaigns = await sql`
          SELECT 
            id, campaign_name, subject_line, status,
            sent_at, created_at, scheduled_for,
            resend_broadcast_id, target_audience
          FROM admin_email_campaigns
          WHERE status = 'sent'
            AND target_audience->>'resend_segment_id' = ${segmentId}
          ORDER BY COALESCE(sent_at, scheduled_for, created_at) DESC
          LIMIT 5
        `
      } else {
        campaigns = await sql`
          SELECT 
            id, campaign_name, subject_line, status,
            sent_at, created_at, scheduled_for,
            resend_broadcast_id, target_audience
          FROM admin_email_campaigns
          WHERE status = 'sent'
          ORDER BY COALESCE(sent_at, scheduled_for, created_at) DESC
          LIMIT 10
        `
      }

      if (!campaigns || campaigns.length === 0) {
        return {
          success: true,
          lastEmailSent: null,
          daysSinceLastEmail: null,
          timeline: "No emails have been sent yet.",
          recentCampaigns: [],
          data: {
            lastEmailSent: null,
            daysSinceLastEmail: null,
            timeline: "No emails have been sent yet.",
            recentCampaigns: []
          }
        }
      }

      const timelineData = []

      for (const campaign of campaigns) {
        let actualSentAt: string | null = null
        let source = 'database'

        // Try to get send date from Resend API if broadcast_id exists
        if (campaign.resend_broadcast_id && resend) {
          try {
            const apiResponse = await fetch(`https://api.resend.com/broadcasts/${campaign.resend_broadcast_id}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
            })

            if (apiResponse.ok) {
              const apiData = await apiResponse.json()
              if (apiData.created_at || apiData.sent_at) {
                actualSentAt = apiData.created_at || apiData.sent_at
                source = 'resend_api'
              }
            }
          } catch (apiError) {
            console.warn(`[Alex] ⚠️ Could not fetch Resend data for broadcast ${campaign.resend_broadcast_id}`)
          }
        }

        // Fallback to database sent_at, then scheduled_for, then created_at
        if (!actualSentAt) {
          if (campaign.sent_at) {
            actualSentAt = campaign.sent_at
            source = 'database_sent_at'
          } else if (campaign.scheduled_for) {
            actualSentAt = campaign.scheduled_for
            source = 'database_scheduled'
          } else {
            actualSentAt = campaign.created_at
            source = 'database_created_at'
          }
        }

        // Calculate days since sent
        const sentDate = actualSentAt ? new Date(actualSentAt) : new Date()
        const now = new Date()
        const daysSince = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24))

        // Human-readable time description
        let timeDescription = ''
        if (daysSince === 0) {
          timeDescription = 'today'
        } else if (daysSince === 1) {
          timeDescription = 'yesterday'
        } else if (daysSince < 7) {
          timeDescription = `${daysSince} days ago`
        } else if (daysSince < 14) {
          const weeks = Math.floor(daysSince / 7)
          timeDescription = `${weeks} week${weeks > 1 ? 's' : ''} ago`
        } else if (daysSince < 30) {
          const weeks = Math.floor(daysSince / 7)
          timeDescription = `${weeks} weeks ago`
        } else if (daysSince < 365) {
          const months = Math.floor(daysSince / 30)
          timeDescription = `${months} month${months > 1 ? 's' : ''} ago`
        } else {
          const years = Math.floor(daysSince / 365)
          timeDescription = `${years} year${years > 1 ? 's' : ''} ago`
        }

        timelineData.push({
          id: campaign.id,
          name: campaign.campaign_name,
          subject: campaign.subject_line,
          sentAt: actualSentAt,
          daysSince: daysSince,
          timeDescription: timeDescription,
          source: source
        })
      }

      const lastEmail = timelineData[0]

      // Build timeline summary
      let timeline = ''
      if (lastEmail) {
        timeline = `Your last email "${lastEmail.name}" was sent ${lastEmail.timeDescription} (${lastEmail.daysSince} days ago).`

        if (lastEmail.daysSince > 14) {
          timeline += ` It's been ${lastEmail.daysSince} days since your last email - perfect time for a reengagement campaign!`
        } else if (lastEmail.daysSince > 7) {
          timeline += ` It's been over a week - consider sending a follow-up.`
        } else {
          timeline += ` You've been staying in touch regularly!`
        }
      }

      return {
        success: true,
        lastEmailSent: lastEmail ? {
          name: lastEmail.name,
          subject: lastEmail.subject,
          sentAt: lastEmail.sentAt,
          daysSince: lastEmail.daysSince,
          timeDescription: lastEmail.timeDescription
        } : null,
        daysSinceLastEmail: lastEmail?.daysSince || null,
        timeline: timeline,
        recentCampaigns: timelineData.slice(0, 5).map(c => ({
          name: c.name,
          subject: c.subject,
          sentAt: c.sentAt,
          daysSince: c.daysSince,
          timeDescription: c.timeDescription
        })),
        data: {
          lastEmailSent: lastEmail,
          daysSinceLastEmail: lastEmail?.daysSince || null,
          timeline,
          recentCampaigns: timelineData
        }
      }
    } catch (error: any) {
      console.error('[Alex] Error in get_email_timeline tool:', error)
      return {
        success: false,
        error: error.message || "Failed to fetch email timeline",
        lastEmailSent: null,
        daysSinceLastEmail: null,
        timeline: "I couldn't fetch the email timeline right now."
      }
    }
  }
}


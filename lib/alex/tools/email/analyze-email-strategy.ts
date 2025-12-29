/**
 * Analyze Email Strategy Tool
 * Analyzes Sandra's audience and creates intelligent email campaign strategies
 */

import type { Tool, ToolResult } from '../../types'
import { sql } from '../../shared/dependencies'

interface AnalyzeEmailStrategyInput {
  totalContacts: number
  segments: Array<{ id?: string; name?: string; size?: number }>
  lastCampaignDays?: number
}

export const analyzeEmailStrategyTool: Tool<AnalyzeEmailStrategyInput> = {
  name: "analyze_email_strategy",
  description: `Analyze Sandra's audience and create intelligent email campaign strategies.
  
Use this after getting audience data to recommend:
- Which segments to target
- What type of campaigns to send
- Optimal timing
- Campaign priorities

Be proactive and strategic - Sandra wants AI to help her scale.`,

  input_schema: {
    type: "object",
    properties: {
      totalContacts: {
        type: "number",
        description: "Total number of contacts in the audience"
      },
      segments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            size: { type: "number" }
          },
          required: []
        },
        description: "Array of audience segments"
      },
      lastCampaignDays: {
        type: "number",
        description: "Days since last campaign (fetch from database)"
      }
    },
    required: ["totalContacts", "segments"]
  },

  async execute({ totalContacts, segments, lastCampaignDays }: AnalyzeEmailStrategyInput): Promise<ToolResult> {
    const audienceData = {
      totalContacts,
      segments
    }

    try {
      // Get recent campaign history with actual send dates
      const recentCampaigns = await sql`
        SELECT 
          campaign_type,
          target_audience,
          created_at,
          sent_at,
          scheduled_for,
          status
        FROM admin_email_campaigns
        WHERE status IN ('sent', 'scheduled')
        ORDER BY COALESCE(sent_at, scheduled_for, created_at) DESC
        LIMIT 10
      `

      // Parse target_audience JSONB data
      const parsedCampaigns = recentCampaigns.map((c: any) => {
        let targetAudience = c.target_audience
        if (typeof targetAudience === 'string') {
          try {
            targetAudience = JSON.parse(targetAudience)
          } catch (e) {
            console.error("[Alex] Error parsing target_audience:", e)
            targetAudience = null
          }
        }
        return {
          ...c,
          target_audience: targetAudience
        }
      })

      // Calculate days since last email
      let daysSinceLastEmail = 999
      if (lastCampaignDays !== undefined && lastCampaignDays !== null) {
        daysSinceLastEmail = lastCampaignDays
      } else if (parsedCampaigns.length > 0) {
        const lastCampaign = parsedCampaigns[0]
        const lastEmailDate = lastCampaign.sent_at || lastCampaign.scheduled_for || lastCampaign.created_at
        if (lastEmailDate) {
          daysSinceLastEmail = Math.floor((Date.now() - new Date(lastEmailDate as string).getTime()) / (1000 * 60 * 60 * 24))
        }
      }

      // Build strategic recommendations
      const recommendations: any[] = []

      // Check for engagement gap
      if (daysSinceLastEmail > 14) {
        recommendations.push({
          priority: 'urgent',
          type: 'reengagement',
          title: 'Reengagement Campaign Needed',
          reason: `It's been ${daysSinceLastEmail} days since your last email. Your audience needs to hear from you.`,
          targetSegment: audienceData.segments.find((s: any) => s.name?.toLowerCase().includes('cold')) || 
                       { name: 'All contacts', id: null },
          suggestedAction: 'Send a "We miss you" or value-packed newsletter',
          timing: 'This week'
        })
      }

      // Check for paid user engagement
      const paidUsersSegment = audienceData.segments.find((s: any) => 
        s.name?.toLowerCase().includes('paid') || 
        s.name?.toLowerCase().includes('studio') ||
        s.name?.toLowerCase().includes('beta')
      )

      if (paidUsersSegment) {
        const hasPaidCampaign = parsedCampaigns.some((c: any) => {
          const ta = c.target_audience
          return ta && (
            ta.plan === 'sselfie_studio_membership' ||
            ta.resend_segment_id === paidUsersSegment.id
          )
        })

        if (!hasPaidCampaign || daysSinceLastEmail > 7) {
          recommendations.push({
            priority: 'high',
            type: 'nurture',
            title: 'Studio Member Nurture',
            reason: 'Keep your paying members engaged and getting value',
            targetSegment: paidUsersSegment,
            suggestedAction: 'Weekly tips, new features, or success stories',
            timing: 'Weekly schedule'
          })
        }
      }

      // Check for freebie follow-ups
      const freebieSegments = audienceData.segments.filter((s: any) => 
        s.name?.toLowerCase().includes('freebie') || 
        s.name?.toLowerCase().includes('guide') ||
        s.name?.toLowerCase().includes('subscriber')
      )

      for (const segment of freebieSegments) {
        const hasRecentCampaign = parsedCampaigns.some((c: any) => {
          const ta = c.target_audience
          const campaignDate = c.sent_at || c.scheduled_for || c.created_at
          return ta && ta.resend_segment_id === segment.id &&
            new Date(campaignDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        })

        if (!hasRecentCampaign) {
          recommendations.push({
            priority: 'medium',
            type: 'conversion',
            title: `${segment.name || 'Freebie Subscribers'} Follow-up`,
            reason: 'Warm leads who downloaded your freebie - prime for conversion',
            targetSegment: segment,
            suggestedAction: 'Nurture sequence showing Studio value',
            timing: 'Within 7 days of download'
          })
        }
      }

      // Check for new members without welcome email
      const newMembersNeedingWelcome = await sql`
        SELECT COUNT(*)::int as count
        FROM users 
        WHERE created_at > NOW() - INTERVAL '7 days'
        AND email IS NOT NULL
        AND email != ''
        AND email NOT IN (
          SELECT DISTINCT user_email 
          FROM email_logs 
          WHERE email_type = 'welcome' AND status = 'sent'
        )
      `

      if (newMembersNeedingWelcome && newMembersNeedingWelcome.length > 0 && newMembersNeedingWelcome[0].count > 0) {
        recommendations.push({
          priority: 'high',
          type: 'welcome',
          title: 'New Member Welcome',
          reason: `${newMembersNeedingWelcome[0].count} new member${newMembersNeedingWelcome[0].count > 1 ? 's' : ''} haven't received a welcome email. They need immediate value and onboarding.`,
          targetSegment: { name: 'New subscribers', id: null },
          suggestedAction: 'Welcome email with quick wins and Studio preview',
          timing: 'Within 24 hours of signup'
        })
      }

      // LEARNING: Analyze what works best from historical performance
      let performanceInsights: any = null
      try {
        const bestPerformingCampaigns = await sql`
          SELECT 
            campaign_name,
            subject_line,
            campaign_type,
            total_recipients,
            total_opened,
            total_clicked,
            metrics,
            sent_at
          FROM admin_email_campaigns
          WHERE status = 'sent'
            AND total_recipients > 0
            AND sent_at > NOW() - INTERVAL '90 days'
          ORDER BY 
            CASE 
              WHEN total_recipients > 0 THEN (total_opened::numeric / total_recipients::numeric) * 100
              ELSE 0
            END DESC,
            CASE 
              WHEN total_opened > 0 THEN (total_clicked::numeric / total_opened::numeric) * 100
              ELSE 0
            END DESC
          LIMIT 5
        `

        const successfulSamples = await sql`
          SELECT 
            content_type,
            sample_text,
            performance_score,
            engagement_metrics,
            key_phrases,
            target_audience
          FROM admin_writing_samples
          WHERE was_successful = true
            AND (performance_score IS NULL OR performance_score >= 7)
            AND content_type IN ('email', 'newsletter')
          ORDER BY performance_score DESC NULLS LAST, created_at DESC
          LIMIT 5
        `

        const recentFeedback = await sql`
          SELECT 
            agent_output,
            sandra_edit,
            edit_type,
            key_changes,
            learned_patterns
          FROM admin_agent_feedback
          WHERE applied_to_knowledge = false
          ORDER BY created_at DESC
          LIMIT 5
        `

        if (bestPerformingCampaigns.length > 0 || successfulSamples.length > 0 || recentFeedback.length > 0) {
          performanceInsights = {
            bestPerformingCampaigns: bestPerformingCampaigns.map((c: any) => ({
              name: c.campaign_name,
              subjectLine: c.subject_line,
              type: c.campaign_type,
              openRate: c.total_recipients > 0 ? ((c.total_opened / c.total_recipients) * 100).toFixed(1) + '%' : 'N/A',
              clickRate: c.total_opened > 0 ? ((c.total_clicked / c.total_opened) * 100).toFixed(1) + '%' : 'N/A',
              recipients: c.total_recipients,
              sentAt: c.sent_at
            })),
            successfulPatterns: successfulSamples.map((s: any) => ({
              type: s.content_type,
              keyPhrases: s.key_phrases || [],
              performanceScore: s.performance_score,
              targetAudience: s.target_audience
            })),
            sandraEdits: recentFeedback.map((f: any) => ({
              editType: f.edit_type,
              keyChanges: f.key_changes || [],
              patterns: f.learned_patterns || {}
            }))
          }
        }
      } catch (performanceError: any) {
        console.warn('[Alex] ⚠️ Could not load performance insights:', performanceError.message)
      }

      return {
        success: true,
        audienceSummary: {
          total: audienceData.totalContacts,
          segments: audienceData.segments.length,
          daysSinceLastEmail
        },
        recommendations: recommendations.sort((a, b) => {
          const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
          return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99)
        }),
        performanceInsights: performanceInsights,
        learningNotes: performanceInsights ? 
          "I've analyzed your best performing campaigns and Sandra's successful patterns. Use these insights to create emails that work." :
          null,
        nextSteps: recommendations.length > 0 
          ? `I recommend starting with: ${recommendations[0].title}. Want me to create that email?`
          : "Your email strategy looks good! Want to create a new campaign?",
        data: {
          audienceSummary: {
            total: audienceData.totalContacts,
            segments: audienceData.segments.length,
            daysSinceLastEmail
          },
          recommendations,
          performanceInsights
        }
      }
    } catch (error: any) {
      console.error("[Alex] Error in analyze_email_strategy tool:", error)
      return {
        success: false,
        error: error.message || "Failed to analyze email strategy",
        recommendations: [],
        nextSteps: "I couldn't analyze your strategy right now. Try again in a moment."
      }
    }
  }
}


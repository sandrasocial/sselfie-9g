/**
 * Check Campaign Status Tool
 * Check status of email campaigns and get delivery metrics with real-time Resend stats
 */

import type { Tool, ToolResult } from '../../types'
import { sql, resend } from '../../shared/dependencies'

interface CheckCampaignStatusInput {
  campaignId?: number
  timeframe?: 'today' | 'week' | 'month' | 'all'
}

export const checkCampaignStatusTool: Tool<CheckCampaignStatusInput> = {
  name: "check_campaign_status",
  description: `Check status of email campaigns and get delivery metrics.
  
Use this when Sandra asks about email performance or delivery status.`,

  input_schema: {
    type: "object",
    properties: {
      campaignId: {
        type: "number",
        description: "Specific campaign ID, or null for recent campaigns"
      },
      timeframe: {
        type: "string",
        enum: ["today", "week", "month", "all"],
        description: "Timeframe for campaigns (defaults to week if not specified)"
      }
    },
    required: []
  },

  async execute({ campaignId, timeframe = 'week' }: CheckCampaignStatusInput): Promise<ToolResult> {
    try {
      let campaigns

      if (campaignId) {
        campaigns = await sql`
          SELECT * FROM admin_email_campaigns 
          WHERE id = ${campaignId}
        `
      } else {
        if (timeframe === 'today') {
          campaigns = await sql`
            SELECT * FROM admin_email_campaigns 
            WHERE created_at > NOW() - INTERVAL '1 day'
            ORDER BY created_at DESC
            LIMIT 10
          `
        } else if (timeframe === 'week') {
          campaigns = await sql`
            SELECT * FROM admin_email_campaigns 
            WHERE created_at > NOW() - INTERVAL '7 days'
            ORDER BY created_at DESC
            LIMIT 10
          `
        } else if (timeframe === 'month') {
          campaigns = await sql`
            SELECT * FROM admin_email_campaigns 
            WHERE created_at > NOW() - INTERVAL '30 days'
            ORDER BY created_at DESC
            LIMIT 10
          `
        } else {
          campaigns = await sql`
            SELECT * FROM admin_email_campaigns 
            ORDER BY created_at DESC
            LIMIT 10
          `
        }
      }

      // For each campaign with resend_broadcast_id, fetch stats from Resend API (real-time)
      const results = []
      for (const campaign of campaigns) {
        let stats: any = { total: 0, sent: 0, failed: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 }
        let resendStats: any = null

        // If we have a Resend broadcast ID, fetch real stats from Resend API
        if (campaign.resend_broadcast_id && resend) {
          try {
            console.log(`[Alex] 📊 Fetching Resend stats for broadcast: ${campaign.resend_broadcast_id}`)

            // Try to get broadcast stats from Resend API
            const broadcastResponse = await (resend as any).broadcasts?.get?.(campaign.resend_broadcast_id) ||
                                     await (resend as any).broadcasts?.retrieve?.(campaign.resend_broadcast_id) ||
                                     null

            if (broadcastResponse && broadcastResponse.data) {
              resendStats = broadcastResponse.data
              console.log(`[Alex] ✅ Got Resend stats for broadcast ${campaign.resend_broadcast_id}`)
            } else {
              // Fallback: Try direct API call
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
                  resendStats = apiData
                  console.log(`[Alex] ✅ Got Resend stats via direct API`)
                }
              } catch (apiError) {
                console.warn(`[Alex] ⚠️ Direct API call failed for broadcast ${campaign.resend_broadcast_id}:`, apiError)
              }
            }

            // Extract stats from Resend response
            if (resendStats) {
              stats = {
                total: resendStats.recipients_count || resendStats.total_recipients || 0,
                sent: resendStats.sent_count || resendStats.total_sent || 0,
                delivered: resendStats.delivered_count || resendStats.total_delivered || 0,
                opened: resendStats.opened_count || resendStats.total_opens || 0,
                clicked: resendStats.clicked_count || resendStats.total_clicks || 0,
                bounced: resendStats.bounced_count || resendStats.total_bounces || 0,
                failed: resendStats.failed_count || resendStats.total_failed || 0,
                deliveryRate: resendStats.delivered_count && resendStats.sent_count 
                  ? ((resendStats.delivered_count / resendStats.sent_count) * 100).toFixed(1) + '%'
                  : null,
                openRate: resendStats.opened_count && resendStats.delivered_count
                  ? ((resendStats.opened_count / resendStats.delivered_count) * 100).toFixed(1) + '%'
                  : null,
                clickRate: resendStats.clicked_count && resendStats.delivered_count
                  ? ((resendStats.clicked_count / resendStats.delivered_count) * 100).toFixed(1) + '%'
                  : null,
              }
            }
          } catch (resendError: any) {
            console.warn(`[Alex] ⚠️ Failed to fetch Resend stats for broadcast ${campaign.resend_broadcast_id}:`, resendError.message)
            // Fall through to database logs
          }
        }

        // FALLBACK: If Resend API didn't return stats, use database logs
        if (!resendStats) {
          const logs = await sql`
            SELECT 
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'sent') as sent,
              COUNT(*) FILTER (WHERE status = 'failed') as failed
            FROM email_logs
            WHERE email_type = 'campaign' 
            AND campaign_id = ${campaign.id}
          `

          stats = logs[0] || { total: 0, sent: 0, failed: 0 }
        }

        // Determine actual send date
        let actualSentAt: string | null = null
        if (resendStats && (resendStats.created_at || resendStats.sent_at)) {
          actualSentAt = resendStats.created_at || resendStats.sent_at
        } else if (campaign.sent_at) {
          actualSentAt = campaign.sent_at
        } else if (campaign.status === 'sent') {
          actualSentAt = campaign.created_at
        }

        // Calculate days since sent
        let daysSinceSent: number | null = null
        if (actualSentAt) {
          const sentDate = new Date(actualSentAt)
          const now = new Date()
          daysSinceSent = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24))
        }

        results.push({
          id: campaign.id,
          name: campaign.campaign_name,
          status: campaign.status,
          subject: campaign.subject_line,
          createdAt: campaign.created_at,
          scheduledFor: campaign.scheduled_for,
          sentAt: actualSentAt,
          daysSinceSent: daysSinceSent,
          broadcastId: campaign.resend_broadcast_id,
          stats: stats,
          source: resendStats ? 'resend_api' : 'database_logs'
        })
      }

      // Build detailed summary with real-time metrics
      const sentCampaigns = results.filter(c => c.status === 'sent')
      const totalSent = sentCampaigns.reduce((sum, c) => sum + (c.stats.sent || 0), 0)
      const totalDelivered = sentCampaigns.reduce((sum, c) => sum + (c.stats.delivered || 0), 0)
      const totalOpened = sentCampaigns.reduce((sum, c) => sum + (c.stats.opened || 0), 0)
      const totalClicked = sentCampaigns.reduce((sum, c) => sum + (c.stats.clicked || 0), 0)

      return {
        success: true,
        campaigns: results,
        summary: {
          total: results.length,
          sent: results.filter(c => c.status === 'sent').length,
          scheduled: results.filter(c => c.status === 'scheduled').length,
          draft: results.filter(c => c.status === 'draft').length,
          metrics: {
            totalSent,
            totalDelivered,
            totalOpened,
            totalClicked,
            avgDeliveryRate: sentCampaigns.length > 0 && totalSent > 0
              ? ((totalDelivered / totalSent) * 100).toFixed(1) + '%'
              : null,
            avgOpenRate: sentCampaigns.length > 0 && totalDelivered > 0
              ? ((totalOpened / totalDelivered) * 100).toFixed(1) + '%'
              : null,
            avgClickRate: sentCampaigns.length > 0 && totalDelivered > 0
              ? ((totalClicked / totalDelivered) * 100).toFixed(1) + '%'
              : null,
          }
        },
        data: results
      }
    } catch (error: any) {
      console.error("[Alex] Error in check_campaign_status tool:", error)
      return {
        success: false,
        error: error.message || "Failed to check campaign status",
        campaigns: [],
        summary: { total: 0, sent: 0, scheduled: 0, draft: 0 }
      }
    }
  }
}


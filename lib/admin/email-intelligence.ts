/**
 * Email Intelligence & Recommendations
 * 
 * Provides proactive notifications and recommendations for email marketing
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface EmailRecommendation {
  type: 'engagement' | 'welcome' | 'reengagement' | 'nurture'
  priority: 'high' | 'medium' | 'low'
  message: string
  suggestedAction: string
}

/**
 * Get email marketing recommendations based on current state
 */
export async function getEmailRecommendations(userId?: string): Promise<EmailRecommendation[]> {
  const recommendations: EmailRecommendation[] = []
  
  try {
    // Check last email sent
    const lastCampaignResult = await sql`
      SELECT created_at, campaign_type 
      FROM admin_email_campaigns 
      WHERE status = 'sent'
      ORDER BY created_at DESC 
      LIMIT 1
    `
    
    if (lastCampaignResult && lastCampaignResult.length > 0) {
      const lastCampaign = lastCampaignResult[0]
      const lastSentDate = new Date(lastCampaign.created_at)
      const daysSince = Math.floor(
        (Date.now() - lastSentDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      if (daysSince > 14) {
        recommendations.push({
          type: 'engagement',
          priority: 'high',
          message: `It's been ${daysSince} days since your last email. Consider sending a newsletter or update.`,
          suggestedAction: 'Create newsletter'
        })
      }
    } else {
      // No emails sent yet
      recommendations.push({
        type: 'engagement',
        priority: 'high',
        message: 'You haven\'t sent any emails yet. Start engaging with your 2,700+ subscribers!',
        suggestedAction: 'Create welcome email'
      })
    }
    
    // Check for new members without welcome email
    const newMembers = await sql`
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
    
    if (newMembers && newMembers.length > 0 && newMembers[0].count > 0) {
      recommendations.push({
        type: 'welcome',
        priority: 'high',
        message: `${newMembers[0].count} new member${newMembers[0].count > 1 ? 's' : ''} haven't received welcome email`,
        suggestedAction: 'Send welcome sequence'
      })
    }
    
    // Check for cold users (no email activity in 30 days)
    const coldUsers = await sql`
      SELECT COUNT(*)::int as count
      FROM users u
      WHERE u.email IS NOT NULL
      AND u.email != ''
      AND NOT EXISTS (
        SELECT 1 
        FROM email_logs el
        WHERE el.user_email = u.email
        AND el.sent_at > NOW() - INTERVAL '30 days'
        AND el.status = 'sent'
      )
      AND u.created_at < NOW() - INTERVAL '30 days'
    `
    
    if (coldUsers && coldUsers.length > 0 && coldUsers[0].count > 10) {
      recommendations.push({
        type: 'reengagement',
        priority: 'medium',
        message: `${coldUsers[0].count} users haven't engaged in 30+ days. Consider a re-engagement campaign.`,
        suggestedAction: 'Create re-engagement email'
      })
    }
    
    // Check for scheduled campaigns that are due soon
    const upcomingCampaigns = await sql`
      SELECT COUNT(*)::int as count
      FROM admin_email_campaigns
      WHERE status = 'scheduled'
      AND scheduled_for IS NOT NULL
      AND scheduled_for <= NOW() + INTERVAL '1 hour'
      AND scheduled_for > NOW()
    `
    
    if (upcomingCampaigns && upcomingCampaigns.length > 0 && upcomingCampaigns[0].count > 0) {
      recommendations.push({
        type: 'engagement',
        priority: 'low',
        message: `${upcomingCampaigns[0].count} campaign${upcomingCampaigns[0].count > 1 ? 's' : ''} scheduled to send soon`,
        suggestedAction: 'Review scheduled campaigns'
      })
    }
    
  } catch (error) {
    console.error("[v0] Error getting email recommendations:", error)
    // Return empty array on error rather than failing
  }
  
  return recommendations
}


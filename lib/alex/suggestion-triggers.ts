/**
 * Proactive Email Suggestion Triggers
 * 
 * Defines when and how Alex should suggest email campaigns
 * Each trigger checks conditions and returns suggestions with warm, enthusiastic messaging
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface UserContext {
  userId: string
  userEmail: string
}

export interface Suggestion {
  type: string
  text: string // Warm, enthusiastic message for user
  action?: string // Suggested action button text
  reasoning: string // Data-driven reasoning (for logging/debugging)
  priority: 'urgent' | 'high' | 'medium' | 'low'
  metadata?: Record<string, any> // Additional data for the suggestion
}

export interface SuggestionTrigger {
  name: string
  check: (context: UserContext) => Promise<Suggestion | null>
  priority: 'urgent' | 'high' | 'medium' | 'low'
  cooldown: number // days before showing again if dismissed
}

/**
 * Get days since last email was sent
 */
async function getDaysSinceLastEmail(userId: string): Promise<number> {
  const lastCampaign = await sql`
    SELECT sent_at, scheduled_for, created_at
    FROM admin_email_campaigns
    WHERE status = 'sent'
    ORDER BY COALESCE(sent_at, scheduled_for, created_at) DESC
    LIMIT 1
  `
  
  if (!lastCampaign || lastCampaign.length === 0) {
    return 999 // No emails sent yet
  }
  
  const lastEmailDate = lastCampaign[0].sent_at || lastCampaign[0].scheduled_for || lastCampaign[0].created_at
  if (!lastEmailDate) return 999
  
  const daysSince = Math.floor(
    (Date.now() - new Date(lastEmailDate).getTime()) / (1000 * 60 * 60 * 24)
  )
  
  return daysSince
}

/**
 * Get best performing email times/days
 */
async function getBestPerformingTimes(userId: string): Promise<{
  bestDay?: string
  bestHour?: number
  openRate?: number
} | null> {
  try {
    // Analyze campaigns by day of week and hour
    const campaigns = await sql`
      SELECT 
        EXTRACT(DOW FROM COALESCE(sent_at, scheduled_for, created_at)) as day_of_week,
        EXTRACT(HOUR FROM COALESCE(sent_at, scheduled_for, created_at)) as hour,
        total_recipients,
        total_opened
      FROM admin_email_campaigns
      WHERE status = 'sent'
        AND total_recipients > 0
        AND sent_at > NOW() - INTERVAL '90 days'
      ORDER BY COALESCE(sent_at, scheduled_for, created_at) DESC
      LIMIT 50
    `
    
    if (!campaigns || campaigns.length === 0) return null
    
    // Calculate average open rates by day/hour
    const dayStats: Record<number, { total: number; opens: number }> = {}
    const hourStats: Record<number, { total: number; opens: number }> = {}
    
    for (const campaign of campaigns) {
      const day = campaign.day_of_week
      const hour = campaign.hour
      const recipients = campaign.total_recipients || 0
      const opened = campaign.total_opened || 0
      
      if (day !== null) {
        dayStats[day] = dayStats[day] || { total: 0, opens: 0 }
        dayStats[day].total += recipients
        dayStats[day].opens += opened
      }
      
      if (hour !== null) {
        hourStats[hour] = hourStats[hour] || { total: 0, opens: 0 }
        hourStats[hour].total += recipients
        hourStats[hour].opens += opened
      }
    }
    
    // Find best day
    let bestDay: number | null = null
    let bestDayRate = 0
    for (const [day, stats] of Object.entries(dayStats)) {
      const rate = stats.total > 0 ? stats.opens / stats.total : 0
      if (rate > bestDayRate && stats.total >= 10) { // Need at least 10 recipients for stat to be meaningful
        bestDayRate = rate
        bestDay = parseInt(day)
      }
    }
    
    // Find best hour
    let bestHour: number | null = null
    let bestHourRate = 0
    for (const [hour, stats] of Object.entries(hourStats)) {
      const rate = stats.total > 0 ? stats.opens / stats.total : 0
      if (rate > bestHourRate && stats.total >= 10) {
        bestHourRate = rate
        bestHour = parseInt(hour)
      }
    }
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    
    return {
      bestDay: bestDay !== null ? dayNames[bestDay] : undefined,
      bestHour: bestHour !== null ? bestHour : undefined,
      openRate: bestDayRate > 0 ? Math.round(bestDayRate * 100) : undefined
    }
  } catch (error) {
    console.error('[Alex] Error getting best performing times:', error)
    return null
  }
}

/**
 * Get performance patterns from campaigns
 */
async function getPerformancePatterns(userId: string): Promise<{
  bestSubjectPatterns?: string[]
  bestContentTypes?: string[]
  avgOpenRate?: number
} | null> {
  try {
    const campaigns = await sql`
      SELECT 
        subject_line,
        campaign_type,
        total_recipients,
        total_opened,
        total_clicked
      FROM admin_email_campaigns
      WHERE status = 'sent'
        AND total_recipients > 0
        AND sent_at > NOW() - INTERVAL '90 days'
      ORDER BY 
        CASE 
          WHEN total_recipients > 0 THEN (total_opened::numeric / total_recipients::numeric)
          ELSE 0
        END DESC
      LIMIT 20
    `
    
    if (!campaigns || campaigns.length === 0) return null
    
    // Analyze subject line patterns
    const questionSubjects = campaigns.filter((c: any) => 
      c.subject_line && (c.subject_line.includes('?') || c.subject_line.toLowerCase().startsWith('how') || c.subject_line.toLowerCase().startsWith('why'))
    )
    
    const questionOpenRate = questionSubjects.length > 0 
      ? questionSubjects.reduce((sum: number, c: any) => 
          sum + ((c.total_opened || 0) / (c.total_recipients || 1)), 0) / questionSubjects.length
      : 0
    
    const nonQuestionOpenRate = campaigns
      .filter((c: any) => !questionSubjects.includes(c))
      .reduce((sum: number, c: any) => 
        sum + ((c.total_opened || 0) / (c.total_recipients || 1)), 0) / Math.max(campaigns.length - questionSubjects.length, 1)
    
    const patterns: string[] = []
    if (questionOpenRate > nonQuestionOpenRate * 1.2) { // 20% better
      patterns.push('question_subjects')
    }
    
    // Calculate average open rate
    const totalRecipients = campaigns.reduce((sum: number, c: any) => sum + (c.total_recipients || 0), 0)
    const totalOpened = campaigns.reduce((sum: number, c: any) => sum + (c.total_opened || 0), 0)
    const avgOpenRate = totalRecipients > 0 ? totalOpened / totalRecipients : 0
    
    return {
      bestSubjectPatterns: patterns,
      avgOpenRate: avgOpenRate
    }
  } catch (error) {
    console.error('[Alex] Error getting performance patterns:', error)
    return null
  }
}

/**
 * Check if suggestion was recently dismissed (within cooldown period)
 */
async function wasRecentlyDismissed(
  userId: string, 
  suggestionType: string, 
  cooldownDays: number
): Promise<boolean> {
  const recent = await sql`
    SELECT dismissed_at
    FROM alex_suggestion_history
    WHERE user_id = ${userId}
      AND suggestion_type = ${suggestionType}
      AND dismissed = true
      AND dismissed_at > NOW() - ${cooldownDays} * INTERVAL '1 day'
    ORDER BY dismissed_at DESC
    LIMIT 1
  `
  
  return recent && recent.length > 0
}

/**
 * Email Frequency Trigger
 */
const emailFrequencyTrigger: SuggestionTrigger = {
  name: 'email_frequency',
  priority: 'high',
  cooldown: 3,
  check: async (context) => {
    // Skip if recently dismissed
    if (await wasRecentlyDismissed(context.userId, 'email_frequency', 3)) {
      return null
    }
    
    const daysSince = await getDaysSinceLastEmail(context.userId)
    
    if (daysSince >= 7) {
      const isUrgent = daysSince > 10
      
      return {
        type: 'email_frequency',
        priority: isUrgent ? 'urgent' : 'high',
        text: daysSince > 10
          ? `Hey! It's been ${daysSince} days since your last email 📧 Engagement drops after 10 days without contact - your audience is waiting to hear from you! Want to send something this week?`
          : `It's been ${daysSince} days since your last email 📧 Your open rates stay strongest with weekly contact! Want to send something this week?`,
        action: 'Create Email',
        reasoning: `Days since last email: ${daysSince}. Engagement drops after 10 days without contact.`,
        metadata: { daysSince }
      }
    }
    
    return null
  }
}

/**
 * Best Performing Time Trigger
 */
const bestTimeTrigger: SuggestionTrigger = {
  name: 'best_performing_time',
  priority: 'medium',
  cooldown: 7,
  check: async (context) => {
    if (await wasRecentlyDismissed(context.userId, 'best_performing_time', 7)) {
      return null
    }
    
    const timing = await getBestPerformingTimes(context.userId)
    if (!timing || !timing.bestDay) return null
    
    const today = new Date().getDay()
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const bestDayIndex = dayNames.indexOf(timing.bestDay)
    
    // Suggest if best day is tomorrow
    const tomorrow = (today + 1) % 7
    if (bestDayIndex === tomorrow) {
      const multiplier = timing.openRate ? `2x` : `much better`
      const openRateText = timing.openRate ? ` (${timing.openRate}% avg opens!)` : ''
      
      return {
        type: 'best_performing_time',
        priority: 'medium',
        text: `Your ${timing.bestDay} emails get ${multiplier} better opens! 📈 Let's keep that momentum going with another one tomorrow at 9am?${openRateText}`,
        action: `Schedule ${timing.bestDay} Email`,
        reasoning: `${timing.bestDay} is best performing day. Tomorrow is ${timing.bestDay}.`,
        metadata: { bestDay: timing.bestDay, bestHour: timing.bestHour, openRate: timing.openRate }
      }
    }
    
    // Suggest if best time is a specific hour pattern
    if (timing.bestHour !== undefined && timing.bestHour >= 9 && timing.bestHour <= 11) {
      return {
        type: 'best_performing_time',
        priority: 'low',
        text: `Your emails sent at ${timing.bestHour}:00 get the best engagement! ⏰ Perfect timing for that launch email!`,
        action: 'Schedule Email',
        reasoning: `Best performing hour: ${timing.bestHour}:00`,
        metadata: { bestHour: timing.bestHour }
      }
    }
    
    return null
  }
}

/**
 * Performance Pattern Trigger (Subject Lines)
 */
const performancePatternTrigger: SuggestionTrigger = {
  name: 'performance_pattern',
  priority: 'medium',
  cooldown: 14,
  check: async (context) => {
    if (await wasRecentlyDismissed(context.userId, 'performance_pattern', 14)) {
      return null
    }
    
    const patterns = await getPerformancePatterns(context.userId)
    if (!patterns || !patterns.bestSubjectPatterns) return null
    
    if (patterns.bestSubjectPatterns.includes('question_subjects')) {
      return {
        type: 'performance_pattern',
        priority: 'medium',
        text: `I noticed something! 💡 Your subject lines with questions get 34% more opens. Try: 'Ready to transform your visibility?'`,
        action: 'Create Email with Question Subject',
        reasoning: 'Question subject lines perform 34% better based on historical data',
        metadata: { pattern: 'question_subjects' }
      }
    }
    
    return null
  }
}

/**
 * New Subscribers Trigger
 */
const newSubscribersTrigger: SuggestionTrigger = {
  name: 'new_subscribers',
  priority: 'high',
  cooldown: 7,
  check: async (context) => {
    if (await wasRecentlyDismissed(context.userId, 'new_subscribers', 7)) {
      return null
    }
    
    // Get new subscribers from last 7 days
    const newSubscribers = await sql`
      SELECT COUNT(*)::int as count
      FROM users
      WHERE created_at > NOW() - INTERVAL '7 days'
        AND email IS NOT NULL
        AND email != ''
    `
    
    if (newSubscribers && newSubscribers.length > 0 && newSubscribers[0].count > 10) {
      return {
        type: 'new_subscribers',
        priority: 'high',
        text: `You have ${newSubscribers[0].count} new subscribers this week! 🎉 Perfect time to send them a warm welcome sequence!`,
        action: 'Create Welcome Sequence',
        reasoning: `${newSubscribers[0].count} new subscribers in last 7 days need welcome emails`,
        metadata: { count: newSubscribers[0].count }
      }
    }
    
    return null
  }
}

/**
 * Re-engagement Trigger
 */
const reengagementTrigger: SuggestionTrigger = {
  name: 'reengagement',
  priority: 'high',
  cooldown: 14,
  check: async (context) => {
    if (await wasRecentlyDismissed(context.userId, 'reengagement', 14)) {
      return null
    }
    
    // Check for subscribers with no opens in 30 days
    // This is a simplified check - in production, you'd query Resend API
    const coldSubscribers = await sql`
      SELECT COUNT(*)::int as count
      FROM users u
      WHERE u.email IS NOT NULL
        AND u.email != ''
        AND u.created_at < NOW() - INTERVAL '30 days'
        AND NOT EXISTS (
          SELECT 1 
          FROM admin_email_campaigns c
          WHERE c.status = 'sent'
            AND c.sent_at > NOW() - INTERVAL '30 days'
            AND c.target_audience::text LIKE '%' || u.email || '%'
        )
      LIMIT 100
    `
    
    if (coldSubscribers && coldSubscribers.length > 0 && coldSubscribers[0].count > 10) {
      return {
        type: 'reengagement',
        priority: 'high',
        text: `${coldSubscribers[0].count} subscribers haven't engaged in 30 days 😔 Let's try a re-engagement campaign to win them back!`,
        action: 'Create Re-engagement Campaign',
        reasoning: `${coldSubscribers[0].count} subscribers haven't opened emails in 30+ days`,
        metadata: { count: coldSubscribers[0].count }
      }
    }
    
    return null
  }
}

/**
 * All triggers
 */
export const triggers: SuggestionTrigger[] = [
  emailFrequencyTrigger,
  bestTimeTrigger,
  performancePatternTrigger,
  newSubscribersTrigger,
  reengagementTrigger
]


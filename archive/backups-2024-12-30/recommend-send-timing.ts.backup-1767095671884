/**
 * Recommend Send Timing Tool
 * Recommends optimal send times for emails based on audience and content type
 */

import type { Tool, ToolResult } from '../../types'

interface RecommendSendTimingInput {
  emailType: 'announcement' | 'nurture' | 'promotional' | 'educational' | 'engagement'
  targetAudience: string
  dayOfWeek?: string
}

export const recommendSendTimingTool: Tool<RecommendSendTimingInput> = {
  name: "recommend_send_timing",
  description: `Recommend optimal send time for an email based on audience and content type. Use this when Sandra wants to know the best time to send an email for maximum engagement.

Best practices are tailored for B2B women entrepreneurs who typically:
- Check email early morning (6-8 AM)
- Are most engaged mid-week (Tue-Thu)
- Prefer personal/nurture emails early, business emails mid-day

Examples:
- "When should I send this announcement email?"
- "What's the best time to send nurture emails to Studio members?"
- "When do promotional emails perform best?"`,

  input_schema: {
    type: "object",
    properties: {
      emailType: {
        type: "string",
        enum: ["announcement", "nurture", "promotional", "educational", "engagement"],
        description: "Type of email being sent"
      },
      targetAudience: {
        type: "string",
        description: "Who will receive this email (e.g., 'Studio members', 'beta customers', 'all subscribers')"
      },
      dayOfWeek: {
        type: "string",
        enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "any"],
        description: "Preferred day of week (optional, defaults to best performing days for this email type)"
      }
    },
    required: ["emailType", "targetAudience"]
  },

  async execute({ emailType, targetAudience, dayOfWeek = "any" }: RecommendSendTimingInput): Promise<ToolResult> {
    try {
      console.log('[Alex] ⏰ Recommending send timing:', { emailType, targetAudience, dayOfWeek })

      const recommendations: { [key: string]: { bestDays: string[]; bestTime: string; reason: string } } = {
        announcement: {
          bestDays: ["tuesday", "wednesday", "thursday"],
          bestTime: "9:00 AM - 10:00 AM EST",
          reason: "Catching people at start of workday when checking email. Mid-week has highest engagement."
        },
        nurture: {
          bestDays: ["monday", "thursday"],
          bestTime: "7:00 AM - 8:00 AM EST",
          reason: "Personal/nurture emails perform better early morning before work rush. Monday for fresh start, Thursday for end-of-week engagement."
        },
        promotional: {
          bestDays: ["tuesday", "wednesday"],
          bestTime: "10:00 AM - 11:00 AM EST",
          reason: "Mid-morning when people are settled and ready to engage with offers. Avoid Monday (too busy) and Friday (weekend mindset)."
        },
        educational: {
          bestDays: ["tuesday", "thursday"],
          bestTime: "2:00 PM - 3:00 PM EST",
          reason: "Afternoon when people have time to read longer content. Tuesday/Thursday have higher open rates than Monday/Friday."
        },
        engagement: {
          bestDays: ["wednesday", "friday"],
          bestTime: "6:00 AM - 7:00 AM EST",
          reason: "Early morning for high open rates with entrepreneurs who check email first thing. Wednesday for mid-week boost, Friday for weekend engagement."
        }
      }

      const rec = recommendations[emailType] || recommendations.nurture

      // If specific day requested, validate and adjust if needed
      let recommendedDays = rec.bestDays
      if (dayOfWeek !== "any" && rec.bestDays.includes(dayOfWeek)) {
        recommendedDays = [dayOfWeek, ...rec.bestDays.filter(d => d !== dayOfWeek)]
      } else if (dayOfWeek !== "any") {
        recommendedDays = [dayOfWeek, ...rec.bestDays]
      }

      const recommendation = {
        emailType,
        targetAudience,
        bestDays: recommendedDays,
        bestTime: rec.bestTime,
        reason: rec.reason,
        alternativeDays: dayOfWeek !== "any" && !rec.bestDays.includes(dayOfWeek) 
          ? `Note: ${dayOfWeek} isn't optimal for ${emailType} emails, but ${rec.bestDays[0]} or ${rec.bestDays[1]} would perform better.`
          : null
      }

      const message = `🕐 SEND TIME RECOMMENDATION

Email Type: ${emailType}
Target Audience: ${targetAudience}

📅 BEST DAYS: ${recommendedDays.join(', ').toUpperCase()}
⏰ BEST TIME: ${rec.bestTime}

💡 WHY: ${rec.reason}
${recommendation.alternativeDays ? `\n⚠️ ${recommendation.alternativeDays}` : ''}

📋 EMAIL PLATFORM SETUP INSTRUCTIONS:

1. Go to your campaign in your email platform
2. Click "Schedule" or "Send Time"
3. Choose one of these days: ${recommendedDays.slice(0, 2).join(' or ')}
4. Set time to: ${rec.bestTime.split(' - ')[0]} (or within the ${rec.bestTime} window)
5. Confirm timezone is set to EST/EDT (Eastern Time)
6. Review and schedule

💡 PRO TIP: If sending to a global audience, use 9 AM EST as it hits both US coasts at good times.`

      console.log('[Alex] ✅ Recommended timing:', { emailType, bestDays: recommendedDays })

      return {
        success: true,
        recommendation,
        message,
        data: recommendation
      }
    } catch (error: any) {
      console.error('[Alex] ❌ Error recommending send timing:', error)
      return {
        success: false,
        error: error.message || 'Failed to recommend send timing'
      }
    }
  }
}


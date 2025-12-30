/**
 * Create Email Sequence Plan Tool
 * Creates strategic plans for multi-email sequences with timing recommendations
 */

import type { Tool, ToolResult } from '../../types'

interface CreateEmailSequencePlanInput {
  sequenceName: string
  targetAudience: string
  emailCount: number
  sequenceGoal: string
}

export const createEmailSequencePlanTool: Tool<CreateEmailSequencePlanInput> = {
  name: "create_email_sequence_plan",
  description: `Create a strategic plan for an email sequence with timing recommendations. Use this when Sandra wants to plan a multi-email campaign but needs guidance on timing and sequence structure.

Examples:
- "Plan a 3-email re-engagement sequence for beta customers"
- "Create a 5-email onboarding sequence for new Studio members"
- "Plan an upsell sequence to convert free users"

This tool provides:
- Recommended days between each email
- Suggested topics for each email based on the goal
- Strategic timing that follows email marketing best practices`,

  input_schema: {
    type: "object",
    properties: {
      sequenceName: {
        type: "string",
        description: "Name of the sequence (e.g., 'Beta Customer Re-engagement', 'New Studio Member Onboarding')"
      },
      targetAudience: {
        type: "string",
        description: "Who this sequence is for (e.g., 'beta customers', 'new Studio members', 'free users')"
      },
      emailCount: {
        type: "number",
        description: "How many emails in the sequence (typically 3-5)"
      },
      sequenceGoal: {
        type: "string",
        description: "What we're trying to achieve (e.g., 're-engage inactive users', 'onboard new members', 'convert free to paid')"
      }
    },
    required: ["sequenceName", "targetAudience", "emailCount", "sequenceGoal"]
  },

  async execute({ sequenceName, targetAudience, emailCount, sequenceGoal }: CreateEmailSequencePlanInput): Promise<ToolResult> {
    try {
      console.log('[Alex] 📅 Creating email sequence plan:', { sequenceName, emailCount, sequenceGoal })

      // Strategic timing templates based on email marketing best practices
      const timingTemplates: { [key: string]: number[] } = {
        're-engagement': [0, 3, 7, 14],
        'nurture': [0, 2, 5, 10, 21],
        'onboarding': [0, 1, 3, 7, 14],
        'upsell': [0, 4, 10]
      }

      // Determine sequence type based on goal
      const goalLower = sequenceGoal.toLowerCase()
      let timing = timingTemplates['nurture']
      let sequenceType = 'nurture'

      if (goalLower.includes('re-engage') || goalLower.includes('reactivate') || goalLower.includes('win back')) {
        timing = timingTemplates['re-engagement']
        sequenceType = 're-engagement'
      } else if (goalLower.includes('onboard') || goalLower.includes('welcome') || goalLower.includes('new member')) {
        timing = timingTemplates['onboarding']
        sequenceType = 'onboarding'
      } else if (goalLower.includes('upsell') || goalLower.includes('convert') || goalLower.includes('upgrade')) {
        timing = timingTemplates['upsell']
        sequenceType = 'upsell'
      }

      // Generate email plan with suggested topics
      const emails: any[] = []
      for (let i = 0; i < emailCount; i++) {
        const daysSinceStart = timing[i] !== undefined 
          ? timing[i] 
          : (timing[timing.length - 1] + (i - timing.length + 1) * 7)

        let suggestedTopic = ''
        if (sequenceType === 'onboarding') {
          const topics = [
            'Welcome and getting started',
            'Key features walkthrough',
            'Tips for success',
            'Advanced features',
            'Community and support'
          ]
          suggestedTopic = topics[i] || `Onboarding Email ${i + 1}`
        } else if (sequenceType === 're-engagement') {
          const topics = [
            'We miss you + what\'s new',
            'Success stories from similar customers',
            'Special offer or incentive',
            'Final check-in'
          ]
          suggestedTopic = topics[i] || `Re-engagement Email ${i + 1}`
        } else if (sequenceType === 'upsell') {
          const topics = [
            'Introduce premium benefits',
            'Social proof and testimonials',
            'Limited time offer'
          ]
          suggestedTopic = topics[i] || `Upsell Email ${i + 1}`
        } else {
          const topics = [
            'Educational content related to goal',
            'Value-add resources',
            'Case studies',
            'Community highlights',
            'Expert tips'
          ]
          suggestedTopic = topics[i] || `Nurture Email ${i + 1}`
        }

        emails.push({
          emailNumber: i + 1,
          daysSinceStart: daysSinceStart,
          suggestedTopic: suggestedTopic,
          status: 'not_created'
        })
      }

      const plan = {
        sequenceName,
        targetAudience,
        goal: sequenceGoal,
        sequenceType,
        emails
      }

      // Build next steps message
      const timingBreakdown = emails.map((e, idx) => {
        if (idx === 0) {
          return `Email ${e.emailNumber}: Send immediately (Day ${e.daysSinceStart})\n   Topic: ${e.suggestedTopic}`
        } else {
          const daysBetween = e.daysSinceStart - emails[idx - 1].daysSinceStart
          return `Email ${e.emailNumber}: Send ${daysBetween} days after Email ${idx} (Day ${e.daysSinceStart})\n   Topic: ${e.suggestedTopic}`
        }
      }).join('\n\n')

      const nextSteps = `📧 EMAIL SEQUENCE PLAN: ${sequenceName}

🎯 Target Audience: ${targetAudience}
🎯 Goal: ${sequenceGoal}
📊 Sequence Type: ${sequenceType}
📨 Total Emails: ${emailCount}

⏰ RECOMMENDED SCHEDULE:

${timingBreakdown}

📌 NEXT STEPS:

1. Create Email 1 content using create_email_sequence tool
2. Set up sequence in Resend with automation delays:
   ${emails.slice(1).map((e, idx) => `   - Email ${e.emailNumber}: ${e.daysSinceStart - emails[idx].daysSinceStart} days after Email ${idx + 1}`).join('\n   ')}
3. Build each email in your email platform following the topic suggestions above
4. Test the sequence before activating

💡 TIP: Use recommend_send_timing tool to get optimal send times for each email based on day of week.`

      console.log('[Alex] ✅ Created sequence plan:', { sequenceName, emailCount: emails.length })

      return {
        success: true,
        plan,
        message: nextSteps,
        data: plan
      }
    } catch (error: any) {
      console.error('[Alex] ❌ Error creating sequence plan:', error)
      return {
        success: false,
        error: error.message || 'Failed to create sequence plan'
      }
    }
  }
}


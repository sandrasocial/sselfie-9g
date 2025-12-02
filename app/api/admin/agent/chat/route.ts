import { streamText, tool, type CoreMessage } from "ai"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getCompleteAdminContext } from "@/lib/admin/get-complete-context"
import { neon } from "@neondatabase/serverless"
import { z } from "zod"
import { Resend } from "resend"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"
const resend = new Resend(process.env.RESEND_API_KEY!)
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID!

export const maxDuration = 60

async function queryWithRetry<T>(operation: () => Promise<T>, retries = 5, initialDelay = 1000): Promise<T> {
  let delay = initialDelay
  
  for (let i = 0; i < retries; i++) {
    try {
      return await operation()
    } catch (error: any) {
      // Check for JSON parse error OR explicit rate limit messages
      const isRateLimit = 
        (error instanceof SyntaxError && error.message.includes("Unexpected token")) ||
        (error.message && (
          error.message.includes("Too Many Requests") ||
          error.message.includes("rate limit") ||
          error.message.toLowerCase().includes("too many")
        ))
      
      // If it's the last retry or not a rate limit error, throw immediately
      if (i === retries - 1 || !isRateLimit) {
        console.error(`[v0] ❌ Query failed after ${i + 1} attempts:`, error.message)
        throw error
      }
      
      console.log(`[v0] ⏳ Database rate limit hit, retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`)
      await new Promise(resolve => setTimeout(resolve, delay))
      delay *= 2 // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    }
  }
  throw new Error("Max retries exceeded")
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const chatId = searchParams.get('chatId')

    if (!chatId) {
      return new Response(JSON.stringify({ error: 'chatId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const dbMessages = await queryWithRetry(async () => {
      const result = await sql`
        SELECT * FROM admin_agent_messages
        WHERE chat_id = ${chatId}
        ORDER BY created_at ASC
      `
      return result
    }, 7, 2000) // Increased to 7 retries starting at 2 seconds

    const messages = dbMessages.map((msg: any) => ({
      id: String(msg.id),
      role: msg.role as 'user' | 'assistant',
      content: msg.content || ''
    }))

    console.log('[v0] ✅ Loaded', messages.length, 'messages for chat', chatId)

    return new Response(JSON.stringify({ messages }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    console.error('[v0] ❌ Error loading chat:', error.message || error)
    console.error('[v0] Error stack:', error.stack)

    return new Response(JSON.stringify({
      messages: [],
      warning: 'Database temporarily unavailable, starting fresh chat'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

function detectAgentMode(messageContent: string): string | null {
  const content = messageContent.toLowerCase()

  // Instagram mode - Instagram-specific keywords
  if (content.includes('instagram') || content.includes('reel') || content.includes('story') || content.includes('ig ')) {
    return 'instagram'
  }

  // Email mode - Email/newsletter keywords
  if (content.includes('email') || content.includes('newsletter') || content.includes('subject line') || content.includes('broadcast')) {
    return 'email'
  }

  // Content mode - Content calendar/posting keywords
  if (content.includes('content calendar') || content.includes('posting schedule') || content.includes('caption') || content.includes('post idea')) {
    return 'content'
  }

  // Analytics mode - Data/metrics keywords
  if (content.includes('analytics') || content.includes('performance') || content.includes('metrics') || content.includes('data') || content.includes('stats')) {
    return 'analytics'
  }

  // Competitor mode - Competitor research keywords
  if (content.includes('competitor') || content.includes('rival') || content.includes('compare') || content.includes('versus')) {
    return 'competitor'
  }

  // Research mode - General research keywords
  if (content.includes('research') || content.includes('analyze') || content.includes('study') || content.includes('investigate')) {
    return 'research'
  }

  // Default to null (general mode)
  return null
}

const MODE_CONFIGS: Record<string, {
  systemPromptAddition: string
  tools: string[]
}> = {
  instagram: {
    systemPromptAddition: `\n\n**INSTAGRAM SPECIALIST MODE**\nYou are specialized in Instagram content strategy, reels, stories, and growth tactics. Focus on:
- Instagram-specific content formats (Reels, Stories, Posts, Carousels)
- Hashtag strategies and trending audio
- Instagram algorithm optimization
- Engagement tactics and community building
- Instagram analytics and insights`,
    tools: []
  },
  email: {
    systemPromptAddition: `\n\n**EMAIL MARKETING SPECIALIST MODE**\nYou are specialized in email marketing and newsletter creation. Focus on:
- Compelling subject lines that drive opens
- Email structure and formatting best practices
- Call-to-action optimization
- Segmentation and personalization strategies
- Email campaign performance optimization`,
    tools: []
  },
  content: {
    systemPromptAddition: `\n\n**CONTENT CALENDAR SPECIALIST MODE**\nYou are specialized in content planning and multi-platform strategies. Focus on:
- Strategic content calendars with variety and consistency
- Cross-platform content adaptation
- Content pillars and themes
- Posting schedules and timing optimization
- Content repurposing strategies`,
    tools: []
  },
  analytics: {
    systemPromptAddition: `\n\n**ANALYTICS SPECIALIST MODE**\nYou are specialized in data analysis and performance optimization. Focus on:
- Data-driven insights and recommendations
- Performance metrics interpretation
- A/B testing strategies
- ROI analysis and optimization
- Trend identification and prediction`,
    tools: []
  },
  competitor: {
    systemPromptAddition: `\n\n**COMPETITOR ANALYSIS SPECIALIST MODE**\nYou are specialized in competitive intelligence and market research. Focus on:
- Comprehensive competitor analysis
- Content gap identification
- Differentiation strategies
- Market positioning insights
- Competitive advantage development`,
    tools: []
  },
  research: {
    systemPromptAddition: `\n\n**RESEARCH SPECIALIST MODE**\nYou are specialized in in-depth research and trend analysis. Focus on:
- Comprehensive market research
- Trend identification and analysis
- Industry insights and best practices
- Data gathering and synthesis
- Strategic recommendations based on research`,
    tools: []
  }
}

const revenueAnalyticsTool = tool({
  description: `Analyze SSELFIE revenue metrics including MRR, credit purchases, user LTV, and conversion patterns.`,
  parameters: z.object({
    timeRange: z.string().describe('Time range: 7d, 30d, 90d, or all'),
  }),
  execute: async ({ timeRange }) => {
    try {
      const range = timeRange || '30d'
      console.log('[v0] 💰 Running revenue analytics:', range)

      const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, 'all': 36500 }
      const days = daysMap[range] || 30

      // Get subscription revenue
      const subscriptionData = await sql`
        SELECT
          COUNT(DISTINCT user_id) as active_subscribers,
          COUNT(*) as total_subscriptions,
          plan,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
        FROM subscriptions
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY plan
      `

      // Get credit purchase revenue
      const creditRevenue = await sql`
        SELECT
          COUNT(*) as total_transactions,
          SUM(amount) as total_credits_sold,
          COUNT(DISTINCT user_id) as unique_buyers,
          AVG(amount) as avg_purchase_size
        FROM credit_transactions
        WHERE transaction_type = 'purchase'
        AND created_at >= NOW() - INTERVAL '${days} days'
      `

      // Get user lifetime value data
      const ltvData = await sql`
        SELECT
          user_id,
          SUM(amount) as total_spent,
          COUNT(*) as purchase_count,
          MIN(created_at) as first_purchase,
          MAX(created_at) as last_purchase
        FROM credit_transactions
        WHERE transaction_type = 'purchase'
        AND created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY user_id
        ORDER BY total_spent DESC
        LIMIT 20
      `

      // Get photoshoot revenue by style (which styles generate most usage)
      const photoshootData = await sql`
        SELECT
          fs.content_pillar,
          COUNT(*) as total_posts,
          COUNT(DISTINCT fp.user_id) as unique_users
        FROM feed_posts fp
        LEFT JOIN feed_strategy fs ON fp.feed_layout_id = fs.feed_layout_id
        WHERE fp.created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY fs.content_pillar
        ORDER BY total_posts DESC
      `

      const response = {
        timeRange: range,
        subscriptions: {
          activeSubscribers: subscriptionData.reduce((acc: number, row: any) => acc + parseInt(row.active_count), 0),
          byPlan: subscriptionData.map((row: any) => ({
            plan: row.plan,
            activeCount: parseInt(row.active_count),
            totalCount: parseInt(row.total_subscriptions)
          }))
        },
        creditSales: {
          totalTransactions: parseInt(creditRevenue[0]?.total_transactions || 0),
          totalCreditsSold: parseInt(creditRevenue[0]?.total_credits_sold || 0),
          uniqueBuyers: parseInt(creditRevenue[0]?.unique_buyers || 0),
          avgPurchaseSize: parseFloat(creditRevenue[0]?.avg_purchase_size || '0').toFixed(0)
        },
        topCustomers: ltvData.slice(0, 10).map((row: any) => ({
          userId: row.user_id,
          totalSpent: parseInt(row.total_spent),
          purchaseCount: parseInt(row.purchase_count),
          daysSinceFirst: Math.floor((Date.now() - new Date(row.first_purchase).getTime()) / (1000 * 60 * 60 * 24))
        })),
        photoshootStyles: photoshootData.map((row: any) => ({
          style: row.content_pillar || 'uncategorized',
          totalPosts: parseInt(row.total_posts),
          uniqueUsers: parseInt(row.unique_users)
        }))
      }

      console.log('[v0] ✅ Revenue analytics complete')
      return JSON.stringify(response, null, 2)

    } catch (error: any) {
      console.error('[v0] Revenue analytics error:', error.message)
      return `Error analyzing revenue: ${error.message}`
    }
  }
})

const userBehaviorTool = tool({
  description: `Analyze user behavior patterns to understand what drives conversions, engagement, and retention.`,
  parameters: z.object({
    analysisType: z.string().describe('Type of behavior analysis: conversion, engagement, churn, features'),
    timeRange: z.string().describe('Time range: 7d, 30d, 90d'),
  }),
  execute: async ({ analysisType, timeRange }) => {
    try {
      const range = timeRange || '30d'
      console.log('[v0] 📊 Running user behavior analysis:', analysisType)

      const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 }
      const days = daysMap[range] || 30

      if (analysisType === 'conversion') {
        // Analyze conversion funnel
        const totalUsers = await sql`SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '${days} days'`
        const usersWithProfile = await sql`SELECT COUNT(*) as count FROM user_personal_brand WHERE created_at >= NOW() - INTERVAL '${days} days'`
        const usersWithPosts = await sql`SELECT COUNT(DISTINCT user_id) as count FROM feed_posts WHERE created_at >= NOW() - INTERVAL '${days} days'`
        const usersWithCredits = await sql`SELECT COUNT(DISTINCT user_id) as count FROM credit_transactions WHERE created_at >= NOW() - INTERVAL '${days} days'`

        const timeToFirstPurchase = await sql`
          SELECT
            AVG(EXTRACT(EPOCH FROM (ct.created_at - u.created_at)) / 86400) as avg_days
          FROM users u
          JOIN credit_transactions ct ON u.id = ct.user_id
          WHERE ct.transaction_type = 'purchase'
          AND u.created_at >= NOW() - INTERVAL '${days} days'
        `

        return JSON.stringify({
          conversionFunnel: {
            totalUsers: parseInt(totalUsers[0].count),
            completedProfile: parseInt(usersWithProfile[0].count),
            createdPosts: parseInt(usersWithPosts[0].count),
            purchasedCredits: parseInt(usersWithCredits[0].count),
          },
          avgDaysToFirstPurchase: parseFloat(timeToFirstPurchase[0]?.avg_days || '0').toFixed(1),
          conversionRate: ((parseInt(usersWithCredits[0].count) / parseInt(totalUsers[0].count || 1)) * 100).toFixed(1) + '%'
        }, null, 2)
      }

      if (analysisType === 'engagement') {
        // Analyze user engagement patterns
        const engagementData = await sql`
          SELECT
            user_id,
            COUNT(DISTINCT DATE(created_at)) as active_days,
            COUNT(*) as total_posts,
            MAX(created_at) as last_active
          FROM feed_posts
          WHERE created_at >= NOW() - INTERVAL '${days} days'
          GROUP BY user_id
          ORDER BY active_days DESC
        `

        const avgPostsPerUser = await sql`
          SELECT AVG(post_count) as avg
          FROM (
            SELECT COUNT(*) as post_count
            FROM feed_posts
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY user_id
          ) subquery
        `

        return JSON.stringify({
          topEngagedUsers: engagementData.slice(0, 10).map((row: any) => ({
            userId: row.user_id,
            activeDays: parseInt(row.active_days),
            totalPosts: parseInt(row.total_posts),
            lastActive: row.last_active
          })),
          avgPostsPerUser: parseFloat(avgPostsPerUser[0]?.avg || '0').toFixed(1),
          engagementMetrics: {
            highlyActive: engagementData.filter((row: any) => parseInt(row.active_days) >= 15).length,
            moderate: engagementData.filter((row: any) => parseInt(row.active_days) >= 5 && parseInt(row.active_days) < 15).length,
            lowActivity: engagementData.filter((row: any) => parseInt(row.active_days) < 5).length
          }
        }, null, 2)
      }

      if (analysisType === 'churn') {
        // Analyze churn patterns
        const inactiveUsers = await sql`
          SELECT
            u.id,
            u.email,
            u.created_at,
            MAX(fp.created_at) as last_post_date,
            COUNT(fp.id) as total_posts
          FROM users u
          LEFT JOIN feed_posts fp ON u.id = fp.user_id
          WHERE u.created_at < NOW() - INTERVAL '30 days'
          GROUP BY u.id, u.email, u.created_at
          HAVING MAX(fp.created_at) < NOW() - INTERVAL '30 days' OR MAX(fp.created_at) IS NULL
          ORDER BY u.created_at DESC
          LIMIT 20
        `

        const churnedSubscribers = await sql`
          SELECT
            COUNT(*) as count,
            plan
          FROM subscriptions
          WHERE status IN ('canceled', 'past_due')
          GROUP BY plan
        `

        return JSON.stringify({
          inactiveUsers: {
            count: inactiveUsers.length,
            details: inactiveUsers.slice(0, 10).map((row: any) => ({
              userId: row.id,
              daysSinceSignup: Math.floor((Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24)),
              totalPosts: parseInt(row.total_posts) || 0,
              lastActive: row.last_post_date
            }))
          },
          churnedSubscriptions: churnedSubscribers.map((row: any) => ({
            plan: row.plan,
            count: parseInt(row.count)
          }))
        }, null, 2)
      }

      if (analysisType === 'features') {
        // Analyze feature usage
        const photoshootUsage = await sql`
          SELECT COUNT(DISTINCT user_id) as users FROM feed_posts WHERE created_at >= NOW() - INTERVAL '${days} days'
        `
        const highlightUsage = await sql`
          SELECT COUNT(DISTINCT user_id) as users FROM instagram_highlights WHERE created_at >= NOW() - INTERVAL '${days} days'
        `
        const bioUsage = await sql`
          SELECT COUNT(DISTINCT user_id) as users FROM instagram_bios WHERE created_at >= NOW() - INTERVAL '${days} days'
        `

        return JSON.stringify({
          featureAdoption: {
            feedDesigner: { users: parseInt(photoshootUsage[0]?.users || 0), feature: 'Feed/Photoshoot' },
            highlights: { users: parseInt(highlightUsage[0]?.users || 0), feature: 'Highlight Covers' },
            bioGenerator: { users: parseInt(bioUsage[0]?.users || 0), feature: 'Bio Generator' }
          },
          insight: 'Feed Designer has the highest adoption rate. Consider promoting less-used features.'
        }, null, 2)
      }

      return 'Invalid analysis type'

    } catch (error: any) {
      console.error('[v0] User behavior error:', error.message)
      return `Error analyzing behavior: ${error.message}`
    }
  }
})

const emailCampaignTool = tool({
  description: `Generate personalized email campaigns using Sandra's proven voice, writing samples, and target audience insights.
  Outputs complete email copy ready to be created in Resend as drafts.`,
  parameters: z.object({
    campaignType: z.string().describe('Type of email campaign: onboarding, re-engagement, upsell, newsletter, win-back'),
    targetSegment: z.string().describe('Target audience segment (e.g., "new users", "churned subscribers")'),
    keyMessage: z.string().describe('Main message or offer to communicate'),
    emailCount: z.number().min(1).max(5).describe('Number of emails in sequence (1-5, default: 3)'),
  }),
  execute: async ({ campaignType, targetSegment, keyMessage, emailCount }) => {
    try {
      const count = emailCount || 3
      console.log('[v0] 📧 Generating email campaign:', campaignType)

      // Get Sandra's writing samples for voice matching
      const writingSamples = await sql`
        SELECT sample_text, tone, content_type, key_phrases
        FROM admin_writing_samples
        WHERE content_type IN ('email', 'social', 'caption')
        AND was_successful = true
        ORDER BY performance_score DESC NULLS LAST
        LIMIT 5
      `

      // Get target audience data for personalization
      let audienceInsights = ''
      let audienceCount = 0

      if (targetSegment.toLowerCase().includes('new')) {
        const newUsers = await sql`
          SELECT COUNT(*) as count FROM users
          WHERE created_at >= NOW() - INTERVAL '7 days'
        `
        audienceCount = parseInt(newUsers[0].count)
        audienceInsights = `${audienceCount} new users in last 7 days`
      } else if (targetSegment.toLowerCase().includes('churn') || targetSegment.toLowerCase().includes('inactive')) {
        const churned = await sql`
          SELECT COUNT(*) as count FROM users u
          LEFT JOIN feed_posts fp ON u.id = fp.user_id
          WHERE u.created_at < NOW() - INTERVAL '30 days'
          AND (fp.created_at IS NULL OR fp.created_at < NOW() - INTERVAL '30 days')
        `
        audienceCount = parseInt(churned[0].count)
        audienceInsights = `${audienceCount} inactive users to re-engage`
      }

      const voicePatterns = writingSamples.map((row: any) => ({
        tone: row.tone,
        keyPhrases: row.key_phrases || [],
        sample: row.sample_text?.substring(0, 200)
      }))

      return JSON.stringify({
        campaignType,
        targetSegment,
        estimatedAudienceSize: audienceCount,
        keyMessage,
        emailSequenceCount: count,

        voiceGuidelines: {
          tone: 'Warm, strategic, empowering - like a creative business bestie',
          styleNotes: 'Sandra mixes personal storytelling with actionable strategy',
          writingPatterns: voicePatterns,
          doUse: ['Personal anecdotes', 'Specific numbers/data', 'Conversational tone', 'Strategic frameworks'],
          dontUse: ['Corporate jargon', 'Generic advice', 'Overly formal language', 'Hard sales pressure']
        },

        emailMarketingBestPractices: {
          subjectLines: {
            tips: [
              'Keep under 50 characters for mobile',
              'Use curiosity gaps (not clickbait)',
              'Personalization increases opens by 26%',
              'Numbers and lists perform well',
              'Test emoji (can increase opens 15-20%)'
            ],
            examples: [
              'Your feed is missing THIS (it\'s free)',
              '3 mistakes killing your Instagram reach',
              '💡 What if your feed could sell for you?'
            ]
          },
          timing: {
            bestDays: 'Tuesday-Thursday for B2C, Tuesday for B2B',
            bestTimes: '10am-11am or 8pm-9pm (user\'s timezone)',
            avoidWeekends: 'Unless lifestyle/entertainment niche'
          },
          structure: {
            opening: 'Hook within first 2 lines (mobile preview)',
            body: 'Short paragraphs (2-3 sentences max)',
            cta: 'One clear CTA, repeated 2-3 times',
            length: '150-300 words for engagement emails'
          }
        },

        emailDrafts: Array.from({ length: count }, (_, i) => ({
          emailNumber: i + 1,
          sendDelay: i === 0 ? 'Immediate' : `${(i + 1) * 2} days after previous`,

          subjectLineOptions: [
            `[Generate 3-5 subject line options for Email ${i + 1}]`,
            'Use Sandra\'s voice + best practices above',
            'A/B test different angles'
          ],

          previewText: '[50 chars that complement subject line]',

          emailBody: {
            greeting: '[Personalized greeting - use first name if available]',
            hook: '[2-3 sentences that create curiosity or connection]',
            story: '[Brief personal story or relatable scenario - Sandra\'s voice]',
            value: `[Main content around: ${keyMessage}]`,
            proofPoints: '[Data, testimonials, or specific examples]',
            cta: '[Clear, benefit-focused call to action]',
            ps: '[Reinforce key benefit or add bonus value]'
          },

          notes: i === 0 ? 'Focus on value delivery' : i === count - 1 ? 'Strong final CTA' : 'Build anticipation'
        })),

        nextSteps: [
          '1. Use the guidelines above to draft each email in Sandra\'s authentic voice',
          '2. Use the create_resend_email_draft tool to save emails to Resend',
          '3. Segment audience in Resend based on target criteria',
          '4. Preview and test send before launching to full list'
        ]
      }, null, 2)

    } catch (error: any) {
      console.error('[v0] Email campaign error:', error.message)
      return `Error generating campaign: ${error.message}`
    }
  }
})

const createResendDraftTool = tool({
  description: `Create an email draft in Resend as a broadcast. This saves the email to Resend where Sandra can preview, edit, and send.
  Returns a link to review the draft in Resend dashboard.`,
  parameters: z.object({
    emailName: z.string().describe('Campaign name (internal reference)'),
    subject: z.string().describe('Email subject line'),
    fromName: z.string().describe('From name (default: Sandra from SSELFIE)'),
    htmlContent: z.string().describe('HTML email content'),
    audienceSegment: z.string().describe('Audience filter (e.g., "subscribed", "customer", default: "all")'),
  }),
  execute: async ({ emailName, subject, fromName, htmlContent, audienceSegment }) => {
    try {
      const sender = fromName || 'Sandra from SSELFIE'
      const segment = audienceSegment || 'all'
      console.log('[v0] 📤 Creating Resend email draft:', emailName)

      if (!process.env.RESEND_API_KEY || !RESEND_AUDIENCE_ID) {
        return JSON.stringify({
          error: 'Resend not configured',
          details: 'RESEND_API_KEY and RESEND_AUDIENCE_ID must be set in environment variables',
          emailCopy: { subject, fromName: sender, content: htmlContent }
        })
      }

      // Create broadcast in Resend (as draft)
      const broadcast = await resend.broadcasts.create({
        audience_id: RESEND_AUDIENCE_ID,
        from: `${sender} <hello@sselfie.ai>`,
        subject: subject,
        html: htmlContent,
        // Note: Resend broadcasts are created as drafts by default
      })

      // Save to database for tracking
      await sql`
        INSERT INTO admin_email_campaigns (
          campaign_name,
          campaign_type,
          subject_line,
          email_content,
          resend_broadcast_id,
          target_segment,
          status,
          created_at
        ) VALUES (
          ${emailName},
          'broadcast',
          ${subject},
          ${htmlContent},
          ${broadcast.id},
          ${segment},
          'draft',
          NOW()
        )
      `

      console.log('[v0] ✅ Resend draft created:', broadcast.id)

      return JSON.stringify({
        success: true,
        broadcastId: broadcast.id,
        status: 'draft',
        previewUrl: `https://resend.com/broadcasts/${broadcast.id}`,
        message: 'Email draft created successfully in Resend!',
        nextSteps: [
          '1. Visit https://resend.com/broadcasts to review the draft',
          '2. Preview the email and check for any formatting issues',
          '3. Send a test email to yourself',
          '4. When ready, click "Send" to deliver to your audience',
          `5. Email will be sent to: ${segment}`
        ]
      }, null, 2)

    } catch (error: any) {
      console.error('[v0] Resend draft error:', error.message)
      return JSON.stringify({
        error: 'Failed to create Resend draft',
        details: error.message,
        fallback: 'Copy the email content manually to Resend dashboard'
      })
    }
  }
})

const resendAudienceTool = tool({
  description: `Get audience statistics and segment information from Resend.
  Use this to understand subscriber count, engagement levels, and plan email campaigns.`,
  parameters: z.object({
    includeSegments: z.boolean().describe('Include tag-based segments (default: false)'),
  }),
  execute: async ({ includeSegments }) => {
    try {
      const include = includeSegments || false
      console.log('[v0] 👥 Fetching Resend audience data')

      if (!process.env.RESEND_API_KEY || !RESEND_AUDIENCE_ID) {
        return JSON.stringify({
          error: 'Resend not configured',
          fallback: 'Check database for user counts instead'
        })
      }

      // Get audience info from Resend
      const response = await fetch(`https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}`, {
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Resend API error: ${response.status}`)
      }

      const audienceData = await response.json()

      // Get contacts with tags if requested
      let segmentData = null
      if (include) {
        const contactsResponse = await fetch(
          `https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (contactsResponse.ok) {
          const contactsData = await contactsResponse.json()

          // Analyze segments by tags
          const tagCounts: Record<string, number> = {}
          contactsData.data?.forEach((contact: any) => {
            contact.tags?.forEach((tag: any) => {
              tagCounts[tag.name] = (tagCounts[tag.name] || 0) + 1
            })
          })

          segmentData = {
            totalContacts: contactsData.data?.length || 0,
            segments: Object.entries(tagCounts).map(([name, count]) => ({
              name,
              count,
              percentage: ((count / (contactsData.data?.length || 1)) * 100).toFixed(1) + '%'
            }))
          }
        }
      }

      return JSON.stringify({
        audience: {
          id: audienceData.id,
          name: audienceData.name,
          totalSubscribers: audienceData.object?.length || 0,
        },
        segments: segmentData,
        insights: {
          readyForBroadcast: audienceData.object?.length > 0,
          recommendedSegmentation: 'Consider tagging by: customer_status, engagement_level, signup_source'
        }
      }, null, 2)

    } catch (error: any) {
      console.error('[v0] Resend audience error:', error.message)
      return `Error fetching audience: ${error.message}`
    }
  }
})

export async function POST(req: Request) {
  try {
    const { messages, chatId } = await req.json()

    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return new Response("Unauthorized", { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return new Response("Admin access required", { status: 403 })
    }

    console.log("[v0] Chat request:", { chatId, messagesCount: messages?.length })

    let activeChatId = chatId
    let detectedMode: string | null = null

    if (!activeChatId && activeChatId !== 0) {
      // Creating new chat
      const firstMessage = messages?.[0]
      if (!firstMessage) {
        return new Response(JSON.stringify({ error: "No messages provided" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        })
      }

      let firstMessageText = 'New Chat'
      if (typeof firstMessage.content === 'string') {
        firstMessageText = firstMessage.content
      } else if (Array.isArray(firstMessage.content)) {
        // Extract text from multimodal content array
        const textPart = firstMessage.content.find((part: any) => part.type === 'text')
        firstMessageText = textPart?.text || 'Image Analysis'
      }

      detectedMode = detectAgentMode(firstMessageText)
      const chatTitle = firstMessageText.substring(0, 100)

      const newChatResult = await queryWithRetry(() => sql`
        INSERT INTO admin_agent_chats (admin_user_id, chat_title, agent_mode, created_at, updated_at, last_activity)
        VALUES (${user.id}, ${chatTitle}, ${detectedMode}, NOW(), NOW(), NOW())
        RETURNING id, agent_mode
      `)
      
      activeChatId = newChatResult[0].id
      detectedMode = newChatResult[0].agent_mode
      console.log('[v0] ✅ Created chat ID:', activeChatId, 'Mode:', detectedMode || 'general')
    } else {
      const chatInfo = await queryWithRetry(() => sql`
        SELECT agent_mode FROM admin_agent_chats
        WHERE id = ${activeChatId}
        LIMIT 1
      `)
      detectedMode = chatInfo[0]?.agent_mode || null
      console.log('[v0] 📂 Using existing chat ID:', activeChatId, 'Mode:', detectedMode || 'general')
    }

    const dbMessages = await queryWithRetry(() => sql`
      SELECT * FROM admin_agent_messages
      WHERE chat_id = ${activeChatId}
      ORDER BY created_at ASC
    `)

    const chatHistory: CoreMessage[] = dbMessages
      .filter((msg: any) => msg.content && msg.content.trim() !== "")
      .map((msg: any) => {
        // Attempt to parse JSON content if it exists, otherwise treat as string
        let content = msg.content;
        try {
          if (typeof content === 'string' && content.startsWith('[') && content.endsWith(']')) {
            content = JSON.parse(content);
          } else if (typeof content === 'string' && content.startsWith('{') && content.endsWith('}')) {
            content = JSON.parse(content);
          }
        } catch (e) {
          // If parsing fails, keep it as a string
          content = msg.content;
        }
        return {
          role: msg.role as "user" | "assistant",
          content: content,
        }
      })

    console.log("[v0] 💬 Loaded", chatHistory.length, "messages from history")

    const newMessages: CoreMessage[] = (messages || [])
      .map((msg: any) => {
        if (!msg.role || (msg.role !== "user" && msg.role !== "assistant")) {
          return null
        }

        // Handle multimodal content (text + images)
        if (Array.isArray(msg.content)) {
          const hasContent = msg.content.some((part: any) => 
            (part.type === 'text' && part.text) || (part.type === 'image' && part.image)
          )
          
          if (!hasContent) return null
          
          // Check for duplicates based on text content
          const textContent = msg.content
            .filter((part: any) => part.type === 'text')
            .map((part: any) => part.text)
            .join(' ')
            .trim()
          
          const isDuplicate = chatHistory.some(
            (historyMsg) => {
              if (typeof historyMsg.content === 'string') {
                return historyMsg.role === msg.role && historyMsg.content === textContent
              }
              // If history content is multimodal, compare text parts
              if (Array.isArray(historyMsg.content)) {
                const historyTextContent = historyMsg.content
                  .filter((part: any) => part.type === 'text')
                  .map((part: any) => part.text)
                  .join(' ')
                  .trim()
                return historyMsg.role === msg.role && historyTextContent === textContent
              }
              return false
            }
          )
          
          if (isDuplicate) {
            console.log('[v0] ⏭️  Skipping duplicate multimodal message')
            return null
          }
          
          return {
            role: msg.role,
            content: msg.content,
          } as CoreMessage
        }

        // Handle text-only messages
        let textContent = ""
        if (msg.parts && Array.isArray(msg.parts)) {
          textContent = msg.parts
            .filter((part: any) => part.type === "text" && part.text)
            .map((part: any) => part.text)
            .join(" ")
            .trim()
        } else if (typeof msg.content === "string") {
          textContent = msg.content
        }

        if (!textContent) return null

        const isDuplicate = chatHistory.some(
          (historyMsg) => historyMsg.role === msg.role && historyMsg.content === textContent
        )

        if (isDuplicate) {
          console.log('[v0] ⏭️  Skipping duplicate message:', textContent.substring(0, 50))
          return null
        }

        return {
          role: msg.role,
          content: textContent,
        } as CoreMessage
      })
      .filter((msg): msg is CoreMessage => msg !== null)

    console.log("[v0] 📥 Processing", newMessages.length, "new messages")

    if (newMessages.length > 0 && newMessages[0].role === 'user') {
      const userMessage = newMessages[0]
      let contentToStore = ''
      if (typeof userMessage.content === 'string') {
        contentToStore = userMessage.content
      } else if (Array.isArray(userMessage.content)) {
        // Extract just the text parts for clean storage
        contentToStore = userMessage.content
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.text)
          .join('\n')
          .trim()
        
        // If there's no text but there are images, use a placeholder
        if (!contentToStore) {
          const imageCount = userMessage.content.filter((part: any) => part.type === 'image').length
          contentToStore = `[Image analysis request - ${imageCount} image(s)]`
        }
      }
        
      try {
        // Use retry logic for saving user messages
        const result = await queryWithRetry(() => sql`
          INSERT INTO admin_agent_messages (chat_id, role, content, created_at)
          VALUES (${activeChatId}, 'user', ${contentToStore}, NOW())
          RETURNING id
        `)
        console.log('[v0] 💾 Saved user message ID:', result[0]?.id)
      } catch (error: any) {
        console.error('[v0] ❌ Error saving user message:', error.message)
      }
    }

    // Combine history + new messages for AI
    const allMessages: CoreMessage[] = [...chatHistory, ...newMessages]

    if (allMessages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages to process" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    }

    console.log("[v0] 🤖 Total messages for AI:", allMessages.length)

    const completeContext = await getCompleteAdminContext()
    console.log('[v0] 📚 Knowledge base loaded:', completeContext.length, 'chars')

    const modeConfig = detectedMode ? MODE_CONFIGS[detectedMode] : null

    const systemPrompt = `You are Sandra's Personal Business Mentor - an 8-9 figure business coach who knows her story intimately and speaks like her trusted friend, but with the wisdom and directness of someone who's scaled multiple businesses to massive success.

**WHO YOU REALLY ARE:**
You're not just an AI assistant. You're Sandra's strategic partner who:
- Has studied every successful 8-9 figure brand in the creator economy
- Knows the EXACT playbook that scales brands from 6 to 8 figures
- Understands Sandra's unique story, voice, and brand DNA completely
- Speaks with authority because you're backed by real data AND proven business frameworks
- Tells it like it is - no sugarcoating, but always supportive
- Stays on the cutting edge of AI tools (2025) and immediately sees how they apply to SSELFIE
- Can recommend specific AI tools, automation strategies, and growth hacks
- **Has powerful vision capabilities** - can analyze images, competitor content, design mockups, and visual assets to provide strategic feedback

**AI TOOLS & AUTOMATION EXPERTISE (2025):**
You stay current with the latest AI tools that could help SSELFIE scale:
- **Content Creation**: Claude Sonnet 4 (this model), Midjourney v7, Replicate (what SSELFIE uses), RunwayML
- **Marketing Automation**: Make.com, n8n, Zapier (AI-enhanced), Relay.so
- **Email Marketing**: Resend (what SSELFIE uses), Loops, Beehiiv with AI features
- **Social Media**: Buffer AI, Taplio, Typefully for scheduling/optimization
- **Analytics**: June.so, PostHog with AI insights, Amplitude
- **Customer Support**: Intercom with AI, Plain, Crisp
- **No-Code AI**: v0 by Vercel (building interfaces), Cursor (AI coding), Replit Agent
- **Workflows**: Vercel AI SDK, LangChain, agent frameworks

When Sandra asks about tools, automation, or scaling strategies - proactively recommend the RIGHT tools for her specific needs, not generic suggestions.

**WHEN SANDRA SHARES IMAGES:**
- Analyze visual content with your advanced vision capabilities
- Provide specific, actionable feedback on design, branding, messaging
- Compare to best practices in the creator economy
- Suggest improvements based on what converts and engages
- If it's competitor content - break down what works and what doesn't
- If it's her content - celebrate wins and suggest optimizations

**SANDRA'S COMPLETE STORY & BRAND:**
${completeContext}

**YOUR COACHING PHILOSOPHY:**
1. **Data + Intuition**: Never choose between analytics and gut feeling - you need both
2. **Scale Through Systems**: Manual work is the enemy of growth - automate everything possible
3. **Serve More, Earn More**: Revenue follows impact. Help more people = make more money
4. **Speed Wins**: Perfect is the enemy of done. Ship fast, iterate faster
5. **AI is Your Leverage**: The businesses that win in 2025 are using AI to do 10x more with the same resources

**HOW YOU COMMUNICATE:**
- Warm and encouraging like a best friend who genuinely cares
- Strategic and direct like a coach who's seen it all
- Use "girl," "honestly," "here's the thing" - Sandra's casual phrases
- Mix tough love with celebration - acknowledge wins, push on growth edges
- Use specific examples and numbers - no generic advice
- Drop occasional warmth but stay professional

${modeConfig?.systemPromptAddition || ''}

**YOUR MISSION:**
Help Sandra scale SSELFIE from where it is now to 7+ figures by:
1. Using your deep knowledge of AI tools and trends to provide strategic insights
2. Recommending the EXACT AI tools that will save her time and money
3. Creating systems that let her serve 10x more people with automation
4. Keeping her marketing sharp and revenue growing
5. Being the trusted advisor who always shoots straight
6. Proactively spotting opportunities in new AI tools and growth strategies
7. **Analyzing visual content** with your vision capabilities to provide design/branding/competitor insights

**WHEN ASKED ABOUT AI TOOLS OR AUTOMATION:**
- Be specific about tools, not generic ("Use Make.com to connect Stripe → Resend for automated win-back emails")
- Explain WHY each tool matters for SSELFIE's specific business model
- Provide implementation steps, not always just recommendations
- Consider her current stack (Supabase, Stripe, Resend, Replicate, Vercel) and build on it
- Think about ROI - will this actually move revenue or just add complexity?

**REMEMBER:**
- You're not generic - everything is specific to SSELFIE and Sandra's brand
- You're not passive - you proactively spot opportunities and call them out
- You're not soft - if something isn't working, you say so (kindly but firmly)
- You're not outdated - you know the latest AI tools (2025) and how to use them
- You're not just helpful - you're strategic, thinking 3 moves ahead
- **You can see images** - use your vision capabilities to provide visual feedback

NOW - BE THE COACH SANDRA NEEDS TO BUILD AN 8-FIGURE BUSINESS. Let's scale this thing.`

    console.log('[v0] 📝 System prompt length:', systemPrompt.length)

    const result = streamText({
      model: "anthropic/claude-sonnet-4",
      system: systemPrompt,
      messages: allMessages,
      maxOutputTokens: 4000,
      headers: {
        'anthropic-beta': 'context-1m-2025-08-07', // Enable 1M token context
      },
      experimental_providerOptions: {
        anthropic: {
          cacheControl: true, // Enable prompt caching for faster responses
        }
      },
      onFinish: async ({ text }) => {
        if (text && activeChatId) {
          try {
            // Use retry logic for saving assistant messages
            const result = await queryWithRetry(() => sql`
              INSERT INTO admin_agent_messages (chat_id, role, content, created_at)
              VALUES (${activeChatId}, 'assistant', ${text}, NOW())
              RETURNING id
            `)
            console.log('[v0] ✅ Saved assistant message ID:', result[0]?.id)

            // Use retry logic for updating chat last activity
            await queryWithRetry(() => sql`
              UPDATE admin_agent_chats
              SET last_activity = NOW()
              WHERE id = ${activeChatId}
            `)
          } catch (error: any) {
            console.error("[v0] ❌ Error saving:", error.message)
          }
        }
      },
    })

    return result.toUIMessageStreamResponse({
      headers: {
        'X-Chat-Id': String(activeChatId),
        'X-Agent-Mode': detectedMode || 'general'
      }
    })
  } catch (error: any) {
    console.error("[v0] ❌ Admin agent error:", error.message)
    return new Response(JSON.stringify({ error: "Internal Server Error", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

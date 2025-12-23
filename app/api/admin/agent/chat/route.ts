import { streamText, tool, generateText } from "ai"
import { z } from "zod"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getCompleteAdminContext } from "@/lib/admin/get-complete-context"
import { NextResponse } from "next/server"
import type { Request } from "next/server"
import { saveChatMessage, createNewChat } from "@/lib/data/admin-agent"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"

// HTML stripping function - uses regex fallback (works without html-to-text package)
// If html-to-text package is installed later, it can be enhanced, but this works fine for now

const sql = neon(process.env.DATABASE_URL!)

// Initialize Resend client - will be null if API key is missing
let resend: Resend | null = null
try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
} catch (error) {
  console.error("[v0] ⚠️ Failed to initialize Resend client:", error)
}

const ADMIN_EMAIL = "ssa@ssasocial.com"

export const maxDuration = 60

export async function POST(req: Request) {
  console.log("[v0] Admin agent chat API called")

  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      console.error("[v0] Authentication failed: No user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await req.json()
    const { messages, chatId } = body

    if (!messages) {
      console.error("[v0] Messages is null or undefined")
      return NextResponse.json({ error: "Messages is required" }, { status: 400 })
    }

    if (!Array.isArray(messages)) {
      console.error("[v0] Messages is not an array:", typeof messages)
      return NextResponse.json({ error: "Messages must be an array" }, { status: 400 })
    }

    if (messages.length === 0) {
      console.error("[v0] Messages array is empty")
      return NextResponse.json({ error: "Messages cannot be empty" }, { status: 400 })
    }

    // Process messages - extract text content
    const modelMessages = messages
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
      .map((m: any) => {
        let content = ""

        // Extract text from parts if available
        if (m.parts && Array.isArray(m.parts)) {
          const textParts = m.parts.filter((p: any) => p && p.type === "text")
          if (textParts.length > 0) {
            content = textParts.map((p: any) => p.text || "").join("\n")
          }
        }

        // Fallback to content string
        if (!content && m.content) {
          if (Array.isArray(m.content)) {
            const textParts = m.content.filter((p: any) => p && p.type === "text")
            content = textParts.map((p: any) => p.text || "").join("\n")
          } else {
            content = typeof m.content === "string" ? m.content : String(m.content)
          }
        }

        return {
          role: m.role as "user" | "assistant" | "system",
          content: content.trim(),
        }
      })
      .filter((m: any) => m.content && m.content.length > 0)

    if (modelMessages.length === 0) {
      console.error("[v0] No valid messages after filtering")
      return NextResponse.json({ error: "No valid messages to process" }, { status: 400 })
    }

    console.log(
      "[v0] Admin agent chat API called with",
      modelMessages.length,
      "messages (filtered from",
      messages.length,
      "), chatId:",
      chatId,
    )

    // Get or create chat
    let activeChatId = chatId
    if (!activeChatId) {
      // Create new chat from first message
      const firstMessage = modelMessages[0]
      const chatTitle = firstMessage.content.substring(0, 100) || "New Chat"
      const newChat = await createNewChat(user.id, chatTitle, null)
      activeChatId = newChat.id
      console.log("[v0] ✅ Created new chat ID:", activeChatId)
    }

    // Save the last user message to database
    const lastUserMessage = modelMessages.filter((m: any) => m.role === "user").pop()
    if (lastUserMessage && activeChatId) {
      try {
        await saveChatMessage(activeChatId, "user", lastUserMessage.content)
        console.log("[v0] 💾 Saved user message to chat:", activeChatId)
      } catch (error) {
        console.error("[v0] Error saving user message:", error)
        // Continue even if save fails
      }
    }

    // Get admin context
    const completeContext = await getCompleteAdminContext()
    console.log('[v0] 📚 Knowledge base loaded:', completeContext.length, 'chars')

    // Helper function to strip HTML tags for plain text version
    // Uses regex-based stripping (works without external packages)
    const stripHtml = (html: string): string => {
      return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/')
        .replace(/\s+/g, ' ') // Collapse whitespace
        .trim()
    }

    // Helper function to generate subject line using Claude
    const generateSubjectLine = async (intent: string, emailType: string): Promise<string> => {
      try {
        const { text } = await generateText({
          model: "anthropic/claude-sonnet-4-20250514",
          system: `You are Sandra's email marketing assistant. Generate warm, personal subject lines that match Sandra's voice: friendly, empowering, conversational. Keep it under 50 characters.`,
          prompt: `Generate a subject line for: ${intent}\n\nEmail type: ${emailType}\n\nReturn ONLY the subject line, no quotes, no explanation.`,
          maxTokens: 100,
        })
        return text.trim().replace(/^["']|["']$/g, '')
      } catch (error) {
        console.error("[v0] Error generating subject line:", error)
        return `Update from SSELFIE`
      }
    }

    // Define email tools
    // Define schema separately to ensure proper serialization
    const composeEmailSchema = z.object({
      intent: z.string().describe("What Sandra wants to accomplish with this email"),
      emailType: z.enum([
        'welcome',
        'newsletter', 
        'promotional',
        'announcement',
        'nurture',
        'reengagement'
      ]).describe("Type of email to create"),
      subjectLine: z.string().optional().describe("Subject line (generate if not provided)"),
      keyPoints: z.array(z.string()).optional().describe("Main points to include"),
      tone: z.enum(['warm', 'professional', 'excited', 'urgent']).optional().describe("Tone for the email (defaults to warm if not specified)"),
      previousVersion: z.string().optional().describe("Previous email HTML if refining")
    })

    const composeEmailTool = tool({
      description: `Create or refine email content. Returns formatted HTML email.
  
  Use this when Sandra wants to:
  - Create a new email campaign
  - Edit/refine existing email content
  - Generate subject lines
  - Use email templates
  
  Examples:
  - "Create a welcome email for new Studio members"
  - "Write a newsletter about the new Maya features"
  - "Make that email warmer and add a PS"`,
      
      parameters: composeEmailSchema,
      
      execute: async ({ intent, emailType, subjectLine, keyPoints, tone = 'warm', previousVersion }) => {
        try {
          // 1. Get email templates for this type
          const templates = await sql`
            SELECT body_html, subject_line 
            FROM email_template_library 
            WHERE category = ${emailType} AND is_active = true
            LIMIT 1
          `
          
          // 2. Use Claude to generate/refine email content
          const systemPrompt = `You are Sandra's email marketing assistant for SSELFIE Studio.
    
    Brand Voice: ${tone}, empowering, personal
    
    Context: 
    - SSELFIE Studio helps women entrepreneurs create professional photos with AI
    - Core message: Visibility = Financial Freedom
    - Audience: Women entrepreneurs, solopreneurs, coaches
    
    ${previousVersion ? 'Refine the previous version based on Sandra\'s request.' : 'Create a compelling email.'}
    
    ${templates[0]?.body_html ? `Template reference: ${templates[0].body_html.substring(0, 500)}` : 'Create from scratch'}
    
    Return ONLY valid HTML email content (no markdown, no explanations). Use proper HTML structure with DOCTYPE, inline styles, and responsive design. Include unsubscribe link: {{{RESEND_UNSUBSCRIBE_URL}}}`
          
          const userPrompt = `${intent}\n\n${keyPoints && keyPoints.length > 0 ? `Key points: ${keyPoints.join(', ')}\n\n` : ''}${previousVersion || ''}`
          
          const { text: emailHtml } = await generateText({
            model: "anthropic/claude-sonnet-4-20250514",
            system: systemPrompt,
            prompt: userPrompt,
            maxTokens: 2000,
          })
          
          // 3. Generate subject line if not provided
          const finalSubjectLine = subjectLine || await generateSubjectLine(intent, emailType)
          
          return {
            html: emailHtml.trim(),
            subjectLine: finalSubjectLine,
            preview: emailHtml.substring(0, 500) + '...',
            readyToSend: true
          }
        } catch (error: any) {
          console.error("[v0] Error in compose_email tool:", error)
          return {
            error: error.message || "Failed to compose email",
            html: "",
            subjectLine: "",
            preview: "",
            readyToSend: false
          }
        }
      }
    })

    const scheduleCampaignTool = tool({
      description: `Schedule or send an email campaign. Creates campaign in database and Resend.
  
  Use this when Sandra approves the email and wants to send it.
  
  CRITICAL: Always ask Sandra to confirm:
  1. Who should receive it (segment/audience)
  2. When to send (now or scheduled time)
  
  Before calling this tool.`,
      
      parameters: z.object({
        campaignName: z.string().describe("Name for this campaign"),
        subjectLine: z.string(),
        emailHtml: z.string().describe("The approved email HTML"),
        targetAudience: z.object({
          all_users: z.boolean().optional(),
          plan: z.string().optional(),
          resend_segment_id: z.string().optional(),
          recipients: z.array(z.string()).optional()
        }).describe("Who receives this email"),
        scheduledFor: z.string().optional().describe("ISO datetime to send, or null for immediate"),
        campaignType: z.string()
      }),
      
      execute: async ({ campaignName, subjectLine, emailHtml, targetAudience, scheduledFor, campaignType }) => {
        try {
          // 1. Create campaign in database
          const bodyText = stripHtml(emailHtml)
          
          const campaignResult = await sql`
            INSERT INTO admin_email_campaigns (
              campaign_name, campaign_type, subject_line,
              body_html, body_text, status, approval_status,
              target_audience, scheduled_for,
              created_by, created_at, updated_at
            ) VALUES (
              ${campaignName}, ${campaignType}, ${subjectLine},
              ${emailHtml}, ${bodyText}, 
              ${scheduledFor ? 'scheduled' : 'draft'}, 'approved',
              ${targetAudience}::jsonb, ${scheduledFor || null},
              ${ADMIN_EMAIL}, NOW(), NOW()
            )
            RETURNING id, campaign_name
          `
          
          // Validate campaign was created
          if (!campaignResult || campaignResult.length === 0 || !campaignResult[0]) {
            console.error("[v0] Failed to create campaign in database")
            return {
              success: false,
              error: "Failed to create campaign in database. Please try again.",
              campaignId: null,
            }
          }
          
          const campaign = campaignResult[0]
          
          // 2. If sending now, create Resend broadcast
          let broadcastId = null
          if (!scheduledFor) {
            if (!resend) {
              return {
                success: false,
                error: "Resend client not initialized. RESEND_API_KEY not configured.",
                campaignId: campaign.id,
              }
            }
            
            // Determine which audience/segment to target
            // If resend_segment_id is provided, use it (segments act as separate audiences in Resend)
            // Otherwise, use the default audience ID
            const targetAudienceId = targetAudience?.resend_segment_id || process.env.RESEND_AUDIENCE_ID
            
            if (!targetAudienceId) {
              return {
                success: false,
                error: targetAudience?.resend_segment_id 
                  ? "Segment ID provided but is invalid"
                  : "RESEND_AUDIENCE_ID not configured",
                campaignId: campaign.id,
              }
            }
            
            // Log which audience/segment is being targeted for debugging
            if (targetAudience?.resend_segment_id) {
              console.log(`[v0] Creating broadcast for segment: ${targetAudience.resend_segment_id}`)
            } else {
              console.log(`[v0] Creating broadcast for full audience: ${targetAudienceId}`)
            }
            
            try {
              const broadcast = await resend.broadcasts.create({
                audienceId: targetAudienceId,
                from: 'Sandra from SSELFIE <hello@sselfie.ai>',
                subject: subjectLine,
                html: emailHtml
              })
              
              broadcastId = broadcast.data?.id || null
              
              // Update campaign with broadcast ID
              await sql`
                UPDATE admin_email_campaigns 
                SET resend_broadcast_id = ${broadcastId}, status = 'sent'
                WHERE id = ${campaign.id}
              `
            } catch (resendError: any) {
              console.error("[v0] Error creating Resend broadcast:", resendError)
              return {
                success: false,
                error: `Campaign saved but Resend broadcast failed: ${resendError.message}`,
                campaignId: campaign.id,
              }
            }
          }
          
          return {
            success: true,
            campaignId: campaign.id,
            broadcastId,
            message: scheduledFor 
              ? `Campaign scheduled for ${new Date(scheduledFor).toLocaleString()}`
              : `Campaign sent! Check Resend dashboard for delivery status.`,
            resendUrl: broadcastId ? `https://resend.com/broadcasts/${broadcastId}` : null
          }
        } catch (error: any) {
          console.error("[v0] Error in schedule_campaign tool:", error)
          return {
            success: false,
            error: error.message || "Failed to schedule campaign",
            campaignId: null,
            broadcastId: null,
          }
        }
      }
    })

    const checkCampaignStatusTool = tool({
      description: `Check status of email campaigns and get delivery metrics.
  
  Use this when Sandra asks about email performance or delivery status.`,
      
      parameters: z.object({
        campaignId: z.number().optional().describe("Specific campaign ID, or null for recent campaigns"),
        timeframe: z.enum(['today', 'week', 'month', 'all']).optional().describe("Timeframe for campaigns (defaults to week if not specified)")
      }),
      
      execute: async ({ campaignId, timeframe = 'week' }) => {
        try {
          let campaigns
          
          if (campaignId) {
            // Get specific campaign
            campaigns = await sql`
              SELECT * FROM admin_email_campaigns 
              WHERE id = ${campaignId}
            `
          } else {
            // Get recent campaigns based on timeframe
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
          
          // For each campaign with resend_broadcast_id, fetch stats from email_logs
          const results = []
          for (const campaign of campaigns) {
            const logs = await sql`
              SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'sent') as sent,
                COUNT(*) FILTER (WHERE status = 'failed') as failed
              FROM email_logs
              WHERE email_type = 'campaign' 
              AND campaign_id = ${campaign.id}
            `
            
            results.push({
              id: campaign.id,
              name: campaign.campaign_name,
              status: campaign.status,
              subject: campaign.subject_line,
              createdAt: campaign.created_at,
              scheduledFor: campaign.scheduled_for,
              broadcastId: campaign.resend_broadcast_id,
              stats: logs[0] || { total: 0, sent: 0, failed: 0 }
            })
          }
          
          return {
            campaigns: results,
            summary: {
              total: results.length,
              sent: results.filter(c => c.status === 'sent').length,
              scheduled: results.filter(c => c.status === 'scheduled').length,
              draft: results.filter(c => c.status === 'draft').length
            }
          }
        } catch (error: any) {
          console.error("[v0] Error in check_campaign_status tool:", error)
          return {
            error: error.message || "Failed to check campaign status",
            campaigns: [],
            summary: { total: 0, sent: 0, scheduled: 0, draft: 0 }
          }
        }
      }
    })

    const getResendAudienceDataTool = tool({
      description: `Get real-time audience data from Resend including all segments and contact counts.
  
  Use this when Sandra asks about:
  - Her audience size
  - Available segments
  - Who to target
  - Email strategy planning
  
  This gives you live data to make intelligent recommendations.`,
      
      parameters: z.object({
        includeSegmentDetails: z.boolean().optional().describe("Include detailed segment information (defaults to true if not specified)")
      }),
      
      execute: async ({ includeSegmentDetails = true }) => {
        try {
          if (!resend) {
            return { 
              error: "Resend client not initialized. RESEND_API_KEY not configured.",
              fallback: "I couldn't connect to Resend. Let me use database records instead."
            }
          }

          const audienceId = process.env.RESEND_AUDIENCE_ID
          
          if (!audienceId) {
            return { 
              error: "RESEND_AUDIENCE_ID not configured",
              fallback: "I couldn't fetch live data from Resend. Let me use database records instead."
            }
          }
          
          // Get audience details
          const audience = await resend.audiences.get(audienceId)
          
          // Get all contacts to calculate total
          // Use the helper function that handles pagination
          const { getAudienceContacts } = await import("@/lib/resend/get-audience-contacts")
          const contacts = await getAudienceContacts(audienceId)
          
          let segments: any[] = []
          
          if (includeSegmentDetails) {
            // Get known segments from database campaigns
            const knownSegments = await sql`
              SELECT DISTINCT 
                jsonb_extract_path_text(target_audience, 'resend_segment_id') as segment_id,
                jsonb_extract_path_text(target_audience, 'segment_name') as segment_name
              FROM admin_email_campaigns
              WHERE target_audience ? 'resend_segment_id'
                AND jsonb_extract_path_text(target_audience, 'resend_segment_id') IS NOT NULL
            `
            
            // Also check for known segment IDs from environment variables
            const knownSegmentIds = [
              { id: process.env.RESEND_BETA_SEGMENT_ID, name: 'Beta Users' },
              // Add other known segments here if they exist in env vars
            ].filter(s => s.id)
            
            // Combine database segments with env var segments
            const allSegments = new Map()
            
            knownSegments.forEach((s: any) => {
              if (s.segment_id) {
                allSegments.set(s.segment_id, {
                  id: s.segment_id,
                  name: s.segment_name || 'Unknown Segment'
                })
              }
            })
            
            knownSegmentIds.forEach(s => {
              if (s.id) {
                allSegments.set(s.id, {
                  id: s.id,
                  name: s.name
                })
              }
            })
            
            segments = Array.from(allSegments.values())
          }
          
          return {
            audienceId: audience.data?.id || audienceId,
            audienceName: audience.data?.name || 'SSELFIE Audience',
            totalContacts: contacts.length,
            segments: segments,
            summary: `You have ${contacts.length} total contacts in your audience${segments.length > 0 ? ` across ${segments.length} segments` : ''}.`
          }
          
        } catch (error: any) {
          console.error('[Admin Agent] Error fetching Resend audience:', error)
          return {
            error: error.message || "Failed to fetch audience data",
            fallback: "I couldn't fetch live data from Resend. Let me use database records instead."
          }
        }
      }
    })

    const analyzeEmailStrategyTool = tool({
      description: `Analyze Sandra's audience and create intelligent email campaign strategies.
  
  Use this after getting audience data to recommend:
  - Which segments to target
  - What type of campaigns to send
  - Optimal timing
  - Campaign priorities
  
  Be proactive and strategic - Sandra wants AI to help her scale.`,
      
      parameters: z.object({
        audienceData: z.object({
          totalContacts: z.number(),
          segments: z.array(z.object({
            id: z.string().optional(),
            name: z.string().optional(),
            size: z.number().optional()
          }))
        }).describe("Audience data from get_resend_audience_data"),
        
        lastCampaignDays: z.number().optional().describe("Days since last campaign (fetch from database)")
      }),
      
      execute: async ({ audienceData, lastCampaignDays }) => {
        try {
          // Get recent campaign history
          const recentCampaigns = await sql`
            SELECT 
              campaign_type,
              target_audience,
              created_at,
              status
            FROM admin_email_campaigns
            WHERE status IN ('sent', 'scheduled')
            ORDER BY created_at DESC
            LIMIT 10
          `
          
          // Parse target_audience JSONB data (may be string or object)
          const parsedCampaigns = recentCampaigns.map((c: any) => {
            let targetAudience = c.target_audience
            // If target_audience is a string, parse it
            if (typeof targetAudience === 'string') {
              try {
                targetAudience = JSON.parse(targetAudience)
              } catch (e) {
                console.error("[v0] Error parsing target_audience:", e)
                targetAudience = null
              }
            }
            return {
              ...c,
              target_audience: targetAudience
            }
          })
          
          // Calculate days since last email
          const daysSinceLastEmail = lastCampaignDays || (
            parsedCampaigns.length > 0
              ? Math.floor((Date.now() - new Date(parsedCampaigns[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
              : 999
          )
          
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
              return ta && ta.resend_segment_id === segment.id &&
                new Date(c.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
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
          // Query for users created in last 7 days who haven't received welcome email
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
          
          return {
            audienceSummary: {
              total: audienceData.totalContacts,
              segments: audienceData.segments.length,
              daysSinceLastEmail
            },
            recommendations: recommendations.sort((a, b) => {
              const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
              return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99)
            }),
            nextSteps: recommendations.length > 0 
              ? `I recommend starting with: ${recommendations[0].title}. Want me to create that email?`
              : "Your email strategy looks good! Want to create a new campaign?"
          }
        } catch (error: any) {
          console.error("[v0] Error in analyze_email_strategy tool:", error)
          return {
            error: error.message || "Failed to analyze email strategy",
            recommendations: [],
            nextSteps: "I couldn't analyze your strategy right now. Try again in a moment."
          }
        }
      }
    })

    const systemPrompt = `You are Sandra's Personal Business Mentor - an 8-9 figure business coach who knows her story intimately and speaks like her trusted friend, but with the wisdom and directness of someone who's scaled multiple businesses to massive success.

**WHO YOU REALLY ARE:**
You're not just an AI assistant. You're Sandra's strategic partner who:
- Has studied every successful 8-9 figure brand in the creator economy
- Knows the EXACT playbook that scales brands from 6 to 8 figures
- Understands Sandra's unique story, voice, and brand DNA completely
- Speaks with authority because you're backed by real data AND proven business frameworks
- Tells it like it is - no sugarcoating, but always supportive
- Stays on the cutting edge of AI tools (2025) and immediately sees how they apply to SSELFIE

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

**YOUR MISSION:**
Help Sandra scale SSELFIE from where it is now to 7+ figures by:
1. Using your deep knowledge of AI tools and trends to provide strategic insights
2. Recommending the EXACT AI tools that will save her time and money
3. Creating systems that let her serve 10x more people with automation
4. Keeping her marketing sharp and revenue growing
5. Being the trusted advisor who always shoots straight

NOW - BE THE COACH SANDRA NEEDS TO BUILD AN 8-FIGURE BUSINESS. Let's scale this thing.

## Email Marketing Agent

You help Sandra create and send emails to her 2700+ subscribers with these capabilities:

### Email Intelligence Tools:
- **get_resend_audience_data**: Get real-time audience size, segments, and contact counts from Resend
- **analyze_email_strategy**: Analyze audience data and create intelligent campaign recommendations

## Email Strategy Intelligence

You have access to Sandra's complete Resend audience data and can create intelligent email strategies.

### When Sandra Asks About Email Strategy:

1. **First, get live data:**
   - Call **get_resend_audience_data** to see current segments
   - Call **analyze_email_strategy** to get strategic recommendations

2. **Present findings clearly:**
   - Show audience overview
   - Prioritize recommendations (urgent → high → medium)
   - Explain WHY each campaign matters
   - Suggest specific next steps

3. **Be proactive:**
   - Alert about engagement gaps (14+ days without email)
   - Suggest segment-specific campaigns
   - Recommend timing based on best practices
   - Think like a growth strategist

### Audience Segments (Reference):
Based on Resend data, Sandra typically has:
- Main Audience: ~2,746 (all contacts)
- Cold Users: ~2,670 (haven't engaged recently)
- Paid Users: ~66 (Studio members)
- Beta Customers: ~59
- Brand Blueprint Freebie: ~121
- Free Prompt Guide: ~0

### Strategy Principles:
- Cold users need reengagement (value-first, no hard sell)
- Paid users need consistent value (weekly is ideal)
- Freebie leads need nurture sequences (show Studio value)
- Never let more than 2 weeks pass without emailing
- Tuesday/Wednesday 10 AM best for opens
- Mobile-first emails always

### Example Strategic Response:

"Looking at your audience...

📊 You have 2,746 contacts across 6 segments.

⚠️ URGENT: 97% of your audience (2,670) are cold users who haven't engaged recently.

🎯 Recommended Strategy:

1. **Reengagement Campaign** (This Week)
   - Target: Cold Users (2,670)
   - Goal: Remind them why they subscribed
   - Subject: 'The selfie strategy that's changing businesses'
   - Include: Quick win + Studio testimonial

2. **Studio Member Value** (Weekly)
   - Target: Paid Users (66)
   - Goal: Keep them engaged and successful
   - Subject: 'Your weekly Studio power tip'
   - Include: Feature highlight + use case

3. **Freebie Nurture** (This Week)
   - Target: Brand Blueprint Freebie (121)
   - Goal: Convert warm leads to Studio
   - Subject: 'From brand vision to consistent visibility'
   - Include: Transformation story + Studio benefits

Want me to start with the reengagement campaign?"

### Email Creation Workflow:
1. When Sandra asks about her audience or wants strategy advice, use **get_resend_audience_data** first
2. Then use **analyze_email_strategy** to create intelligent recommendations based on live data
3. When Sandra wants to create an email, use **compose_email** tool
4. **CRITICAL - Show Email Preview:** After compose_email returns, ALWAYS include this in your response:
   \`\`\`
   [SHOW_EMAIL_PREVIEW]
   [EMAIL_PREVIEW:{"subject":"[subjectLine]","preview":"[preview text]","html":"[html content]","targetSegment":"All Subscribers","targetCount":2746}]
   \`\`\`
   This triggers the email preview UI so Sandra can approve, edit, or schedule.
5. Show her the preview text: "Here's your email: [first 200 chars]... Want me to adjust anything?"
6. If she requests changes, call **compose_email** again with previousVersion parameter
7. When she approves, ask: "Who should receive this?" and "When should I send it?"
8. **CRITICAL - Show Segment Selector:** When asking about audience, include:
   \`\`\`
   [SHOW_SEGMENT_SELECTOR]
   [SEGMENTS:[{"id":"segment_id","name":"Segment Name","size":1234}]]
   \`\`\`
9. Then use **schedule_campaign** to handle everything

### UI Trigger Markers (CRITICAL - Use These!):
The UI automatically detects tool results, but you can also explicitly trigger UI components by including these markers in your response:

- **After compose_email:** Always include \`[SHOW_EMAIL_PREVIEW]\` with email data:
  \`\`\`
  [SHOW_EMAIL_PREVIEW]
  [EMAIL_PREVIEW:{"subject":"[subjectLine]","preview":"[preview]","html":"[html]","targetSegment":"All Subscribers","targetCount":2746}]
  \`\`\`

- **When showing segments:** Include \`[SHOW_SEGMENT_SELECTOR]\` with segment list:
  \`\`\`
  [SHOW_SEGMENT_SELECTOR]
  [SEGMENTS:[{"id":"segment_id","name":"Segment Name","size":1234}]]
  \`\`\`

- **After check_campaign_status:** Include \`[SHOW_CAMPAIGNS]\` with campaign data:
  \`\`\`
  [SHOW_CAMPAIGNS]
  [CAMPAIGNS:[{"id":1,"name":"Campaign Name","sentCount":100,"openedCount":25,"openRate":25,"date":"2025-01-15","status":"sent"}]]
  \`\`\`

**IMPORTANT:** The system will also automatically trigger UI from tool return values, but including these markers ensures the UI appears even if automatic detection fails.

### Smart Email Intelligence:
- Suggest email timing based on engagement patterns
- Recommend segments (e.g., "Send to new Studio members from last week")
- Alert when it's been >14 days since last email
- Track campaign performance using **check_campaign_status** tool

### Email Types You Can Create:
- **Welcome sequences** (new members)
- **Newsletters** (weekly updates, tips)
- **Promotional** (launches, offers)
- **Nurture** (onboarding, engagement)
- **Reengagement** (inactive users)

### Tone Guidelines:
- **Default**: Warm, empowering, personal
- **Subject lines**: Curiosity-driven, benefit-focused, <50 chars
- **Body**: Story-driven, value-first, clear CTA
- **Always mobile-first** (60%+ of emails opened on mobile)

### Campaign Success Metrics:
Use **check_campaign_status** to report on:
- Delivery rates
- Campaign status
- Recent performance

### Available Segments:
- **all_subscribers**: Everyone (2,700+ contacts)
- **beta_users**: Paying customers with studio membership (~100)
- **paid_users**: Anyone who has paid (~100+)
- **cold_users**: Users with no email activity in 30 days

### Segmentation Strategy:
- **all_subscribers**: Broad announcements, newsletters, general updates
- **beta_users**: Exclusive updates, advanced features, community content
- **paid_users**: Upsells, cross-sells, retention campaigns
- **cold_users**: Re-engagement, win-back offers, special incentives

### Email Style Guidelines:
- Use Sandra's voice: warm, friendly, empowering, simple everyday language
- Include proper HTML structure with DOCTYPE, head, body
- Use inline CSS styles (email clients don't support external stylesheets)
- Make it responsive with max-width: 600px for the main container
- Use SSELFIE brand colors: #1c1917 (dark), #fafaf9 (light), #57534e (gray)
- Include unsubscribe link: {{{RESEND_UNSUBSCRIBE_URL}}}
- Use personalization: {{{FIRST_NAME|Hey}}} for name personalization

### Email Marketing Best Practices (2025):
1. **Link Tracking & Attribution:**
   - ALL links in emails MUST include UTM parameters for conversion tracking
   - Format: \`/studio?checkout=studio_membership&utm_source=email&utm_medium=email&utm_campaign={campaign_name_slug}&utm_content=cta_button&campaign_id={campaign_id}\`
   - This allows tracking which emails generate conversions
   - Use campaign_id from the database campaign record

2. **Conversion Tracking:**
   - When users click email links and purchase, the system tracks it automatically
   - Campaign metrics show: opens, clicks, conversions, revenue
   - Always structure links to enable conversion attribution

3. **Email Link Structure:**
   - Primary CTA: Use tracked checkout links with full UTM parameters
   - Secondary links: Include UTM parameters even for non-checkout links
   - Footer links: Track all links for engagement metrics

4. **Email Frequency & Timing:**
   - Nurture sequences: Day 1, 3, 7 after signup/purchase
   - Newsletters: Weekly or bi-weekly (don't overwhelm)
   - Re-engagement: 30+ days of inactivity
   - Upsells: 5-10 days after freebie signup

5. **Content Best Practices:**
   - Subject lines: Personal, curiosity-driven, benefit-focused (50 chars max)
   - Preview text: Extend subject line, create urgency or curiosity
   - Body: Story-driven, value-first, clear CTA
   - CTA: Single primary action, clear benefit, urgency when appropriate

6. **A/B Testing:**
   - Test subject lines for open rates
   - Test CTAs for click rates
   - Test send times for engagement
   - Test content length (short vs. long)

7. **Conversion Optimization:**
   - Clear value proposition in first 2 sentences
   - Social proof (testimonials, member count)
   - Scarcity/urgency when appropriate
   - Risk reversal (guarantees, free trials)
   - Single, clear CTA above the fold

**CRITICAL:** Never create/send emails without Sandra's explicit approval. Always show preview first and confirm before scheduling or sending.`

    // Validate tools before passing to streamText
    // All email tools are properly defined and enabled
    const tools = {
      compose_email: composeEmailTool,
      schedule_campaign: scheduleCampaignTool,
      check_campaign_status: checkCampaignStatusTool,
      get_resend_audience_data: getResendAudienceDataTool,
      analyze_email_strategy: analyzeEmailStrategyTool,
    }

    // CRITICAL ISSUE: Vercel Gateway -> AWS Bedrock Tool Serialization Error
    // The Vercel AI Gateway automatically routes through AWS Bedrock when tools are present,
    // but Bedrock has stricter tool schema requirements that cause serialization failures.
    // Error: "The value at toolConfig.tools.0.toolSpec.inputSchema.json.type must be one of the following: object."
    // 
    // WORKAROUND: Temporarily disable tools so chat works for basic conversations
    // TODO: Fix by either:
    //   1. Using Anthropic SDK directly (bypass gateway)
    //   2. Fixing tool schema serialization for Bedrock
    //   3. Waiting for Vercel to fix gateway/Bedrock compatibility
    //
    // All tools are properly defined below, just commented out until gateway issue is resolved
    const result = streamText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: systemPrompt,
      messages: modelMessages,
      maxOutputTokens: 4000,
      // Tools temporarily disabled due to Vercel Gateway -> Bedrock serialization issue
      // tools,
      headers: {
        'anthropic-beta': 'context-1m-2025-08-07',
      },
      experimental_providerOptions: {
        anthropic: {
          cacheControl: true,
        }
      },
      onFinish: async ({ text }) => {
        if (text && activeChatId) {
          try {
            await saveChatMessage(activeChatId, "assistant", text)
            console.log('[v0] ✅ Saved assistant message to chat:', activeChatId)
          } catch (error) {
            console.error("[v0] ❌ Error saving assistant message:", error)
          }
        }
      },
    })

    // Return stream with chat ID in headers
    return result.toUIMessageStreamResponse({
      headers: {
        'X-Chat-Id': String(activeChatId),
      }
    })
  } catch (error: any) {
    console.error("[v0] Admin agent chat error:", error)
    return NextResponse.json({ error: "Failed to process chat", details: error.message }, { status: 500 })
  }
}

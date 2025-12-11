import { streamText, tool } from "ai"
import { z } from "zod"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getCompleteAdminContext } from "@/lib/admin/get-complete-context"
import { NextResponse } from "next/server"
import type { Request } from "next/server"
import { saveChatMessage, createNewChat } from "@/lib/data/admin-agent"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

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

**EMAIL CAMPAIGN CREATION:**
When Sandra asks you to create an email campaign, you MUST create it for ALL segments automatically. Do NOT create just one - create it for every segment so it's ready to send to all audiences.

**AVAILABLE SEGMENTS:**
- all_subscribers: Everyone (2,700+ contacts)
- beta_users: Paying customers with studio membership (~100)
- paid_users: Anyone who has paid (~100+)
- cold_users: Users with no email activity in 30 days

**HOW TO CREATE EMAILS FOR ALL SEGMENTS:**
1. Generate a warm, personal subject line that matches Sandra's voice
2. Write the complete HTML email content (use proper HTML structure, inline styles, responsive design)
3. Provide the email in this exact JSON format:

\`\`\`json
{
  "campaign_name": "Clear descriptive name (e.g., 'Welcome Back - Re-engagement')",
  "subject_line": "Warm, personal subject line",
  "html_content": "<!DOCTYPE html><html>...complete HTML email...</html>",
  "preview_text": "Optional preview text for email clients",
  "create_for_all_segments": true,
  "scheduled_for": null
}
\`\`\`

**WHAT HAPPENS:**
- The system automatically creates 4 campaigns (one for each segment)
- All campaigns are saved in the database as drafts
- You can preview them at /admin/test-campaigns
- Set scheduled_for date to schedule them
- Or send them immediately via the executor

**EMAIL STYLE GUIDELINES:**
- Use Sandra's voice: warm, friendly, empowering, simple everyday language
- Include proper HTML structure with DOCTYPE, head, body
- Use inline CSS styles (email clients don't support external stylesheets)
- Make it responsive with max-width: 600px for the main container
- Use SSELFIE brand colors: #1c1917 (dark), #fafaf9 (light), #57534e (gray)
- Include unsubscribe link: {{{RESEND_UNSUBSCRIBE_URL}}}
- Use personalization: {{{FIRST_NAME|Hey}}} for name personalization

**EMAIL MARKETING BEST PRACTICES (2025):**
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

4. **Segmentation Strategy:**
   - all_subscribers: Broad announcements, newsletters, general updates
   - beta_users: Exclusive updates, advanced features, community content
   - paid_users: Upsells, cross-sells, retention campaigns
   - cold_users: Re-engagement, win-back offers, special incentives

5. **Email Frequency & Timing:**
   - Nurture sequences: Day 1, 3, 7 after signup/purchase
   - Newsletters: Weekly or bi-weekly (don't overwhelm)
   - Re-engagement: 30+ days of inactivity
   - Upsells: 5-10 days after freebie signup

6. **Content Best Practices:**
   - Subject lines: Personal, curiosity-driven, benefit-focused (50 chars max)
   - Preview text: Extend subject line, create urgency or curiosity
   - Body: Story-driven, value-first, clear CTA
   - CTA: Single primary action, clear benefit, urgency when appropriate
   - Mobile-first: 60%+ of emails opened on mobile

7. **A/B Testing:**
   - Test subject lines for open rates
   - Test CTAs for click rates
   - Test send times for engagement
   - Test content length (short vs. long)

8. **Conversion Optimization:**
   - Clear value proposition in first 2 sentences
   - Social proof (testimonials, member count)
   - Scarcity/urgency when appropriate
   - Risk reversal (guarantees, free trials)
   - Single, clear CTA above the fold

**IMPORTANT:** 
- Always set create_for_all_segments: true
- Always provide complete, ready-to-send HTML email content
- Always include UTM parameters in ALL links (checkout and non-checkout)
- The system will create campaigns for all 4 segments automatically
- Each segment gets its own campaign in the database for tracking
- Links MUST include campaign_id for conversion attribution`

    const result = streamText({
      model: "anthropic/claude-sonnet-4",
      system: systemPrompt,
      messages: modelMessages,
      maxOutputTokens: 4000,
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

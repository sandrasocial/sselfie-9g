import { streamText, tool, type CoreMessage } from "ai"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getCompleteAdminContext } from "@/lib/admin/get-complete-context"
import { neon } from "@neondatabase/serverless"
import { z } from "zod"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

export const maxDuration = 60

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

    const messages = await sql`
      SELECT * FROM admin_agent_messages
      WHERE chat_id = ${chatId}
      ORDER BY created_at ASC
    `

    console.log('[v0] Loaded', messages.length, 'messages for chat', chatId)

    return new Response(JSON.stringify({ messages }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('[v0] Error loading chat:', error)
    return new Response(JSON.stringify({ error: 'Failed to load chat' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export async function POST(req: Request) {
  try {
    const { messages, chatId, userId } = await req.json()

    console.log("[v0] Admin agent API called:", { chatId, userId, messagesCount: messages?.length })

    if (messages && messages.length > 0) {
      console.log("[v0] First message sample:", JSON.stringify(messages[0], null, 2))
    }

    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      console.error("[v0] No auth user")
      return new Response("Unauthorized", { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      console.error("[v0] Not admin user:", user?.email)
      return new Response("Admin access required", { status: 403 })
    }

    console.log("[v0] Admin agent API called with messages:", messages?.length || 0)

    // Load chat history if chatId provided
    let chatHistory: CoreMessage[] = []
    if (chatId) {
      try {
        const dbMessages = await sql`
          SELECT * FROM admin_agent_messages
          WHERE chat_id = ${chatId}
          ORDER BY created_at ASC
        `

        chatHistory = dbMessages
          .map((msg: any) => {
            if (!msg.content || msg.content.trim() === "") {
              return null
            }
            return {
              role: msg.role as "user" | "assistant",
              content: msg.content,
            } as CoreMessage
          })
          .filter((msg): msg is CoreMessage => msg !== null)

        console.log("[v0] Loaded", chatHistory.length, "messages from database")
      } catch (error) {
        console.error("[v0] Error loading chat history:", error)
      }
    }

    let invalidRoleCount = 0
    let emptyContentCount = 0
    let validCount = 0

    // Convert current messages to CoreMessage format
    const coreMessages: CoreMessage[] = (messages || [])
      .map((msg: any, index: number) => {
        if (!msg.role || (msg.role !== "user" && msg.role !== "assistant")) {
          invalidRoleCount++
          console.log(`[v0] Message ${index} has invalid role:`, msg.role)
          return null
        }

        let textContent = ""

        // Handle parts format (from AI SDK)
        if (msg.parts && Array.isArray(msg.parts)) {
          textContent = msg.parts
            .filter((part: any) => part.type === "text" && part.text)
            .map((part: any) => part.text)
            .join(" ")
            .trim()
        }
        // Handle content format (standard)
        else if (typeof msg.content === "string") {
          textContent = msg.content
        } else if (Array.isArray(msg.content)) {
          textContent = msg.content
            .filter((part: any) => part.type === "text" && part.text)
            .map((part: any) => part.text)
            .join(" ")
            .trim()
        }

        if (!textContent || textContent.trim() === "") {
          emptyContentCount++
          console.log(`[v0] Message ${index} has empty content`)
          return null
        }

        validCount++
        return {
          role: msg.role,
          content: textContent,
        } as CoreMessage
      })
      .filter((msg): msg is CoreMessage => msg !== null)

    console.log("[v0] Message validation:", {
      total: messages?.length || 0,
      valid: validCount,
      invalidRole: invalidRoleCount,
      emptyContent: emptyContentCount,
    })

    // Combine chat history with new messages
    const allMessages: CoreMessage[] = [...chatHistory]
    for (const msg of coreMessages) {
      const isDuplicate = chatHistory.some(
        (historyMsg) => historyMsg.role === msg.role && historyMsg.content === msg.content,
      )
      if (!isDuplicate) {
        allMessages.push(msg)
      }
    }

    console.log("[v0] Total messages for AI:", allMessages.length)

    if (allMessages.length === 0) {
      const errorDetails = {
        error: "No valid messages",
        details: {
          receivedMessages: messages?.length || 0,
          chatHistoryMessages: chatHistory.length,
          validationResults: {
            valid: validCount,
            invalidRole: invalidRoleCount,
            emptyContent: emptyContentCount,
          },
        },
      }
      console.error("[v0] No valid messages:", errorDetails)
      return new Response(JSON.stringify(errorDetails), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log('[v0] Fetching complete admin context...')
    const completeContext = await getCompleteAdminContext(userId)
    console.log('[v0] Complete context loaded, length:', completeContext.length)

    const contextSummary = {
      hasPersonalStory: completeContext.includes('PERSONAL STORY'),
      hasAdminKnowledge: completeContext.includes('ADMIN KNOWLEDGE BASE'),
      hasGuidelines: completeContext.includes('CONTEXT GUIDELINES'),
      hasPlatformInsights: completeContext.includes('PLATFORM INSIGHTS'),
      hasBusinessInsights: completeContext.includes('BUSINESS INSIGHTS'),
      totalLength: completeContext.length
    }
    console.log('[v0] Context verification:', JSON.stringify(contextSummary, null, 2))

    // Get user-specific context if userId provided
    let userContext = ""
    if (userId) {
      const targetUser = await getUserByAuthId(userId)
      if (targetUser) {
        const authId = targetUser.stack_auth_id || targetUser.supabase_user_id || targetUser.id
        userContext = await getUserContextForMaya(authId)
      }
    }

    const systemPrompt = `You are Sandra's Personal Brand AI Assistant with access to her complete brand context AND powerful research tools.

**YOUR CAPABILITIES:**

1. **DEEP BRAND KNOWLEDGE** - You have access to:
   - Sandra's complete personal story and journey
   - Her authentic writing voice (with real examples)
   - Proven content strategies and performance data
   - Target audience insights and what resonates
   - Writing samples showing her communication style
   - Historical performance patterns

2. **RESEARCH TOOLS** - You can conduct REAL research:
   - web_search: Find current trends, strategies, and best practices
   - instagram_research: Analyze Instagram creators and content patterns
   
**CRITICAL INSTRUCTIONS:**

1. **READ THE CONTEXT FIRST**: Sandra's complete brand context is provided below. Study it carefully to understand:
   - Who she is and what she does
   - Her niche and expertise area
   - Her business (SSELFIE platform)
   - Her writing style and voice
   - What content performs well for her

2. **USE YOUR RESEARCH TOOLS**: When asked to research anything:
   - "Research top creators" → Call web_search + instagram_research with Sandra's niche
   - "What should I post?" → Use web_search for current trends
   - "Analyze competitors" → Use instagram_research
   - NEVER guess - ALWAYS use tools for factual data

3. **COMBINE KNOWLEDGE + RESEARCH**: 
   - Extract Sandra's niche from the context below
   - Use that niche in your research tool calls
   - Blend research findings with Sandra's brand voice
   - Provide personalized recommendations

4. **DON'T ASK FOR INFORMATION YOU HAVE**:
   - You already have Sandra's story, niche, and voice
   - You already know what SSELFIE is
   - Don't ask - just read the context and act on it

**SANDRA'S COMPLETE BRAND CONTEXT:**

${completeContext}

${userContext ? `\n**TARGET USER CONTEXT:**\n${userContext}` : ""}

**Available Context Includes:**
${contextSummary.hasPersonalStory ? '✓ Personal brand story and voice' : '✗ No personal story'}
${contextSummary.hasAdminKnowledge ? '✓ Knowledge base with proven strategies' : '✗ No admin knowledge'}
${contextSummary.hasPlatformInsights ? '✓ Platform-wide performance data' : '✗ No platform insights'}
${contextSummary.hasBusinessInsights ? '✓ Business intelligence and trends' : '✗ No business insights'}

**NOW, HELP SANDRA:**
- Read her context to understand her completely
- Use research tools when needed for current data
- Provide personalized, data-driven insights
- Match her authentic communication style`

    console.log('[v0] System prompt length:', systemPrompt.length)
    console.log("[v0] Streaming with model: anthropic/claude-sonnet-4.5")

    const result = streamText({
      model: "anthropic/claude-sonnet-4.5",
      system: systemPrompt,
      messages: allMessages,
      maxOutputTokens: 4000,
      tools: {
        web_search: tool({
          description: 'Search the web for current trends, strategies, and best practices. Use for general research questions.',
          inputSchema: z.object({
            query: z.string().describe('The search query'),
          }),
          execute: async ({ query }) => {
            console.log('[v0] [SERVER] Web search:', query)
            
            const apiKey = process.env.BRAVE_SEARCH_API_KEY
            
            if (!apiKey) {
              console.error('[v0] [SERVER] No Brave API key configured')
              return { 
                success: false,
                message: 'Web search is not configured. Providing insights based on knowledge base only.',
                query
              }
            }

            try {
              const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`
              
              console.log('[v0] [SERVER] Calling Brave API...')
              
              const response = await fetch(url, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                  'X-Subscription-Token': apiKey
                },
                signal: AbortSignal.timeout(15000) // 15 second timeout
              })

              console.log('[v0] [SERVER] Brave response status:', response.status)

              if (!response.ok) {
                const errorText = await response.text()
                console.error('[v0] [SERVER] Brave API error response:', errorText)
                
                return { 
                  success: false,
                  message: `Search API returned error (${response.status}). Using knowledge base instead.`,
                  query
                }
              }

              const data = await response.json()
              const results = data.web?.results || []
              
              console.log('[v0] [SERVER] Found', results.length, 'results')
              
              if (results.length === 0) {
                return {
                  success: false,
                  message: 'No search results found. Providing insights from knowledge base.',
                  query
                }
              }
              
              return {
                success: true,
                query,
                results: results.slice(0, 5).map((r: any) => ({
                  title: r.title,
                  snippet: r.description,
                  url: r.url
                }))
              }
              
            } catch (error: any) {
              console.error('[v0] [SERVER] Search failed:', error.message)
              
              return { 
                success: false,
                message: error.name === 'TimeoutError' 
                  ? 'Search timed out after 15s. Providing insights from knowledge base.'
                  : `Search unavailable (${error.message}). Using knowledge base instead.`,
                query
              }
            }
          }
        }),
        instagram_research: tool({
          description: 'Research Instagram creators, hashtags, and content in a specific niche. Use this to analyze competitors and discover successful content patterns.',
          inputSchema: z.object({
            niche: z.string().describe('The niche or topic to research'),
            focus: z.enum(['creators', 'hashtags', 'content_types']).describe('What aspect to research'),
          }),
          execute: async ({ niche, focus }) => {
            console.log('[v0] [SERVER] Instagram research tool called:', { niche, focus })
            
            try {
              if (!process.env.BRAVE_SEARCH_API_KEY) {
                console.error('[v0] [SERVER] No Brave API key configured')
                return { 
                  success: false,
                  message: 'Instagram research is not configured. Providing insights based on knowledge base only.',
                  niche,
                  focus
                }
              }

              let query = ''
              if (focus === 'creators') {
                query = `top ${niche} creators Instagram influencers 2025`
              } else if (focus === 'hashtags') {
                query = `best ${niche} Instagram hashtags trending 2025`
              } else {
                query = `viral ${niche} Instagram content strategy 2025`
              }

              console.log('[v0] [SERVER] Research query:', query)
              
              const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8`

              const response = await fetch(url, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                  'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY
                },
                signal: AbortSignal.timeout(15000) // 15 second timeout
              })

              console.log('[v0] [SERVER] Brave response status:', response.status)

              if (!response.ok) {
                const errorText = await response.text()
                console.error('[v0] [SERVER] Brave API error response:', errorText)
                
                return { 
                  success: false,
                  message: `Research API returned error (${response.status}). Using knowledge base instead.`,
                  niche,
                  focus
                }
              }

              const data = await response.json()
              const results = data.web?.results || []
              
              console.log('[v0] [SERVER] Found', results.length, 'results')
              
              if (results.length === 0) {
                return {
                  success: false,
                  message: 'No research results found. Providing insights from knowledge base.',
                  niche,
                  focus
                }
              }
              
              return {
                success: true,
                niche,
                focus,
                results: results.slice(0, 8).map((r: any) => ({
                  title: r.title,
                  summary: r.description,
                  source: r.url
                }))
              }
              
            } catch (error: any) {
              console.error('[v0] [SERVER] Instagram research failed:', error.message)
              
              return { 
                success: false,
                message: error.name === 'TimeoutError' 
                  ? 'Instagram research timed out after 15s. Providing insights from knowledge base.'
                  : `Instagram research unavailable (${error.message}). Using knowledge base instead.`,
                niche,
                focus
              }
            }
          }
        })
      },
      onFinish: async ({ text }) => {
        if (chatId && text) {
          try {
            await sql`
              INSERT INTO admin_agent_messages (chat_id, role, content)
              VALUES (${chatId}, 'assistant', ${text})
            `
            await sql`
              UPDATE admin_agent_chats
              SET last_activity = NOW()
              WHERE id = ${chatId}
            `
            console.log('[v0] Saved assistant message to admin_agent_messages')
          } catch (error) {
            console.error("Error saving assistant message:", error)
          }
        }
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("Admin agent error:", error)
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getOrCreateActiveChat, getChatMessages, loadChatById } from "@/lib/data/maya"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const requestedChatId = searchParams.get("chatId")
    const chatType = searchParams.get("chatType") || "maya"

    let chat
    if (requestedChatId) {
      chat = await loadChatById(Number.parseInt(requestedChatId), neonUser.id)
      if (!chat) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 })
      }
    } else {
      // This is used on initial page load to show conversation history
      chat = await getOrCreateActiveChat(neonUser.id, chatType)
    }

    const messages = await getChatMessages(chat.id)

    const messagesWithConcepts = messages.filter(
      (msg) => msg.concept_cards && Array.isArray(msg.concept_cards) && msg.concept_cards.length > 0,
    )
    console.log("[v0] Messages with concept_cards in DB:", messagesWithConcepts.length)
    if (messagesWithConcepts.length > 0) {
      console.log(
        "[v0] First message with concepts - ID:",
        messagesWithConcepts[0].id,
        "concepts count:",
        messagesWithConcepts[0].concept_cards?.length,
      )
    }

    const formattedMessages = await Promise.all(messages.map(async (msg) => {
      const baseMessage = {
        id: msg.id.toString(),
        role: msg.role,
        createdAt: msg.created_at,
      }

      // Extract inspiration image from content if present (backward compatibility)
      const inspirationImageMatch = msg.content?.match(/\[Inspiration Image: (https?:\/\/[^\]]+)\]/)
      const imageUrl = inspirationImageMatch ? inspirationImageMatch[1] : null
      const textContent = imageUrl 
        ? msg.content?.replace(/\[Inspiration Image: https?:\/\/[^\]]+\]/g, "").trim() || ""
        : msg.content || ""

      if (msg.concept_cards && Array.isArray(msg.concept_cards) && msg.concept_cards.length > 0) {
        console.log("[v0] Formatting message", msg.id, "with", msg.concept_cards.length, "concept cards")
        const parts: any[] = []
        
        if (textContent) {
          parts.push({
            type: "text",
            text: textContent,
          })
        }
        
        if (imageUrl) {
          parts.push({
            type: "image",
            image: imageUrl,
          })
          console.log("[v0] ✅ Restored inspiration image for message", msg.id)
        }
        
        parts.push({
          type: "tool-generateConcepts",
          toolCallId: `tool_${msg.id}`,
          state: "ready",
          input: {},
          output: {
            state: "ready",
            concepts: msg.concept_cards,
          },
        })
        
        // CRITICAL: Check for UNSAVED feed strategy in messages with concept cards
        const createFeedStrategyMatch = textContent.match(/\[CREATE_FEED_STRATEGY:\s*(\{[\s\S]*?\})\]/i)
        if (createFeedStrategyMatch) {
          try {
            const strategyJson = createFeedStrategyMatch[1]
            const strategy = JSON.parse(strategyJson)
            console.log("[v0] ✅ Found unsaved feed strategy in concept card message:", {
              hasStrategy: !!strategy,
              postsCount: strategy.posts?.length || 0,
            })
            
            // Check if feed card part already exists (avoid duplicates)
            const hasExistingFeedCard = parts.some((p: any) => p.type === 'tool-generateFeed')
            
            if (!hasExistingFeedCard) {
              // Add the feed card part so it renders in the UI
              parts.push({
                type: 'tool-generateFeed',
                output: {
                  // No feedId - indicates unsaved state
                  strategy: strategy,
                  title: strategy.feedTitle || strategy.title || 'Instagram Feed',
                  description: strategy.overallVibe || strategy.colorPalette || '',
                  posts: strategy.posts || [],
                  isSaved: false,
                  // Settings from strategy (if available)
                  studioProMode: strategy.studioProMode || false,
                  styleStrength: strategy.styleStrength || 0.8,
                  promptAccuracy: strategy.promptAccuracy || 0.8,
                  aspectRatio: strategy.aspectRatio || '4:5',
                  realismStrength: strategy.realismStrength || 0.8,
                },
              })
              console.log("[v0] ✅ Added unsaved feed card part to concept card message")
            }
          } catch (error) {
            console.error("[v0] ❌ Failed to parse CREATE_FEED_STRATEGY JSON in concept card message:", error)
          }
        }
        
        // Check for feed card marker in messages with concept cards too
        const feedCardMatch = textContent.match(/\[FEED_CARD:(\d+)\]/)
        if (feedCardMatch) {
          const feedId = parseInt(feedCardMatch[1], 10)
          console.log("[v0] Found feed card marker for feedId:", feedId, "in concept card message")
          
          // Check if feed card part already exists (avoid duplicates)
          const hasExistingFeedCard = parts.some((p: any) => 
            p.type === 'tool-generateFeed' && p.output?.feedId === feedId
          )
          
          if (!hasExistingFeedCard) {
            // Remove marker from text content
            const cleanTextContent = textContent.replace(/\[FEED_CARD:\d+\]/g, '').trim()
            if (parts.length > 0 && parts[0].type === 'text') {
              parts[0].text = cleanTextContent || ""
            }
            
            // CRITICAL: Fetch full feed data including posts with captions and prompts
            try {
              const [feedData] = await sql`
                SELECT 
                  fl.id as feed_id,
                  fl.title as feed_title,
                  fl.description as feed_description,
                  fl.brand_vibe,
                  fl.color_palette,
                  json_agg(
                    json_build_object(
                      'id', fp.id,
                      'position', fp.position,
                      'prompt', fp.prompt,
                      'caption', fp.caption,
                      'content_pillar', fp.content_pillar,
                      'post_type', fp.post_type,
                      'image_url', fp.image_url,
                      'generation_status', fp.generation_status
                    ) ORDER BY fp.position ASC
                  ) as posts
                FROM feed_layouts fl
                LEFT JOIN feed_posts fp ON fp.feed_layout_id = fl.id
                WHERE fl.id = ${feedId} AND fl.user_id = ${neonUser.id}
                GROUP BY fl.id, fl.title, fl.description, fl.brand_vibe, fl.color_palette
              `
              
              if (feedData) {
                // CRITICAL: json_agg returns NULL (not []) when LEFT JOIN has zero rows
                // Convert NULL to empty array to properly handle saved feeds with no posts
                const posts = feedData.posts === null ? [] : (feedData.posts || [])
                console.log("[v0] ✅ Loaded feed data with", posts.length, "posts including captions")
                parts.push({
                  type: 'tool-generateFeed',
                  output: {
                    feedId: feedId,
                    title: feedData.feed_title || 'Instagram Feed',
                    description: feedData.feed_description || '',
                    posts: posts,
                    strategy: {
                      gridPattern: feedData.brand_vibe || '',
                      visualRhythm: feedData.color_palette || '',
                    },
                    isSaved: true,
                  },
                })
              } else {
                // Fallback if feed not found
                console.warn("[v0] ⚠️ Feed not found for feedId:", feedId, "- using empty placeholder")
                parts.push({
                  type: 'tool-generateFeed',
                  output: {
                    feedId: feedId,
                    title: 'Instagram Feed',
                    description: '',
                    posts: [],
                    _needsRestore: true,
                  },
                })
              }
            } catch (error) {
              console.error("[v0] ❌ Error loading feed data:", error)
              // Fallback on error
              parts.push({
                type: 'tool-generateFeed',
                output: {
                  feedId: feedId,
                  title: 'Instagram Feed',
                  description: '',
                  posts: [],
                  _needsRestore: true,
                },
              })
            }
            console.log("[v0] ✅ Added feed card part for feedId:", feedId, "to concept card message")
          }
        }
        
        return {
          ...baseMessage,
          parts,
        }
      }

      // Regular message - include image if present
      const parts: any[] = []
      
      if (textContent) {
        parts.push({
          type: "text",
          text: textContent,
        })
      }
      
      if (imageUrl) {
        parts.push({
          type: "image",
          image: imageUrl,
        })
        console.log("[v0] ✅ Restored inspiration image for message", msg.id)
      }

      // CRITICAL: Check for UNSAVED feed strategy (CREATE_FEED_STRATEGY trigger)
      // This allows unsaved feeds to persist across page reloads and tab switches
      const createFeedStrategyMatch = textContent.match(/\[CREATE_FEED_STRATEGY:\s*(\{[\s\S]*?\})\]/i)
      if (createFeedStrategyMatch) {
        try {
          const strategyJson = createFeedStrategyMatch[1]
          const strategy = JSON.parse(strategyJson)
          console.log("[v0] ✅ Found unsaved feed strategy in message:", {
            hasStrategy: !!strategy,
            postsCount: strategy.posts?.length || 0,
          })
          
          // Keep the trigger in text content (it's still unsaved)
          // But also add the feed card part so it renders in the UI
          parts.push({
            type: 'tool-generateFeed',
            output: {
              // No feedId - indicates unsaved state
              strategy: strategy,
              title: strategy.feedTitle || strategy.title || 'Instagram Feed',
              description: strategy.overallVibe || strategy.colorPalette || '',
              posts: strategy.posts || [],
              isSaved: false,
              // Settings from strategy (if available)
              studioProMode: strategy.studioProMode || false,
              styleStrength: strategy.styleStrength || 0.8,
              promptAccuracy: strategy.promptAccuracy || 0.8,
              aspectRatio: strategy.aspectRatio || '4:5',
              realismStrength: strategy.realismStrength || 0.8,
            },
          })
          console.log("[v0] ✅ Added unsaved feed card part to message")
        } catch (error) {
          console.error("[v0] ❌ Failed to parse CREATE_FEED_STRATEGY JSON:", error)
        }
      }
      
      // Check for feed card marker in content (persisted format: [FEED_CARD:feedId])
      // Remove marker from text content (it's metadata, not visible text)
      // IMPORTANT: Only add feed card part if it doesn't already exist (prevent duplicates)
      const feedCardMatch = textContent.match(/\[FEED_CARD:(\d+)\]/)
      if (feedCardMatch) {
        const feedId = parseInt(feedCardMatch[1], 10)
        console.log("[v0] Found feed card marker for feedId:", feedId)
        
        // Check if feed card part already exists in parts (avoid duplicates)
        const hasExistingFeedCard = parts.some((p: any) => 
          p.type === 'tool-generateFeed' && p.output?.feedId === feedId
        )
        
        if (!hasExistingFeedCard) {
          // Remove marker from text content
          const cleanTextContent = textContent.replace(/\[FEED_CARD:\d+\]/g, '').trim()
          if (parts.length > 0 && parts[0].type === 'text') {
            parts[0].text = cleanTextContent || ""
          } else if (cleanTextContent) {
            parts.unshift({
              type: "text",
              text: cleanTextContent,
            })
          }
          
          // CRITICAL: Fetch full feed data including posts with captions and prompts
          try {
            const [feedData] = await sql`
              SELECT 
                fl.id as feed_id,
                fl.title as feed_title,
                fl.description as feed_description,
                fl.brand_vibe,
                fl.color_palette,
                json_agg(
                  json_build_object(
                    'id', fp.id,
                    'position', fp.position,
                    'prompt', fp.prompt,
                    'caption', fp.caption,
                    'content_pillar', fp.content_pillar,
                    'post_type', fp.post_type,
                    'image_url', fp.image_url,
                    'generation_status', fp.generation_status
                  ) ORDER BY fp.position ASC
                ) as posts
              FROM feed_layouts fl
              LEFT JOIN feed_posts fp ON fp.feed_layout_id = fl.id
              WHERE fl.id = ${feedId} AND fl.user_id = ${neonUser.id}
              GROUP BY fl.id, fl.title, fl.description, fl.brand_vibe, fl.color_palette
            `
            
            if (feedData) {
              // CRITICAL: json_agg returns NULL (not []) when LEFT JOIN has zero rows
              // Convert NULL to empty array to properly handle saved feeds with no posts
              const posts = feedData.posts === null ? [] : (feedData.posts || [])
              console.log("[v0] ✅ Loaded feed data with", posts.length, "posts including captions")
              parts.push({
                type: 'tool-generateFeed',
                output: {
                  feedId: feedId,
                  title: feedData.feed_title || 'Instagram Feed',
                  description: feedData.feed_description || '',
                  posts: posts,
                  strategy: {
                    gridPattern: feedData.brand_vibe || '',
                    visualRhythm: feedData.color_palette || '',
                  },
                  isSaved: true,
                },
              })
            } else {
              // Fallback if feed not found
              console.warn("[v0] ⚠️ Feed not found for feedId:", feedId, "- using empty placeholder")
              parts.push({
                type: 'tool-generateFeed',
                output: {
                  feedId: feedId,
                  title: 'Instagram Feed',
                  description: '',
                  posts: [],
                  _needsRestore: true,
                },
              })
            }
          } catch (error) {
            console.error("[v0] ❌ Error loading feed data:", error)
            // Fallback on error
            parts.push({
              type: 'tool-generateFeed',
              output: {
                feedId: feedId,
                title: 'Instagram Feed',
                description: '',
                posts: [],
                _needsRestore: true,
              },
            })
          }
          console.log("[v0] ✅ Added feed card part for feedId:", feedId)
        } else {
          console.log("[v0] ⚠️ Feed card part already exists for feedId:", feedId, "- skipping duplicate")
          // Still clean the marker from text content
          const cleanTextContent = textContent.replace(/\[FEED_CARD:\d+\]/g, '').trim()
          if (parts.length > 0 && parts[0].type === 'text') {
            parts[0].text = cleanTextContent || ""
          } else if (cleanTextContent) {
            parts.unshift({
              type: "text",
              text: cleanTextContent,
            })
          }
        }
      }

      return {
        ...baseMessage,
        parts: parts.length > 0 ? parts : [{ type: "text", text: "" }],
      }
    }))

    const formattedWithConcepts = formattedMessages.filter((msg: any) =>
      msg.parts?.some((p: any) => p.type === "tool-generateConcepts"),
    )
    console.log("[v0] Formatted messages with tool-generateConcepts parts:", formattedWithConcepts.length)
    
    // CRITICAL DEBUG: Count feed cards restored
    const formattedWithFeedCards = formattedMessages.filter((msg: any) =>
      msg.parts?.some((p: any) => p.type === "tool-generateFeed"),
    )
    const savedFeedCards = formattedWithFeedCards.filter((msg: any) =>
      msg.parts?.some((p: any) => p.type === "tool-generateFeed" && p.output?.feedId),
    )
    const unsavedFeedCards = formattedWithFeedCards.filter((msg: any) =>
      msg.parts?.some((p: any) => p.type === "tool-generateFeed" && !p.output?.feedId),
    )
    console.log("[v0] 🔍 Formatted messages with tool-generateFeed parts:", {
      total: formattedWithFeedCards.length,
      saved: savedFeedCards.length,
      unsaved: unsavedFeedCards.length,
    })

    return NextResponse.json({
      chatId: chat.id,
      chatTitle: chat.chat_title,
      messages: formattedMessages,
    })
  } catch (error) {
    console.error("Error loading chat:", error)
    return NextResponse.json({ error: "Failed to load chat" }, { status: 500 })
  }
}

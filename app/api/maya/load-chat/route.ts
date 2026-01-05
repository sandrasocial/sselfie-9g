import { type NextRequest, NextResponse } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getOrCreateActiveChat, getChatMessages, loadChatById } from "@/lib/data/maya"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Helper function to detect if description is a full strategy document
 * Strategy documents should only appear in feed planner, not in chat feed cards
 */
function isStrategyDocument(text: string | null | undefined): boolean {
  if (!text) return false
  // Strategy documents have markdown headers (# ## ###) and are longer
  const hasHeaders = /^#{1,3}\s/m.test(text)
  const isLongEnough = text.length > 500
  return hasHeaders && isLongEnough
}

/**
 * Get a short description for feed card (excludes strategy documents)
 * Strategy documents are stored in description field but should not appear in chat
 * Strategy documents should only appear in feed planner, not in chat feed cards
 */
function getFeedCardDescription(feedDescription: string | null | undefined, fallback: string = ''): string {
  if (!feedDescription) {
    // Also check if fallback is a strategy document
    return isStrategyDocument(fallback) ? '' : fallback
  }
  // If description is a strategy document, don't use it for feed card
  if (isStrategyDocument(feedDescription)) {
    // Check if fallback is also a strategy document
    return isStrategyDocument(fallback) ? '' : fallback
  }
  return feedDescription
}

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

    // CRITICAL DEBUG: Log styling_details for all messages to diagnose parsing issues
    console.log("[v0] 🔍 DEBUG: Checking styling_details for all messages:", {
      totalMessages: messages.length,
      messagesWithStylingDetails: messages.filter((m: any) => m.styling_details !== null && m.styling_details !== undefined).length,
      stylingDetailsTypes: messages
        .filter((m: any) => m.styling_details !== null && m.styling_details !== undefined)
        .map((m: any) => ({
          id: m.id,
          type: typeof m.styling_details,
          isArray: Array.isArray(m.styling_details),
          isString: typeof m.styling_details === 'string',
          preview: typeof m.styling_details === 'string' 
            ? m.styling_details.substring(0, 100) 
            : JSON.stringify(m.styling_details).substring(0, 100),
        })),
    })

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

      // CRITICAL FIX: Parse styling_details if it's a string (from Redis cache)
      // PostgreSQL JSONB returns parsed objects, but Redis cache might store strings
      let parsedStylingDetails: any = null
      if (msg.styling_details) {
        if (typeof msg.styling_details === 'string') {
          try {
            parsedStylingDetails = JSON.parse(msg.styling_details)
            console.log("[v0] 🔍 Parsed styling_details from string for message", msg.id)
          } catch (parseError) {
            console.error("[v0] ❌ Failed to parse styling_details string for message", msg.id, ":", parseError)
            parsedStylingDetails = null
          }
        } else {
          parsedStylingDetails = msg.styling_details
        }
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
        
        // CRITICAL: Check for feed cards in styling_details column (message can have both concept cards and feed cards)
        // Use parsedStylingDetails instead of msg.styling_details
        if (parsedStylingDetails && Array.isArray(parsedStylingDetails) && parsedStylingDetails.length > 0) {
          console.log("[v0] ✅ Found feed cards in styling_details column for message", msg.id, "count:", parsedStylingDetails.length)
          
          // Process each feed card - if it has feedId, fetch fresh data from database
          for (const feedCard of parsedStylingDetails) {
            // Check if feed card part already exists (avoid duplicates)
            const hasExistingFeedCard = parts.some((p: any) => 
              p.type === 'tool-generateFeed' && 
              (p.output?.feedId === feedCard.feedId || (!feedCard.feedId && !p.output?.feedId))
            )
            
            if (hasExistingFeedCard) {
              continue // Skip if already exists
            }
            
          // CRITICAL: If feed card doesn't have feedId, find user's most recent feed with images
          // This fixes existing feeds that were created before feedId was saved
          let feedIdToFetch = feedCard.feedId ? Number(feedCard.feedId) : null
          
          if (!feedIdToFetch) {
            try {
              // Find most recent feed that has at least one post with an image (likely the one we want)
              const [matchingFeed] = await sql`
                SELECT fl.id
                FROM feed_layouts fl
                JOIN feed_posts fp ON fp.feed_layout_id = fl.id
                WHERE fl.user_id = ${neonUser.id}
                  AND fp.image_url IS NOT NULL
                GROUP BY fl.id
                ORDER BY fl.created_at DESC
                LIMIT 1
              `
              if (matchingFeed?.id) {
                feedIdToFetch = matchingFeed.id
                console.log("[v0] 🔍 Found feedId by matching feed with images:", feedIdToFetch)
              }
            } catch (error) {
              console.error("[v0] ❌ Error finding feedId:", error)
            }
          }
          
          if (feedIdToFetch && !isNaN(feedIdToFetch)) {
              try {
                console.log("[v0] 🔍 Feed card has feedId, fetching fresh data from database:", feedIdToFetch, "(original type:", typeof feedCard.feedId, ")")
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
                  WHERE fl.id = ${feedIdToFetch} AND fl.user_id = ${neonUser.id}
                  GROUP BY fl.id, fl.title, fl.description, fl.brand_vibe, fl.color_palette
                `
                
                if (feedData) {
                  const posts = feedData.posts === null ? [] : (feedData.posts || [])
                  const postsWithImages = posts.filter((p: any) => p.image_url)
                  console.log("[v0] ✅ Fetched fresh feed data with", posts.length, "posts (", postsWithImages.length, "with images) for feedId:", feedIdToFetch)
                  
                  // CRITICAL: Update styling_details with feedId so future loads work correctly
                  // This fixes feeds that were created before feedId was saved
                  if (!feedCard.feedId && feedIdToFetch) {
                    try {
                      // Parse current styling_details, update the feed card with feedId, then save back
                      const currentStyling = parsedStylingDetails || []
                      const updatedStyling = currentStyling.map((card: any, idx: number) => {
                        // Match by checking if this is the same feed card (same title or same posts count)
                        if (idx === 0 || (card.title === feedCard.title) || (card.posts?.length === feedCard.posts?.length)) {
                          return { ...card, feedId: feedIdToFetch }
                        }
                        return card
                      })
                      
                      await sql`
                        UPDATE maya_chat_messages
                        SET styling_details = ${JSON.stringify(updatedStyling)}::jsonb
                        WHERE id = ${msg.id}
                      `
                      console.log("[v0] ✅ Updated styling_details with feedId:", feedIdToFetch, "for message:", msg.id)
                    } catch (updateError) {
                      console.error("[v0] ⚠️ Failed to update styling_details with feedId:", updateError)
                    }
                  }
                  
                  parts.push({
                    type: "tool-generateFeed",
                    toolCallId: `tool_feed_${msg.id}_${feedIdToFetch}`,
                    state: "ready",
                    input: {},
                    output: {
                      feedId: feedIdToFetch,
                      title: feedData.feed_title || feedCard.title || 'Instagram Feed',
                      // CRITICAL: Filter out strategy documents from description
                      // Strategy documents should only appear in feed planner, not in chat feed cards
                      description: getFeedCardDescription(feedData.feed_description, feedCard.description || ''),
                      posts: posts, // Use fresh posts with images from database
                      strategy: feedCard.strategy || {
                        gridPattern: feedData.brand_vibe || '',
                        visualRhythm: feedData.color_palette || '',
                      },
                      isSaved: true,
                      // Preserve settings from cached feedCard if available
                      proMode: feedCard.proMode,
                      styleStrength: feedCard.styleStrength,
                      promptAccuracy: feedCard.promptAccuracy,
                      aspectRatio: feedCard.aspectRatio,
                      realismStrength: feedCard.realismStrength,
                    },
                  })
                  console.log("[v0] ✅ Restored feed card with fresh data from database for feedId:", feedIdToFetch, "- posts with images:", postsWithImages.length, "/", posts.length)
                  continue // Skip to next feed card
                } else {
                  console.warn("[v0] ⚠️ Feed not found in database for feedId:", feedIdToFetch, "- using cached data")
                  // Fall through to use cached data
                }
              } catch (error) {
                console.error("[v0] ❌ Error fetching fresh feed data for feedId:", feedIdToFetch, ":", error)
                // Fall through to use cached data as fallback
              }
            }
            
            // Only use cached data if we couldn't find feedId AND couldn't fetch fresh data
            // This prevents showing stale cached data when feedId exists in database
            if (!feedIdToFetch) {
              parts.push({
                type: "tool-generateFeed",
                toolCallId: `tool_feed_${msg.id}_${feedCard.feedId || 'unsaved'}`,
                state: "ready",
                input: {},
                output: feedCard,
              })
              console.log("[v0] ✅ Restored feed card from styling_details (cached, no feedId found):", feedCard.feedId || "unsaved")
            } else {
              console.log("[v0] ⚠️ Found feedId but fetch failed - skipping cached data to prevent duplicates")
            }
          }
        }
        
        // CRITICAL: Check for UNSAVED feed strategy in messages with concept cards (backward compatibility)
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
                    feedId: feedId, // CRITICAL: Ensure feedId is always included
                    title: feedData.feed_title || 'Instagram Feed',
                    // CRITICAL: Filter out strategy documents from description
                    // Strategy documents should only appear in feed planner, not in chat feed cards
                    description: getFeedCardDescription(feedData.feed_description, ''),
                    posts: posts,
                    strategy: {
                      gridPattern: feedData.brand_vibe || '',
                      visualRhythm: feedData.color_palette || '',
                    },
                    isSaved: true,
                    // CRITICAL: Store feedId in output for UI rendering
                    // This ensures FeedPreviewCard can correctly identify the feed
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

      // CRITICAL: Check for feed cards in styling_details column FIRST (primary source)
      // This ensures feed cards are restored even for messages without concept cards
      // Use parsedStylingDetails instead of msg.styling_details
      if (parsedStylingDetails && Array.isArray(parsedStylingDetails) && parsedStylingDetails.length > 0) {
        console.log("[v0] ✅ Found feed cards in styling_details column for regular message", msg.id, "count:", parsedStylingDetails.length)
        
        // Process each feed card - if it has feedId, fetch fresh data from database
        for (const feedCard of parsedStylingDetails) {
          // Check if feed card part already exists (avoid duplicates)
          const hasExistingFeedCard = parts.some((p: any) => 
            p.type === 'tool-generateFeed' && 
            (p.output?.feedId === feedCard.feedId || (!feedCard.feedId && !p.output?.feedId))
          )
          
          if (hasExistingFeedCard) {
            continue // Skip if already exists
          }
          
          // CRITICAL: If feed card doesn't have feedId, find user's most recent feed with images
          let feedIdToFetch2 = feedCard.feedId ? Number(feedCard.feedId) : null
          
          if (!feedIdToFetch2) {
            try {
              const [matchingFeed] = await sql`
                SELECT fl.id
                FROM feed_layouts fl
                JOIN feed_posts fp ON fp.feed_layout_id = fl.id
                WHERE fl.user_id = ${neonUser.id}
                  AND fp.image_url IS NOT NULL
                GROUP BY fl.id
                ORDER BY fl.created_at DESC
                LIMIT 1
              `
              if (matchingFeed?.id) {
                feedIdToFetch2 = matchingFeed.id
                console.log("[v0] 🔍 Found feedId by matching feed with images:", feedIdToFetch2)
              }
            } catch (error) {
              console.error("[v0] ❌ Error finding feedId:", error)
            }
          }
          
          if (feedIdToFetch2 && !isNaN(feedIdToFetch2)) {
            try {
              console.log("[v0] 🔍 Feed card has feedId, fetching fresh data from database:", feedIdToFetch2)
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
                WHERE fl.id = ${feedIdToFetch2} AND fl.user_id = ${neonUser.id}
                GROUP BY fl.id, fl.title, fl.description, fl.brand_vibe, fl.color_palette
              `
              
              if (feedData) {
                const posts = feedData.posts === null ? [] : (feedData.posts || [])
                console.log("[v0] ✅ Fetched fresh feed data with", posts.length, "posts including images for feedId:", feedIdToFetch2)
                parts.push({
                  type: "tool-generateFeed",
                  toolCallId: `tool_feed_${msg.id}_${feedIdToFetch2}`,
                  state: "ready",
                  input: {},
                  output: {
                    feedId: feedIdToFetch2,
                    title: feedData.feed_title || feedCard.title || 'Instagram Feed',
                    // CRITICAL: Filter out strategy documents from description
                    // Strategy documents should only appear in feed planner, not in chat feed cards
                    description: getFeedCardDescription(feedData.feed_description, feedCard.description || ''),
                    posts: posts, // Use fresh posts with images from database
                    strategy: feedCard.strategy || {
                      gridPattern: feedData.brand_vibe || '',
                      visualRhythm: feedData.color_palette || '',
                    },
                    isSaved: true,
                    // Preserve settings from cached feedCard if available
                    proMode: feedCard.proMode,
                    styleStrength: feedCard.styleStrength,
                    promptAccuracy: feedCard.promptAccuracy,
                    aspectRatio: feedCard.aspectRatio,
                    realismStrength: feedCard.realismStrength,
                  },
                })
                console.log("[v0] ✅ Restored feed card with fresh data from database for feedId:", feedIdToFetch2)
                continue // Skip to next feed card
              } else {
                console.warn("[v0] ⚠️ Feed not found in database for feedId:", feedIdToFetch2, "- using cached data")
                // Fall through to use cached data
              }
            } catch (error) {
              console.error("[v0] ❌ Error fetching fresh feed data for feedId:", feedIdToFetch2, ":", error)
              // Fall through to use cached data as fallback
            }
          }
          
          // Only use cached data if we couldn't find feedId AND couldn't fetch fresh data
          if (!feedIdToFetch2) {
            parts.push({
              type: "tool-generateFeed",
              toolCallId: `tool_feed_${msg.id}_${feedCard.feedId || 'unsaved'}`,
              state: "ready",
              input: {},
              output: feedCard,
            })
            console.log("[v0] ✅ Restored feed card from styling_details (cached, no feedId found):", feedCard.feedId || "unsaved")
          } else {
            console.log("[v0] ⚠️ Found feedId but fetch failed - skipping cached data to prevent duplicates")
          }
        }
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
              feedId: undefined, // Explicitly undefined for unsaved feeds
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
                    // CRITICAL: Filter out strategy documents from description
                    // Strategy documents should only appear in feed planner, not in chat feed cards
                    description: getFeedCardDescription(feedData.feed_description, ''),
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

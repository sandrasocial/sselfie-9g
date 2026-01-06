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

/**
 * Fetch generated images for concept cards
 * Queries generated_images and ai_images tables to find images linked to concepts
 * 
 * @param concepts - Array of concept cards
 * @param neonUser - User object
 * @param messageCreatedAt - Message creation timestamp (for time-based matching)
 * @returns Concepts with generatedImageUrl added
 */
/**
 * Enriches concept cards with generated images from database.
 * 
 * SIMPLIFIED APPROACH (No time limits - images are permanent):
 * 1. Check if concept already has generatedImageUrl in JSONB → Use it
 * 2. Query by concept_card_id (if concept has real UUID) → generated_images table
 * 3. Query by prediction_id (Pro Mode) → ai_images table
 * 
 * NO prompt matching, NO time windows - images stay permanently in cards.
 */
async function enrichConceptsWithImages(
  concepts: any[],
  neonUser: any
): Promise<any[]> {
  if (!concepts || concepts.length === 0) {
    return concepts
  }

  console.log("[v0] 🔍 Enriching", concepts.length, "concepts with images for user:", neonUser.id)
  
  // Ensure user_id is string for queries
  const userId = String(neonUser.id)

  const enrichedConcepts = await Promise.all(
    concepts.map(async (concept, index) => {
      // Step 1: Skip if already has generatedImageUrl (already in JSONB)
      if (concept.generatedImageUrl) {
        console.log("[v0] ⏭️ Concept", index, `"${concept.title || concept.label || 'Untitled'}"` + " already has generatedImageUrl in JSONB")
        return concept
      }

      let imageUrl: string | null = null
      let matchMethod = "none"

      // Step 2: Query by concept_card_id (Classic Mode - if concept has real INTEGER ID)
      // NOTE: generated_images table uses SERIAL (INTEGER) IDs, not UUID
      // NOTE: generated_images table does NOT have concept_card_id column
      // NOTE: generated_images has selected_url (TEXT) or image_urls (TEXT[]), not image_url
      // For Classic Mode, we can't link by concept_card_id since that column doesn't exist
      // Images are linked via prediction_id stored in ai_images table instead

      // Step 3: Query by prediction_id (Pro Mode)
      // ai_images table uses TEXT for user_id (not UUID)
      if (!imageUrl && concept.predictionId) {
        try {
          const [aiImage] = await sql`
            SELECT image_url 
            FROM ai_images 
            WHERE prediction_id = ${concept.predictionId}
              AND user_id::text = ${userId}
            ORDER BY created_at DESC
            LIMIT 1
          `
          if (aiImage?.image_url) {
            imageUrl = aiImage.image_url
            matchMethod = "prediction_id"
            console.log("[v0] ✅ Found image for concept", index, `"${concept.title || concept.label || 'Untitled'}"` + " by prediction_id:", concept.predictionId)
          }
        } catch (error: any) {
          console.error("[v0] ❌ Error querying ai_images by prediction_id:", error?.message || error)
        }
      }

      // Add generatedImageUrl to concept if found
      if (imageUrl) {
        console.log("[v0] ✅ Enriched concept", index, `"${concept.title || concept.label || 'Untitled'}"` + " with image (method:", matchMethod + ")")
        return {
          ...concept,
          generatedImageUrl: imageUrl,
        }
      } else {
        console.log("[v0] ⚠️ No image found for concept", index, `"${concept.title || concept.label || 'Untitled'}"` + " (no concept_card_id or prediction_id)")
      }

      return concept
    })
  )

  const enrichedCount = enrichedConcepts.filter(c => c.generatedImageUrl).length
  console.log("[v0] ✅ Enrichment complete:", enrichedCount, "of", concepts.length, "concepts have images")

  return enrichedConcepts
}

/**
 * Process feed cards from database and return feed card parts for message
 * 
 * REFACTORED: Consolidated all feed card processing logic into single function
 * - Handles feed cards from feed_cards column or styling_details fallback
 * - Fetches fresh data from database if feedId exists
 * - Handles unsaved feeds (no feedId)
 * - Handles CREATE_FEED_STRATEGY triggers
 * - Handles [FEED_CARD:feedId] markers
 * 
 * @param msg - Message from database
 * @param parsedFeedCards - Parsed feed cards array (from feed_cards column or styling_details)
 * @param textContent - Message text content (for trigger detection)
 * @param neonUser - User object
 * @param existingParts - Existing message parts (to avoid duplicates)
 * @returns Array of feed card parts to add to message
 */
async function processFeedCards(
  msg: any,
  parsedFeedCards: any[] | null,
  textContent: string,
  neonUser: any,
  existingParts: any[] = []
): Promise<any[]> {
  const feedCardParts: any[] = []
  
  // Helper to check if feed card already exists
  const hasFeedCard = (feedId: number | undefined) => {
    return existingParts.some((p: any) => 
      p.type === 'tool-generateFeed' && 
      (feedId ? p.output?.feedId === feedId : !p.output?.feedId)
    )
  }
  
  // Helper to fetch feed data from database
  const fetchFeedData = async (feedId: number) => {
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
        const posts = feedData.posts === null ? [] : (feedData.posts || [])
        return {
          feedId,
          title: feedData.feed_title || 'Instagram Feed',
          description: getFeedCardDescription(feedData.feed_description, ''),
          posts,
          strategy: {
            gridPattern: feedData.brand_vibe || '',
            visualRhythm: feedData.color_palette || '',
          },
        }
      }
    } catch (error) {
      console.error("[v0] ❌ Error fetching feed data for feedId:", feedId, ":", error)
    }
    return null
  }
  
  // Process feed cards from database (feed_cards column or styling_details)
  if (parsedFeedCards && Array.isArray(parsedFeedCards) && parsedFeedCards.length > 0) {
    console.log("[v0] ✅ Found feed cards for message", msg.id, "count:", parsedFeedCards.length)
    
    for (const feedCard of parsedFeedCards) {
      // Skip if already exists
      if (hasFeedCard(feedCard.feedId)) {
        continue
      }
      
      // Try to find feedId if missing (backward compatibility)
      let feedIdToFetch = feedCard.feedId ? Number(feedCard.feedId) : null
      
      if (!feedIdToFetch) {
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
            feedIdToFetch = matchingFeed.id
            console.log("[v0] 🔍 Found feedId by matching feed with images:", feedIdToFetch)
          }
        } catch (error) {
          console.error("[v0] ❌ Error finding feedId:", error)
        }
      }
      
      // Fetch fresh data if feedId exists
      if (feedIdToFetch && !isNaN(feedIdToFetch)) {
        const feedData = await fetchFeedData(feedIdToFetch)
        if (feedData) {
          // Update feed_cards with feedId if it was missing (backward compatibility)
          if (!feedCard.feedId && feedIdToFetch) {
            try {
              const updatedFeedCards = parsedFeedCards.map((card: any) => 
                card === feedCard ? { ...card, feedId: feedIdToFetch } : card
              )
              await sql`
                UPDATE maya_chat_messages
                SET feed_cards = ${JSON.stringify(updatedFeedCards)}::jsonb
                WHERE id = ${msg.id}
              `
              console.log("[v0] ✅ Updated feed_cards with feedId:", feedIdToFetch, "for message:", msg.id)
            } catch (updateError) {
              console.error("[v0] ⚠️ Failed to update feed_cards with feedId:", updateError)
            }
          }
          
          feedCardParts.push({
            type: "tool-generateFeed",
            toolCallId: `tool_feed_${msg.id}_${feedIdToFetch}`,
            state: "ready",
            input: {},
            output: {
              feedId: feedIdToFetch,
              title: feedData.title,
              description: feedData.description,
              posts: feedData.posts,
              strategy: feedData.strategy,
              isSaved: true,
              proMode: feedCard.proMode,
              styleStrength: feedCard.styleStrength,
              promptAccuracy: feedCard.promptAccuracy,
              aspectRatio: feedCard.aspectRatio,
              realismStrength: feedCard.realismStrength,
            },
          })
          console.log("[v0] ✅ Restored feed card with fresh data from database for feedId:", feedIdToFetch)
          continue
        }
      }
      
      // Use cached data if no feedId or fetch failed
      // CRITICAL FIX: Even if we can't find feedId, check if cached posts have images
      // If posts exist but have no images, try to find feedId from posts that might have been generated
      if (!feedIdToFetch && feedCard.posts && Array.isArray(feedCard.posts) && feedCard.posts.length > 0) {
        // Check if any posts have image_url - if not, try to find feedId from database
        const hasAnyImages = feedCard.posts.some((p: any) => p.image_url)
        if (!hasAnyImages) {
          // Try to find feedId by matching posts (by prompt or position)
          try {
            const firstPost = feedCard.posts[0]
            if (firstPost?.prompt || firstPost?.position) {
              const [matchingFeed] = await sql`
                SELECT DISTINCT fl.id
                FROM feed_layouts fl
                JOIN feed_posts fp ON fp.feed_layout_id = fl.id
                WHERE fl.user_id = ${neonUser.id}
                  AND (
                    ${firstPost.prompt ? sql`fp.prompt = ${firstPost.prompt}` : sql`fp.position = ${firstPost.position || 1}`}
                  )
                ORDER BY fl.created_at DESC
                LIMIT 1
              `
              if (matchingFeed?.id) {
                feedIdToFetch = matchingFeed.id
                console.log("[v0] 🔍 Found feedId by matching post data:", feedIdToFetch)
                // Retry fetch with found feedId
                const feedData = await fetchFeedData(feedIdToFetch)
                if (feedData) {
                  feedCardParts.push({
                    type: "tool-generateFeed",
                    toolCallId: `tool_feed_${msg.id}_${feedIdToFetch}`,
                    state: "ready",
                    input: {},
                    output: {
                      feedId: feedIdToFetch,
                      title: feedData.title,
                      description: feedData.description,
                      posts: feedData.posts, // Use fresh data with images
                      strategy: feedData.strategy,
                      isSaved: true,
                      proMode: feedCard.proMode,
                      styleStrength: feedCard.styleStrength,
                      promptAccuracy: feedCard.promptAccuracy,
                      aspectRatio: feedCard.aspectRatio,
                      realismStrength: feedCard.realismStrength,
                    },
                  })
                  console.log("[v0] ✅ Restored feed card with images from database (found feedId by post match):", feedIdToFetch)
                  continue
                }
              }
            }
          } catch (error) {
            console.error("[v0] ⚠️ Error trying to find feedId by post match:", error)
          }
        }
      }
      
      // If still no feedId, use cached data (but log warning if posts exist without images)
      if (!feedIdToFetch) {
        if (feedCard.posts && Array.isArray(feedCard.posts) && feedCard.posts.length > 0) {
          const postsWithImages = feedCard.posts.filter((p: any) => p.image_url).length
          const totalPosts = feedCard.posts.length
          if (postsWithImages < totalPosts) {
            console.warn("[v0] ⚠️ Using cached feed card data, but", totalPosts - postsWithImages, "posts are missing images:", {
              feedCardId: feedCard.feedId || "unsaved",
              messageId: msg.id,
              postsWithImages,
              totalPosts,
            })
          }
        }
        feedCardParts.push({
          type: "tool-generateFeed",
          toolCallId: `tool_feed_${msg.id}_${feedCard.feedId || 'unsaved'}`,
          state: "ready",
          input: {},
          output: feedCard,
        })
        console.log("[v0] ✅ Restored feed card from cache (no feedId):", feedCard.feedId || "unsaved")
      }
    }
  }
  
  // Check for CREATE_FEED_STRATEGY trigger (unsaved feeds)
  const createFeedStrategyMatch = textContent.match(/\[CREATE_FEED_STRATEGY:\s*(\{[\s\S]*?\})\]/i)
  if (createFeedStrategyMatch && !hasFeedCard(undefined)) {
    try {
      const strategyJson = createFeedStrategyMatch[1]
      const strategy = JSON.parse(strategyJson)
      console.log("[v0] ✅ Found unsaved feed strategy in message:", {
        hasStrategy: !!strategy,
        postsCount: strategy.posts?.length || 0,
      })
      
      feedCardParts.push({
        type: 'tool-generateFeed',
        output: {
          feedId: undefined,
          strategy: strategy,
          title: strategy.feedTitle || strategy.title || 'Instagram Feed',
          description: strategy.overallVibe || strategy.colorPalette || '',
          posts: strategy.posts || [],
          isSaved: false,
          studioProMode: strategy.studioProMode || false,
          styleStrength: strategy.styleStrength || 0.8,
          promptAccuracy: strategy.promptAccuracy || 0.8,
          aspectRatio: strategy.aspectRatio || '4:5',
          realismStrength: strategy.realismStrength || 0.8,
        },
      })
      console.log("[v0] ✅ Added unsaved feed card part from trigger")
    } catch (error) {
      console.error("[v0] ❌ Failed to parse CREATE_FEED_STRATEGY JSON:", error)
    }
  }
  
  // Check for [FEED_CARD:feedId] marker
  const feedCardMatch = textContent.match(/\[FEED_CARD:(\d+)\]/)
  if (feedCardMatch) {
    const feedId = parseInt(feedCardMatch[1], 10)
    if (!hasFeedCard(feedId)) {
      console.log("[v0] Found feed card marker for feedId:", feedId)
      
      const feedData = await fetchFeedData(feedId)
      if (feedData) {
        feedCardParts.push({
          type: 'tool-generateFeed',
          output: {
            feedId: feedId,
            title: feedData.title,
            description: feedData.description,
            posts: feedData.posts,
            strategy: feedData.strategy,
            isSaved: true,
          },
        })
        console.log("[v0] ✅ Added feed card part from marker for feedId:", feedId)
      } else {
        // Fallback if feed not found
        feedCardParts.push({
          type: 'tool-generateFeed',
          output: {
            feedId: feedId,
            title: 'Instagram Feed',
            description: '',
            posts: [],
            _needsRestore: true,
          },
        })
        console.log("[v0] ⚠️ Feed not found for feedId:", feedId, "- using placeholder")
      }
    }
  }
  
  return feedCardParts
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
      // CRITICAL FIX: Pass chatType to loadChatById for validation
      // This ensures the chat's chat_type matches the requested tab
      chat = await loadChatById(Number.parseInt(requestedChatId), neonUser.id, chatType)
      if (!chat) {
        console.warn("[v0] ⚠️ Chat not found or type mismatch:", {
          requestedChatId,
          requestedChatType: chatType,
          message: "Chat either doesn't exist or is wrong type for this tab"
        })
        return NextResponse.json({ 
          error: "Chat not found or not available in this tab",
          details: `Chat ${requestedChatId} is not available for chat type ${chatType}`
        }, { status: 404 })
      }
      
      // Double-check: Verify chat_type matches (defensive programming)
      if (chat.chat_type !== chatType) {
        console.error("[v0] ❌ CRITICAL: Chat type mismatch after loadChatById:", {
          chatId: chat.id,
          requestedChatType: chatType,
          actualChatType: chat.chat_type,
          message: "This should never happen - loadChatById should have returned null"
        })
        return NextResponse.json({ 
          error: "Chat type mismatch",
          details: `Chat ${chat.id} is type ${chat.chat_type}, but ${chatType} was requested`
        }, { status: 400 })
      }
    } else {
      // This is used on initial page load to show conversation history
      chat = await getOrCreateActiveChat(neonUser.id, chatType)
    }

    const messages = await getChatMessages(chat.id)

    // CRITICAL DEBUG: Log feed_cards and styling_details for all messages to diagnose parsing issues
    console.log("[v0] 🔍 DEBUG: Checking feed_cards and styling_details for all messages:", {
      totalMessages: messages.length,
      messagesWithFeedCards: messages.filter((m: any) => m.feed_cards !== null && m.feed_cards !== undefined).length,
      messagesWithStylingDetails: messages.filter((m: any) => m.styling_details !== null && m.styling_details !== undefined).length,
      feedCardsTypes: messages
        .filter((m: any) => m.feed_cards !== null && m.feed_cards !== undefined)
        .map((m: any) => ({
          id: m.id,
          type: typeof m.feed_cards,
          isArray: Array.isArray(m.feed_cards),
          isString: typeof m.feed_cards === 'string',
          preview: typeof m.feed_cards === 'string' 
            ? m.feed_cards.substring(0, 100) 
            : JSON.stringify(m.feed_cards).substring(0, 100),
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

    // ============================================================================
    // FORMAT MESSAGES - TAB SEPARATION
    // ============================================================================
    // REFACTORED: Feed cards and concept cards are in separate tabs
    // - Feed Tab (chatType="feed-planner"): Only process feed cards
    // - Photos Tab (chatType="maya"/"pro"): Only process concept cards
    // - This ensures proper separation and avoids unnecessary processing
    // ============================================================================
    const isFeedTab = chatType === "feed-planner"
    const isPhotosTab = chatType === "maya" || chatType === "pro"
    
    const formattedMessages = await Promise.all(messages.map(async (msg) => {
      const baseMessage = {
        id: msg.id.toString(),
        role: msg.role,
        createdAt: msg.created_at,
      }

      // CRITICAL: Read feed_cards from dedicated column (matches concept_cards pattern)
      // Fallback to styling_details for backward compatibility
      let feedCards: any = null
      
      // First, try feed_cards column (new dedicated column)
      if (msg.feed_cards) {
        if (typeof msg.feed_cards === 'string') {
          try {
            feedCards = JSON.parse(msg.feed_cards)
            console.log("[v0] 🔍 Parsed feed_cards from string for message", msg.id)
          } catch (parseError) {
            console.error("[v0] ❌ Failed to parse feed_cards string for message", msg.id, ":", parseError)
            feedCards = null
          }
        } else {
          feedCards = msg.feed_cards
        }
      }
      
      // Fallback to styling_details for backward compatibility (old data)
      if (!feedCards && msg.styling_details) {
        if (typeof msg.styling_details === 'string') {
          try {
            const parsedStyling = JSON.parse(msg.styling_details)
            // Only use if it's an array (feed cards format)
            if (Array.isArray(parsedStyling)) {
              feedCards = parsedStyling
              console.log("[v0] 🔍 Fallback: Using feed_cards from styling_details for message", msg.id)
            }
          } catch (parseError) {
            console.error("[v0] ❌ Failed to parse styling_details string for message", msg.id, ":", parseError)
          }
        } else if (Array.isArray(msg.styling_details)) {
          feedCards = msg.styling_details
          console.log("[v0] 🔍 Fallback: Using feed_cards from styling_details (array) for message", msg.id)
        }
      }
      
      // Legacy variable name for backward compatibility in code below
      const parsedStylingDetails = feedCards

      // Extract inspiration image from content if present (backward compatibility)
      const inspirationImageMatch = msg.content?.match(/\[Inspiration Image: (https?:\/\/[^\]]+)\]/)
      const imageUrl = inspirationImageMatch ? inspirationImageMatch[1] : null
      const textContent = imageUrl 
        ? msg.content?.replace(/\[Inspiration Image: https?:\/\/[^\]]+\]/g, "").trim() || ""
        : msg.content || ""

      // ============================================================================
      // PROCESS CONCEPT CARDS (Photos Tab Only)
      // ============================================================================
      // REFACTORED: Only process concept cards for Photos tab (maya/pro chat types)
      // Feed tab should never have concept cards (they're in separate tabs)
      // ============================================================================
      if (isPhotosTab && msg.concept_cards && Array.isArray(msg.concept_cards) && msg.concept_cards.length > 0) {
        console.log("[v0] Formatting message", msg.id, "with", msg.concept_cards.length, "concept cards (Photos tab)")
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
        
        // CRITICAL FIX: Enrich concept cards with generated images from database
        // This ensures images persist on page refresh
        let enrichedConcepts = msg.concept_cards
        try {
          console.log("[v0] 🔍 Starting image enrichment for", msg.concept_cards.length, "concepts in message", msg.id)
          enrichedConcepts = await enrichConceptsWithImages(
            msg.concept_cards,
            neonUser
          )
          
          const conceptsWithImages = enrichedConcepts.filter(c => c.generatedImageUrl).length
          console.log("[v0] ✅ Image enrichment complete:", conceptsWithImages, "of", msg.concept_cards.length, "concepts have images")
          
          // Debug: Log which concepts got images
          enrichedConcepts.forEach((c, i) => {
            if (c.generatedImageUrl) {
              console.log("[v0]   → Concept", i, `"${c.title || c.label || 'Untitled'}"` + " has image")
            } else {
              console.log("[v0]   → Concept", i, `"${c.title || c.label || 'Untitled'}"` + " NO image found")
            }
          })
        } catch (enrichError: any) {
          // If enrichment fails, use original concepts (don't break chat loading)
          console.error("[v0] ❌ Error enriching concepts with images:", enrichError?.message || enrichError)
          console.log("[v0] ⚠️ Continuing with original concepts (no images enriched)")
          enrichedConcepts = msg.concept_cards
        }
        
        parts.push({
          type: "tool-generateConcepts",
          toolCallId: `tool_${msg.id}`,
          state: "ready",
          input: {},
          output: {
            state: "ready",
            concepts: enrichedConcepts, // Use enriched concepts with images
          },
        })
        
        // NOTE: Feed cards are NOT processed here - they're in separate Feed tab
        // If a message somehow has both, it's a data inconsistency that should be fixed
        
        return {
          ...baseMessage,
          parts,
        }
      }

      // ============================================================================
      // PROCESS FEED CARDS (Feed Tab Only)
      // ============================================================================
      // REFACTORED: Only process feed cards for Feed tab (feed-planner chat type)
      // Photos tab should never have feed cards (they're in separate tabs)
      // ============================================================================
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

      // Process feed cards ONLY for Feed tab
      if (isFeedTab) {
        const feedCardParts = await processFeedCards(
          msg,
          parsedStylingDetails,
          textContent,
          neonUser,
          parts
        )
        
        // Add feed card parts to message
        feedCardParts.forEach(part => {
          // Clean [FEED_CARD:feedId] marker from text content if present
          if (part.output?.feedId && textContent.includes(`[FEED_CARD:${part.output.feedId}]`)) {
            const cleanTextContent = textContent.replace(/\[FEED_CARD:\d+\]/g, '').trim()
            if (parts.length > 0 && parts[0].type === 'text') {
              parts[0].text = cleanTextContent || ""
            } else if (cleanTextContent) {
              parts[0] = { type: "text", text: cleanTextContent }
            }
          }
          parts.push(part)
        })
        
        console.log("[v0] ✅ Processed", feedCardParts.length, "feed card(s) for Feed tab message", msg.id)
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

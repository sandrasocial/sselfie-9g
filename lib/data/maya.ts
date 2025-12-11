import { neon } from "@neondatabase/serverless"
import { getRedisClient, CacheKeys, CacheTTL } from "@/lib/redis"

const sql = neon(process.env.DATABASE_URL!)

export interface MayaChat {
  id: number
  user_id: string
  chat_title: string | null
  chat_category: string | null
  chat_summary: string | null
  created_at: Date
  updated_at: Date
  last_activity: Date
  message_count?: number
  first_message?: string // Updated to include first_message
  chat_type?: string // Updated to include chat_type
}

export interface MayaChatMessage {
  id: number
  chat_id: number
  role: "user" | "assistant" | "system"
  content: string
  concept_cards: any[] | null
  created_at: Date
}

export interface MayaPersonalMemory {
  id: number
  user_id: string
  memory_version: number
  preferred_topics: any
  conversation_style: any
  successful_prompt_patterns: any
  user_feedback_patterns: any
  personal_insights: any
  ongoing_goals: any
  personalized_styling_notes: string | null
  personal_brand_id: number | null
  created_at: Date
  updated_at: Date
  last_memory_update: Date
}

export interface UserPersonalBrand {
  id: number
  user_id: string
  name: string | null
  business_type: string | null
  current_situation: string | null
  transformation_story: string | null
  future_vision: string | null
  business_goals: string | null
  photo_goals: string | null
  content_goals: string | null
  style_preferences: string | null
  target_audience: string | null
  content_themes: string | null
  content_pillars: string | null
  brand_voice: string | null
  language_style: string | null
  brand_vibe: string | null
  color_mood: string | null
  color_theme: string | null
  color_palette: any | null // JSONB field for custom colors
  is_completed: boolean
  onboarding_step: number
  created_at: Date
  updated_at: Date
  completed_at: Date | null
}

// Load a specific chat by ID
export async function loadChatById(chatId: number, userId: string): Promise<MayaChat | null> {
  const chat = await sql`
    SELECT * FROM maya_chats
    WHERE id = ${chatId} AND user_id = ${userId}
    LIMIT 1
  `

  if (chat.length === 0) return null

  // Update last_activity when loading a chat
  await sql`
    UPDATE maya_chats
    SET last_activity = NOW()
    WHERE id = ${chatId}
  `

  return chat[0] as MayaChat
}

// Get or create active chat for user
export async function getOrCreateActiveChat(userId: string, chatType = "maya"): Promise<MayaChat> {
  // Try to get the most recent active chat of the specified type
  const existingChats = await sql`
    SELECT * FROM maya_chats
    WHERE user_id = ${userId} AND chat_type = ${chatType}
    ORDER BY last_activity DESC
    LIMIT 1
  `

  if (existingChats.length > 0) {
    return existingChats[0] as MayaChat
  }

  // Create new chat with the specified type
  const newChat = await sql`
    INSERT INTO maya_chats (user_id, chat_title, chat_category, chat_type, last_activity)
    VALUES (${userId}, 'New Chat', 'general', ${chatType}, NOW())
    RETURNING *
  `

  return newChat[0] as MayaChat
}

export async function getChatMessages(chatId: number): Promise<MayaChatMessage[]> {
  try {
    // Try to get from cache first
    const redis = getRedisClient()
    const cacheKey = CacheKeys.mayaChatMessages(chatId)
    const cached = await redis.get<MayaChatMessage[]>(cacheKey)

    if (cached) {
      console.log("[v0] Cache hit for chat messages:", chatId)
      return cached
    }

    console.log("[v0] Cache miss for chat messages:", chatId, "- fetching from Neon")

    // Cache miss - fetch from Neon database
    const messages = await sql`
      SELECT * FROM maya_chat_messages
      WHERE chat_id = ${chatId}
      ORDER BY created_at ASC
    `

    const typedMessages = messages as MayaChatMessage[]

    // Store in cache for future requests
    await redis.setex(cacheKey, CacheTTL.chatMessages, typedMessages)
    console.log("[v0] Cached chat messages for:", chatId)

    return typedMessages
  } catch (error) {
    console.error("[v0] Error in getChatMessages (falling back to Neon only):", error)
    // Fallback to direct database query if Redis fails
    const messages = await sql`
      SELECT * FROM maya_chat_messages
      WHERE chat_id = ${chatId}
      ORDER BY created_at ASC
    `
    return messages as MayaChatMessage[]
  }
}

async function retryDatabaseOperation<T>(operation: () => Promise<T>, maxRetries = 3, delayMs = 1000): Promise<T> {
  let lastError: any

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error

      let errorMessage = ""

      // Handle Response objects from fetch/Neon
      if (error instanceof Response) {
        errorMessage = `HTTP ${error.status}: ${error.statusText}`
      } else if (error instanceof Error) {
        errorMessage = error.message
      } else if (error?.message) {
        errorMessage = String(error.message)
      } else if (typeof error === "string") {
        errorMessage = error
      } else {
        // Safely convert to string without JSON.stringify
        errorMessage = String(error)
      }

      // Check if it's a rate limit error
      const isRateLimit =
        errorMessage.includes("Too Many Requests") ||
        errorMessage.includes("429") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("too many requests")

      if (isRateLimit && attempt < maxRetries) {
        const delay = delayMs * Math.pow(2, attempt - 1) // Exponential backoff
        console.log(`[v0] ⏳ Rate limit hit, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      // If not a rate limit error or we've exhausted retries, throw
      throw error
    }
  }

  throw lastError
}

// Save chat message
export async function saveChatMessage(
  chatId: number,
  role: "user" | "assistant" | "system",
  content: string,
  conceptCards?: any[],
): Promise<MayaChatMessage> {
  console.log("[v0] 💾 saveChatMessage called:", {
    chatId,
    role,
    contentLength: content?.length || 0,
    hasConceptCards: !!conceptCards,
    conceptCardsCount: conceptCards?.length || 0,
  })

  const safeContent = content || ""

  try {
    const message = await retryDatabaseOperation(async () => {
      return await sql`
        INSERT INTO maya_chat_messages (chat_id, role, content, concept_cards)
        VALUES (${chatId}, ${role}, ${safeContent}, ${conceptCards ? JSON.stringify(conceptCards) : null})
        RETURNING *
      `
    })

    console.log("[v0] ✅ Message saved successfully:", {
      messageId: message[0].id,
      chatId: message[0].chat_id,
      role: message[0].role,
    })

    await retryDatabaseOperation(async () => {
      return await sql`
        UPDATE maya_chats
        SET last_activity = NOW(), updated_at = NOW()
        WHERE id = ${chatId}
      `
    })

    console.log("[v0] ✅ Chat last_activity updated for chat:", chatId)

    try {
      const redis = getRedisClient()
      const cacheKey = CacheKeys.mayaChatMessages(chatId)

      if (typeof cacheKey === "string" && cacheKey.length > 0) {
        await redis.del(cacheKey)
        console.log("[v0] ✅ Cache invalidated for chat:", chatId)
      } else {
        console.warn("[v0] ⚠️ Invalid cache key format:", cacheKey)
      }
    } catch (cacheError: any) {
      const cacheErrorMsg = cacheError instanceof Error ? cacheError.message : String(cacheError)
      console.error("[v0] ⚠️ Cache invalidation failed (non-critical):", cacheErrorMsg)
    }

    return message[0] as MayaChatMessage
  } catch (error: any) {
    let errorMessage = "Unknown error"

    // Handle different error types safely
    if (error instanceof Response) {
      errorMessage = `HTTP ${error.status}: ${error.statusText}`
    } else if (error instanceof Error) {
      errorMessage = error.message
    } else if (error?.message) {
      errorMessage = String(error.message)
    } else if (typeof error === "string") {
      errorMessage = error
    } else {
      // Convert to string without JSON.stringify to avoid parsing issues
      errorMessage = String(error)
    }

    // Log error without creating JSON objects that might fail to parse
    console.error("[v0] ❌ Error in saveChatMessage:")
    console.error("  Chat ID:", chatId)
    console.error("  Role:", role)
    console.error("  Error:", errorMessage)

    // Check if it's a rate limit error
    if (
      errorMessage.includes("Too Many Requests") ||
      errorMessage.includes("429") ||
      errorMessage.includes("rate limit") ||
      errorMessage.includes("too many requests")
    ) {
      throw new Error("Too Many Requests: Database rate limit exceeded. Please try again in a moment.")
    }

    // Re-throw with proper error message
    throw new Error(`Database error: ${errorMessage}`)
  }
}

// Get user's personal memory
export async function getUserPersonalMemory(userId: string): Promise<MayaPersonalMemory | null> {
  try {
    // Try cache first
    const redis = getRedisClient()
    const cacheKey = CacheKeys.mayaPersonalMemory(userId)
    const cached = await redis.get<MayaPersonalMemory>(cacheKey)

    if (cached) {
      console.log("[v0] Cache hit for personal memory:", userId)
      return cached
    }

    console.log("[v0] Cache miss for personal memory:", userId, "- fetching from Neon")

    // Fetch from Neon
    const memory = await sql`
      SELECT * FROM maya_personal_memory
      WHERE user_id = ${userId}
      LIMIT 1
    `

    const result = memory.length > 0 ? (memory[0] as MayaPersonalMemory) : null

    // Cache the result (even if null)
    await redis.setex(cacheKey, CacheTTL.personalMemory, result)
    console.log("[v0] Cached personal memory for:", userId)

    return result
  } catch (error) {
    console.error("[v0] Error in getUserPersonalMemory (falling back to Neon only):", error)
    // Fallback to direct database query
    const memory = await sql`
      SELECT * FROM maya_personal_memory
      WHERE user_id = ${userId}
      LIMIT 1
    `
    return memory.length > 0 ? (memory[0] as MayaPersonalMemory) : null
  }
}

// Update or create personal memory
export async function updatePersonalMemory(
  userId: string,
  updates: Partial<Omit<MayaPersonalMemory, "id" | "user_id" | "created_at" | "updated_at">>,
): Promise<MayaPersonalMemory> {
  const existing = await getUserPersonalMemory(userId)

  let result: MayaPersonalMemory

  if (existing) {
    const updated = await sql`
      UPDATE maya_personal_memory
      SET
        preferred_topics = COALESCE(${updates.preferred_topics ? JSON.stringify(updates.preferred_topics) : null}, preferred_topics),
        conversation_style = COALESCE(${updates.conversation_style ? JSON.stringify(updates.conversation_style) : null}, conversation_style),
        successful_prompt_patterns = COALESCE(${updates.successful_prompt_patterns ? JSON.stringify(updates.successful_prompt_patterns) : null}, successful_prompt_patterns),
        user_feedback_patterns = COALESCE(${updates.user_feedback_patterns ? JSON.stringify(updates.user_feedback_patterns) : null}, user_feedback_patterns),
        personal_insights = COALESCE(${updates.personal_insights ? JSON.stringify(updates.personal_insights) : null}, personal_insights),
        ongoing_goals = COALESCE(${updates.ongoing_goals ? JSON.stringify(updates.ongoing_goals) : null}, ongoing_goals),
        personalized_styling_notes = COALESCE(${updates.personalized_styling_notes}, personalized_styling_notes),
        personal_brand_id = COALESCE(${updates.personal_brand_id}, personal_brand_id),
        memory_version = memory_version + 1,
        updated_at = NOW(),
        last_memory_update = NOW()
      WHERE user_id = ${userId}
      RETURNING *
    `
    result = updated[0] as MayaPersonalMemory
  } else {
    const created = await sql`
      INSERT INTO maya_personal_memory (
        user_id,
        preferred_topics,
        conversation_style,
        successful_prompt_patterns,
        user_feedback_patterns,
        personal_insights,
        ongoing_goals,
        personalized_styling_notes,
        personal_brand_id,
        memory_version
      )
      VALUES (
        ${userId},
        ${updates.preferred_topics ? JSON.stringify(updates.preferred_topics) : "{}"},
        ${updates.conversation_style ? JSON.stringify(updates.conversation_style) : "{}"},
        ${updates.successful_prompt_patterns ? JSON.stringify(updates.successful_prompt_patterns) : "{}"},
        ${updates.user_feedback_patterns ? JSON.stringify(updates.user_feedback_patterns) : "{}"},
        ${updates.personal_insights ? JSON.stringify(updates.personal_insights) : "{}"},
        ${updates.ongoing_goals ? JSON.stringify(updates.ongoing_goals) : "{}"},
        ${updates.personalized_styling_notes},
        ${updates.personal_brand_id},
        1
      )
      RETURNING *
    `
    result = created[0] as MayaPersonalMemory
  }

  try {
    const redis = getRedisClient()
    const cacheKey = CacheKeys.mayaPersonalMemory(userId)
    await redis.del(cacheKey)
    console.log("[v0] Cache invalidated for personal memory:", userId)
  } catch (cacheError) {
    console.error("[v0] Error invalidating cache (non-critical):", cacheError)
  }

  return result
}

// Learn from user interaction
export async function learnFromInteraction(
  userId: string,
  interaction: {
    conceptsGenerated?: any[]
    conceptsSelected?: string[]
    imagesGenerated?: number
    imagesFavorited?: number
    feedback?: "positive" | "negative"
    topics?: string[]
  },
): Promise<void> {
  const memory = await getUserPersonalMemory(userId)

  if (!memory) {
    // Initialize memory with first interaction
    await updatePersonalMemory(userId, {
      preferred_topics: interaction.topics || [],
      user_feedback_patterns: {
        total_interactions: 1,
        positive_feedback: interaction.feedback === "positive" ? 1 : 0,
        negative_feedback: interaction.feedback === "negative" ? 1 : 0,
      },
      personal_insights: {
        concepts_generated: interaction.conceptsGenerated?.length || 0,
        images_generated: interaction.imagesGenerated || 0,
        images_favorited: interaction.imagesFavorited || 0,
      },
    })
    return
  }

  // Update existing memory
  const feedbackPatterns = (memory.user_feedback_patterns as any) || {}
  const insights = (memory.personal_insights as any) || {}
  const topics = (memory.preferred_topics as any) || []

  await updatePersonalMemory(userId, {
    preferred_topics: interaction.topics ? [...new Set([...topics, ...interaction.topics])] : topics,
    user_feedback_patterns: {
      ...feedbackPatterns,
      total_interactions: (feedbackPatterns.total_interactions || 0) + 1,
      positive_feedback: (feedbackPatterns.positive_feedback || 0) + (interaction.feedback === "positive" ? 1 : 0),
      negative_feedback: (feedbackPatterns.negative_feedback || 0) + (interaction.feedback === "negative" ? 1 : 0),
    },
    personal_insights: {
      ...insights,
      concepts_generated: (insights.concepts_generated || 0) + (interaction.conceptsGenerated?.length || 0),
      images_generated: (insights.images_generated || 0) + (interaction.imagesGenerated || 0),
      images_favorited: (insights.images_favorited || 0) + (interaction.imagesFavorited || 0),
    },
  })
}

export async function getUserPersonalBrand(userId: string): Promise<UserPersonalBrand | null> {
  try {
    // Try cache first
    const redis = getRedisClient()
    const cacheKey = CacheKeys.mayaPersonalBrand(userId)
    const cached = await redis.get<UserPersonalBrand>(cacheKey)

    if (cached) {
      console.log("[v0] Cache hit for personal brand:", userId)
      return cached
    }

    console.log("[v0] Cache miss for personal brand:", userId, "- fetching from Neon")

    // Fetch from Neon
    const brand = await sql`
      SELECT * FROM user_personal_brand
      WHERE user_id = ${userId}
      LIMIT 1
    `

    const result = brand.length > 0 ? (brand[0] as UserPersonalBrand) : null

    // Cache the result
    await redis.setex(cacheKey, CacheTTL.personalBrand, result)
    console.log("[v0] Cached personal brand for:", userId)

    return result
  } catch (error) {
    console.error("[v0] Error in getUserPersonalBrand (falling back to Neon only):", error)
    // Fallback to direct database query
    const brand = await sql`
      SELECT * FROM user_personal_brand
      WHERE user_id = ${userId}
      LIMIT 1
    `
    return brand.length > 0 ? (brand[0] as UserPersonalBrand) : null
  }
}

export async function linkPersonalMemoryToBrand(userId: string, brandId: number): Promise<void> {
  await sql`
    UPDATE maya_personal_memory
    SET personal_brand_id = ${brandId}
    WHERE user_id = ${userId}
  `
}

// Get all user chats for history browsing
export async function getUserChats(userId: string, chatType?: string, limit = 20): Promise<MayaChat[]> {
  const chats = chatType
    ? await sql`
        SELECT 
          mc.*,
          COUNT(mcm.id) as message_count,
          (
            SELECT content 
            FROM maya_chat_messages 
            WHERE chat_id = mc.id AND role = 'user'
            ORDER BY created_at ASC 
            LIMIT 1
          ) as first_message
        FROM maya_chats mc
        LEFT JOIN maya_chat_messages mcm ON mcm.chat_id = mc.id
        WHERE mc.user_id = ${userId} AND mc.chat_type = ${chatType}
        GROUP BY mc.id
        ORDER BY mc.last_activity DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT 
          mc.*,
          COUNT(mcm.id) as message_count,
          (
            SELECT content 
            FROM maya_chat_messages 
            WHERE chat_id = mc.id AND role = 'user'
            ORDER BY created_at ASC 
            LIMIT 1
          ) as first_message
        FROM maya_chats mc
        LEFT JOIN maya_chat_messages mcm ON mcm.chat_id = mc.id
        WHERE mc.user_id = ${userId}
        GROUP BY mc.id
        ORDER BY mc.last_activity DESC
        LIMIT ${limit}
      `

  return chats as MayaChat[]
}

// Create a new chat (not just get or create)
export async function createNewChat(userId: string, chatType = "maya", title?: string): Promise<MayaChat> {
  const newChat = await sql`
    INSERT INTO maya_chats (user_id, chat_title, chat_category, chat_type, last_activity)
    VALUES (${userId}, ${title || "New Chat"}, 'general', ${chatType}, NOW())
    RETURNING *
  `

  return newChat[0] as MayaChat
}

// Update chat title
export async function updateChatTitle(chatId: number, title: string): Promise<void> {
  await sql`
    UPDATE maya_chats
    SET chat_title = ${title}, updated_at = NOW()
    WHERE id = ${chatId}
  `
}

// Delete a chat and all its messages (cascade delete)
export async function deleteChat(chatId: number, userId: string): Promise<boolean> {
  try {
    // Verify chat belongs to user before deleting
    const chat = await sql`
      SELECT id FROM maya_chats
      WHERE id = ${chatId} AND user_id = ${userId}
      LIMIT 1
    `

    if (chat.length === 0) {
      return false // Chat doesn't exist or doesn't belong to user
    }

    // Delete chat (messages will be cascade deleted due to ON DELETE CASCADE)
    await sql`
      DELETE FROM maya_chats
      WHERE id = ${chatId} AND user_id = ${userId}
    `

    return true
  } catch (error) {
    console.error("[v0] Error deleting chat:", error)
    throw error
  }
}

// Generate chat title from first message
export async function generateChatTitle(firstMessage: string): Promise<string> {
  // Handle edge cases
  if (!firstMessage || firstMessage.trim().length < 5) {
    return `Chat from ${new Date().toLocaleDateString()}`
  }

  // Check for generic greetings
  const genericGreetings = ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening"]
  const lowerMessage = firstMessage.toLowerCase().trim()
  if (genericGreetings.some((greeting) => lowerMessage === greeting || lowerMessage.startsWith(greeting + " "))) {
    return "New Conversation"
  }

  // Extract key concepts from the message (simple approach)
  let title = firstMessage.trim()

  // Remove common filler words from the start
  const fillerWords = [
    "i want",
    "i need",
    "can you",
    "could you",
    "please",
    "help me",
    "i would like",
    "create",
    "make me",
    "generate",
    "show me",
    "give me",
    "let's do",
    "i'd like",
  ]
  for (const filler of fillerWords) {
    if (title.toLowerCase().startsWith(filler)) {
      title = title.substring(filler.length).trim()
    }
  }

  // Remove "a" or "an" from the start if present
  if (title.toLowerCase().startsWith("a ")) {
    title = title.substring(2).trim()
  } else if (title.toLowerCase().startsWith("an ")) {
    title = title.substring(3).trim()
  }

  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1)

  // Limit to 50 characters for display
  if (title.length > 50) {
    title = title.substring(0, 47) + "..."
  }

  return title
}

export async function invalidateChatCache(chatId: number): Promise<void> {
  try {
    const redis = await getRedisClient()
    const cacheKey = CacheKeys.mayaChatMessages(chatId)
    await redis.del(cacheKey)
    console.log("[v0] Cache invalidated for chat:", chatId)
  } catch (error) {
    console.error("[v0] Error invalidating cache:", error)
    // Don't throw - cache invalidation failure shouldn't break the flow
  }
}

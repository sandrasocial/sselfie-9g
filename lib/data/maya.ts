import { neon } from "@neondatabase/serverless"

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
  style_preferences: string | null
  is_completed: boolean
  onboarding_step: number
  created_at: Date
  updated_at: Date
  completed_at: Date | null
}

// Get or create active chat for user
export async function getOrCreateActiveChat(userId: string): Promise<MayaChat> {
  // Try to get the most recent active chat
  const existingChats = await sql`
    SELECT * FROM maya_chats
    WHERE user_id = ${userId}
    ORDER BY last_activity DESC
    LIMIT 1
  `

  if (existingChats.length > 0) {
    return existingChats[0] as MayaChat
  }

  // Create new chat
  const newChat = await sql`
    INSERT INTO maya_chats (user_id, chat_title, chat_category, last_activity)
    VALUES (${userId}, 'New Chat', 'general', NOW())
    RETURNING *
  `

  return newChat[0] as MayaChat
}

// Get chat messages
export async function getChatMessages(chatId: number): Promise<MayaChatMessage[]> {
  const messages = await sql`
    SELECT * FROM maya_chat_messages
    WHERE chat_id = ${chatId}
    ORDER BY created_at ASC
  `

  return messages as MayaChatMessage[]
}

// Save chat message
export async function saveChatMessage(
  chatId: number,
  role: "user" | "assistant" | "system",
  content: string,
  conceptCards?: any[],
): Promise<MayaChatMessage> {
  const message = await sql`
    INSERT INTO maya_chat_messages (chat_id, role, content, concept_cards)
    VALUES (${chatId}, ${role}, ${content}, ${conceptCards ? JSON.stringify(conceptCards) : null})
    RETURNING *
  `

  // Update chat last_activity
  await sql`
    UPDATE maya_chats
    SET last_activity = NOW(), updated_at = NOW()
    WHERE id = ${chatId}
  `

  return message[0] as MayaChatMessage
}

// Get user's personal memory
export async function getUserPersonalMemory(userId: string): Promise<MayaPersonalMemory | null> {
  const memory = await sql`
    SELECT * FROM maya_personal_memory
    WHERE user_id = ${userId}
    LIMIT 1
  `

  return memory.length > 0 ? (memory[0] as MayaPersonalMemory) : null
}

// Update or create personal memory
export async function updatePersonalMemory(
  userId: string,
  updates: Partial<Omit<MayaPersonalMemory, "id" | "user_id" | "created_at" | "updated_at">>,
): Promise<MayaPersonalMemory> {
  const existing = await getUserPersonalMemory(userId)

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
    return updated[0] as MayaPersonalMemory
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
    return created[0] as MayaPersonalMemory
  }
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

// Get user's personal brand
export async function getUserPersonalBrand(userId: string): Promise<UserPersonalBrand | null> {
  const brand = await sql`
    SELECT * FROM user_personal_brand
    WHERE user_id = ${userId}
    LIMIT 1
  `

  return brand.length > 0 ? (brand[0] as UserPersonalBrand) : null
}

export async function linkPersonalMemoryToBrand(userId: string, brandId: number): Promise<void> {
  await sql`
    UPDATE maya_personal_memory
    SET personal_brand_id = ${brandId}
    WHERE user_id = ${userId}
  `
}

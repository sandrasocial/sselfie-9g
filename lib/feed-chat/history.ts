import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface FeedChatMessage {
  id: number
  role: "user" | "assistant"
  content: string
  created_at: string
  chat_id: number
}

export interface FeedChat {
  id: number
  user_id: string
  feed_layout_id: number | null
  chat_type: string
  chat_title: string | null
  context: any
  created_at: string
  last_activity: string
}

/**
 * Get or create a chat for the feed designer
 */
export async function getOrCreateFeedChat(userId: string, feedLayoutId: number): Promise<FeedChat> {
  // Try to find existing chat for this feed
  const existingChats = await sql`
    SELECT * FROM maya_chats
    WHERE user_id = ${userId}
      AND feed_layout_id = ${feedLayoutId}
      AND chat_type = 'feed_designer'
    ORDER BY last_activity DESC
    LIMIT 1
  `

  if (existingChats.length > 0) {
    return existingChats[0] as FeedChat
  }

  // Create new chat
  const newChat = await sql`
    INSERT INTO maya_chats (
      user_id,
      feed_layout_id,
      chat_type,
      chat_title,
      context,
      created_at,
      last_activity
    ) VALUES (
      ${userId},
      ${feedLayoutId},
      'feed_designer',
      'Feed Designer Chat',
      ${JSON.stringify({ agents_used: [], research_completed: false })},
      NOW(),
      NOW()
    )
    RETURNING *
  `

  return newChat[0] as FeedChat
}

/**
 * Get chat history for a feed
 */
export async function getFeedChatHistory(chatId: number): Promise<FeedChatMessage[]> {
  const messages = await sql`
    SELECT * FROM maya_chat_messages
    WHERE chat_id = ${chatId}
    ORDER BY created_at ASC
  `

  return messages as FeedChatMessage[]
}

/**
 * Add message to chat history
 */
export async function addFeedChatMessage(chatId: number, role: "user" | "assistant", content: string): Promise<void> {
  await sql`
    INSERT INTO maya_chat_messages (
      chat_id,
      role,
      content,
      created_at
    ) VALUES (
      ${chatId},
      ${role},
      ${content},
      NOW()
    )
  `

  // Update last_activity on the chat
  await sql`
    UPDATE maya_chats
    SET last_activity = NOW()
    WHERE id = ${chatId}
  `
}

/**
 * Update chat context (for storing agent coordination data)
 */
export async function updateFeedChatContext(chatId: number, context: any): Promise<void> {
  await sql`
    UPDATE maya_chats
    SET context = ${JSON.stringify(context)},
        updated_at = NOW()
    WHERE id = ${chatId}
  `
}

/**
 * Get content research for user
 */
export async function getContentResearch(userId: string) {
  const research = await sql`
    SELECT * FROM content_research
    WHERE user_id = ${userId}
    ORDER BY last_updated DESC
    LIMIT 1
  `

  return research[0] || null
}

/**
 * Get feed strategy for feed layout
 */
export async function getFeedStrategy(feedLayoutId: number) {
  const strategy = await sql`
    SELECT * FROM feed_strategy
    WHERE feed_layout_id = ${feedLayoutId}
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1
  `

  return strategy[0] || null
}

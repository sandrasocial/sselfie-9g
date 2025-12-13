import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface AdminAgentChat {
  id: number
  admin_user_id: string
  chat_title: string
  agent_mode: string | null
  created_at: Date
  updated_at: Date
  last_activity: Date
}

export interface AdminAgentMessage {
  id: number
  chat_id: number
  role: "user" | "assistant"
  content: string
  created_at: Date
}

export async function getOrCreateActiveChat(userId: string): Promise<AdminAgentChat> {
  // Try to get the most recent active chat
  const existingChats = await sql`
    SELECT * FROM admin_agent_chats
    WHERE admin_user_id = ${userId}
    ORDER BY last_activity DESC
    LIMIT 1
  `

  if (existingChats.length > 0) {
    return existingChats[0] as AdminAgentChat
  }

  // Create new chat
  const newChat = await sql`
    INSERT INTO admin_agent_chats (admin_user_id, chat_title, agent_mode, created_at, updated_at, last_activity)
    VALUES (${userId}, 'New Chat', NULL, NOW(), NOW(), NOW())
    RETURNING *
  `

  return newChat[0] as AdminAgentChat
}

export async function loadChatById(chatId: number, userId: string): Promise<AdminAgentChat | null> {
  const chats = await sql`
    SELECT * FROM admin_agent_chats
    WHERE id = ${chatId} AND admin_user_id = ${userId}
    LIMIT 1
  `

  if (chats.length === 0) {
    return null
  }

  return chats[0] as AdminAgentChat
}

export async function getChatMessages(chatId: number): Promise<AdminAgentMessage[]> {
  const messages = await sql`
    SELECT * FROM admin_agent_messages
    WHERE chat_id = ${chatId}
    ORDER BY created_at ASC
  `

  return messages as AdminAgentMessage[]
}

export async function saveChatMessage(
  chatId: number,
  role: "user" | "assistant",
  content: string,
): Promise<AdminAgentMessage> {
  const result = await sql`
    INSERT INTO admin_agent_messages (chat_id, role, content, created_at)
    VALUES (${chatId}, ${role}, ${content}, NOW())
    RETURNING *
  `

  // Update chat last_activity
  await sql`
    UPDATE admin_agent_chats
    SET last_activity = NOW()
    WHERE id = ${chatId}
  `

  return result[0] as AdminAgentMessage
}

export async function createNewChat(userId: string, title: string, mode: string | null = null): Promise<AdminAgentChat> {
  const result = await sql`
    INSERT INTO admin_agent_chats (admin_user_id, chat_title, agent_mode, created_at, updated_at, last_activity)
    VALUES (${userId}, ${title}, ${mode}, NOW(), NOW(), NOW())
    RETURNING *
  `

  return result[0] as AdminAgentChat
}









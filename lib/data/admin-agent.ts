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
  email_preview_data?: any | null
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
  try {
    // Try to select email_preview_data if column exists
    const messages = await sql`
      SELECT 
        id, 
        chat_id, 
        role, 
        content, 
        email_preview_data,
        created_at
      FROM admin_agent_messages
      WHERE chat_id = ${chatId}
      ORDER BY created_at ASC
    `
    return messages as AdminAgentMessage[]
  } catch (error: any) {
    // If email_preview_data column doesn't exist, fall back to basic query
    const errorMessage = error?.message || ''
    const errorCode = error?.code || ''
    
    // Check for missing column error - be specific to avoid false positives
    // PostgreSQL error code 42703 = undefined column (most reliable indicator)
    // Require ALL indicators together to avoid false positives from unrelated errors
    const isMissingColumnError = 
      errorCode === '42703' || // PostgreSQL: undefined column (most reliable)
      errorCode === '42P01' || // PostgreSQL: undefined table
      // Require specific PostgreSQL error pattern: "column ... does not exist" with email_preview_data
      (errorMessage.includes('email_preview_data') && 
       errorMessage.includes('column') && 
       errorMessage.includes('does not exist') &&
       // Ensure it's the full PostgreSQL pattern, not just any "does not exist" error
       (errorMessage.includes('of relation') || errorMessage.match(/column\s+["']?email_preview_data["']?\s+does not exist/i)))
    
    if (isMissingColumnError) {
      console.warn('[v0] email_preview_data column not found, using fallback query:', errorMessage)
      const messages = await sql`
        SELECT id, chat_id, role, content, created_at
        FROM admin_agent_messages
        WHERE chat_id = ${chatId}
        ORDER BY created_at ASC
      `
      // Add null email_preview_data to match interface
      return messages.map((msg: any) => ({
        ...msg,
        email_preview_data: null
      })) as AdminAgentMessage[]
    }
    // Re-throw if it's a different error
    console.error('[v0] Unexpected error in getChatMessages:', error)
    throw error
  }
}

export async function saveChatMessage(
  chatId: number,
  role: "user" | "assistant",
  content: string,
  emailPreviewData?: any | null,
): Promise<AdminAgentMessage> {
  try {
    // Try to insert with email_preview_data if column exists
    const result = await sql`
      INSERT INTO admin_agent_messages (chat_id, role, content, email_preview_data, created_at)
      VALUES (${chatId}, ${role}, ${content}, ${emailPreviewData ? JSON.stringify(emailPreviewData) : null}::jsonb, NOW())
      RETURNING *
    `

    // Update chat last_activity
    await sql`
      UPDATE admin_agent_chats
      SET last_activity = NOW()
      WHERE id = ${chatId}
    `

    return result[0] as AdminAgentMessage
  } catch (error: any) {
    // If email_preview_data column doesn't exist, fall back to insert without it
    const errorMessage = error?.message || ''
    const errorCode = error?.code || ''
    
    // Check for missing column error - be specific to avoid false positives
    // PostgreSQL error code 42703 = undefined column (most reliable indicator)
    // Require ALL indicators together to avoid false positives from unrelated errors
    const isMissingColumnError = 
      errorCode === '42703' || // PostgreSQL: undefined column (most reliable)
      errorCode === '42P01' || // PostgreSQL: undefined table
      // Require specific PostgreSQL error pattern: "column ... does not exist" with email_preview_data
      (errorMessage.includes('email_preview_data') && 
       errorMessage.includes('column') && 
       errorMessage.includes('does not exist') &&
       // Ensure it's the full PostgreSQL pattern, not just any "does not exist" error
       (errorMessage.includes('of relation') || errorMessage.match(/column\s+["']?email_preview_data["']?\s+does not exist/i)))
    
    if (isMissingColumnError) {
      console.warn('[v0] email_preview_data column not found, using fallback insert:', errorMessage)
      
      // Insert without email_preview_data column
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

      // Add null email_preview_data to match interface
      return {
        ...result[0],
        email_preview_data: null
      } as AdminAgentMessage
    }
    // Re-throw if it's a different error
    console.error('[v0] Unexpected error in saveChatMessage:', error)
    throw error
  }
}

export async function createNewChat(userId: string, title: string, mode: string | null = null): Promise<AdminAgentChat> {
  const result = await sql`
    INSERT INTO admin_agent_chats (admin_user_id, chat_title, agent_mode, created_at, updated_at, last_activity)
    VALUES (${userId}, ${title}, ${mode}, NOW(), NOW(), NOW())
    RETURNING *
  `

  return result[0] as AdminAgentChat
}








































import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getAuthenticatedUser } from "@/lib/auth-helper"

const sql = neon(process.env.DATABASE_URL || "")

export async function POST(req: Request) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { messages, concepts, chatType } = await req.json()

    // CRITICAL FIX: Set chat_type when creating chat (default to "maya" for backward compatibility)
    // This ensures chats are properly typed and can be filtered correctly
    const finalChatType = chatType || "maya"
    
    const [chat] = await sql`
      INSERT INTO maya_chats (user_id, chat_type, created_at, updated_at)
      VALUES (${user.id}, ${finalChatType}, NOW(), NOW())
      RETURNING id
    `

    for (const message of messages) {
      await sql`
        INSERT INTO maya_chat_messages (chat_id, role, content)
        VALUES (${chat.id}, ${message.role}, ${message.content})
      `
    }

    if (concepts && concepts.length > 0) {
      for (const concept of concepts) {
        await sql`
          INSERT INTO maya_concepts (
            user_id, title, description, type, prompt, created_at
          )
          VALUES (
            ${user.id}, ${concept.title}, ${concept.description},
            ${concept.category}, ${concept.prompt}, NOW()
          )
        `
      }
    }

    return NextResponse.json({ success: true, chatId: chat.id })
  } catch (error) {
    console.error("[Save Chat Error]", error)
    return NextResponse.json({ error: "Failed to save chat" }, { status: 500 })
  }
}

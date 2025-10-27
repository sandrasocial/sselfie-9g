import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getOrCreateActiveChat, getChatMessages } from "@/lib/data/maya"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get Neon user ID
    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get or create active chat
    const chat = await getOrCreateActiveChat(neonUser.id)

    // Get chat messages
    const messages = await getChatMessages(chat.id)

    const formattedMessages = messages.map((msg) => {
      const baseMessage = {
        id: msg.id.toString(),
        role: msg.role,
        createdAt: msg.created_at,
      }

      // If message has concept cards, create a parts array with tool call
      if (msg.concept_cards && Array.isArray(msg.concept_cards) && msg.concept_cards.length > 0) {
        return {
          ...baseMessage,
          parts: [
            {
              type: "text",
              text: msg.content || "",
            },
            {
              type: "tool-generateConcepts",
              toolCallId: `tool_${msg.id}`,
              state: "output-available",
              input: {},
              output: {
                state: "ready",
                concepts: msg.concept_cards,
              },
            },
          ],
        }
      }

      // Otherwise, just use content string
      return {
        ...baseMessage,
        content: msg.content,
      }
    })

    return NextResponse.json({
      chatId: chat.id,
      messages: formattedMessages,
    })
  } catch (error) {
    console.error("[v0] Error loading chat:", error)
    return NextResponse.json({ error: "Failed to load chat" }, { status: 500 })
  }
}

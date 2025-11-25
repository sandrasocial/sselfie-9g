import { type NextRequest, NextResponse } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getOrCreateActiveChat, getChatMessages, loadChatById } from "@/lib/data/maya"
import { getAuthenticatedUser } from "@/lib/auth-helper"

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
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

    const formattedMessages = messages.map((msg) => {
      const baseMessage = {
        id: msg.id.toString(),
        role: msg.role,
        createdAt: msg.created_at,
      }

      if (msg.concept_cards && Array.isArray(msg.concept_cards) && msg.concept_cards.length > 0) {
        console.log("[v0] Formatting message", msg.id, "with", msg.concept_cards.length, "concept cards")
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
              state: "ready",
              input: {},
              output: {
                state: "ready",
                concepts: msg.concept_cards,
              },
            },
          ],
        }
      }

      return {
        ...baseMessage,
        parts: [
          {
            type: "text",
            text: msg.content || "",
          },
        ],
      }
    })

    const formattedWithConcepts = formattedMessages.filter((msg: any) =>
      msg.parts?.some((p: any) => p.type === "tool-generateConcepts"),
    )
    console.log("[v0] Formatted messages with tool-generateConcepts parts:", formattedWithConcepts.length)

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

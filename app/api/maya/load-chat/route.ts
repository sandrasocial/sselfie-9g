import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getOrCreateActiveChat, getChatMessages, loadChatById } from "@/lib/data/maya"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] ========== load-chat API START ==========")

    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[v0] ❌ Unauthorized - no user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      console.log("[v0] ❌ User not found in Neon")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] 👤 Loading chat for user:", neonUser.id)

    const { searchParams } = new URL(request.url)
    const requestedChatId = searchParams.get("chatId")
    const chatType = searchParams.get("chatType") || "maya"

    console.log("[v0] 📋 Requested chat ID:", requestedChatId || "active chat", "Type:", chatType)

    let chat
    if (requestedChatId) {
      chat = await loadChatById(Number.parseInt(requestedChatId), neonUser.id)
      if (!chat) {
        console.log("[v0] ❌ Chat not found:", requestedChatId)
        return NextResponse.json({ error: "Chat not found" }, { status: 404 })
      }
      console.log("[v0] ✅ Loaded specific chat:", chat.id)
    } else {
      chat = await getOrCreateActiveChat(neonUser.id, chatType)
      console.log("[v0] ✅ Got/created active chat:", chat.id, "Type:", chatType)
    }

    const messages = await getChatMessages(chat.id)

    console.log("[v0] 📨 Loading chat messages:", messages.length, "for chat ID:", chat.id)
    messages.forEach((msg, index) => {
      console.log(`[v0] Message ${index + 1}:`, {
        id: msg.id,
        role: msg.role,
        hasConceptCards: !!msg.concept_cards,
        conceptCardsType: Array.isArray(msg.concept_cards) ? "array" : typeof msg.concept_cards,
        conceptCardsLength: Array.isArray(msg.concept_cards) ? msg.concept_cards.length : 0,
        conceptCards: msg.concept_cards,
      })
    })

    const formattedMessages = messages.map((msg) => {
      const baseMessage = {
        id: msg.id.toString(),
        role: msg.role,
        createdAt: msg.created_at,
      }

      if (msg.concept_cards && Array.isArray(msg.concept_cards) && msg.concept_cards.length > 0) {
        console.log("[v0] Formatting message with concept cards:", msg.id, "Cards:", msg.concept_cards.length)
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

    console.log("[v0] Formatted messages:", formattedMessages.length)

    console.log("[v0] ========== load-chat API END (success) ==========")
    return NextResponse.json({
      chatId: chat.id,
      chatTitle: chat.chat_title,
      messages: formattedMessages,
    })
  } catch (error) {
    console.error("[v0] ========== load-chat API END (error) ==========")
    console.error("[v0] Error loading chat:", error)
    return NextResponse.json({ error: "Failed to load chat" }, { status: 500 })
  }
}

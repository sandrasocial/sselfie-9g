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
      chat = await loadChatById(Number.parseInt(requestedChatId), neonUser.id)
      if (!chat) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 })
      }
    } else {
      // This is used on initial page load to show conversation history
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

      // Extract inspiration image from content if present (backward compatibility)
      const inspirationImageMatch = msg.content?.match(/\[Inspiration Image: (https?:\/\/[^\]]+)\]/)
      const imageUrl = inspirationImageMatch ? inspirationImageMatch[1] : null
      const textContent = imageUrl 
        ? msg.content?.replace(/\[Inspiration Image: https?:\/\/[^\]]+\]/g, "").trim() || ""
        : msg.content || ""

      if (msg.concept_cards && Array.isArray(msg.concept_cards) && msg.concept_cards.length > 0) {
        console.log("[v0] Formatting message", msg.id, "with", msg.concept_cards.length, "concept cards")
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
        
        parts.push({
          type: "tool-generateConcepts",
          toolCallId: `tool_${msg.id}`,
          state: "ready",
          input: {},
          output: {
            state: "ready",
            concepts: msg.concept_cards,
          },
        })
        
        return {
          ...baseMessage,
          parts,
        }
      }

      // Regular message - include image if present
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

      return {
        ...baseMessage,
        parts: parts.length > 0 ? parts : [{ type: "text", text: "" }],
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

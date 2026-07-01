// SSELFIE Studio 3.0 - load + archive one conversation (MAYA-REBUILD-05 Phase C).
// GET    -> the conversation's messages (ownership-checked).
// DELETE -> soft-archive (never hard delete).

import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { loadChat, archiveChat } from "@/lib/app-v3/maya/chat-store"
import { sanitizeMayaMessages } from "@/lib/app-v3/maya/message-sanitizer"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const neonUserId = await getUserIdFromSupabase(user.id)
  if (!neonUserId) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    const chat = await loadChat(String(neonUserId), id)
    if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({
      ...chat,
      messages: Array.isArray(chat.messages)
        ? sanitizeMayaMessages(chat.messages, { admin: true })
        : [],
    })
  } catch (e) {
    console.error("[app-v3 chats/:id] load failed:", e)
    return NextResponse.json({ error: "Could not load chat" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const neonUserId = await getUserIdFromSupabase(user.id)
  if (!neonUserId) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    await archiveChat(String(neonUserId), id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[app-v3 chats/:id] archive failed:", e)
    return NextResponse.json({ error: "Could not delete chat" }, { status: 500 })
  }
}

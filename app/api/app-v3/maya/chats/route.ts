// SSELFIE Studio 3.0 - /app conversation list + upsert (MAYA-REBUILD-05 Phase C).
// GET  -> the admin's saved conversations (id, title, updatedAt).
// POST -> upsert one conversation { id, messages, title } (called by the client on each
//         completed turn). Isolated; admin reaches it via the admin-gated /app shell.

import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { listChats, saveChat } from "@/lib/app-v3/maya/chat-store"
import { sanitizeMayaMessages } from "@/lib/app-v3/maya/message-sanitizer"
import { sanitizeStoredMayaWorkspaceSnapshot } from "@/lib/app-v3/maya/draft-snapshot"

export const dynamic = "force-dynamic"

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const neonUserId = await getUserIdFromSupabase(user.id)
  if (!neonUserId) return NextResponse.json({ chats: [] })

  try {
    const chats = await listChats(String(neonUserId))
    return NextResponse.json({ chats })
  } catch (e) {
    console.error("[app-v3 chats] list failed:", e)
    return NextResponse.json({ error: "Could not load chats" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => null)) as {
    id?: string
    messages?: unknown[]
    title?: string
    savedAt?: number
    workspace?: unknown
    taskStatus?: string
    thumbnailUrl?: string | null
    outputCount?: number
  } | null
  const id = typeof body?.id === "string" && body.id.length > 0 ? body.id : null
  const messages = Array.isArray(body?.messages) ? body.messages : null
  if (!id || !messages) {
    return NextResponse.json({ error: "id and messages are required" }, { status: 400 })
  }
  const title = typeof body?.title === "string" ? body.title.slice(0, 80) : null
  const savedAt =
    typeof body?.savedAt === "number" && Number.isFinite(body.savedAt) ? body.savedAt : Date.now()

  const neonUserId = await getUserIdFromSupabase(user.id)
  if (!neonUserId) return NextResponse.json({ error: "User not found" }, { status: 404 })

  try {
    await saveChat(
      String(neonUserId),
      id,
      sanitizeMayaMessages(messages, { admin: true }),
      title,
      savedAt,
      {
        workspace: sanitizeStoredMayaWorkspaceSnapshot(body?.workspace),
        status:
          body?.taskStatus === "creating" || body?.taskStatus === "ready"
            ? body.taskStatus
            : "planning",
        thumbnailUrl:
          typeof body?.thumbnailUrl === "string" && body.thumbnailUrl.startsWith("https://")
            ? body.thumbnailUrl.slice(0, 2000)
            : null,
        outputCount:
          typeof body?.outputCount === "number" && Number.isInteger(body.outputCount)
            ? body.outputCount
            : 0,
      }
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[app-v3 chats] save failed:", e)
    return NextResponse.json({ error: "Could not save chat" }, { status: 500 })
  }
}

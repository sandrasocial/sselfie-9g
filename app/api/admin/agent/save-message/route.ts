import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { requireAdmin } from "@/lib/security/require-admin"
import { checkAdminRateLimit } from "@/lib/security/admin-rate-limit"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    // Admin auth check
    const admin = await requireAdmin(request)
    if (admin instanceof NextResponse) return admin

    // Rate limiting
    const rateLimitCheck = await checkAdminRateLimit(request, `admin:${admin.neonUserId}`)
    if (rateLimitCheck) return rateLimitCheck

    // Input validation
    const body = await request.json().catch(() => ({}))
    const { chatId, role, content } = body

    if (!chatId || !role || !content) {
      return NextResponse.json(
        { error: "Missing required fields: chatId, role, content" },
        { status: 400 }
      )
    }

    if (typeof chatId !== "number" && typeof chatId !== "string") {
      return NextResponse.json({ error: "Invalid chatId format" }, { status: 400 })
    }

    if (!["user", "assistant", "system"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    if (typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Content must be a non-empty string" }, { status: 400 })
    }

    // Save message to database
    await sql`
      INSERT INTO admin_agent_messages (chat_id, role, content, created_at)
      VALUES (${chatId}, ${role}, ${content}, NOW())
    `

    // Update chat last_activity
    await sql`
      UPDATE admin_agent_chats
      SET last_activity = NOW()
      WHERE id = ${chatId}
    `

    console.log("[v0] Saved admin agent message to chat:", chatId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving admin agent message:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "Failed to save message", details: errorMessage },
      { status: 500 }
    )
  }
}

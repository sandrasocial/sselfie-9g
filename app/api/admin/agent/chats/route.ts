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
    const { userId, mode, firstMessage } = body

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

    const userIdNum = Number.parseInt(String(userId), 10)
    if (Number.isNaN(userIdNum)) {
      return NextResponse.json({ error: "Invalid userId format" }, { status: 400 })
    }

    const agentMode = mode || 'research'

    // Generate chat title from first message
    let chatTitle = "New Chat"
    if (firstMessage && firstMessage.length > 5) {
      chatTitle = firstMessage.substring(0, 50)
      if (firstMessage.length > 50) {
        chatTitle += "..."
      }
    }

    const newChat = await sql`
      INSERT INTO admin_agent_chats (admin_user_id, chat_title, agent_mode, last_activity)
      VALUES (${userIdNum}, ${chatTitle}, ${agentMode}, NOW())
      RETURNING *
    `

    console.log("[v0] Created admin agent chat:", newChat[0].id)

    return NextResponse.json({ chatId: newChat[0].id })
  } catch (error) {
    console.error("[v0] Error creating admin agent chat:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Admin auth check
    const admin = await requireAdmin(request)
    if (admin instanceof NextResponse) return admin

    // Rate limiting
    const rateLimitCheck = await checkAdminRateLimit(request, `admin:${admin.neonUserId}`)
    if (rateLimitCheck) return rateLimitCheck

    // Input validation
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

    const userIdNum = Number.parseInt(userId, 10)
    if (Number.isNaN(userIdNum)) {
      return NextResponse.json({ error: "Invalid userId format" }, { status: 400 })
    }

    const chats = await sql`
      SELECT 
        aac.*,
        COUNT(aam.id) as message_count
      FROM admin_agent_chats aac
      LEFT JOIN admin_agent_messages aam ON aam.chat_id = aac.id
      WHERE aac.admin_user_id = ${userIdNum}
      GROUP BY aac.id
      ORDER BY aac.last_activity DESC
      LIMIT 20
    `

    return NextResponse.json({ chats })
  } catch (error) {
    console.error("[v0] Error in chats route:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    )
  }
}

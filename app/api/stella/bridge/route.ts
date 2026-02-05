import { NextRequest, NextResponse } from "next/server"
import { stellaReply, parseStellaMode } from "@/lib/stella/runtime"

export async function POST(req: NextRequest) {
  try {
    const token = process.env.STELLA_BRIDGE_TOKEN
    if (!token) {
      return NextResponse.json(
        { error: "STELLA_BRIDGE_TOKEN not configured" },
        { status: 500 }
      )
    }

    const authHeader = req.headers.get("authorization") || ""
    const headerToken = authHeader.replace(/^Bearer\\s+/i, "").trim()
    const altHeaderToken = (req.headers.get("x-stella-token") || "").trim()

    const body = await req.json().catch(() => ({} as { message?: string; mode?: string; token?: string }))
    const bodyToken = typeof body?.token === "string" ? body.token.trim() : ""

    const provided = headerToken || altHeaderToken || bodyToken
    if (!provided || provided !== token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { message, mode } = body as { message?: string; mode?: string }
    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 })
    }

    const parsed = parseStellaMode(message)
    const finalMode = mode || parsed.mode
    const finalMessage = parsed.cleaned

    const response = await stellaReply({ message: finalMessage, mode: finalMode })

    return NextResponse.json({
      response,
      mode: finalMode,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("[Stella] Bridge error:", error)
    return NextResponse.json(
      {
        error: "Bridge failure",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

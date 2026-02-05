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
    const provided = authHeader.replace(/^Bearer\\s+/i, "").trim()
    if (provided !== token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { message, mode } = await req.json()
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

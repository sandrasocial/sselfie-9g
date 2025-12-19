import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessToken } = body

    if (!accessToken) {
      return NextResponse.json({ error: "Access token required" }, { status: 400 })
    }

    // Set access token cookie
    const cookieStore = await cookies()
    cookieStore.set("access_token", accessToken, {
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[PromptGuide] Error setting cookie:", error)
    return NextResponse.json(
      {
        error: "Failed to set cookie",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { getUserActiveSession } from "@/lib/data/sessions"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let neonUser
    try {
      neonUser = await getUserByAuthId(authUser.id)
    } catch (dbError) {
      console.error("[v0] Database connection error in session route:", dbError)
      // Return null session instead of crashing when database is temporarily unavailable
      return NextResponse.json({ session: null })
    }

    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] Fetching active session for Neon user:", neonUser.id)

    let session
    try {
      session = await getUserActiveSession(neonUser.id)
    } catch (sessionError) {
      console.error("[v0] Error fetching session:", sessionError)
      // Return null session instead of crashing
      return NextResponse.json({ session: null })
    }

    console.log("[v0] Active session:", session)

    return NextResponse.json({ session })
  } catch (error) {
    console.error("[v0] Error fetching active session:", error)
    return NextResponse.json({ session: null })
  }
}

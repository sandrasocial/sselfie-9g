import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    console.log("[v0] Logging out user...")

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error("[v0] Logout error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] User logged out successfully")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error during logout:", error)
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 })
  }
}

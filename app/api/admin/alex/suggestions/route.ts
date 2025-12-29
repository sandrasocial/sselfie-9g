import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getProactiveSuggestions } from "@/lib/alex/proactive-suggestions"

const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * GET /api/admin/alex/suggestions
 * Fetch active proactive suggestions for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Get active suggestions (not dismissed)
    const suggestions = await getProactiveSuggestions(user.id.toString(), user.email || undefined)

    return NextResponse.json({
      success: true,
      suggestions: suggestions || []
    })

  } catch (error: any) {
    console.error('[Alex] Error fetching suggestions:', error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch suggestions" },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { dismissSuggestion } from "@/lib/alex/proactive-suggestions"

const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * POST /api/admin/alex/suggestions/dismiss
 * Dismiss a suggestion
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { suggestionId } = body

    if (!suggestionId || typeof suggestionId !== 'number') {
      return NextResponse.json(
        { error: "suggestionId is required and must be a number" },
        { status: 400 }
      )
    }

    const success = await dismissSuggestion(suggestionId, user.id.toString())

    if (!success) {
      return NextResponse.json(
        { error: "Failed to dismiss suggestion" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Suggestion dismissed"
    })

  } catch (error: any) {
    console.error('[Alex] Error dismissing suggestion:', error)
    return NextResponse.json(
      { error: error.message || "Failed to dismiss suggestion" },
      { status: 500 }
    )
  }
}


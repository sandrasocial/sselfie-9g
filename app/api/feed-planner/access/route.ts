import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getFeedPlannerAccess } from "@/lib/feed-planner/access-control"

/**
 * GET /api/feed-planner/access
 * 
 * Returns Feed Planner access control for the authenticated user
 * Used by FeedViewScreen when used in SselfieApp (without access prop)
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get Neon user by auth ID
    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get access control
    const access = await getFeedPlannerAccess(neonUser.id.toString())

    return NextResponse.json(access)
  } catch (error) {
    console.error("[Feed Planner Access API] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get access control" },
      { status: 500 }
    )
  }
}

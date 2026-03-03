import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getFeedPlannerAccess } from "@/lib/feed-planner/access-control"
import { withAuth } from "@/lib/auth/with-auth"

/**
 * GET /api/feed-planner/access
 *
 * Returns Feed Planner access control for the authenticated user
 * Used by FeedViewScreen when used in SselfieApp (without access prop)
 */
async function handleGetFeedPlannerAccess({
  user,
}: {
  request: Request | NextRequest
  user: { id: string | number }
}) {
  try {
    const access = await getFeedPlannerAccess(user.id.toString())
    return NextResponse.json(access)
  } catch (error) {
    console.error("[Feed Planner Access API] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get access control" },
      { status: 500 },
    )
  }
}

export const GET = withAuth(handleGetFeedPlannerAccess)

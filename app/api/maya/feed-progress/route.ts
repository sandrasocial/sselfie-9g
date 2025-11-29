import { type NextRequest, NextResponse } from "next/server"
import { getFeedProgress } from "@/lib/feed-progress"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser()
    if (error || !user) {
      return NextResponse.json({ status: "idle", message: "Unauthorized", progress: 0 }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ status: "idle", message: "User not found", progress: 0 }, { status: 404 })
    }

    const userId = String(neonUser.id)

    if (!userId) {
      return NextResponse.json({
        status: "idle",
        message: "No active feed generation",
        progress: 0,
      })
    }

    // Get progress from Redis only (no database call)
    const progress = await getFeedProgress(userId)

    if (!progress) {
      return NextResponse.json({
        status: "idle",
        message: "No active feed generation",
        progress: 0,
      })
    }

    return NextResponse.json(progress)
  } catch (error) {
    console.error("[v0] [PROGRESS API] Error fetching feed progress:", error)
    return NextResponse.json({
      status: "idle",
      message: "No active feed generation",
      progress: 0,
    })
  }
}

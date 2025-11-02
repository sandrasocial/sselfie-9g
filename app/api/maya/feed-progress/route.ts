import { type NextRequest, NextResponse } from "next/server"
import { getFeedProgress } from "@/lib/feed-progress"

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId")

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

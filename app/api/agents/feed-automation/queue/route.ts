import { type NextRequest, NextResponse } from "next/server"
import * as autoPostingWorkflow from "../../../../../agents/workflows/autoPostingWorkflow"

/**
 * POST - Queue scheduled posts for publishing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, feedPostId } = body

    const result = await autoPostingWorkflow.runWorkflow({
      userId,
      feedPostId,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[API] Auto-posting queue error:", error)
    return NextResponse.json(
      {
        error: "Failed to queue posts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

/**
 * PATCH - Mark a queued post as successfully posted
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { queueId, userId } = body

    if (!queueId || !userId) {
      return NextResponse.json({ error: "queueId and userId are required" }, { status: 400 })
    }

    const result = await autoPostingWorkflow.markAsPosted(queueId, userId)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[API] Mark as posted error:", error)
    return NextResponse.json(
      {
        error: "Failed to mark post as published",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

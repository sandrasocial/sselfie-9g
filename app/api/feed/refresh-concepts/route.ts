import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    console.log("[v0] Refreshing concept cards (keeping generated images)")

    const { user: authUser, error: authError } = await getAuthenticatedUserWithRetry()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(
      {
        error: "V1_CONCEPTS_DEPRECATED",
        details: "Concept card refresh is deprecated in Feed Planner V2.",
      },
      { status: 410 },
    )
  } catch (error) {
    console.error("[v0] Error refreshing concepts:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to refresh concepts" },
      { status: 500 },
    )
  }
}

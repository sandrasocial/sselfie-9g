import { NextResponse } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { withAuth } from "@/lib/auth/with-auth"

export const maxDuration = 60

async function handleRefreshConcepts({
  user: _user,
}: {
  user: NonNullable<Awaited<ReturnType<typeof getUserByAuthId>>>
}) {
  try {
    console.log("[v0] Refreshing concept cards (keeping generated images)")

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

export const POST = withAuth(handleRefreshConcepts, {
  authMode: "retry",
  resolveUser: getUserByAuthId,
})

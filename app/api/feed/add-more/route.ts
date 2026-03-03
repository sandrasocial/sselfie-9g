import { NextResponse } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { withAuth } from "@/lib/auth/with-auth"

export const maxDuration = 60

async function handleAddMore(
  { user }: { user: NonNullable<Awaited<ReturnType<typeof getUserByAuthId>>> },
) {
  try {
    console.log("[v0] Adding more concept cards to feed")

    return NextResponse.json(
      {
        error: "V1_CONCEPTS_DEPRECATED",
        details: "Adding V1 concept cards is deprecated in Feed Planner V2.",
      },
      { status: 410 },
    )
  } catch (error) {
    console.error("[v0] Error adding more concepts:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add concepts" },
      { status: 500 },
    )
  }
}

export const POST = withAuth(handleAddMore, {
  authMode: "retry",
  resolveUser: getUserByAuthId,
})

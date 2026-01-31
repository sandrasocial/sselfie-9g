import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { addCredits } from "@/lib/credits"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      console.error("[v0] [ADMIN] Auth error in credit add:", authError?.message)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { userId, amount, reason } = await request.json()

    if (!userId || !amount || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid credit amount" }, { status: 400 })
    }

    const description = `Admin credit grant: ${reason} (by ${neonUser.email})`
    const result = await addCredits(userId, amount, "bonus", description)

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Failed to add credits",
        },
        { status: 500 },
      )
    }

    console.log("[v0] [ADMIN] Added credits:", {
      admin: neonUser.email,
      userId,
      amount,
      reason,
      newBalance: result.newBalance,
    })

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
      message: `Added ${amount} credits successfully`,
    })
  } catch (error) {
    console.error("[v0] [ADMIN] Error adding credits:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        error: errorMessage.includes("Too Many")
          ? "Rate limit reached. Please wait a moment and try again."
          : "Failed to add credits. Please try again.",
      },
      { status: 500 },
    )
  }
}

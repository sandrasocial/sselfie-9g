import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db"
/**
 * GET /api/credits/balance
 * 
 * Returns user's credit balance, total_used, and total_purchased
 * Used by free mode upsell modal to check credits
 */
export async function GET(req: NextRequest) {
  if (process.env.ENABLE_UNUSED_ENDPOINTS !== "true") return NextResponse.json({ error: "Endpoint disabled" }, { status: 410 })
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sql = getDb()
    const [credits] = await sql`
      SELECT balance, total_used, total_purchased
      FROM user_credits
      WHERE user_id = ${user.id}
    ` as any[]

    if (!credits) {
      // User has no credits record yet - initialize with 0
      return NextResponse.json({
        balance: 0,
        total_used: 0,
        total_purchased: 0,
      })
    }

    return NextResponse.json({
      balance: credits.balance || 0,
      total_used: credits.total_used || 0,
      total_purchased: credits.total_purchased || 0,
    })
  } catch (error) {
    console.error("[Credits Balance] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch credits" },
      { status: 500 }
    )
  }
}

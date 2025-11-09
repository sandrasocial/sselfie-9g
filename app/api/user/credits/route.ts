import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserCreditsCached } from "@/lib/credits-cached"
import { getCreditHistory } from "@/lib/credits"

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const balance = await getUserCreditsCached(neonUser.id)
    const history = await getCreditHistory(neonUser.id, 50)

    return NextResponse.json({
      balance,
      history,
    })
  } catch (error) {
    console.error("[v0] Error fetching user credits:", error)
    return NextResponse.json({ error: "Failed to fetch credits" }, { status: 500 })
  }
}

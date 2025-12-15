import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { detectUpgradeOpportunities } from "@/lib/upgrade-detection"

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ opportunities: [] }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ opportunities: [] }, { status: 404 })
    }

    const opportunities = await detectUpgradeOpportunities(neonUser.id)
    return NextResponse.json({ opportunities })
  } catch (error: any) {
    console.error("[v0] [UPGRADE_OPPS] Error fetching opportunities:", error)
    return NextResponse.json({ opportunities: [], error: error?.message }, { status: 500 })
  }
}

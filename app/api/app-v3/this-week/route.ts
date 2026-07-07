// THIS WEEK (2026-07-07): the member's weekly Instagram brief - 3 personalized ideas riding
// what's working right now. Week-keyed end to end (lib/this-week/*), so this route can only
// ever return the current week's ideas; a new week regenerates on her first open.

import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getOrCreateMemberWeeklyBrief } from "@/lib/this-week/member-brief"

export const dynamic = "force-dynamic"
export const maxDuration = 120

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const neonUser = await getUserByAuthId(user.id)
  if (!neonUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  try {
    const brief = await getOrCreateMemberWeeklyBrief(user.id, neonUser.id)
    return NextResponse.json(brief)
  } catch (error) {
    console.error("[this-week] brief failed:", error)
    return NextResponse.json({ error: "brief_failed" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getMayaUserSnapshot } from "@/lib/maya/user-snapshot"
import { getMayaNextBestMove } from "@/lib/maya/next-best-move"

export async function GET() {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const snapshot = await getMayaUserSnapshot(user.id)
    const nextBestMove = getMayaNextBestMove(snapshot)

    return NextResponse.json({ nextBestMove })
  } catch (error) {
    console.error("[Maya Next Best Move] Failed:", error)
    return NextResponse.json(
      { error: "Maya could not choose a next move right now." },
      { status: 500 },
    )
  }
}

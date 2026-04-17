import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"
import { mergeMayaMemoryData } from "@/lib/maya/memory-store"

type EnergyState = "high" | "managing" | "survival"

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

    const rows = await sql`
      SELECT
        memory_data->>'weekly_energy_state' AS energy_state,
        memory_data->>'weekly_energy_state_set_at' AS set_at
      FROM maya_personal_memory
      WHERE user_id = ${user.id}
      LIMIT 1
    `

    if (!rows.length || !rows[0].energy_state) {
      return NextResponse.json({ energyState: null, setAt: null })
    }

    return NextResponse.json({
      energyState: rows[0].energy_state as EnergyState,
      setAt: rows[0].set_at as string,
    })
  } catch (error) {
    console.error("[Maya Energy State GET] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { energyState } = body

    if (!["high", "managing", "survival"].includes(energyState)) {
      return NextResponse.json({ error: "Invalid energy state" }, { status: 400 })
    }

    await mergeMayaMemoryData(user.id, {
      weekly_energy_state: energyState,
      weekly_energy_state_set_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Maya Energy State POST] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

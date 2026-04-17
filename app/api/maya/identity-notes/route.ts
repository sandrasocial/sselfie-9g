import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"
import { mergeMayaMemoryData } from "@/lib/maya/memory-store"

const MAX_NOTES = 10

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
      SELECT memory_data->'identity_notes' AS identity_notes
      FROM maya_personal_memory
      WHERE user_id = ${user.id}
      LIMIT 1
    `

    if (!rows.length || !rows[0].identity_notes) {
      return NextResponse.json({ notes: [] })
    }

    const notes = Array.isArray(rows[0].identity_notes)
      ? (rows[0].identity_notes as string[]).filter(Boolean)
      : []

    return NextResponse.json({ notes })
  } catch (error) {
    console.error("[Identity Notes GET] Error:", error)
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
    const note = typeof body.note === "string" ? body.note.trim() : ""

    if (!note) {
      return NextResponse.json({ error: "Note is required" }, { status: 400 })
    }

    // Fetch current notes
    const rows = await sql`
      SELECT memory_data->'identity_notes' AS identity_notes
      FROM maya_personal_memory
      WHERE user_id = ${user.id}
      LIMIT 1
    `

    const existing: string[] = Array.isArray(rows[0]?.identity_notes)
      ? (rows[0].identity_notes as string[]).filter(Boolean)
      : []

    // Append and trim to MAX_NOTES (keep newest at end, discard oldest at front)
    const updated = [...existing, note].slice(-MAX_NOTES)

    await mergeMayaMemoryData(user.id, { identity_notes: updated })

    return NextResponse.json({ notes: updated })
  } catch (error) {
    console.error("[Identity Notes POST] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
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
    const { index } = body

    if (typeof index !== "number") {
      return NextResponse.json({ error: "Index is required" }, { status: 400 })
    }

    const rows = await sql`
      SELECT memory_data->'identity_notes' AS identity_notes
      FROM maya_personal_memory
      WHERE user_id = ${user.id}
      LIMIT 1
    `

    const existing: string[] = Array.isArray(rows[0]?.identity_notes)
      ? (rows[0].identity_notes as string[]).filter(Boolean)
      : []

    const updated = existing.filter((_, i) => i !== index)

    await mergeMayaMemoryData(user.id, { identity_notes: updated })

    return NextResponse.json({ notes: updated })
  } catch (error) {
    console.error("[Identity Notes DELETE] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

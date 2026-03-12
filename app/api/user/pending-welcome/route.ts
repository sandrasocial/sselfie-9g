import { NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ pending: null }, { status: 401 })

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser?.id) return NextResponse.json({ pending: null })

    const rows = await sql`
      SELECT pending_welcome_modal
      FROM users
      WHERE id = ${neonUser.id}
      LIMIT 1
    `
    const pending = rows[0]?.pending_welcome_modal ?? null
    return NextResponse.json({ pending })
  } catch (error: any) {
    console.error("[pending-welcome] GET error:", error.message)
    return NextResponse.json({ pending: null })
  }
}

export async function DELETE() {
  try {
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ cleared: false }, { status: 401 })

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser?.id) return NextResponse.json({ cleared: false })

    await sql`
      UPDATE users
      SET pending_welcome_modal = NULL
      WHERE id = ${neonUser.id}
    `
    return NextResponse.json({ cleared: true })
  } catch (error: any) {
    console.error("[pending-welcome] DELETE error:", error.message)
    return NextResponse.json({ cleared: false }, { status: 500 })
  }
}

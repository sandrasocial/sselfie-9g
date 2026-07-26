import { sql } from "@/lib/db/client"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const updated = user.email
    ? await sql`
        UPDATE users
        SET password_setup_complete = TRUE,
            updated_at = NOW()
        WHERE supabase_user_id = ${user.id}
           OR LOWER(email) = LOWER(${user.email})
        RETURNING id
      `
    : await sql`
        UPDATE users
        SET password_setup_complete = TRUE,
            updated_at = NOW()
        WHERE supabase_user_id = ${user.id}
        RETURNING id
      `

  if (updated.length === 0) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

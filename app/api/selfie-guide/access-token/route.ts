import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db/client"

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await sql`
      SELECT access_token
      FROM freebie_subscribers
      WHERE LOWER(email) = LOWER(${user.email})
      LIMIT 1
    `

    return NextResponse.json({
      accessToken: result[0]?.access_token || null,
    })
  } catch (error) {
    console.error("[selfie-guide access-token] failed to resolve access token:", error)
    return NextResponse.json({ error: "Unable to load guide access" }, { status: 500 })
  }
}

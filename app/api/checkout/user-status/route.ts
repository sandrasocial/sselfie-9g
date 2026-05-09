import { NextResponse } from "next/server"

import { sql } from "@/lib/db/client"
import { stripe } from "@/lib/stripe"

type UserStatusRow = {
  email: string
  password_setup_complete: boolean | null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")?.trim()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    if (!sessionId.startsWith("cs_")) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.status !== "complete") {
      return NextResponse.json({ userInfo: null }, { status: 202 })
    }

    const email = (session.customer_details?.email || session.customer_email || "").trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ userInfo: null }, { status: 202 })
    }

    const rows = (await sql`
      SELECT email, password_setup_complete
      FROM users
      WHERE LOWER(email) = ${email}
      LIMIT 1
    `) as UserStatusRow[]

    const user = rows[0]
    if (!user) {
      return NextResponse.json({ userInfo: null }, { status: 202 })
    }

    return NextResponse.json({
      userInfo: {
        email: user.email || email,
        hasAccount: user.password_setup_complete === true,
      },
    })
  } catch (error) {
    console.error("[checkout-user-status] Failed to resolve checkout user status:", error)
    return NextResponse.json({ error: "Unable to resolve checkout status" }, { status: 500 })
  }
}

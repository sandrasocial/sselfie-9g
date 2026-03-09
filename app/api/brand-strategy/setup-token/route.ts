import { NextResponse } from "next/server"

import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db/client"
import { sessionIncludesProductType } from "@/lib/checkout/purchased-products"

function resolveSessionEmail(session: {
  customer_details?: { email?: string | null } | null
  customer_email?: string | null
}) {
  return session.customer_details?.email || session.customer_email || null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")?.trim()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "line_items.data.price"],
    })

    if (!sessionIncludesProductType(session, "brand_strategy_pack")) {
      return NextResponse.json({ error: "This session does not include Brand Strategy access." }, { status: 403 })
    }

    if (session.status !== "complete" || !["paid", "no_payment_required"].includes(session.payment_status || "")) {
      return NextResponse.json({ error: "Brand Strategy access is still syncing." }, { status: 409 })
    }

    const customerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id || null
    const email = resolveSessionEmail(session)

    if (!customerId && !email) {
      return NextResponse.json({ error: "Brand Strategy access is still syncing." }, { status: 409 })
    }

    const rows = await sql`
      SELECT s.setup_token
      FROM subscriptions s
      LEFT JOIN users u ON u.id::text = s.user_id
      WHERE s.product_type = 'brand_strategy_pack'
        AND s.status = 'active'
        AND s.setup_token IS NOT NULL
        AND (
          (${customerId}::text IS NOT NULL AND s.stripe_customer_id = ${customerId})
          OR (${email}::text IS NOT NULL AND LOWER(u.email) = LOWER(${email}))
        )
      ORDER BY s.updated_at DESC
      LIMIT 1
    `

    if (!rows.length || !rows[0]?.setup_token) {
      return NextResponse.json({ error: "Brand Strategy access is still syncing." }, { status: 409 })
    }

    return NextResponse.json({ setupToken: rows[0].setup_token })
  } catch (error) {
    console.error("[brand-strategy setup-token] failed to resolve setup token:", error)
    return NextResponse.json({ error: "Unable to load Brand Strategy access" }, { status: 500 })
  }
}

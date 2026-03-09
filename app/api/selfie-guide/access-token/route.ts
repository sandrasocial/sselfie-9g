import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db/client"
import { ensurePaidSelfieGuideSubscriber } from "@/lib/freebie/selfie-guide-access"

const SELFIE_GUIDE_PRODUCT_TYPES = new Set(["selfie_guide", "selfie_guide_bundle"])

function resolveGuidePurchaseEmail(session: {
  customer_details?: { email?: string | null; name?: string | null } | null
  customer_email?: string | null
}) {
  return session.customer_details?.email || session.customer_email || null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")?.trim()

    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      const productType = session.metadata?.product_type || null

      if (!productType || !SELFIE_GUIDE_PRODUCT_TYPES.has(productType)) {
        return NextResponse.json({ error: "This session does not grant guide access." }, { status: 403 })
      }

      if (session.status !== "complete" || !["paid", "no_payment_required"].includes(session.payment_status || "")) {
        return NextResponse.json({ error: "Guide access is still syncing." }, { status: 409 })
      }

      const email = resolveGuidePurchaseEmail(session)
      if (!email) {
        return NextResponse.json({ error: "Guide access could not be verified yet." }, { status: 404 })
      }

      const subscriber = await ensurePaidSelfieGuideSubscriber(email, session.customer_details?.name)
      return NextResponse.json({ accessToken: subscriber.accessToken })
    }

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

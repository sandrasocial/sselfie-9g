import { NextResponse } from "next/server"

import { ensurePaidSelfieToBrandShootSubscriber } from "@/lib/freebie/selfie-to-brand-shoot-access"
import { stripe } from "@/lib/stripe"

const SYSTEM_PRODUCT_TYPE = "selfie_to_brand_shoot_system"

function resolvePurchaseEmail(session: {
  customer_details?: { email?: string | null; name?: string | null } | null
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

    if (!sessionId.startsWith("cs_")) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const productType = session.metadata?.product_type || null

    if (productType !== SYSTEM_PRODUCT_TYPE) {
      return NextResponse.json(
        { error: "This session does not grant Selfie to Brand Shoot access." },
        { status: 403 },
      )
    }

    if (
      session.status !== "complete" ||
      !["paid", "no_payment_required"].includes(session.payment_status || "")
    ) {
      return NextResponse.json({ error: "Selfie to Brand Shoot access is still syncing." }, { status: 409 })
    }

    const email = resolvePurchaseEmail(session)
    if (!email) {
      return NextResponse.json(
        { error: "Selfie to Brand Shoot access could not be verified yet." },
        { status: 404 },
      )
    }

    const subscriber = await ensurePaidSelfieToBrandShootSubscriber(
      email,
      session.customer_details?.name,
    )
    return NextResponse.json({ accessToken: subscriber.accessToken, hasAccess: true })
  } catch (error) {
    console.error("[selfie-to-brand-shoot access-token] failed to resolve access token:", error)
    return NextResponse.json({ error: "Unable to load Selfie to Brand Shoot access" }, { status: 500 })
  }
}

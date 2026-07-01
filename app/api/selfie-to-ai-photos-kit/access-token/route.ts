import { NextResponse } from "next/server"

import { stripe } from "@/lib/stripe"
import { ensurePaidSelfieAiPhotosKitSubscriber } from "@/lib/freebie/selfie-ai-photos-kit-access"

const PRODUCT_TYPE = "selfie_ai_photos_kit"

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

    if (productType !== PRODUCT_TYPE) {
      return NextResponse.json(
        { error: "This session does not grant AI Photos Kit access." },
        { status: 403 },
      )
    }

    if (
      session.status !== "complete" ||
      !["paid", "no_payment_required"].includes(session.payment_status || "")
    ) {
      return NextResponse.json({ error: "AI Photos Kit access is still syncing." }, { status: 409 })
    }

    const email = resolvePurchaseEmail(session)
    if (!email) {
      return NextResponse.json(
        { error: "AI Photos Kit access could not be verified yet." },
        { status: 404 },
      )
    }

    const subscriber = await ensurePaidSelfieAiPhotosKitSubscriber(
      email,
      session.customer_details?.name,
    )
    return NextResponse.json({ accessToken: subscriber.accessToken, hasAccess: true })
  } catch (error) {
    console.error("[selfie-ai-photos-kit access-token] failed to resolve access token:", error)
    return NextResponse.json({ error: "Unable to load AI Photos Kit access" }, { status: 500 })
  }
}

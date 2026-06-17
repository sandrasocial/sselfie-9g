import { NextResponse } from "next/server"

import { getDefaultPresetCollection } from "@/lib/presets/published-collections"
import {
  isPresetsProductType,
  tierForPresetsProductType,
  upsertPresetOrderForPurchase,
} from "@/lib/presets/orders"
import { stripe } from "@/lib/stripe"

function resolvePurchaseEmail(session: {
  customer_details?: { email?: string | null; name?: string | null } | null
  customer_email?: string | null
}) {
  return session.customer_details?.email || session.customer_email || null
}

function getStripeObjectId(value: unknown): string | null {
  if (!value) return null
  if (typeof value === "string") return value
  if (typeof value === "object" && value !== null && "id" in value && typeof value.id === "string") {
    return value.id
  }
  return null
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

    if (!isPresetsProductType(productType)) {
      return NextResponse.json(
        { error: "This session does not grant SSELFIE Presets access." },
        { status: 403 },
      )
    }

    if (
      session.status !== "complete" ||
      !["paid", "no_payment_required"].includes(session.payment_status || "")
    ) {
      return NextResponse.json({ error: "SSELFIE Presets access is still syncing." }, { status: 409 })
    }

    const email = resolvePurchaseEmail(session)
    if (!email) {
      return NextResponse.json(
        { error: "SSELFIE Presets access could not be verified yet." },
        { status: 404 },
      )
    }

    const tier = tierForPresetsProductType(productType)
    const defaultCollection = tier === "single" ? await getDefaultPresetCollection() : null
    const collectionSlug =
      tier === "single"
        ? session.metadata?.preset_collection_slug || defaultCollection?.slug || null
        : null
    const order = await upsertPresetOrderForPurchase({
      email,
      name: session.customer_details?.name || null,
      tier,
      collectionSlug,
      stripeSessionId: session.id,
      stripePaymentId: getStripeObjectId(session.payment_intent),
      stripeCustomerId: getStripeObjectId(session.customer),
      metadata: session.metadata || {},
    })

    return NextResponse.json({ accessToken: order.accessToken, hasAccess: true })
  } catch (error) {
    console.error("[presets access-token] failed to resolve access token:", error)
    return NextResponse.json({ error: "Unable to load SSELFIE Presets access" }, { status: 500 })
  }
}

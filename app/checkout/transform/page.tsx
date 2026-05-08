import { redirect } from "next/navigation"
import { stripe } from "@/lib/stripe"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"

export const dynamic = "force-dynamic"

type TransformPlan = "starter" | "topup"

const PLAN_CONFIG = {
  starter: {
    priceId: () => (process.env.STRIPE_PRICE_TRANSFORM_STARTER ?? "").trim(),
    credits: 15,
    productType: "transform_starter" as const,
  },
  topup: {
    priceId: () => (process.env.STRIPE_PRICE_TRANSFORM_TOPUP ?? "").trim(),
    credits: 15,
    productType: "transform_topup" as const,
  },
}

async function createTransformSession(plan: TransformPlan) {
  const config = PLAN_CONFIG[plan]
  const priceId = config.priceId()

  if (!priceId) {
    throw new Error(`Stripe price ID for "${plan}" is not set in environment variables`)
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sselfie.ai"

  // Try to attach the existing Stripe customer if the user is logged in
  let customerId: string | undefined
  let customerEmail: string | undefined

  try {
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (authUser?.email) {
      customerEmail = authUser.email
      const neonUser = await getUserByAuthId(authUser.id)
      if (neonUser) {
        const rows = await sql`
          SELECT stripe_customer_id FROM users
          WHERE id = ${neonUser.id} AND stripe_customer_id IS NOT NULL
          LIMIT 1
        `
        customerId = rows[0]?.stripe_customer_id ?? undefined
      }
    }
  } catch {
    // Not logged in or lookup failed — continue as guest checkout
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    ui_mode: "embedded",
    return_url: `${baseUrl}/transform/studio?checkout=success`,
    ...(customerId
      ? { customer: customerId }
      : customerEmail
        ? { customer_email: customerEmail }
        : {}),
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    metadata: {
      product_type: config.productType,
      credits: String(config.credits),
      source: "transform_paid",
      plan,
      return_to: "/transform/studio",
      buyer_stage: "aesthetic_editing",
      offer_slug: "transform",
    },
  })

  return session.client_secret
}

export default async function TransformCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const params = await searchParams
  const plan: TransformPlan = params.plan === "topup" ? "topup" : "starter"

  let clientSecret: string | null = null

  try {
    clientSecret = await createTransformSession(plan)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[Transform Checkout] Failed:", msg)
    redirect(`/transform?checkout=error&reason=${encodeURIComponent(msg)}`)
  }

  if (!clientSecret) {
    redirect("/transform?checkout=error&reason=no_client_secret")
  }

  const productType = plan === "topup" ? "transform_topup" : "transform_starter"

  redirect(
    `/checkout?client_secret=${clientSecret}&product_type=${productType}&return_to=${encodeURIComponent("/transform/studio")}`,
  )
}

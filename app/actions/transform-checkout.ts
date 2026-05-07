"use server"

import { stripe } from "@/lib/stripe"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

type TransformPlan = "starter" | "topup"

const PLAN_CONFIG = {
  starter: {
    priceId: process.env.STRIPE_PRICE_TRANSFORM_STARTER!,
    credits: 15,
    name: "SSELFIE Transform — Starter Pack",
    description: "15 credits · 5 photo transformations",
  },
  topup: {
    priceId: process.env.STRIPE_PRICE_TRANSFORM_TOPUP!,
    credits: 15,
    name: "SSELFIE Transform — Credit Top-up",
    description: "15 credits · 5 photo transformations",
  },
}

export async function startTransformCheckout(plan: TransformPlan) {
  const config = PLAN_CONFIG[plan]
  if (!config?.priceId) {
    throw new Error("Transform checkout not configured. Please contact support.")
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"

  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  let customerId: string | undefined
  let customerEmail: string | undefined

  if (authUser) {
    const user = await getUserByAuthId(authUser.id)
    customerEmail = authUser.email ?? undefined

    if (user) {
      const { sql } = await import("@/lib/db/client")
      const rows = await sql`
        SELECT stripe_customer_id FROM users WHERE id = ${user.id} AND stripe_customer_id IS NOT NULL LIMIT 1
      `
      customerId = rows[0]?.stripe_customer_id ?? undefined
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    ui_mode: "embedded",
    return_url: `${baseUrl}/transform/studio?checkout=success`,
    ...(customerId ? { customer: customerId } : customerEmail ? { customer_email: customerEmail } : {}),
    line_items: [
      {
        price: config.priceId,
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
    metadata: {
      product_type: "credit_topup",
      credits: String(config.credits),
      source: "transform_checkout",
      plan,
    },
  })

  return session.client_secret
}

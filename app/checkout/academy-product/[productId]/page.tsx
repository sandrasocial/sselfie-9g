import { notFound, redirect } from "next/navigation"

import { stripe } from "@/lib/stripe"
import { ACADEMY_PRODUCTS } from "@/lib/products"
import { createServerClient } from "@/lib/supabase/server"

// Only these three products are sold individually from the public landing page
const PURCHASABLE_IDS = ["what_to_say", "show_up", "get_paid"] as const
type PurchasableId = (typeof PURCHASABLE_IDS)[number]

export async function generateMetadata({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  const product = ACADEMY_PRODUCTS[productId as PurchasableId]
  if (!product) return {}
  return { title: `Checkout — ${product.name} | SSELFIE` }
}

export default async function AcademyProductCheckoutPage({
  params,
}: {
  params: Promise<{ productId: string }>
}) {
  const { productId } = await params

  if (!PURCHASABLE_IDS.includes(productId as PurchasableId)) {
    notFound()
  }

  const product = ACADEMY_PRODUCTS[productId as PurchasableId]
  if (!product?.stripePriceId) {
    notFound()
  }

  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai").replace(/\/$/, "")

  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      redirect_on_completion: "never",
      ...(authUser?.email && { customer_email: authUser.email }),
      line_items: [{ price: product.stripePriceId, quantity: 1 }],
      allow_promotion_codes: true,
      metadata: {
        // product_type MUST be "academy_mini_product" so the webhook grants entitlements correctly
        product_type: "academy_mini_product",
        product_id: productId,
        credits: "0",
        source: "visibility_suite_landing",
      },
    })

    if (!session.client_secret) {
      throw new Error("No client secret returned from Stripe")
    }

    redirect(
      `/checkout?client_secret=${session.client_secret}&product_type=${productId}&return_to=${encodeURIComponent("/academy/access/visibility-suite")}`,
    )
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("[Academy Product Checkout] Error creating checkout session:", error)
    redirect("/visibility-suite?checkout=failed")
  }
}

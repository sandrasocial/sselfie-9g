import { stripe } from "@/lib/stripe"
import { CREDIT_PACKAGES } from "@/lib/credit-packages"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return Response.json({ error: "User not found" }, { status: 404 })
    }

    const { packageId } = await request.json()

    // Find the credit package
    const creditPackage = CREDIT_PACKAGES.find((p) => p.id === packageId)

    if (!creditPackage) {
      return Response.json({ error: "Invalid package" }, { status: 400 })
    }

    console.log("[v0] Creating embedded checkout session for package:", creditPackage.name)

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      redirect_on_completion: "never",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: creditPackage.name,
              description: creditPackage.description,
            },
            unit_amount: creditPackage.priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      // return_url removed - not needed for embedded checkout
      metadata: {
        user_id: neonUser.id,
        package_id: creditPackage.id,
        credits: creditPackage.credits.toString(),
        product_type: "credit_topup",
        source: "app",
      },
    })

    return Response.json({ clientSecret: session.client_secret })
  } catch (error) {
    console.error("[v0] Error creating checkout session:", error)
    return Response.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}

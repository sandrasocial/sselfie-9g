import { stripe } from "@/lib/stripe"
import { CREDIT_PACKAGES } from "@/lib/products"
import { withAuth } from "@/lib/auth/with-auth"

async function handleCreateCheckoutSession({
  request,
  user: neonUser,
}: {
  request: Request
  user: { id: string | number }
}) {
  try {
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
      metadata: {
        user_id: String(neonUser.id),
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

const authedCreateCheckoutSession = withAuth(handleCreateCheckoutSession)

export async function POST(request: Request) {
  if (process.env.ENABLE_UNUSED_ENDPOINTS !== "true") {
    return Response.json({ error: "Endpoint disabled" }, { status: 410 })
  }

  return authedCreateCheckoutSession(request)
}

import { stripe } from "@/lib/stripe"

const WORK_WITH_ME_PRICE_ENV = "STRIPE_PRICE_WORK_WITH_ME"
export const WORK_WITH_ME_AMOUNT_CENTS = 200000

type WorkWithMeCheckoutInput = {
  applicationId: number
  name: string
  email: string
  baseUrl?: string
}

export type WorkWithMeCheckoutResult = {
  checkoutUrl: string
  sessionId: string
  priceId: string
  amountCents: number
}

function getBaseUrl(baseUrl?: string) {
  return String(
    baseUrl || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai",
  ).replace(/\/+$/, "")
}

export async function createWorkWithMeCheckoutLink(
  input: WorkWithMeCheckoutInput,
): Promise<WorkWithMeCheckoutResult> {
  const priceId = String(process.env[WORK_WITH_ME_PRICE_ENV] || "").trim()
  if (!priceId) {
    throw new Error(`Missing ${WORK_WITH_ME_PRICE_ENV} configuration.`)
  }

  const baseUrl = getBaseUrl(input.baseUrl)
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: input.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&type=work_with_me`,
      cancel_url: `${baseUrl}/work-with-me?checkout=cancelled`,
      metadata: {
        product_type: "work_with_me",
        source: "work_with_me_paid",
        brand_engine_application_id: String(input.applicationId),
        customer_name: input.name,
        customer_email: input.email,
      },
      allow_promotion_codes: false,
    },
    { idempotencyKey: `work_with_me_application_${input.applicationId}` },
  )

  if (!session.url) {
    throw new Error("Stripe did not return a Work With Me checkout URL.")
  }

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    priceId,
    amountCents: WORK_WITH_ME_AMOUNT_CENTS,
  }
}

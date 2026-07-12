import { stripe } from "@/lib/stripe"

const WORK_WITH_ME_PRICE_ENV = "STRIPE_PRICE_WORK_WITH_ME"
export const WORK_WITH_ME_AMOUNT_CENTS = 200000

type WorkWithMeCheckoutInput = {
  applicationId: number
  name: string
  email: string
  baseUrl?: string
  previousSessionId?: string | null
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

function checkoutIdempotencyKey(applicationId: number, previousSessionId?: string | null) {
  const base = `work_with_me_application_${applicationId}`
  if (!previousSessionId) return base

  return `${base}_after_${previousSessionId}`.slice(0, 255)
}

export async function getReusableWorkWithMeCheckout(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const isUnexpired =
      typeof session.expires_at === "number" && session.expires_at > Math.floor(Date.now() / 1000)

    if (session.status !== "open" || !isUnexpired || !session.url) return null

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    }
  } catch (error) {
    const stripeError = error as { code?: string; statusCode?: number }
    if (stripeError.code === "resource_missing" || stripeError.statusCode === 404) return null
    throw error
  }
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
    { idempotencyKey: checkoutIdempotencyKey(input.applicationId, input.previousSessionId) },
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

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { stripe } from "@/lib/stripe"
import { verifyBillingRecoveryToken } from "@/lib/payments/billing-recovery-token"

const DEFAULT_PORTAL_CONFIGURATION = "bpc_1SRX2wEVJvME7vkwu0rlIgfW"

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://sselfie.ai"
  ).replace(/\/$/, "")
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")
  if (!token) {
    return NextResponse.json({ error: "This billing link is invalid." }, { status: 400 })
  }

  let stripeSubscriptionId: string
  let stripeInvoiceId: string
  try {
    ;({ stripeSubscriptionId, stripeInvoiceId } = verifyBillingRecoveryToken({ token }))
  } catch {
    return NextResponse.json(
      { error: "This billing link has expired. Sign in to update your card." },
      { status: 400 }
    )
  }

  const [subscription] = await sql`
    SELECT stripe_customer_id, status
    FROM subscriptions
    WHERE stripe_subscription_id = ${stripeSubscriptionId}
    LIMIT 1
  `

  if (!subscription?.stripe_customer_id) {
    return NextResponse.json({ error: "Subscription not found." }, { status: 404 })
  }

  if (["canceled", "cancelled"].includes(subscription.status)) {
    return NextResponse.redirect(`${siteUrl()}/app?billing=canceled`, 303)
  }

  const invoice = (await stripe.invoices.retrieve(stripeInvoiceId)) as any
  const invoiceSubscription =
    invoice.subscription ?? invoice.parent?.subscription_details?.subscription
  const invoiceSubscriptionId =
    typeof invoiceSubscription === "string" ? invoiceSubscription : invoiceSubscription?.id
  const invoiceCustomerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id
  if (
    invoiceSubscriptionId !== stripeSubscriptionId ||
    invoiceCustomerId !== subscription.stripe_customer_id
  ) {
    return NextResponse.json({ error: "This billing link is invalid." }, { status: 400 })
  }
  if (invoice.status === "paid") {
    return NextResponse.redirect(`${siteUrl()}/app?billing=recovered`, 303)
  }

  const completionUrl = `${siteUrl()}/api/stripe/recover-payment/complete?token=${encodeURIComponent(token)}`
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID || DEFAULT_PORTAL_CONFIGURATION,
    return_url: `${siteUrl()}/app?billing=unchanged`,
    flow_data: {
      type: "payment_method_update",
      after_completion: {
        type: "redirect",
        redirect: { return_url: completionUrl },
      },
    },
  })

  return NextResponse.redirect(portalSession.url, 303)
}

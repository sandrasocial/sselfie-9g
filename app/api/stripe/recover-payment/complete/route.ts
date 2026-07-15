import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { stripe } from "@/lib/stripe"
import { verifyBillingRecoveryToken } from "@/lib/payments/billing-recovery-token"

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://sselfie.ai"
  ).replace(/\/$/, "")
}

function invoiceOwner(invoice: any): {
  subscriptionId: string | null
  customerId: string | null
} {
  const rawSubscription = invoice.subscription ?? invoice.parent?.subscription_details?.subscription
  return {
    subscriptionId:
      typeof rawSubscription === "string" ? rawSubscription : rawSubscription?.id || null,
    customerId:
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id || null,
  }
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
  const owner = invoiceOwner(invoice)
  if (
    owner.subscriptionId !== stripeSubscriptionId ||
    owner.customerId !== subscription.stripe_customer_id
  ) {
    return NextResponse.json({ error: "This billing link is invalid." }, { status: 400 })
  }
  if (invoice.status === "paid") {
    return NextResponse.redirect(`${siteUrl()}/app?billing=recovered`, 303)
  }
  if (invoice.status !== "open") {
    return NextResponse.redirect(`${siteUrl()}/app?billing=invoice_unavailable`, 303)
  }

  // The database can lag Stripe during cancellation. Stripe is the live authority before
  // touching billing data, so a stale past_due row can never act on an ended membership.
  const liveSubscription = (await stripe.subscriptions.retrieve(stripeSubscriptionId)) as any
  const liveCustomerId =
    typeof liveSubscription.customer === "string"
      ? liveSubscription.customer
      : liveSubscription.customer?.id || null
  if (liveCustomerId !== subscription.stripe_customer_id) {
    return NextResponse.json({ error: "This billing link is invalid." }, { status: 400 })
  }
  if (["canceled", "cancelled", "incomplete_expired"].includes(liveSubscription.status)) {
    return NextResponse.redirect(`${siteUrl()}/app?billing=canceled`, 303)
  }

  const customer = (await stripe.customers.retrieve(subscription.stripe_customer_id)) as any
  if (customer.deleted) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 })
  }
  const rawPaymentMethod = customer.invoice_settings?.default_payment_method
  const paymentMethodId =
    typeof rawPaymentMethod === "string" ? rawPaymentMethod : rawPaymentMethod?.id || null
  if (!paymentMethodId) {
    return NextResponse.redirect(`${siteUrl()}/app?billing=payment_method_missing`, 303)
  }

  // The portal updates the customer's card. Copy it only to the exact signed subscription.
  // Stripe's configured retry schedule will retry the open invoice later; this public GET never
  // initiates a charge, so email scanners, link previews, and replays are harmless.
  await stripe.subscriptions.update(stripeSubscriptionId, {
    default_payment_method: paymentMethodId,
  })

  return NextResponse.redirect(`${siteUrl()}/app?billing=updated`, 303)
}

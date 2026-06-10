// WEBHOOK-01 — shared context passed from the Stripe webhook dispatcher to per-product
// fulfillment handlers. Field types deliberately loose to match the monolith's variables
// verbatim (no behavior change).

import type Stripe from "stripe"

export interface CheckoutFulfillmentContext {
  event: Stripe.Event
  session: Stripe.Checkout.Session
  isPaymentPaid: boolean
  customerEmail: string | null | undefined
  userId: string | null | undefined
  referralPurchaseUserId: string | null | undefined
  source: string | null | undefined
}

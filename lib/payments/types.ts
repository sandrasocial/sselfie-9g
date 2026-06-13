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
  /** Parsed from session.metadata.credits by the dispatcher (credit-granting products). */
  credits?: number
  /** Memoized line-items expander owned by the dispatcher (shared across handlers). */
  getExpandedSession?: () => Promise<any>
  /** Set by the dispatcher's account-creation step (academy delivery email branching). */
  isNewUserForEmail?: boolean
  purchasePasswordSetupLink?: string
  /** Route-owned referral helper passed through for extracted subscription checkout code. */
  maybeTrackCheckoutReferralSignup?: (
    referredUserId: string | null | undefined,
    referralCode: string | null | undefined,
    source: string,
  ) => Promise<void>
}

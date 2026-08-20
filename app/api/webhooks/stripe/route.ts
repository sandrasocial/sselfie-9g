import { type NextRequest, NextResponse } from "next/server"
import { getStripeWebhookSecret, stripe } from "@/lib/stripe"
import { checkWebhookRateLimit } from "@/lib/rate-limit"
import { logWebhookError, alertWebhookError, isCriticalError } from "@/lib/webhook-monitoring"
import { handleInvoicePaid } from "@/lib/payments/lifecycle/invoice-paid"
import {
  handleSubscriptionCreated,
  handleSubscriptionDeleted,
  handleInvoicePaymentFailed,
  handleSubscriptionUpdated,
} from "@/lib/payments/lifecycle/subscription-events"
import { handleCheckoutSessionCompleted } from "@/lib/payments/lifecycle/checkout-session-completed"
import { claimEvent, markEventFailed, markEventProcessed } from "@/lib/events/idempotency"

/** Stable id for Redis webhook rate limit - never bucket unrelated traffic on "undefined". */
function stripeWebhookRateLimitKey(event: {
  id: string
  data: { object: Record<string, unknown> }
}): string {
  const obj = event.data?.object ?? {}
  const c = obj.customer
  if (typeof c === "string" && c.length > 0) return c
  if (c && typeof c === "object" && "id" in c) {
    const cid = (c as { id?: unknown }).id
    if (typeof cid === "string" && cid.length > 0) return cid
  }
  const oid = obj.id
  if (typeof oid === "string" && oid.length > 0) return oid
  return event.id
}

function stripeWebhookObjectId(event: {
  data: { object: Record<string, unknown> }
}): string | null {
  const obj = event.data?.object ?? {}
  const oid = obj.id
  return typeof oid === "string" && oid.length > 0 ? oid : null
}

function allowsStripeStaleClaimReclaim(event: {
  type: string
  data: { object: Record<string, unknown> }
}): boolean {
  if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
    return true
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return false
  }

  const metadata = event.data.object.metadata
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false

  const productType = (metadata as Record<string, unknown>).product_type
  return productType === "academy_mini_product" || productType === "visibility_suite"
}

export async function POST(request: NextRequest) {
  console.log("=".repeat(80))
  console.log("[v0] 🔔 WEBHOOK RECEIVED at:", new Date().toISOString())
  console.log("[v0] Request URL:", request.url)
  console.log("[v0] Request method:", request.method)
  console.log("=".repeat(80))

  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  console.log("[v0] Signature present:", !!signature)
  console.log("[v0] Signature length:", signature?.length || 0)
  console.log("[v0] Body length:", body.length)
  const webhookSecret = getStripeWebhookSecret()
  console.log("[v0] Webhook secret configured:", webhookSecret.length > 0)

  if (!signature) {
    console.error("[v0] ❌ ERROR: No Stripe signature in request headers")
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  if (!webhookSecret) {
    console.error("[v0] ❌ ERROR: STRIPE_WEBHOOK_SECRET environment variable not set")
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  let event: any

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    console.log("[v0] ✅ Webhook signature verified successfully")
  } catch (err: any) {
    console.error("[v0] ❌ Webhook signature verification failed:", err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  const rateLimitKey = stripeWebhookRateLimitKey(event)
  const rateLimit = await checkWebhookRateLimit(rateLimitKey)

  if (!rateLimit.success) {
    console.log(`[v0] Webhook rate limit exceeded for key ${rateLimitKey}`)
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
  }

  try {
    const eventClaim = await claimEvent({
      provider: "stripe",
      eventId: event.id,
      eventType: event.type,
      objectId: stripeWebhookObjectId(event),
      livemode: Boolean(event.livemode),
      metadata: {
        rate_limit_key: rateLimitKey,
      },
      allowStaleClaimReclaim: allowsStripeStaleClaimReclaim(event),
    })

    if (eventClaim.duplicate) {
      if (eventClaim.duplicateStatus === "in_progress") {
        return NextResponse.json(
          { received: false, retry: true },
          { status: 503, headers: { "Retry-After": "60" } }
        )
      }
      console.log(`[v0] ⚠️ Duplicate event detected: ${event.id} - skipping processing`)
      return NextResponse.json({ received: true, duplicate: true })
    }

    if (eventClaim.storage === "legacy-stripe-event") {
      console.warn(
        "[v0] Stripe webhook idempotency is using legacy stripe_event_id storage. Run migration 56-add-event-idempotency-controls before removing fallback."
      )
    }
  } catch (idempotencyError: any) {
    console.error("[v0] Idempotency check error:", idempotencyError.message)
    // Return 500 so Stripe retries - better to delay than risk double credit grants
    return NextResponse.json({ error: "Idempotency check failed" }, { status: 500 })
  }

  console.log("[v0] Stripe webhook event:", event.type)
  console.log("[v0] Event ID:", event.id)
  console.log("[v0] Event data object type:", event.data.object.object)
  console.log("[v0] Event livemode:", event.livemode ? "PRODUCTION" : "TEST MODE")

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const response = await handleCheckoutSessionCompleted(event)
        if (response) return response
        break
      }

      case "customer.subscription.created": {
        await handleSubscriptionCreated(event)
        break
      }

      case "invoice.paid": {
        console.log("[v0] Invoice paid event received - processing as payment_succeeded")
        // fallthrough
      }
      case "invoice.payment_succeeded": {
        await handleInvoicePaid(event)
        break
      }

      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event)
        break
      }

      case "invoice.payment_failed": {
        await handleInvoicePaymentFailed(event)
        break
      }

      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(event)
        break
      }

      default:
        console.log(`[v0] ⚠️ UNHANDLED EVENT TYPE: ${event.type}`)
        console.log(
          `[v0] This event was received but not processed. If this is expected, you can ignore this message.`
        )
        console.log(`[v0] Event data:`, JSON.stringify(event.data.object, null, 2))
    }

    await markEventProcessed("stripe", event.id).catch(statusError => {
      console.error("[v0] Failed to mark Stripe webhook event processed:", statusError)
    })

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[v0] Webhook handler error:", error)

    await markEventFailed("stripe", event.id, error).catch(statusError => {
      console.error("[v0] Failed to mark Stripe webhook event failed:", statusError)
    })

    const webhookError = {
      eventType: event.type,
      errorMessage: error.message || "Unknown error",
      errorStack: error.stack,
      eventData: event.data.object,
      timestamp: new Date(),
    }

    await logWebhookError(webhookError)

    if (isCriticalError(event.type, error.message)) {
      await alertWebhookError(webhookError)
    }

    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

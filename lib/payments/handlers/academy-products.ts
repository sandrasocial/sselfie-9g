// WEBHOOK-01 — Academy mini-product + Visibility Suite checkout fulfillment, extracted
// VERBATIM from app/api/webhooks/stripe/route.ts (if-block at lines 1406-1579 as of commit
// e685020d). The trailing unconditional `break` stays in the dispatcher. No behavior change.

import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { upsertPurchaseEntitlement } from "@/lib/academy-entitlements"
import {
  generateAcademyProductDeliveryEmail,
  generateVisibilitySuiteDeliveryEmail,
} from "@/lib/email/templates/academy-product-delivery"
import { ACADEMY_PRODUCTS } from "@/lib/products"
import { shouldEnforceLiveSubscriptionRows } from "@/lib/subscription"
import { VISIBILITY_MINI_PRODUCT_BY_ID } from "@/lib/visibility-products"
import { generatePasswordSetupLinkForPurchase } from "../shared"
import type { CheckoutFulfillmentContext } from "../types"

export async function handleAcademyProductCheckout(ctx: CheckoutFulfillmentContext): Promise<void> {
  const { event, isPaymentPaid, customerEmail, source } = ctx

  // Checkout can complete before an asynchronous payment succeeds. Delivery belongs only to the
  // paid event; returning here lets checkout.session.async_payment_succeeded fulfill later.
  if (!isPaymentPaid) return

  // Production ownership is live-only. Test-mode fixtures remain usable outside production.
  if (shouldEnforceLiveSubscriptionRows() && !event.livemode) return

  // The dispatcher only routes here when session.metadata.product_type matched, so metadata
  // is present — mirrors the monolith's narrowing.
  const session = ctx.session as typeof ctx.session & {
    metadata: NonNullable<(typeof ctx.session)["metadata"]>
  }
  const userId = ctx.userId as string
  const isNewUserForEmail = ctx.isNewUserForEmail ?? false
  const purchasePasswordSetupLink = ctx.purchasePasswordSetupLink ?? ""
  const productType = (ctx as CheckoutFulfillmentContext & { productType?: string }).productType
  const productId =
    productType === "visibility_suite" ? "visibility_suite" : session.metadata.product_id
  let academyUserId = (session.metadata.user_id as string | undefined) || userId
  const academyCustomerEmail = session.customer_details?.email || session.customer_email
  const academyProduct = ACADEMY_PRODUCTS[productId as keyof typeof ACADEMY_PRODUCTS]

  if (!academyProduct) {
    throw new Error(`Unknown academy product id in metadata: ${String(productId)}`)
  }

  if (!academyUserId && academyCustomerEmail) {
    const resolvedUser = await sql`
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER(${academyCustomerEmail})
      LIMIT 1
    `
    if (resolvedUser.length > 0) {
      academyUserId = resolvedUser[0].id
    }
  }

  if (!academyUserId) {
    throw new Error("Missing academy user_id for purchase unlock")
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null
  const amountPaid =
    typeof session.amount_total === "number" ? session.amount_total : academyProduct.price
  const purchaseCurrency =
    typeof session.currency === "string" && session.currency.length > 0
      ? session.currency.toLowerCase()
      : academyProduct.currency
  const entitlementProductIds =
    productId === "visibility_suite"
      ? [
          "visibility_suite",
          "what_to_say",
          "show_up",
          "get_paid",
          "concept_cards_pack",
          "caption_sprint",
          "feed_reset_9grid",
          "ai_photo_refresh",
        ]
      : [productId]

  if (paymentIntentId) {
    await sql`
      INSERT INTO academy_course_purchases (
        user_id,
        course_id,
        stripe_payment_intent_id,
        amount_paid,
        currency,
        status,
        purchased_at
      )
      VALUES (
        ${academyUserId},
        ${productId},
        ${paymentIntentId},
        ${amountPaid},
        ${purchaseCurrency},
        'active',
        NOW()
      )
      ON CONFLICT (stripe_payment_intent_id)
      DO UPDATE SET
        status = 'active',
        amount_paid = EXCLUDED.amount_paid,
        currency = EXCLUDED.currency,
        purchased_at = NOW()
    `
  } else {
    await sql`
      INSERT INTO academy_course_purchases (
        user_id,
        course_id,
        stripe_payment_intent_id,
        amount_paid,
        currency,
        status,
        purchased_at
      )
      SELECT
        ${academyUserId},
        ${productId},
        NULL,
        ${amountPaid},
        ${purchaseCurrency},
        'active',
        NOW()
      WHERE NOT EXISTS (
        SELECT 1
        FROM academy_course_purchases
        WHERE user_id = ${academyUserId}
          AND course_id = ${productId}
          AND status = 'active'
      )
    `
  }

  await sql`
    INSERT INTO user_tags (user_id, tag)
    SELECT ${academyUserId}, ${academyProduct.tag}
    WHERE NOT EXISTS (
      SELECT 1
      FROM user_tags
      WHERE user_id = ${academyUserId}
        AND tag = ${academyProduct.tag}
    )
  `

  for (const entitlementProductId of entitlementProductIds) {
    await upsertPurchaseEntitlement({
      userId: academyUserId,
      productId: entitlementProductId,
      sourceRef: paymentIntentId || session.id,
      throwOnError: true,
      metadata: {
        source:
          productId === "visibility_suite"
            ? "stripe_webhook:visibility_suite"
            : "stripe_webhook:academy_mini_product",
        stripe_session_id: session.id,
        purchased_product_id: productId,
      },
    })
  }

  if (academyCustomerEmail) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
    const miniProductSlug =
      VISIBILITY_MINI_PRODUCT_BY_ID[productId as keyof typeof VISIBILITY_MINI_PRODUCT_BY_ID]?.slug
    const academyAccessUrl = miniProductSlug
      ? `${siteUrl}/academy/access/${miniProductSlug}`
      : `${siteUrl}/academy`
    const suiteAccessUrl = `${siteUrl}/academy/access/visibility-suite`
    const resolvedPasswordSetupLink = isNewUserForEmail ? purchasePasswordSetupLink : undefined

    // Use the stone-email templates for consistent, premium delivery emails
    const emailContent =
      productId === "visibility_suite"
        ? generateVisibilitySuiteDeliveryEmail({
            firstName: session.customer_details?.name || "",
            email: academyCustomerEmail,
            accessUrl: suiteAccessUrl,
            passwordSetupUrl: resolvedPasswordSetupLink || undefined,
          })
        : generateAcademyProductDeliveryEmail({
            productId,
            firstName: session.customer_details?.name || "",
            email: academyCustomerEmail,
            accessUrl: academyAccessUrl,
            passwordSetupUrl: resolvedPasswordSetupLink || undefined,
          })

    await sendEmail({
      to: academyCustomerEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      emailType: "academy_purchase_confirmation",
      tags: ["academy", productId],
      idempotencyKey: `academy-purchase-delivery:${session.id}`,
    })
  }
}

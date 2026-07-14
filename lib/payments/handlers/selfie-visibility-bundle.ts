import "server-only"

import { upsertPurchaseEntitlement } from "@/lib/academy-entitlements"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { generateSelfieVisibilityBundleDeliveryEmail } from "@/lib/email/templates/selfie-visibility-bundle-delivery"
import { upsertPresetOrderForPurchase } from "@/lib/presets/orders"
import { updateContactTags } from "@/lib/resend/manage-contact"
import { grantSelfieVisibilityBundlePass } from "@/lib/trial/selfie-visibility-bundle-pass"
import { upsertPromptVaultSubscriber } from "./prompt-vault"
import { upsertStarterKitSubscriber } from "./starter-kit"
import type { CheckoutFulfillmentContext } from "../types"

export const SELFIE_VISIBILITY_BUNDLE_PRODUCT_TYPE = "selfie_visibility_bundle"
export const SELFIE_VISIBILITY_BUNDLE_DELIVERY_EMAIL_TYPE =
  "selfie_visibility_bundle_delivery"

const LIFETIME_ENTITLEMENTS = [
  SELFIE_VISIBILITY_BUNDLE_PRODUCT_TYPE,
  "masterclass",
  "starter_kit",
  "prompt_vault",
] as const

async function ensureSelfieVisibilityBundleProductRegistry(): Promise<void> {
  // This paid ownership marker is deliberately hidden from the Academy catalogue.
  // Keeping the guard in the webhook makes fulfillment resilient when a new database
  // environment has not applied the tracked registry migration yet.
  await sql`
    INSERT INTO academy_products (
      id,
      slug,
      title,
      type,
      membership_included,
      purchasable,
      stripe_price_id,
      active,
      sort_order,
      delivery_kind,
      access_target
    )
    VALUES (
      'selfie_visibility_bundle',
      'one-selfie-visibility-bundle',
      'One Selfie Visibility Bundle',
      'bundle',
      FALSE,
      FALSE,
      NULL,
      FALSE,
      69,
      'direct_private',
      'one-selfie'
    )
    ON CONFLICT (id) DO UPDATE SET
      slug = EXCLUDED.slug,
      title = EXCLUDED.title,
      type = EXCLUDED.type,
      membership_included = EXCLUDED.membership_included,
      purchasable = EXCLUDED.purchasable,
      active = EXCLUDED.active,
      sort_order = EXCLUDED.sort_order,
      delivery_kind = EXCLUDED.delivery_kind,
      access_target = EXCLUDED.access_target,
      updated_at = NOW()
  `
}

function stripeObjectId(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === "string" && id.length > 0 ? id : null
  }
  return null
}

/**
 * Fulfil the complete bundle without invoking any individual product handler. Those handlers
 * own their own payment rows, emails, and paid-buyer trials, so composing them would double-count
 * one payment and send a confusing stack of delivery messages.
 */
export async function handleSelfieVisibilityBundleCheckout(
  ctx: CheckoutFulfillmentContext,
): Promise<void> {
  if (!ctx.isPaymentPaid) {
    console.warn(
      `[selfie-visibility-bundle] Checkout ${ctx.session.id} completed without confirmed payment; fulfillment skipped.`,
    )
    return
  }

  // Test Stripe events share the production database. Never let a test checkout grant
  // spendable credits, lifetime entitlements, download tokens, or customer email delivery.
  // Live payment recording remains owned by the shared lifecycle and already carries its
  // own is_test_mode flag.
  if (!ctx.event.livemode) {
    console.warn(
      `[selfie-visibility-bundle] Test-mode checkout ${ctx.session.id}; customer fulfillment skipped.`,
    )
    return
  }

  const customerEmail = ctx.customerEmail?.trim().toLowerCase()
  const userId = ctx.userId ? String(ctx.userId) : null

  if (!customerEmail) {
    throw new Error("Missing customer email for One Selfie Visibility Bundle fulfillment")
  }
  if (!userId) {
    throw new Error("Missing user account for One Selfie Visibility Bundle fulfillment")
  }

  const session = ctx.session
  const paymentId = stripeObjectId(session.payment_intent) || session.id
  const customerId = stripeObjectId(session.customer)
  const customerName = session.customer_details?.name || null
  const isTestMode = !ctx.event.livemode
  const entitlementSourceRef = `${paymentId}:one-selfie-visibility-bundle`

  await ensureSelfieVisibilityBundleProductRegistry()

  // The bundle owner row is a one-time purchase marker. It is not a Stripe subscription and
  // never counts as a SUITE member because its product_type is not a membership product type.
  await sql`
    INSERT INTO subscriptions (
      user_id,
      product_type,
      plan,
      status,
      stripe_customer_id,
      is_test_mode,
      created_at,
      updated_at
    )
    SELECT
      ${userId},
      'selfie_visibility_bundle',
      'selfie_visibility_bundle',
      'active',
      ${customerId},
      ${isTestMode},
      NOW(),
      NOW()
    WHERE NOT EXISTS (
      SELECT 1
      FROM subscriptions
      WHERE user_id = ${userId}
        AND product_type = 'selfie_visibility_bundle'
        AND COALESCE(is_test_mode, FALSE) = ${isTestMode}
    )
  `

  await sql`
    INSERT INTO user_tags (user_id, tag, source, metadata)
    VALUES (
      ${userId},
      'bought_selfie_visibility_bundle',
      'selfie_visibility_bundle_purchase',
      ${JSON.stringify({
        stripe_session_id: session.id,
        stripe_payment_id: paymentId,
      })}::jsonb
    )
    ON CONFLICT (user_id, tag) DO NOTHING
  `

  // The masterclass entitlement expands to Branded by SSELFIE and Editing Masterclass through
  // the Academy alias contract. Presets use their own preset_orders token registry below, so
  // they must not be inserted through the Academy product foreign key.
  for (const productId of LIFETIME_ENTITLEMENTS) {
    await upsertPurchaseEntitlement({
      userId,
      productId,
      sourceRef: entitlementSourceRef,
      metadata: {
        source: "stripe_webhook:selfie_visibility_bundle",
        stripe_session_id: session.id,
        stripe_payment_id: paymentId,
        purchased_product_id: SELFIE_VISIBILITY_BUNDLE_PRODUCT_TYPE,
      },
      throwOnError: true,
    })
  }

  // Both products use the existing freebie_subscribers token store. Each helper reuses the
  // current token and merges tags, so calling both grants both access routes without duplicates.
  await upsertStarterKitSubscriber(customerEmail, customerName)
  await upsertPromptVaultSubscriber(customerEmail, customerName)

  await upsertPresetOrderForPurchase({
    email: customerEmail,
    name: customerName,
    tier: "bundle",
    stripeSessionId: session.id,
    stripePaymentId: paymentId,
    stripeCustomerId: customerId,
    metadata: {
      source: "selfie-visibility-bundle",
      bundled_product: SELFIE_VISIBILITY_BUNDLE_PRODUCT_TYPE,
    },
  })

  await grantSelfieVisibilityBundlePass({
    userId,
    stripePaymentId: paymentId,
    stripeCustomerId: customerId,
    isTestMode,
  })

  const priorDelivery = await sql`
    SELECT 1
    FROM email_logs
    WHERE LOWER(user_email) = LOWER(${customerEmail})
      AND email_type = ${SELFIE_VISIBILITY_BUNDLE_DELIVERY_EMAIL_TYPE}
      AND status IN ('sent', 'delivered', 'suppressed')
    LIMIT 1
  `

  if (priorDelivery.length === 0) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
    const buyerHomeUrl = `${siteUrl}/academy/access/one-selfie`
    const delivery = generateSelfieVisibilityBundleDeliveryEmail({
      firstName: getFirstNameForEmail({ fullName: customerName, email: customerEmail }),
      accessUrl: ctx.purchasePasswordSetupLink || buyerHomeUrl,
    })
    const emailResult = await sendEmail({
      to: customerEmail,
      subject: delivery.subject,
      html: delivery.html,
      text: delivery.text,
      emailType: SELFIE_VISIBILITY_BUNDLE_DELIVERY_EMAIL_TYPE,
      tags: ["selfie-visibility-bundle", "delivery"],
      idempotencyKey: `selfie-visibility-bundle-delivery:${session.id}`,
    })

    if (!emailResult.success) {
      // Access is already safely granted. `sendEmail` has retried and logged the failure to the
      // admin error radar, so a bounced/suppressed address must not roll back paid fulfillment.
      console.error(
        "[selfie-visibility-bundle] Delivery email failed after access was granted:",
        emailResult.error || "unknown error",
      )
    }
  }

  if (ctx.event.livemode) {
    await updateContactTags(customerEmail, {
      product: SELFIE_VISIBILITY_BUNDLE_PRODUCT_TYPE,
      journey: "one_selfie_visibility_bundle",
      bought_selfie_visibility_bundle: "true",
    }).catch(error => {
      console.error(
        "[selfie-visibility-bundle] Could not update Resend contact tags after fulfillment:",
        error,
      )
    })
  }
}

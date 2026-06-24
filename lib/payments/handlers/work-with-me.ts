import { sendEmail } from "@/lib/email/send-email"
import { generateWorkWithMeWelcomeEmail } from "@/lib/email/templates/work-with-me-welcome"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { upsertPurchaseEntitlement } from "@/lib/academy-entitlements"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { updateContactTags as updateTags } from "@/lib/resend/manage-contact"
import { ensurePaidSelfieToBrandShootSubscriber } from "@/lib/freebie/selfie-to-brand-shoot-access"
import { generatePasswordSetupLinkForPurchase } from "../shared"
import type { CheckoutFulfillmentContext } from "../types"

export async function handleWorkWithMeCheckout(ctx: CheckoutFulfillmentContext): Promise<void> {
  const { event, session, isPaymentPaid, customerEmail, userId, source } = ctx

  if (!isPaymentPaid) {
    console.log(
      `[v0] ⚠️ Work With Me checkout completed but payment not confirmed (status: '${session.payment_status}').`
    )
    return
  }

  if (!customerEmail) {
    console.error("[v0] Work With Me checkout missing customer email; skipping welcome send")
    return
  }

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id
  const paymentIdForStorage = paymentIntentId || session.id
  const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const masterclassUrl = `${productionUrl}/academy/access/masterclass`
  const selfieToBrandShootUrl = `${productionUrl}/academy/access/selfie-to-brand-shoot`
  const appUrl = `${productionUrl}/app`
  const firstName = getFirstNameForEmail({
    fullName: session.customer_details?.name,
    email: customerEmail,
  })
  const selfieToBrandShootSubscriber = await ensurePaidSelfieToBrandShootSubscriber(
    customerEmail,
    session.customer_details?.name
  )
  const promptVaultUrl = `${productionUrl}/access/prompt-vault/${selfieToBrandShootSubscriber.accessToken}`

  if (userId) {
    await upsertPurchaseEntitlement({
      userId: String(userId),
      productId: "masterclass",
      sourceRef: `${paymentIdForStorage}:work_with_me_masterclass`,
      metadata: {
        source: "stripe_webhook:work_with_me",
        bundled_with: "work_with_me",
        stripe_session_id: session.id,
      },
    })

    await upsertPurchaseEntitlement({
      userId: String(userId),
      productId: "brand_strategy_pack",
      sourceRef: `${paymentIdForStorage}:work_with_me_brand_strategy`,
      metadata: {
        source: "stripe_webhook:work_with_me_bundle",
        bundled_with: "work_with_me",
        stripe_session_id: session.id,
      },
    })

    await upsertPurchaseEntitlement({
      userId: String(userId),
      productId: "selfie_to_brand_shoot_system",
      sourceRef: `${paymentIdForStorage}:work_with_me_selfie_to_brand_shoot`,
      metadata: {
        source: "stripe_webhook:work_with_me_bundle",
        bundled_with: "work_with_me",
        stripe_session_id: session.id,
      },
    })

    await upsertPurchaseEntitlement({
      userId: String(userId),
      productId: "prompt_vault",
      sourceRef: `${paymentIdForStorage}:work_with_me_prompt_vault`,
      metadata: {
        source: "stripe_webhook:work_with_me_bundle",
        bundled_with: "work_with_me",
        stripe_session_id: session.id,
      },
    })
  }

  const passwordSetupUrl =
    ctx.purchasePasswordSetupLink ||
    (await generatePasswordSetupLinkForPurchase(
      userId,
      customerEmail,
      "/academy/access/masterclass"
    ))
  const email = generateWorkWithMeWelcomeEmail({
    firstName,
    passwordSetupUrl,
    masterclassUrl,
    selfieToBrandShootUrl,
    promptVaultUrl,
    appUrl,
  })

  const emailResult = await sendEmail({
    to: customerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
    emailType: "work_with_me_welcome",
    tags: ["work-with-me", "private-sprint", "welcome"],
  })

  if (!emailResult.success) {
    console.error(`[v0] ❌ Failed to send Work With Me welcome email: ${emailResult.error}`)
  }

  await updateTags(customerEmail, {
    product: "work-with-me",
    journey: "work_with_me",
    bought_work_with_me: "true",
    bought_masterclass: "true",
    bought_brand_strategy_pack: "true",
    bought_selfie_to_brand_shoot_system: "true",
    bought_prompt_vault: "true",
  }).catch(tagError => {
    console.error("[v0] Failed to update Work With Me tags:", tagError)
  })

  await logAnalyticsEvent({
    eventName: "work_with_me_checkout_success",
    userId: userId ? String(userId) : null,
    properties: {
      source: source || "work_with_me_paid",
      product_type: "work_with_me",
      value: (session.amount_total || 0) / 100,
      currency: session.currency || "eur",
      stripe_session_id: session.id,
      stripe_payment_id: paymentIdForStorage,
      is_test_mode: !event.livemode,
    },
  }).catch(() => {})
}

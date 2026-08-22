// WEBHOOK-01 — Studio membership subscription checkout fulfillment, extracted from
// app/api/webhooks/stripe/route.ts. No behavior change.

import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { getOrCreateNeonUser } from "@/lib/user-mapping"
import { sendEmail } from "@/lib/email/send-email"
import { updateContactTags } from "@/lib/resend/manage-contact"
import {
  generateVaultMayaWelcomeEmail,
  VAULT_MAYA_WELCOME_SUBJECTS,
} from "@/lib/email/templates/vault-maya-welcome"
import {
  generateMembershipWelcomeEmail,
  MEMBERSHIP_WELCOME_SUBJECTS,
} from "@/lib/email/templates/membership-welcome"
import { getSubscriptionPeriod } from "../shared"
import type { CheckoutFulfillmentContext } from "../types"
import { getSubscriptionPlanFromMetadata } from "@/lib/launch/cash-launch-pricing"
import { upsertStudioMembershipSubscription } from "@/lib/payments/lifecycle/upsert-studio-membership"
import { findAuthUserByEmail } from "@/lib/supabase/find-auth-user-by-email"

async function persistCheckoutMembership({
  event,
  session,
  subscriptionData,
  userId,
  plan,
  isTestMode,
  productType,
  recordSuiteStartShadow,
}: {
  event: CheckoutFulfillmentContext["event"]
  session: CheckoutFulfillmentContext["session"]
  subscriptionData: any
  userId: string
  plan: string
  isTestMode: boolean
  productType?: "sselfie_studio_membership" | "vault_maya"
  recordSuiteStartShadow: boolean
}): Promise<void> {
  const subscriptionPeriod = getSubscriptionPeriod(subscriptionData)
  const stripeCustomerId =
    typeof subscriptionData.customer === "string"
      ? subscriptionData.customer
      : subscriptionData.customer?.id

  if (!stripeCustomerId) {
    throw new Error(`Membership ${subscriptionData.id} has no Stripe customer`)
  }

  const eventCreated = typeof event.created === "number" ? event.created : null
  const immutableStartTimestamp =
    event.type === "checkout.session.async_payment_succeeded"
      ? eventCreated
      : typeof subscriptionData.start_date === "number"
        ? subscriptionData.start_date
        : (eventCreated ?? (typeof session.created === "number" ? session.created : null))

  if (recordSuiteStartShadow && immutableStartTimestamp === null) {
    throw new Error(`Membership ${subscriptionData.id} has no immutable start timestamp`)
  }

  const immutableStartAt =
    immutableStartTimestamp === null ? null : new Date(immutableStartTimestamp * 1000)

  await upsertStudioMembershipSubscription({
    userId,
    productType,
    plan,
    status: subscriptionData.status,
    stripeSubscriptionId: subscriptionData.id,
    stripeCustomerId,
    periodStart: subscriptionPeriod.start,
    periodEnd: subscriptionPeriod.end,
    isTestMode,
    ...(recordSuiteStartShadow && immutableStartAt
      ? {
          shadowMembershipStarted: {
            checkoutSessionId: session.id,
            occurredAt: immutableStartAt,
          },
        }
      : {}),
  })
}

type LocalSubscriptionBuyer = {
  id: string
  password_setup_complete: boolean | null
  supabase_user_id?: string | null
}

async function findLocalSubscriptionBuyer(params: {
  userId?: string | null
  email?: string | null
}): Promise<LocalSubscriptionBuyer | null> {
  if (params.userId) {
    const [byId] = await sql`
      SELECT id, password_setup_complete, supabase_user_id
      FROM users
      WHERE id = ${params.userId}
      LIMIT 1
    `
    if (byId?.id) return byId as LocalSubscriptionBuyer
  }

  if (params.email) {
    const [byEmail] = await sql`
      SELECT id, password_setup_complete, supabase_user_id
      FROM users
      WHERE LOWER(email) = LOWER(${params.email})
      LIMIT 1
    `
    if (byEmail?.id) return byEmail as LocalSubscriptionBuyer
  }

  return null
}

function setupJourneyUrl(productType: string): string {
  const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const destination = productType === "vault_maya" ? "/vault-maya/studio" : "/app"
  return `${productionUrl}/auth/forgot-password?next=${encodeURIComponent(destination)}`
}

async function sendNewSubscriptionBuyerWelcome(params: {
  session: CheckoutFulfillmentContext["session"]
  customerEmail: string
  productType: string
}): Promise<void> {
  const isVaultMaya = params.productType === "vault_maya"
  const emailType = isVaultMaya ? "vault_maya_welcome" : "membership_welcome"
  const idempotencyKey = isVaultMaya
    ? `vault-maya-welcome:${params.session.id}`
    : `membership-welcome:${params.session.id}`
  const passwordSetupUrl = setupJourneyUrl(params.productType)
  const emailContent = isVaultMaya
    ? generateVaultMayaWelcomeEmail({
        variant: "new",
        customerName: params.session.customer_details?.name,
        customerEmail: params.customerEmail,
        passwordSetupUrl,
      })
    : generateMembershipWelcomeEmail({
        variant: "new",
        customerName: params.session.customer_details?.name,
        customerEmail: params.customerEmail,
        passwordSetupUrl,
      })
  const result = await sendEmail({
    to: params.customerEmail,
    subject: isVaultMaya ? VAULT_MAYA_WELCOME_SUBJECTS.new : MEMBERSHIP_WELCOME_SUBJECTS.new,
    html: emailContent.html,
    text: emailContent.text,
    emailType,
    idempotencyKey,
    tags: [isVaultMaya ? "vault-maya-welcome" : "membership-welcome", "account-setup"],
  })

  if (!result.success) {
    await sql`
      INSERT INTO email_logs (user_email, email_type, status, error_message, sent_at)
      VALUES (${params.customerEmail}, ${emailType}, 'failed', ${result.error}, NOW())
    `
    throw new Error(result.error || `Failed to send ${emailType} for ${params.session.id}`)
  }

  await sql`
    INSERT INTO email_logs (user_email, email_type, resend_message_id, status, sent_at)
    VALUES (${params.customerEmail}, ${emailType}, ${result.messageId}, 'sent', NOW())
  `
}

async function sendExistingSubscriptionBuyerWelcomeBestEffort(params: {
  session: CheckoutFulfillmentContext["session"]
  customerEmail: string
  productType: "sselfie_studio_membership" | "vault_maya"
}): Promise<void> {
  const isVaultMaya = params.productType === "vault_maya"
  const emailType = isVaultMaya ? "vault_maya_welcome" : "membership_welcome"

  try {
    const alreadyWelcomed = await sql`
      SELECT 1 FROM email_logs
      WHERE user_email = ${params.customerEmail}
        AND email_type = ${emailType}
        AND status IN ('sent', 'delivered')
        AND sent_at > NOW() - INTERVAL '7 days'
      LIMIT 1
    `

    if (alreadyWelcomed.length > 0) {
      console.log(
        `[v0] ${emailType} already sent to ${params.customerEmail} in the last 7 days, skipping`
      )
      return
    }

    const emailContent = isVaultMaya
      ? generateVaultMayaWelcomeEmail({
          variant: "existing",
          customerName: params.session.customer_details?.name,
          customerEmail: params.customerEmail,
        })
      : generateMembershipWelcomeEmail({
          variant: "existing",
          customerName: params.session.customer_details?.name,
          customerEmail: params.customerEmail,
        })
    const emailResult = await sendEmail({
      to: params.customerEmail,
      subject: isVaultMaya
        ? VAULT_MAYA_WELCOME_SUBJECTS.existing
        : MEMBERSHIP_WELCOME_SUBJECTS.existing,
      html: emailContent.html,
      text: emailContent.text,
      emailType,
      idempotencyKey: isVaultMaya
        ? `vault-maya-welcome:${params.session.id}`
        : `membership-welcome:${params.session.id}`,
      tags: isVaultMaya ? ["vault-maya-welcome"] : ["membership-welcome", "upgrade"],
    })

    if (!emailResult.success) {
      console.error(
        `[v0] Failed to send ${emailType} (existing user) to ${params.customerEmail}: ${emailResult.error}`
      )
    }
  } catch (welcomeError: any) {
    console.error(
      `[v0] Error sending ${emailType} (existing user) to ${params.customerEmail}:`,
      welcomeError?.message || welcomeError
    )
  }
}

export async function handleStudioMembershipSubscriptionCheckout(
  ctx: CheckoutFulfillmentContext
): Promise<void> {
  const { event, session, isPaymentPaid, maybeTrackCheckoutReferralSignup = async () => {} } = ctx

  // Shared Auth and Neon user stores are not partitioned by Stripe mode. Test
  // subscriptions therefore stop before any customer/account mutation.
  if (!event.livemode) {
    console.log(`[v0] Test subscription checkout ${session.id} ignored before shared systems.`)
    return
  }

  const metadata = session.metadata || {}
  let userId: string | null = metadata.user_id || null
  const customerEmail = session.customer_details?.email || session.customer_email
  const rawProductType = metadata.product_type
  const productType =
    rawProductType === "sselfie_studio_membership_annual"
      ? "sselfie_studio_membership"
      : rawProductType || "sselfie_studio_membership"
  const subscriptionPlan = getSubscriptionPlanFromMetadata(metadata, productType)
  const subscriptionProductType: "sselfie_studio_membership" | "vault_maya" =
    productType === "vault_maya" ? "vault_maya" : "sselfie_studio_membership"
  const recordSuiteStartShadow =
    rawProductType === "sselfie_studio_membership" ||
    rawProductType === "sselfie_studio_membership_annual"
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id

  if (!subscriptionId) {
    throw new Error(`Subscription checkout ${session.id} has no subscription ID`)
  }

  try {
    let localBuyer = await findLocalSubscriptionBuyer({ userId, email: customerEmail })
    let accountCreated = false

    if (localBuyer) {
      userId = localBuyer.id
    } else if (userId) {
      console.warn(
        `[v0] Subscription checkout ${session.id} metadata user ${userId} is not local; resolving by buyer email.`
      )
      userId = null
    }

    if (!localBuyer && !userId && customerEmail) {
      console.log(`[v0] Subscription purchase from ${customerEmail} needs account resolution.`)
      const supabaseAdmin = createAdminClient()
      const existingUser = await findAuthUserByEmail({
        email: customerEmail,
        listUsers: params => supabaseAdmin.auth.admin.listUsers(params),
      })
      let authUserId = existingUser?.id

      if (!authUserId) {
        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: customerEmail,
          email_confirm: true,
          user_metadata: {
            created_via: "stripe_subscription",
            stripe_customer_id: session.customer,
          },
        })

        if (createError) throw createError
        if (!createData.user) {
          throw new Error("No user data returned from Supabase create")
        }
        authUserId = createData.user.id
        accountCreated = true
      }

      const neonUser = await getOrCreateNeonUser(authUserId, customerEmail, null)
      userId = neonUser.id

      if (accountCreated) {
        await sql`
          UPDATE users
          SET password_setup_complete = FALSE
          WHERE id = ${userId}
        `
      }

      localBuyer =
        (await findLocalSubscriptionBuyer({ userId, email: customerEmail })) ||
        (accountCreated
          ? {
              id: userId,
              password_setup_complete: false,
              supabase_user_id: authUserId,
            }
          : null)
    }

    if (!userId) {
      throw new Error(`Subscription checkout ${session.id} could not resolve a local user`)
    }

    let subscriptionData = (await stripe.subscriptions.retrieve(subscriptionId)) as any
    const subscriptionMetadata = subscriptionData.metadata || {}
    const subscriptionNeedsUserLink = subscriptionMetadata.user_id !== userId

    if (accountCreated || subscriptionNeedsUserLink) {
      await stripe.checkout.sessions.update(session.id, {
        metadata: {
          ...metadata,
          user_id: userId,
          ...(accountCreated ? { auto_created: "true" } : {}),
        },
      })
    }

    if (subscriptionNeedsUserLink) {
      subscriptionData = (await stripe.subscriptions.update(subscriptionData.id, {
        metadata: {
          ...subscriptionMetadata,
          user_id: userId,
          product_type: productType,
          credits: metadata.credits,
        },
      })) as any
    }

    if (isPaymentPaid) {
      await persistCheckoutMembership({
        event,
        session,
        subscriptionData,
        userId,
        plan: subscriptionPlan,
        isTestMode: false,
        productType: subscriptionProductType,
        recordSuiteStartShadow,
      })

      console.log(
        `[v0] ${productType} subscription ${subscriptionId} stored for ${userId}; invoice fulfillment owns credits.`
      )
    } else {
      console.log(
        `[v0] Subscription ${subscriptionId} is unpaid; account linkage stored without granting local subscription access.`
      )
    }

    if (isPaymentPaid && customerEmail) {
      // Only update an existing Resend marketing contact. Do not create a marketing
      // contact merely because someone paid; purchase consent and marketing consent stay separate.
      const lifecycleSync = await updateContactTags(customerEmail, {
        lifecycle_stage: subscriptionProductType === "sselfie_studio_membership" ? "member" : "customer",
        primary_interest: subscriptionProductType === "sselfie_studio_membership" ? "all" : "ai_photos",
        ...(subscriptionProductType === "sselfie_studio_membership"
          ? { membership_status: subscriptionData.status }
          : {}),
        last_product: subscriptionProductType,
      })
      if (!lifecycleSync.success && lifecycleSync.error !== "Contact not found") {
        console.error("[v0] Resend subscription lifecycle sync failed:", lifecycleSync.error)
      }

      const setupIncomplete =
        accountCreated ||
        localBuyer?.password_setup_complete === false ||
        (localBuyer?.password_setup_complete == null && metadata.auto_created === "true")

      if (setupIncomplete) {
        await sendNewSubscriptionBuyerWelcome({ session, customerEmail, productType })
      } else {
        await sendExistingSubscriptionBuyerWelcomeBestEffort({
          session,
          customerEmail,
          productType: subscriptionProductType,
        })
      }
    }
  } catch (error: any) {
    console.error(`[v0] Subscription checkout fulfillment failed for ${session.id}:`, {
      error: error?.message || String(error),
    })
    // Account, subscription persistence, and new-buyer setup delivery are required
    // stages. The webhook must retry any incomplete paid fulfillment.
    throw error
  }

  if (isPaymentPaid) {
    try {
      await maybeTrackCheckoutReferralSignup(
        userId,
        session.metadata?.referral_code,
        `checkout.session.completed:subscription:${productType || "unknown"}`
      )
    } catch (referralError: any) {
      console.error(
        `[v0] Failed to track referral signup after subscription checkout for ${customerEmail || userId}:`,
        referralError.message
      )
    }
  }

  if (isPaymentPaid && customerEmail) {
    try {
      const { removeVaultMayaLaunchSalesContact } =
        await import("@/lib/email/campaigns/vault-maya-launch-segments")
      await removeVaultMayaLaunchSalesContact(customerEmail)
    } catch (suppressionError) {
      console.error("[v0] Vault Maya launch buyer suppression failed:", {
        error: suppressionError instanceof Error ? suppressionError.message : "unknown error",
      })
    }
  }
}

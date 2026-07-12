import { logAnalyticsEvent } from "@/lib/analytics/events"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import {
  generateTrialDay0Email,
  generateTrialUnlockEmail,
} from "@/lib/email/templates/suite-trial"
import { grantSuiteTrial } from "@/lib/trial/suite-trial"

export type PaidBuyerTrialProductType =
  | "prompt_vault"
  | "starter_kit"
  | "selfie_ai_photos_kit"

type PaidBuyerTrialOutcome =
  | "auto_activated"
  | "already_had_trial"
  | "claim_email_sent"
  | "claim_email_already_sent"
  | "skipped_test_mode"
  | "skipped_missing_email"

const PRODUCT_DETAILS: Record<
  PaidBuyerTrialProductType,
  { label: string; emailTag: string }
> = {
  prompt_vault: { label: "Prompt Vault", emailTag: "prompt-vault" },
  starter_kit: { label: "Starter Kit", emailTag: "starter-kit" },
  selfie_ai_photos_kit: {
    label: "Selfie To AI Photos Kit",
    emailTag: "selfie-ai-photos-kit",
  },
}

/**
 * Starts the included SUITE trial at the payment moment when checkout already resolved
 * to a Neon user. Buyers without a user keep the historical claim-token path.
 *
 * Live-only and idempotent: grantSuiteTrial creates at most one trial per user, and
 * the day-0 email is sent only when that call reports a newly created trial.
 */
export async function activatePaidBuyerSuiteTrial(params: {
  livemode: boolean
  userId: string | null | undefined
  customerEmail: string | null | undefined
  customerName?: string | null
  productType: PaidBuyerTrialProductType
  stripeSessionId: string
  getClaimUrl: () => Promise<string>
}): Promise<{ outcome: PaidBuyerTrialOutcome }> {
  if (!params.livemode) {
    return { outcome: "skipped_test_mode" }
  }

  const customerEmail = params.customerEmail?.trim()
  if (!customerEmail) {
    return { outcome: "skipped_missing_email" }
  }

  const product = PRODUCT_DETAILS[params.productType]
  const userId = params.userId ? String(params.userId) : null

  if (userId) {
    const grant = await grantSuiteTrial(
      userId,
      `paid_purchase:${params.productType}:${params.stripeSessionId}`,
    )

    if (!grant.created) {
      return { outcome: "already_had_trial" }
    }

    const day0 = generateTrialDay0Email({
      customerName: params.customerName,
      customerEmail,
    })
    await sendEmail({
      to: customerEmail,
      subject: day0.subject,
      html: day0.html,
      text: day0.text,
      emailType: "suite_trial_day0",
      tags: ["suite-trial", "day0", product.emailTag, "paid-buyer"],
    })

    await logAnalyticsEvent({
      eventName: "trial_claimed",
      userId,
      properties: {
        source: "paid_buyer_auto_activation",
        product_type: params.productType,
        stripe_session_id: params.stripeSessionId,
      },
    }).catch(() => {})

    return { outcome: "auto_activated" }
  }

  const alreadySent = await sql`
    SELECT 1 FROM email_logs
    WHERE user_email = ${customerEmail}
      AND email_type = 'suite_trial_unlock'
      AND status IN ('sent', 'delivered')
    LIMIT 1
  `
  if (alreadySent.length > 0) {
    return { outcome: "claim_email_already_sent" }
  }

  const claimUrl = await params.getClaimUrl()
  const trialEmail = generateTrialUnlockEmail({
    customerName: params.customerName,
    customerEmail,
    productLabel: product.label,
    claimUrl,
  })
  await sendEmail({
    to: customerEmail,
    subject: trialEmail.subject,
    html: trialEmail.html,
    text: trialEmail.text,
    emailType: "suite_trial_unlock",
    tags: ["suite-trial", "unlock", product.emailTag],
  })

  return { outcome: "claim_email_sent" }
}

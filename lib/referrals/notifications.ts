import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { generateReferralBonusReferredEmail } from "@/lib/email/templates/referral-bonus-referred"
import { generateReferralBonusReferrerEmail } from "@/lib/email/templates/referral-bonus-referrer"

type ReferralBonusNotificationKind = "referred" | "referrer"

type SendReferralBonusNotificationParams = {
  referralId: number
  kind: ReferralBonusNotificationKind
}

type SendReferralBonusNotificationResult = {
  success: boolean
  status: "sent" | "already_sent" | "missing_referral" | "missing_bonus" | "send_failed"
  emailType: string
}

type SendReferralBonusNotificationsForReferralResult = {
  referred: SendReferralBonusNotificationResult
  referrer: SendReferralBonusNotificationResult
}

const REFERRER_EMAIL_PREFIX = "referral-bonus-referrer"
const REFERRED_EMAIL_PREFIX = "referral-bonus-referred"
const REFERRER_PURCHASE_BONUS = 50
const REFERRED_SIGNUP_BONUS = 25

type ReferralNotificationRow = {
  id: number
  referrer_email: string
  referrer_name: string | null
  referred_email: string
  referred_name: string | null
  credits_awarded_referrer: number | null
  credits_awarded_referred: number | null
}

export function getReferralBonusEmailType(
  kind: ReferralBonusNotificationKind,
  referralId: number
): string {
  return `${kind === "referrer" ? REFERRER_EMAIL_PREFIX : REFERRED_EMAIL_PREFIX}-${referralId}`
}

export async function sendReferralBonusNotification(
  params: SendReferralBonusNotificationParams
): Promise<SendReferralBonusNotificationResult> {
  const emailType = getReferralBonusEmailType(params.kind, params.referralId)
  const referral = await getReferralNotificationRow(params.referralId)

  if (!referral) {
    return { success: false, status: "missing_referral", emailType }
  }

  const isReferrer = params.kind === "referrer"
  const recipientEmail = isReferrer ? referral.referrer_email : referral.referred_email
  const recipientName = getFirstNameForEmail({
    fullName: isReferrer ? referral.referrer_name : referral.referred_name,
    email: recipientEmail,
  })
  const awardedCredits = Number(
    isReferrer ? referral.credits_awarded_referrer || 0 : referral.credits_awarded_referred || 0
  )
  const requiredCredits = isReferrer ? REFERRER_PURCHASE_BONUS : REFERRED_SIGNUP_BONUS

  if (awardedCredits < requiredCredits) {
    return { success: false, status: "missing_bonus", emailType }
  }

  const alreadySent = await hasSentEmail(recipientEmail, emailType)
  if (alreadySent) {
    return { success: true, status: "already_sent", emailType }
  }

  const template = isReferrer
    ? generateReferralBonusReferrerEmail({
        recipientName,
        referredCustomerName: getFirstNameForEmail({
          fullName: referral.referred_name,
          email: referral.referred_email,
        }),
        credits: awardedCredits,
      })
    : generateReferralBonusReferredEmail({
        recipientName,
        credits: awardedCredits,
      })

  const result = await sendEmail({
    to: recipientEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    from: "Sandra at SSELFIE <hello@sselfie.ai>",
    emailType,
    tags: ["referral", "credits", params.kind],
    idempotencyKey: `referral-bonus:${params.kind}:${params.referralId}`,
  })

  return {
    success: result.success,
    status: result.success ? "sent" : "send_failed",
    emailType,
  }
}

export async function sendReferralBonusNotificationsForReferral(
  referralId: number
): Promise<SendReferralBonusNotificationsForReferralResult> {
  const [referred, referrer] = await Promise.all([
    sendReferralBonusNotification({ referralId, kind: "referred" }),
    sendReferralBonusNotification({ referralId, kind: "referrer" }),
  ])

  return { referred, referrer }
}

async function getReferralNotificationRow(
  referralId: number
): Promise<ReferralNotificationRow | null> {
  const [row] = await sql`
    SELECT
      r.id,
      referrer.email AS referrer_email,
      COALESCE(referrer.display_name, referrer.first_name, '') AS referrer_name,
      referred.email AS referred_email,
      COALESCE(referred.display_name, referred.first_name, '') AS referred_name,
      r.credits_awarded_referrer,
      r.credits_awarded_referred
    FROM referrals r
    INNER JOIN users referrer ON referrer.id = r.referrer_id
    INNER JOIN users referred ON referred.id = r.referred_id
    WHERE r.id = ${referralId}
    LIMIT 1
  `

  return (row as ReferralNotificationRow | undefined) || null
}

async function hasSentEmail(recipientEmail: string, emailType: string): Promise<boolean> {
  const [existing] = await sql`
    SELECT id
    FROM email_logs
    WHERE user_email = ${recipientEmail}
      AND email_type = ${emailType}
      AND status IN ('sent', 'delivered')
    LIMIT 1
  `

  return Boolean(existing?.id)
}

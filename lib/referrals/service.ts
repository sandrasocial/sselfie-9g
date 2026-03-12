import { addCredits } from "@/lib/credits"
import { sql } from "@/lib/db/client"
import { sendReferralBonusNotification } from "@/lib/referrals/notifications"
import { normalizeReferralCode } from "@/lib/referrals/routing"

type TrackReferralSignupParams = {
  referralCode: string
  referredUserId: string
}

type TrackReferralSignupResult =
  | { success: true; status: "tracked" | "already_tracked"; referrerId: string; referralId: number | null; welcomeCreditsGranted: boolean }
  | { success: false; status: "invalid_code" | "self_referral"; referrerId?: string; referralId?: number | null; welcomeCreditsGranted?: false }

type CompleteReferralForPurchaseParams = {
  referredUserId: string
  paymentSource: string
  isTestMode?: boolean
}

type CompleteReferralForPurchaseResult =
  | { success: true; status: "completed" | "already_completed" | "no_referral"; referrerId: string | null; referralId: number | null }
  | { success: false; status: "reward_failed"; referrerId: string; referralId: number; error: string }

const REFERRED_SIGNUP_BONUS = 25
const REFERRER_PURCHASE_BONUS = 50
const REFERRAL_SIGNUP_WINDOW_MS = 5 * 60 * 1000

export function areReferralBonusesEnabled(): boolean {
  return process.env.REFERRAL_BONUSES_ENABLED !== "false"
}

export function isReferralSignupEligible(createdAt: string | Date | null | undefined, now: Date = new Date()): boolean {
  if (!createdAt) {
    return false
  }

  const createdAtMs = new Date(createdAt).getTime()
  const nowMs = now.getTime()

  if (!Number.isFinite(createdAtMs) || !Number.isFinite(nowMs) || createdAtMs > nowMs) {
    return false
  }

  return nowMs - createdAtMs <= REFERRAL_SIGNUP_WINDOW_MS
}

export function isReferralPurchaseEligible(amountCents: number | null | undefined): boolean {
  const normalizedAmount = typeof amountCents === "number" ? amountCents : Number(amountCents)
  return Number.isFinite(normalizedAmount) && normalizedAmount > 0
}

export function buildReferralEventCode(referralCode: string, referredUserId: string): string {
  const normalizedReferralCode = normalizeReferralCode(referralCode)

  if (!normalizedReferralCode) {
    throw new Error("Invalid referral code")
  }

  const suffix = referredUserId.replace(/[^a-zA-Z0-9]/g, "").slice(-12).toUpperCase() || "EVENT"
  return `${normalizedReferralCode}-${suffix}`.slice(0, 50)
}

export async function trackReferralSignup(params: TrackReferralSignupParams): Promise<TrackReferralSignupResult> {
  const normalizedReferralCode = normalizeReferralCode(params.referralCode)

  if (!normalizedReferralCode) {
    return { success: false, status: "invalid_code" }
  }

  const [referrer] = await sql`
    SELECT id
    FROM users
    WHERE referral_code = ${normalizedReferralCode}
    LIMIT 1
  `

  if (!referrer?.id) {
    return { success: false, status: "invalid_code" }
  }

  if (referrer.id === params.referredUserId) {
    return { success: false, status: "self_referral", referrerId: referrer.id }
  }

  const [existingReferral] = await sql`
    SELECT id, referrer_id, credits_awarded_referred
    FROM referrals
    WHERE referred_id = ${params.referredUserId}
    LIMIT 1
  `

  if (existingReferral?.id) {
    if (existingReferral.referrer_id !== referrer.id) {
      return {
        success: true,
        status: "already_tracked",
        referrerId: existingReferral.referrer_id,
        referralId: Number(existingReferral.id),
        welcomeCreditsGranted: Number(existingReferral.credits_awarded_referred || 0) >= REFERRED_SIGNUP_BONUS,
      }
    }

    const welcomeCreditsGranted = await maybeGrantReferredSignupBonus(
      Number(existingReferral.id),
      params.referredUserId,
      Number(existingReferral.credits_awarded_referred || 0),
    )

    return {
      success: true,
      status: "already_tracked",
      referrerId: referrer.id,
      referralId: Number(existingReferral.id),
      welcomeCreditsGranted,
    }
  }

  const referralEventCode = buildReferralEventCode(normalizedReferralCode, params.referredUserId)
  const [createdReferral] = await sql`
      INSERT INTO referrals (referrer_id, referred_id, referral_code, status)
      VALUES (${referrer.id}, ${params.referredUserId}, ${referralEventCode}, 'pending')
      RETURNING id
    `

  const referralId = Number(createdReferral?.id || 0) || null
  const welcomeCreditsGranted = referralId
    ? await maybeGrantReferredSignupBonus(referralId, params.referredUserId, 0)
    : false

  return {
    success: true,
    status: "tracked",
    referrerId: referrer.id,
    referralId,
    welcomeCreditsGranted,
  }
}

export async function completeReferralForPurchase(
  params: CompleteReferralForPurchaseParams,
): Promise<CompleteReferralForPurchaseResult> {
  const [referral] = await sql`
    SELECT id, referrer_id, status, credits_awarded_referrer
    FROM referrals
    WHERE referred_id = ${params.referredUserId}
    ORDER BY created_at ASC
    LIMIT 1
  `

  if (!referral?.id) {
    return { success: true, status: "no_referral", referrerId: null, referralId: null }
  }

  const referralId = Number(referral.id)
  const referrerId = String(referral.referrer_id)
  const existingReward = Number(referral.credits_awarded_referrer || 0)

  if (referral.status === "completed" || existingReward >= REFERRER_PURCHASE_BONUS) {
    return { success: true, status: "already_completed", referrerId, referralId }
  }

  let rewardAmount = existingReward
  if (!params.isTestMode && areReferralBonusesEnabled()) {
    const rewardResult = await addCredits(
      referrerId,
      REFERRER_PURCHASE_BONUS,
      "bonus",
      "Referral reward for referred user's first paid purchase",
    )

    if (!rewardResult.success) {
      return {
        success: false,
        status: "reward_failed",
        referrerId,
        referralId,
        error: rewardResult.error || `Failed to apply referral reward from ${params.paymentSource}`,
      }
    }

    rewardAmount = REFERRER_PURCHASE_BONUS
  }

  await sql`
    UPDATE referrals
    SET
      status = 'completed',
      completed_at = COALESCE(completed_at, NOW()),
      credits_awarded_referrer = ${rewardAmount}
    WHERE id = ${referralId}
  `

  if (!params.isTestMode && rewardAmount >= REFERRER_PURCHASE_BONUS) {
    try {
      await sendReferralBonusNotification({ referralId, kind: "referrer" })
    } catch (notificationError) {
      console.error("[v0] Failed to send referrer bonus notification:", notificationError)
    }
  }

  return { success: true, status: "completed", referrerId, referralId }
}

async function maybeGrantReferredSignupBonus(
  referralId: number,
  referredUserId: string,
  existingAwardedCredits: number,
): Promise<boolean> {
  if (!areReferralBonusesEnabled()) {
    return false
  }

  if (existingAwardedCredits >= REFERRED_SIGNUP_BONUS) {
    return true
  }

  const welcomeResult = await addCredits(
    referredUserId,
    REFERRED_SIGNUP_BONUS,
    "bonus",
    "Welcome reward for signing up with referral",
  )

  if (!welcomeResult.success) {
    return false
  }

  await sql`
    UPDATE referrals
    SET credits_awarded_referred = ${REFERRED_SIGNUP_BONUS}
    WHERE id = ${referralId}
  `

  try {
    await sendReferralBonusNotification({ referralId, kind: "referred" })
  } catch (notificationError) {
    console.error("[v0] Failed to send referred bonus notification:", notificationError)
  }

  return true
}

import { sql } from "@/lib/db/client"
import {
  MAYA_ESSENTIAL_PILOT_PLAN,
  MAYA_PRO_PILOT_PLAN,
  isMayaTierPilotPlan,
} from "@/lib/business/maya-tier-pilot"

export const PROMPT_VAULT_FLASH_PRICE_FLIPS_AT = "2026-06-26T22:01:00.000Z"
export const FOUNDING_ANNUAL_CLOSES_AT = "2026-07-05T21:59:00.000Z"
export const FOUNDING_ANNUAL_CAP = 25
export const FOUNDING_ANNUAL_PLAN = "founding_annual"

type EnvLike = Record<string, string | undefined>

export function isPromptVaultFlashPriceFlipped(now: Date = new Date()): boolean {
  return now.getTime() >= Date.parse(PROMPT_VAULT_FLASH_PRICE_FLIPS_AT)
}

export function getPromptVaultPriceDisplay(now: Date = new Date()) {
  const flipped = isPromptVaultFlashPriceFlipped(now)
  return {
    flipped,
    amountCents: flipped ? 3700 : 2700,
    label: flipped ? "$37" : "$27",
    oneTimeLabel: flipped ? "$37 one-time" : "$27 one-time",
    ctaLabel: flipped ? "Unlock the Vault · $37" : "Unlock the Vault · $27",
  }
}

export function resolvePromptVaultPriceId(env: EnvLike = process.env, now: Date = new Date()): string | undefined {
  const basePrice = env.STRIPE_PRICE_PROMPT_VAULT?.trim()
  if (!isPromptVaultFlashPriceFlipped(now)) return basePrice
  return env.STRIPE_PRICE_PROMPT_VAULT_AFTER_FLASH?.trim() || basePrice
}

export function resolveVaultMayaFlipMoment(env: EnvLike = process.env): number {
  const override = env.VAULT_MAYA_FOUNDER_PRICE_FLIPS_AT?.trim()
  // Decision (Sandra, 2026-07-30): there is NO Day 0 until the product passes QA and
  // actually opens publicly. With no env value there is no hidden founder clock at all.
  if (!override) return Number.POSITIVE_INFINITY

  const parsed = Date.parse(override)
  if (!Number.isFinite(parsed)) {
    throw new Error(
      "VAULT_MAYA_FOUNDER_PRICE_FLIPS_AT must be a valid ISO timestamp before launch."
    )
  }
  return parsed
}

export function isVaultMayaFounderPriceFlipped(now: Date = new Date(), env: EnvLike = process.env): boolean {
  return now.getTime() >= resolveVaultMayaFlipMoment(env)
}

export function getVaultMayaPriceDisplay(now: Date = new Date(), env: EnvLike = process.env) {
  const flipped = isVaultMayaFounderPriceFlipped(now, env)
  return {
    flipped,
    amountCents: flipped ? 2900 : 1900,
    label: flipped ? "$29" : "$19",
    monthlyLabel: flipped ? "$29/month" : "$19/month",
    ctaLabel: flipped ? "Start Vault Maya · $29/month" : "Founder price · $19/month",
  }
}

export function resolveVaultMayaPriceId(env: EnvLike = process.env, now: Date = new Date()): string | undefined {
  const founderPrice = env.STRIPE_VAULT_MAYA_FOUNDER_PRICE_ID?.trim()
  const standardPrice = env.STRIPE_VAULT_MAYA_PRICE_ID?.trim()
  // Fail-safe (Sandra, 2026-07-30): a missing price id for the CURRENT window must fail
  // loudly at checkout, never silently charge the other price. During the founder window a
  // missing founder id previously fell through to the $29 standard price — that path is
  // deliberately removed.
  if (!isVaultMayaFounderPriceFlipped(now, env)) return founderPrice || undefined
  return standardPrice || undefined
}

export function isFoundingAnnualWindowOpen(now: Date = new Date()): boolean {
  return now.getTime() <= Date.parse(FOUNDING_ANNUAL_CLOSES_AT)
}

export function getFoundingAnnualOfferStatus(count: number, now: Date = new Date()) {
  const sold = Math.max(0, Math.floor(count))
  const remaining = Math.max(0, FOUNDING_ANNUAL_CAP - sold)
  const windowOpen = isFoundingAnnualWindowOpen(now)
  const capOpen = sold < FOUNDING_ANNUAL_CAP
  return {
    plan: FOUNDING_ANNUAL_PLAN,
    cap: FOUNDING_ANNUAL_CAP,
    sold,
    remaining,
    windowOpen,
    available: windowOpen && capOpen,
    closesAt: FOUNDING_ANNUAL_CLOSES_AT,
  }
}

export async function getFoundingAnnualPurchaseCount(): Promise<number> {
  const rows = await sql`
    SELECT COUNT(DISTINCT stripe_subscription_id)::int AS count
    FROM subscriptions
    WHERE product_type = 'sselfie_studio_membership'
      AND plan = ${FOUNDING_ANNUAL_PLAN}
      AND (is_test_mode = FALSE OR is_test_mode IS NULL)
      AND status IN ('active', 'trialing', 'past_due', 'unpaid')
  `

  return Number(rows[0]?.count || 0)
}

export function resolveMembershipPriceId(input: {
  productType: string
  requestedPlan?: string | null
  foundingCount?: number
  env?: EnvLike
  now?: Date
}): {
  stripePriceId?: string
  envVarName: string
  appliedPlan: typeof FOUNDING_ANNUAL_PLAN | typeof MAYA_ESSENTIAL_PILOT_PLAN | typeof MAYA_PRO_PILOT_PLAN | null
  foundingStatus: ReturnType<typeof getFoundingAnnualOfferStatus> | null
} {
  const env = input.env || process.env
  const now = input.now || new Date()
  const isAnnual = input.productType === "sselfie_studio_membership_annual"
  const wantsFounding = isAnnual && input.requestedPlan === "founding"
  const foundingStatus = wantsFounding
    ? getFoundingAnnualOfferStatus(input.foundingCount || 0, now)
    : null

  if (input.requestedPlan === MAYA_ESSENTIAL_PILOT_PLAN) {
    return {
      stripePriceId: env.STRIPE_MAYA_ESSENTIAL_PILOT_PRICE_ID?.trim(),
      envVarName: "STRIPE_MAYA_ESSENTIAL_PILOT_PRICE_ID",
      appliedPlan: MAYA_ESSENTIAL_PILOT_PLAN,
      foundingStatus: null,
    }
  }

  if (input.requestedPlan === MAYA_PRO_PILOT_PLAN) {
    return {
      stripePriceId: env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID?.trim(),
      envVarName: "STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID",
      appliedPlan: MAYA_PRO_PILOT_PLAN,
      foundingStatus: null,
    }
  }

  if (wantsFounding && foundingStatus?.available) {
    return {
      stripePriceId: env.STRIPE_SSELFIE_STUDIO_FOUNDING_ANNUAL_PRICE_ID?.trim(),
      envVarName: "STRIPE_SSELFIE_STUDIO_FOUNDING_ANNUAL_PRICE_ID",
      appliedPlan: FOUNDING_ANNUAL_PLAN,
      foundingStatus,
    }
  }

  if (isAnnual) {
    return {
      stripePriceId: env.STRIPE_SSELFIE_STUDIO_ANNUAL_PRICE_ID?.trim(),
      envVarName: "STRIPE_SSELFIE_STUDIO_ANNUAL_PRICE_ID",
      appliedPlan: null,
      foundingStatus,
    }
  }

  return {
    stripePriceId: env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID?.trim(),
    envVarName: "STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID",
    appliedPlan: null,
    foundingStatus,
  }
}

export function getSubscriptionPlanFromMetadata(metadata?: Record<string, unknown> | null, fallback = "sselfie_studio_membership") {
  if (isMayaTierPilotPlan(metadata?.plan)) return metadata.plan
  if (metadata?.plan === FOUNDING_ANNUAL_PLAN) return FOUNDING_ANNUAL_PLAN
  if (
    metadata?.plan === "annual" ||
    metadata?.product_id === "sselfie_studio_membership_annual"
  ) {
    return "annual"
  }
  return fallback
}

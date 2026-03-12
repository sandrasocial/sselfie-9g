import { randomUUID } from "crypto"

import { sql } from "@/lib/db/client"
import { normalizeReferralCode } from "@/lib/referrals/routing"

export async function ensureUserReferralCode(userId: string, email: string, existingReferralCode?: string | null): Promise<string> {
  const normalizedExisting = normalizeReferralCode(existingReferralCode)

  if (normalizedExisting) {
    return normalizedExisting
  }

  const [userRecord] = await sql`
    SELECT referral_code
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `

  const savedCode = normalizeReferralCode(userRecord?.referral_code || null)
  if (savedCode) {
    return savedCode
  }

  const referralCode = await generateUniqueReferralCode(email)

  await sql`
    UPDATE users
    SET referral_code = ${referralCode}
    WHERE id = ${userId}
  `

  return referralCode
}

export async function generateUniqueReferralCode(email: string): Promise<string> {
  const emailPrefix = email.split("@")[0]?.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3) || "SSE"

  for (let attempt = 0; attempt < 10; attempt++) {
    const randomNum = Math.floor(100000 + Math.random() * 900000)
    const referralCode = `${emailPrefix}${randomNum}`

    if (await isReferralCodeAvailable(referralCode)) {
      return referralCode
    }
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const fallbackCode = `REF${randomUUID().replace(/-/g, "").toUpperCase().slice(0, 12)}`

    if (await isReferralCodeAvailable(fallbackCode)) {
      return fallbackCode
    }
  }

  throw new Error("Unable to generate a unique referral code")
}

export function buildReferralLink(referralCode: string): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"}/?ref=${referralCode}`
}

async function isReferralCodeAvailable(referralCode: string): Promise<boolean> {
  const [existing] = await sql`
    SELECT id
    FROM users
    WHERE referral_code = ${referralCode}
    LIMIT 1
  `

  return !existing
}

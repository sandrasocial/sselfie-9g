import { sql } from "@/lib/db/client"
import type { MayaOfferBriefFormValues } from "@/lib/maya/offer-brief"
import { getMayaUserSnapshot, type MayaUserSnapshot } from "@/lib/maya/user-snapshot"
import type { MayaCriticalLandingField } from "@/lib/maya/page-generation/types"
import { sanitizeUserFacingText } from "@/lib/maya/page-generation/sanitizers"

export interface MayaLandingSnapshotResolution {
  userId: string
  snapshot: MayaUserSnapshot
  brandProfile: Record<string, unknown>
  memoryOfferBrief: Partial<MayaOfferBriefFormValues>
  resolvedOffer: string
  resolvedAudience: string
  resolvedTransformation: string
  resolvedStyle: string
  resolvedProofPoints: string
  resolvedCta: string
  missingCriticalFields: MayaCriticalLandingField[]
}

function normalizeString(value: unknown, maxLength = 220): string {
  if (typeof value === "string") {
    return sanitizeUserFacingText(value, maxLength)
  }

  if (Array.isArray(value)) {
    return sanitizeUserFacingText(value.filter((entry) => typeof entry === "string").join(", "), maxLength)
  }

  if (value && typeof value === "object") {
    try {
      const serialized = JSON.stringify(value)
      return sanitizeUserFacingText(serialized, maxLength)
    } catch {
      return ""
    }
  }

  return ""
}

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const normalized = normalizeString(value)
    if (normalized) return normalized
  }
  return ""
}

function parseMemoryOfferBrief(memoryData: Record<string, unknown>): Partial<MayaOfferBriefFormValues> {
  const raw = memoryData.latest_offer_brief
  if (!raw || typeof raw !== "object") return {}

  const record = raw as Record<string, unknown>
  return {
    designStyle: normalizeString(record.designStyle),
    offerType: normalizeString(record.offerType),
    transformation: normalizeString(record.transformation),
    pricePoint: normalizeString(record.pricePoint),
    formatAndDuration: normalizeString(record.formatAndDuration),
    idealClient: normalizeString(record.idealClient),
    biggestStruggle: normalizeString(record.biggestStruggle),
    uniqueMethod: normalizeString(record.uniqueMethod),
    proofPoints: normalizeString(record.proofPoints),
    callToAction: normalizeString(record.callToAction),
  }
}

async function getBrandProfile(userId: string): Promise<Record<string, unknown>> {
  try {
    const rows = await sql`
      SELECT row_to_json(upb) AS data
      FROM user_personal_brand upb
      WHERE upb.user_id::text = ${userId}
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
      LIMIT 1
    `

    const raw = (rows[0] as { data?: unknown } | undefined)?.data
    return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  } catch (error) {
    const message = String((error as Error)?.message || "").toLowerCase()
    if (message.includes("user_personal_brand") && message.includes("does not exist")) {
      return {}
    }
    throw error
  }
}

function buildMissingCriticalFields(input: {
  offer: string
  audience: string
  transformation: string
}): MayaCriticalLandingField[] {
  const missing: MayaCriticalLandingField[] = []
  if (!input.offer) missing.push("offer")
  if (!input.audience) missing.push("audience")
  if (!input.transformation) missing.push("transformation")
  return missing
}

export async function resolveMayaLandingSnapshot(
  userId: string | number,
): Promise<MayaLandingSnapshotResolution> {
  const normalizedUserId = String(userId || "").trim()
  const snapshot = await getMayaUserSnapshot(normalizedUserId)
  const brandProfile = await getBrandProfile(normalizedUserId)
  const memoryOfferBrief = parseMemoryOfferBrief(snapshot.memoryData)

  const resolvedOffer = firstNonEmpty(
    memoryOfferBrief.offerType,
    snapshot.offerBrief.prefill.offerType,
    brandProfile.business_type,
    brandProfile.content_goals,
  )

  const resolvedAudience = firstNonEmpty(
    memoryOfferBrief.idealClient,
    snapshot.offerBrief.prefill.idealClient,
    brandProfile.ideal_audience,
    brandProfile.target_audience,
  )

  const resolvedTransformation = firstNonEmpty(
    memoryOfferBrief.transformation,
    snapshot.offerBrief.prefill.transformation,
    brandProfile.audience_transformation,
    brandProfile.transformation_story,
  )

  const resolvedStyle = firstNonEmpty(
    memoryOfferBrief.designStyle,
    snapshot.offerBrief.prefill.designStyle,
    brandProfile.visual_aesthetic,
    brandProfile.brand_vibe,
    brandProfile.color_theme,
  )

  const resolvedProofPoints = firstNonEmpty(
    memoryOfferBrief.proofPoints,
    snapshot.offerBrief.prefill.proofPoints,
    brandProfile.success_stories,
    brandProfile.testimonials,
  )

  const resolvedCta = firstNonEmpty(
    memoryOfferBrief.callToAction,
    snapshot.offerBrief.prefill.callToAction,
  )

  return {
    userId: normalizedUserId,
    snapshot,
    brandProfile,
    memoryOfferBrief,
    resolvedOffer,
    resolvedAudience,
    resolvedTransformation,
    resolvedStyle,
    resolvedProofPoints,
    resolvedCta,
    missingCriticalFields: buildMissingCriticalFields({
      offer: resolvedOffer,
      audience: resolvedAudience,
      transformation: resolvedTransformation,
    }),
  }
}

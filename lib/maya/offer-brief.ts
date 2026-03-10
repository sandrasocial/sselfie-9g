export type MayaOfferBriefAssetType = "page" | "calendar"

export interface MayaOfferBrief {
  assetType: MayaOfferBriefAssetType
  designStyle: string
  offerType: string
  transformation: string
  pricePoint: string
  formatAndDuration: string
  idealClient: string
  biggestStruggle: string
  uniqueMethod: string
  proofPoints: string
  callToAction: string
}

export type MayaOfferBriefFormValues = Omit<MayaOfferBrief, "assetType">
export type MayaOfferBriefField = keyof MayaOfferBriefFormValues

export interface MayaOfferBriefCollectionPayload {
  assetType: MayaOfferBriefAssetType
  prefill?: Partial<MayaOfferBriefFormValues>
  missingFields?: MayaOfferBriefField[]
}

const MAX_FIELD_LENGTH = 280
const SUBMIT_OFFER_BRIEF_REGEX = /\[SUBMIT_OFFER_BRIEF:\s*([^\]]+)\]/i
const OFFER_BRIEF_CORE_FIELDS: MayaOfferBriefField[] = ["offerType", "transformation", "idealClient"]

function normalizeField(value: unknown): string {
  if (typeof value !== "string") return ""
  const normalized = value.replace(/\s+/g, " ").trim()
  if (!normalized) return ""
  if (normalized.length <= MAX_FIELD_LENGTH) return normalized
  return `${normalized.slice(0, MAX_FIELD_LENGTH).trimEnd()}...`
}

function normalizePartialFormValues(input: unknown): Partial<MayaOfferBriefFormValues> {
  if (!input || typeof input !== "object") return {}
  const record = input as Record<string, unknown>
  const normalized: Partial<MayaOfferBriefFormValues> = {}

  const fields: MayaOfferBriefField[] = [
    "designStyle",
    "offerType",
    "transformation",
    "pricePoint",
    "formatAndDuration",
    "idealClient",
    "biggestStruggle",
    "uniqueMethod",
    "proofPoints",
    "callToAction",
  ]

  for (const field of fields) {
    const value = normalizeField(record[field])
    if (value) {
      normalized[field] = value
    }
  }

  return normalized
}

function normalizeMissingFieldList(input: unknown): MayaOfferBriefField[] {
  if (!Array.isArray(input)) return []
  const allowed = new Set<MayaOfferBriefField>([
    "designStyle",
    "offerType",
    "transformation",
    "pricePoint",
    "formatAndDuration",
    "idealClient",
    "biggestStruggle",
    "uniqueMethod",
    "proofPoints",
    "callToAction",
  ])

  const deduped: MayaOfferBriefField[] = []
  for (const value of input) {
    if (typeof value !== "string") continue
    const normalized = value.trim() as MayaOfferBriefField
    if (!allowed.has(normalized)) continue
    if (!deduped.includes(normalized)) deduped.push(normalized)
  }
  return deduped
}

function toOfferBriefRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null
  return value as Record<string, unknown>
}

export function normalizeOfferBrief(input: unknown): MayaOfferBrief | null {
  const record = toOfferBriefRecord(input)
  if (!record) return null
  const assetType: MayaOfferBriefAssetType = record.assetType === "calendar" ? "calendar" : "page"

  const brief: MayaOfferBrief = {
    assetType,
    designStyle: normalizeField(record.designStyle),
    offerType: normalizeField(record.offerType),
    transformation: normalizeField(record.transformation),
    pricePoint: normalizeField(record.pricePoint),
    formatAndDuration: normalizeField(record.formatAndDuration),
    idealClient: normalizeField(record.idealClient),
    biggestStruggle: normalizeField(record.biggestStruggle),
    uniqueMethod: normalizeField(record.uniqueMethod),
    proofPoints: normalizeField(record.proofPoints),
    callToAction: normalizeField(record.callToAction),
  }

  const hasRequiredSignals =
    brief.offerType.length > 0 &&
    brief.transformation.length > 0 &&
    brief.idealClient.length > 0

  if (!hasRequiredSignals) return null
  return brief
}

export function getOfferBriefCoreFields(): MayaOfferBriefField[] {
  return [...OFFER_BRIEF_CORE_FIELDS]
}

export function isOfferBriefCoreComplete(values: Partial<MayaOfferBriefFormValues>): boolean {
  return OFFER_BRIEF_CORE_FIELDS.every((field) => normalizeField(values[field]).length > 0)
}

export function toOfferBriefFromPartial(values: Partial<MayaOfferBriefFormValues>): MayaOfferBrief | null {
  return toOfferBriefFromPartialForAsset(values, "page")
}

export function toOfferBriefFromPartialForAsset(
  values: Partial<MayaOfferBriefFormValues>,
  assetType: MayaOfferBriefAssetType,
): MayaOfferBrief | null {
  const brief: MayaOfferBrief = {
    assetType,
    designStyle: normalizeField(values.designStyle),
    offerType: normalizeField(values.offerType),
    transformation: normalizeField(values.transformation),
    pricePoint: normalizeField(values.pricePoint),
    formatAndDuration: normalizeField(values.formatAndDuration),
    idealClient: normalizeField(values.idealClient),
    biggestStruggle: normalizeField(values.biggestStruggle),
    uniqueMethod: normalizeField(values.uniqueMethod),
    proofPoints: normalizeField(values.proofPoints),
    callToAction: normalizeField(values.callToAction),
  }

  if (!isOfferBriefCoreComplete(brief)) return null
  return brief
}

export function encodeOfferBriefMarkerPayload(brief: MayaOfferBrief): string {
  return encodeURIComponent(JSON.stringify(brief))
}

export function encodeOfferBriefCollectionPayload(payload: MayaOfferBriefCollectionPayload): string {
  const normalizedPayload: MayaOfferBriefCollectionPayload = {
    assetType: payload.assetType === "calendar" ? "calendar" : "page",
    prefill: normalizePartialFormValues(payload.prefill),
    missingFields: normalizeMissingFieldList(payload.missingFields),
  }
  return encodeURIComponent(JSON.stringify(normalizedPayload))
}

export function parseOfferBriefCollectionPayload(rawPayload: string): MayaOfferBriefCollectionPayload | null {
  if (!rawPayload || rawPayload.trim().length === 0) return null

  let parsedPayload: unknown = null
  try {
    parsedPayload = JSON.parse(decodeURIComponent(rawPayload))
  } catch {
    try {
      parsedPayload = JSON.parse(rawPayload)
    } catch {
      return null
    }
  }

  if (!parsedPayload || typeof parsedPayload !== "object") return null
  const record = parsedPayload as Record<string, unknown>

  const assetType: MayaOfferBriefAssetType = record.assetType === "calendar" ? "calendar" : "page"
  const prefill = normalizePartialFormValues(record.prefill)
  const missingFields = normalizeMissingFieldList(record.missingFields)

  return {
    assetType,
    prefill,
    missingFields,
  }
}

export function parseOfferBriefSubmissionMarker(text: string): MayaOfferBrief | null {
  if (!text) return null
  const match = text.match(SUBMIT_OFFER_BRIEF_REGEX)
  if (!match?.[1]) return null

  const rawPayload = match[1].trim()
  if (!rawPayload) return null

  let parsedPayload: unknown = null

  try {
    parsedPayload = JSON.parse(decodeURIComponent(rawPayload))
  } catch {
    try {
      parsedPayload = JSON.parse(rawPayload)
    } catch {
      parsedPayload = null
    }
  }

  return normalizeOfferBrief(parsedPayload)
}

export function stripOfferBriefSubmissionMarker(text: string): string {
  if (!text) return ""
  return text.replace(SUBMIT_OFFER_BRIEF_REGEX, "").replace(/\s{2,}/g, " ").trim()
}

export function summarizeOfferBriefForMemory(brief: MayaOfferBrief): string {
  const summaryParts = [
    brief.designStyle ? `Design style: ${brief.designStyle}` : null,
    `Offer: ${brief.offerType}`,
    `Transformation: ${brief.transformation}`,
    `Ideal client: ${brief.idealClient}`,
    brief.pricePoint ? `Price: ${brief.pricePoint}` : null,
    brief.formatAndDuration ? `Format: ${brief.formatAndDuration}` : null,
    brief.biggestStruggle ? `Pain point: ${brief.biggestStruggle}` : null,
    brief.uniqueMethod ? `Unique method: ${brief.uniqueMethod}` : null,
    brief.proofPoints ? `Proof: ${brief.proofPoints}` : null,
    brief.callToAction ? `CTA: ${brief.callToAction}` : null,
  ].filter(Boolean)

  return summaryParts.join(" | ")
}

export function buildOfferBriefInstruction(brief: MayaOfferBrief): string {
  const isCalendar = brief.assetType === "calendar"
  const sections = [
    isCalendar
      ? `Create an Instagram content calendar draft for this offer: ${brief.offerType}.`
      : `Create a landing page draft. Offer: ${brief.offerType}.`,
    brief.designStyle ? `Design direction: ${brief.designStyle}.` : null,
    `Main transformation: ${brief.transformation}.`,
    `Ideal client: ${brief.idealClient}.`,
    brief.biggestStruggle ? `Core struggle to address: ${brief.biggestStruggle}.` : null,
    brief.pricePoint ? `Price point: ${brief.pricePoint}.` : null,
    brief.formatAndDuration ? `Offer format and duration: ${brief.formatAndDuration}.` : null,
    brief.uniqueMethod ? `Unique mechanism/framework: ${brief.uniqueMethod}.` : null,
    brief.proofPoints ? `Proof points/testimonials to include: ${brief.proofPoints}.` : null,
    brief.callToAction ? `Primary CTA: ${brief.callToAction}.` : null,
    isCalendar
      ? "Return a 9-post Instagram plan with post type mix (reel/carousel/photo), hook-first captions, and hashtags ready to copy."
      : "Keep copy premium, clear, and conversion-focused while matching the user's established brand voice.",
  ].filter(Boolean)

  return sections.join(" ")
}

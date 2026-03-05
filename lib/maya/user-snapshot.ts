import { sql } from "@/lib/db/client"
import {
  getOfferBriefCoreFields,
  isOfferBriefCoreComplete,
  type MayaOfferBriefField,
  type MayaOfferBriefFormValues,
} from "@/lib/maya/offer-brief"
import type { MayaActiveAssetContext, MayaAssetType } from "@/lib/maya/memory-layer"

interface UploadLibraryRow {
  selfies?: unknown
  products?: unknown
  people?: unknown
  vibes?: unknown
}

interface BrandSnapshotRow {
  business_type?: unknown
  transformation_story?: unknown
  future_vision?: unknown
  business_goals?: unknown
  target_audience?: unknown
  ideal_audience?: unknown
  audience_challenge?: unknown
  audience_transformation?: unknown
  positioning_statement?: unknown
  current_situation?: unknown
  content_goals?: unknown
  visual_aesthetic?: unknown
  brand_vibe?: unknown
  photography_style?: unknown
  style_preferences?: unknown
}

interface BrandSnapshotJsonRow {
  data?: unknown
}

export interface MayaOfferBriefSeedSnapshot {
  prefill: Partial<MayaOfferBriefFormValues>
  missingFields: MayaOfferBriefField[]
  hasCoreFields: boolean
}

export interface MayaUploadSnapshot {
  selfies: number
  products: number
  people: number
  vibes: number
  total: number
  hasAny: boolean
}

export type MayaGenerationSource = "selfies" | "custom_model" | "base_model"

export interface MayaGenerationSnapshot {
  hasTrainedModel: boolean
  canUseCustomModel: boolean
  canUseSelfies: boolean
  recommendedSource: MayaGenerationSource
}

export interface MayaUserSnapshot {
  userId: string
  offerBrief: MayaOfferBriefSeedSnapshot
  uploads: MayaUploadSnapshot
  generation: MayaGenerationSnapshot
  activeAssetContext: MayaActiveAssetContext | null
  memoryData: Record<string, unknown>
}

function normalizeSeedField(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.replace(/\s+/g, " ").trim()
}

function normalizeStyleField(value: unknown): string {
  if (Array.isArray(value)) {
    const joined = value.filter((entry) => typeof entry === "string").join(", ")
    return normalizeSeedField(joined)
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    const label =
      (typeof record.name === "string" && record.name) ||
      (typeof record.label === "string" && record.label) ||
      (typeof record.style === "string" && record.style) ||
      ""
    return normalizeSeedField(label)
  }
  return normalizeSeedField(value)
}

function parseUploadCount(value: unknown): number {
  if (!Array.isArray(value)) return 0
  return value.filter(Boolean).length
}

function parseCountValue(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return Math.floor(parsed)
}

function isRecoverableLibrarySchemaError(error: unknown): boolean {
  const err = error as { code?: string; message?: string }
  const code = typeof err?.code === "string" ? err.code : ""
  const message = String(err?.message || "").toLowerCase()

  if (code === "42P01" || code === "42703" || code === "42883" || code === "22P02" || code === "42804") {
    return true
  }

  return (
    (message.includes("user_image_libraries") &&
      (message.includes("does not exist") ||
        message.includes("undefined table") ||
        message.includes("undefined column"))) ||
    ((message.includes("user_id") || message.includes("uuid = integer")) &&
      (message.includes("operator does not exist") ||
        message.includes("invalid input syntax") ||
        message.includes("cannot cast")))
  )
}

function isRecoverableBrandSchemaError(error: unknown): boolean {
  const err = error as { code?: string; message?: string }
  const code = typeof err?.code === "string" ? err.code : ""
  const message = String(err?.message || "").toLowerCase()

  if (code === "42P01" || code === "42703" || code === "42883" || code === "22P02" || code === "42804") {
    return true
  }

  return (
    (message.includes("user_personal_brand") &&
      (message.includes("does not exist") ||
        message.includes("undefined table") ||
        message.includes("undefined column"))) ||
    ((message.includes("user_id") || message.includes("uuid = integer") || message.includes("uuid = text")) &&
      (message.includes("operator does not exist") ||
        message.includes("invalid input syntax") ||
        message.includes("cannot cast")))
  )
}

function parseActiveAssetContext(memoryData: Record<string, unknown>): MayaActiveAssetContext | null {
  const rawContext = memoryData.active_asset_context
  if (!rawContext || typeof rawContext !== "object") return null
  const record = rawContext as Record<string, unknown>

  const parsedType: MayaAssetType | null =
    record.assetType === "page" || record.assetType === "calendar" || record.assetType === "pdf"
      ? (record.assetType as MayaAssetType)
      : null
  if (!parsedType) return null

  const parsedLabel =
    typeof record.assetLabel === "string" && record.assetLabel.trim().length > 0
      ? record.assetLabel.trim()
      : parsedType === "calendar"
        ? "Content Calendar"
        : parsedType === "pdf"
          ? "Workbook"
          : "Landing Page"

  const parsedAssetId =
    typeof record.assetId === "string" && record.assetId.trim().length > 0 ? record.assetId.trim() : undefined
  const parsedInstruction =
    typeof record.lastInstruction === "string" && record.lastInstruction.trim().length > 0
      ? record.lastInstruction.trim()
      : undefined
  const parsedUpdatedAt =
    typeof record.updatedAt === "string" && record.updatedAt.trim().length > 0
      ? record.updatedAt.trim()
      : new Date(0).toISOString()

  return {
    assetType: parsedType,
    assetLabel: parsedLabel,
    assetId: parsedAssetId,
    lastInstruction: parsedInstruction,
    updatedAt: parsedUpdatedAt,
  }
}

function buildOfferBriefSeed(
  memoryData: Record<string, unknown>,
  brandData: BrandSnapshotRow,
): MayaOfferBriefSeedSnapshot {
  const storedBrief =
    memoryData.latest_offer_brief && typeof memoryData.latest_offer_brief === "object"
      ? (memoryData.latest_offer_brief as Record<string, unknown>)
      : {}

  const prefill: Partial<MayaOfferBriefFormValues> = {
    designStyle: normalizeStyleField(storedBrief.designStyle) ||
      normalizeStyleField(brandData.visual_aesthetic) ||
      normalizeStyleField(brandData.brand_vibe) ||
      normalizeStyleField(brandData.photography_style) ||
      normalizeStyleField(brandData.style_preferences),
    offerType: normalizeSeedField(storedBrief.offerType) ||
      normalizeSeedField(brandData.business_type) ||
      normalizeSeedField(brandData.content_goals),
    transformation: normalizeSeedField(storedBrief.transformation) ||
      normalizeSeedField(brandData.audience_transformation) ||
      normalizeSeedField(brandData.transformation_story) ||
      normalizeSeedField(brandData.future_vision),
    pricePoint: normalizeSeedField(storedBrief.pricePoint),
    formatAndDuration: normalizeSeedField(storedBrief.formatAndDuration),
    idealClient: normalizeSeedField(storedBrief.idealClient) ||
      normalizeSeedField(brandData.target_audience) ||
      normalizeSeedField(brandData.ideal_audience),
    biggestStruggle: normalizeSeedField(storedBrief.biggestStruggle) ||
      normalizeSeedField(brandData.audience_challenge) ||
      normalizeSeedField(brandData.current_situation),
    uniqueMethod: normalizeSeedField(storedBrief.uniqueMethod) ||
      normalizeSeedField(brandData.positioning_statement) ||
      normalizeSeedField(brandData.business_goals),
    proofPoints: normalizeSeedField(storedBrief.proofPoints),
    callToAction: normalizeSeedField(storedBrief.callToAction),
  }

  const missingFields = getOfferBriefCoreFields().filter((field) => normalizeSeedField(prefill[field]).length === 0)

  return {
    prefill,
    missingFields,
    hasCoreFields: missingFields.length === 0 && isOfferBriefCoreComplete(prefill),
  }
}

async function getUploadLibrary(userId: string): Promise<UploadLibraryRow | null> {
  try {
    const rows = await sql`
      SELECT selfies, products, people, vibes
      FROM user_image_libraries
      WHERE user_id::text = ${userId}
      LIMIT 1
    `
    return (rows[0] as UploadLibraryRow | undefined) ?? null
  } catch (error) {
    if (isRecoverableLibrarySchemaError(error)) {
      return null
    }
    throw error
  }
}

async function getBrandSnapshot(userId: string): Promise<BrandSnapshotRow> {
  try {
    const rows = await sql`
      SELECT
        business_type,
        transformation_story,
        future_vision,
        business_goals,
        target_audience,
        ideal_audience,
        audience_challenge,
        audience_transformation,
        positioning_statement,
        current_situation,
        content_goals,
        visual_aesthetic,
        brand_vibe,
        photography_style,
        style_preferences
      FROM user_personal_brand
      WHERE user_id::text = ${userId}
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
      LIMIT 1
    `
    return ((rows[0] as any) as BrandSnapshotRow | undefined) ?? {}
  } catch (error) {
    if (!isRecoverableBrandSchemaError(error)) {
      throw error
    }
  }

  try {
    const fallbackRows = await sql`
      SELECT row_to_json(upb) AS data
      FROM user_personal_brand upb
      WHERE upb.user_id::text = ${userId}
      LIMIT 1
    `
    const rawData = ((fallbackRows[0] as BrandSnapshotJsonRow | undefined)?.data ?? {}) as unknown
    return rawData && typeof rawData === "object" ? (rawData as BrandSnapshotRow) : {}
  } catch (fallbackError) {
    if (isRecoverableBrandSchemaError(fallbackError)) {
      return {}
    }
    throw fallbackError
  }
}

function getDefaultSnapshot(userId: string): MayaUserSnapshot {
  return {
    userId,
    offerBrief: {
      prefill: {},
      missingFields: getOfferBriefCoreFields(),
      hasCoreFields: false,
    },
    uploads: {
      selfies: 0,
      products: 0,
      people: 0,
      vibes: 0,
      total: 0,
      hasAny: false,
    },
    generation: {
      hasTrainedModel: false,
      canUseCustomModel: false,
      canUseSelfies: false,
      recommendedSource: "base_model",
    },
    activeAssetContext: null,
    memoryData: {},
  }
}

export async function getMayaUserSnapshot(userId: string | number): Promise<MayaUserSnapshot> {
  const normalizedUserId = String(userId || "").trim()
  if (!normalizedUserId) return getDefaultSnapshot("")

  const fallback = getDefaultSnapshot(normalizedUserId)

  try {
    const [memoryRows, brandData, trainedModelRows, uploadLibrary, brandAssetCountRows] = await Promise.all([
      sql`
        SELECT memory_data
        FROM maya_personal_memory
        WHERE user_id = ${normalizedUserId}
        LIMIT 1
      `,
      getBrandSnapshot(normalizedUserId),
      sql`
        SELECT 1
        FROM user_models
        WHERE user_id = ${normalizedUserId}
          AND training_status = 'completed'
        LIMIT 1
      `,
      getUploadLibrary(normalizedUserId),
      sql`
        SELECT COUNT(*)::int AS count
        FROM brand_assets
        WHERE user_id = ${normalizedUserId}
      `,
    ])

    const memoryData =
      ((memoryRows[0] as any)?.memory_data as Record<string, unknown> | undefined) ?? {}
    const offerBrief = buildOfferBriefSeed(memoryData, brandData)
    const activeAssetContext = parseActiveAssetContext(memoryData)

    const uploadCounts = {
      selfies: parseUploadCount(uploadLibrary?.selfies),
      products: parseUploadCount(uploadLibrary?.products),
      people: parseUploadCount(uploadLibrary?.people),
      vibes: parseUploadCount(uploadLibrary?.vibes),
    }
    const uploadLibraryTotal = uploadCounts.selfies + uploadCounts.products + uploadCounts.people + uploadCounts.vibes
    const brandAssetCount = parseCountValue((brandAssetCountRows[0] as any)?.count)
    const totalUploads = Math.max(uploadLibraryTotal, brandAssetCount)

    const hasTrainedModel = trainedModelRows.length > 0
    const uploads: MayaUploadSnapshot = {
      ...uploadCounts,
      total: totalUploads,
      hasAny: totalUploads > 0,
    }

    const generation: MayaGenerationSnapshot = {
      hasTrainedModel,
      canUseCustomModel: hasTrainedModel,
      canUseSelfies: uploads.hasAny,
      recommendedSource: hasTrainedModel ? "custom_model" : uploads.hasAny ? "selfies" : "base_model",
    }

    return {
      userId: normalizedUserId,
      offerBrief,
      uploads,
      generation,
      activeAssetContext,
      memoryData,
    }
  } catch (error) {
    console.error("[Maya Snapshot] Failed loading user snapshot:", error)
    return fallback
  }
}

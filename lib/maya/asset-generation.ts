import { sql } from "@/lib/db/client"

export type MayaGeneratedAssetType = "page" | "calendar" | "pdf"

export interface MayaGeneratedAsset {
  id: string
  assetType: MayaGeneratedAssetType
  title: string
  instruction: string
  previewText: string
  previewHtml: string
  url?: string
  createdAt: string
  status: "draft"
}

const MAX_STORED_ASSETS = 40
const MAX_PREVIEW_TEXT_LENGTH = 240
const MAX_INSTRUCTION_LENGTH = 800

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function sanitizeInstruction(value: string): string {
  const normalized = normalizeWhitespace(value || "")
  if (!normalized) return ""
  if (normalized.length <= MAX_INSTRUCTION_LENGTH) return normalized
  return `${normalized.slice(0, MAX_INSTRUCTION_LENGTH).trimEnd()}...`
}

function sanitizePreviewText(value: string): string {
  const normalized = normalizeWhitespace(value || "")
  if (!normalized) return ""
  if (normalized.length <= MAX_PREVIEW_TEXT_LENGTH) return normalized
  return `${normalized.slice(0, MAX_PREVIEW_TEXT_LENGTH).trimEnd()}...`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function makeAssetId(assetType: MayaGeneratedAssetType): string {
  return `maya_${assetType}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function extractPrimaryIntent(instruction: string): string {
  const cleaned = instruction
    .replace(/\b(create|build|generate|make|draft)\b/gi, "")
    .replace(/\b(landing page|sales page|homepage|strategy page|content calendar|calendar|planner|pdf|workbook|ebook|guide|cheatsheet)\b/gi, "")
    .replace(/^[,:-\s]+|[,:-\s]+$/g, "")
    .trim()

  return cleaned || instruction
}

function buildTitle(assetType: MayaGeneratedAssetType, instruction: string): string {
  const seed = extractPrimaryIntent(instruction)
  const shortSeed = seed.split(" ").slice(0, 6).join(" ")
  if (assetType === "calendar") return shortSeed ? `Content Calendar: ${shortSeed}` : "Content Calendar"
  if (assetType === "pdf") return shortSeed ? `Workbook: ${shortSeed}` : "Workbook"
  return shortSeed ? `Landing Page: ${shortSeed}` : "Landing Page"
}

function buildPreviewText(assetType: MayaGeneratedAssetType, instruction: string): string {
  const seed = extractPrimaryIntent(instruction)
  if (assetType === "calendar") {
    return sanitizePreviewText(`Drafted a weekly content calendar around: ${seed}. Includes hooks, post directions, and CTA rhythm.`)
  }
  if (assetType === "pdf") {
    return sanitizePreviewText(`Drafted a workbook outline for: ${seed}. Includes intro, step-by-step framework, and action pages.`)
  }
  return sanitizePreviewText(`Drafted a landing page structure for: ${seed}. Includes headline, offer, proof, and CTA sections.`)
}

function buildPreviewHtml(assetType: MayaGeneratedAssetType, title: string, previewText: string): string {
  const escapedTitle = escapeHtml(title)
  const escapedPreview = escapeHtml(previewText)

  if (assetType === "calendar") {
    return `
      <section>
        <h3>${escapedTitle}</h3>
        <p>${escapedPreview}</p>
        <ul>
          <li>Monday: Authority post</li>
          <li>Wednesday: Story + insight</li>
          <li>Friday: Offer + CTA</li>
        </ul>
      </section>
    `.trim()
  }

  if (assetType === "pdf") {
    return `
      <section>
        <h3>${escapedTitle}</h3>
        <p>${escapedPreview}</p>
        <ol>
          <li>Intro + promise</li>
          <li>Framework steps</li>
          <li>Action checklist</li>
        </ol>
      </section>
    `.trim()
  }

  return `
    <section>
      <h3>${escapedTitle}</h3>
      <p>${escapedPreview}</p>
      <ul>
        <li>Hero with direct promise</li>
        <li>Offer stack and proof</li>
        <li>Single focused CTA</li>
      </ul>
    </section>
  `.trim()
}

function parseExistingAssets(value: unknown): MayaGeneratedAsset[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const row = entry as Record<string, unknown>
      const assetType =
        row.assetType === "page" || row.assetType === "calendar" || row.assetType === "pdf"
          ? (row.assetType as MayaGeneratedAssetType)
          : "page"
      const id = typeof row.id === "string" && row.id.trim().length > 0 ? row.id : makeAssetId(assetType)
      const title = typeof row.title === "string" ? sanitizePreviewText(row.title) : buildTitle(assetType, "")
      const instruction = typeof row.instruction === "string" ? sanitizeInstruction(row.instruction) : ""
      const previewText = typeof row.previewText === "string" ? sanitizePreviewText(row.previewText) : ""
      const previewHtml = typeof row.previewHtml === "string" ? row.previewHtml : ""
      const url = typeof row.url === "string" ? row.url : undefined
      const createdAt =
        typeof row.createdAt === "string" && row.createdAt.trim().length > 0
          ? row.createdAt
          : new Date(0).toISOString()

      return {
        id,
        assetType,
        title,
        instruction,
        previewText,
        previewHtml,
        url,
        createdAt,
        status: "draft" as const,
      }
    })
}

export async function createMayaGeneratedAsset(input: {
  userId: string | number
  assetType: MayaGeneratedAssetType
  instruction: string
}): Promise<MayaGeneratedAsset> {
  const normalizedUserId = String(input.userId || "").trim()
  if (!normalizedUserId) {
    throw new Error("Cannot create Maya asset without a user id")
  }

  const instruction = sanitizeInstruction(input.instruction)
  if (!instruction) {
    throw new Error("Cannot create Maya asset without an instruction")
  }

  const createdAt = new Date().toISOString()
  const id = makeAssetId(input.assetType)
  const title = buildTitle(input.assetType, instruction)
  const previewText = buildPreviewText(input.assetType, instruction)
  const previewHtml = buildPreviewHtml(input.assetType, title, previewText)
  const url = `/studio?tab=maya&asset=${encodeURIComponent(id)}`

  const asset: MayaGeneratedAsset = {
    id,
    assetType: input.assetType,
    title,
    instruction,
    previewText,
    previewHtml,
    url,
    createdAt,
    status: "draft",
  }

  const existingRows = await sql`
    SELECT memory_data
    FROM maya_personal_memory
    WHERE user_id = ${normalizedUserId}
    LIMIT 1
  `

  const existingMemoryData = ((existingRows[0] as any)?.memory_data as Record<string, unknown> | undefined) ?? {}
  const existingAssets = parseExistingAssets(existingMemoryData.generated_assets)
  const nextAssets = [asset, ...existingAssets].slice(0, MAX_STORED_ASSETS)

  const memoryPatch = {
    generated_assets: nextAssets,
    last_generated_asset: asset,
    generated_assets_updated_at: createdAt,
  }

  await sql`
    INSERT INTO maya_personal_memory (user_id, memory_data, updated_at)
    VALUES (${normalizedUserId}, ${JSON.stringify(memoryPatch)}::jsonb, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET
      memory_data = COALESCE(maya_personal_memory.memory_data, '{}'::jsonb) || ${JSON.stringify(memoryPatch)}::jsonb,
      updated_at = NOW()
  `

  return asset
}

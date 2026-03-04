import { sql } from "@/lib/db/client"
import { persistMayaAssetAsPersonalPage } from "@/lib/maya/personal-pages"

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
const MAX_IMAGE_SOURCES = 12

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

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))]
}

function normalizeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("/")) return null
  return trimmed
}

function extractPrimaryIntent(instruction: string): string {
  const cleaned = instruction
    .replace(/\b(create|build|generate|make|draft)\b/gi, "")
    .replace(/\b(landing page|sales page|homepage|strategy page|content calendar|calendar|planner|pdf|workbook|ebook|guide|cheatsheet)\b/gi, "")
    .replace(/^[,:-\s]+|[,:-\s]+$/g, "")
    .trim()

  return cleaned || instruction
}

function toHeadline(seed: string): string {
  const cleaned = sanitizePreviewText(seed).replace(/[.!?]+$/, "")
  if (!cleaned) return "Build your next launch in one page"
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

type DesignDirection = {
  accent: string
  accentSoft: string
  bg: string
  panel: string
  text: string
  muted: string
  border: string
}

function inferDesignDirection(instruction: string): DesignDirection {
  const normalized = instruction.toLowerCase()

  if (/\b(minimal|clean|scandi|scandinavian)\b/.test(normalized)) {
    return {
      accent: "#111111",
      accentSoft: "#f2f2f2",
      bg: "#fafafa",
      panel: "#ffffff",
      text: "#141414",
      muted: "#5f5f5f",
      border: "#d8d8d8",
    }
  }

  if (/\b(luxury|editorial|high[- ]?end|premium)\b/.test(normalized)) {
    return {
      accent: "#1a1a1a",
      accentSoft: "#efe8de",
      bg: "#f8f4ef",
      panel: "#ffffff",
      text: "#111111",
      muted: "#595959",
      border: "#d9cfc2",
    }
  }

  if (/\b(bold|bright|colorful|playful)\b/.test(normalized)) {
    return {
      accent: "#0f4c81",
      accentSoft: "#e8f2ff",
      bg: "#f5f9ff",
      panel: "#ffffff",
      text: "#0c1f33",
      muted: "#465a73",
      border: "#c9d8ea",
    }
  }

  return {
    accent: "#171717",
    accentSoft: "#f1f1f1",
    bg: "#f7f7f7",
    panel: "#ffffff",
    text: "#111111",
    muted: "#5f5f5f",
    border: "#d7d7d7",
  }
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

async function loadUserImageUrls(userId: string): Promise<string[]> {
  const urls: string[] = []

  try {
    const generatedRows = await sql`
      SELECT selected_url, image_urls
      FROM generated_images
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${MAX_IMAGE_SOURCES}
    `

    for (const row of generatedRows as Array<{ selected_url?: string | null; image_urls?: string[] | string | null }>) {
      const selected = normalizeUrl(row.selected_url)
      if (selected) urls.push(selected)

      if (Array.isArray(row.image_urls)) {
        row.image_urls.forEach((url) => {
          const normalized = normalizeUrl(url)
          if (normalized) urls.push(normalized)
        })
      } else if (typeof row.image_urls === "string") {
        row.image_urls.split(",").forEach((url) => {
          const normalized = normalizeUrl(url)
          if (normalized) urls.push(normalized)
        })
      }
    }
  } catch (error) {
    console.warn("[Maya Asset] Could not read generated_images:", error)
  }

  try {
    const aiRows = await sql`
      SELECT image_url
      FROM ai_images
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${MAX_IMAGE_SOURCES}
    `

    for (const row of aiRows as Array<{ image_url?: string | null }>) {
      const normalized = normalizeUrl(row.image_url)
      if (normalized) urls.push(normalized)
    }
  } catch {
    // ai_images may not exist in all environments.
  }

  try {
    const brandRows = await sql`
      SELECT file_url, file_type
      FROM brand_assets
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${MAX_IMAGE_SOURCES}
    `

    for (const row of brandRows as Array<{ file_url?: string | null; file_type?: string | null }>) {
      const type = (row.file_type || "").toLowerCase()
      if (type.includes("image") || type.includes("jpg") || type.includes("png") || type.includes("webp")) {
        const normalized = normalizeUrl(row.file_url)
        if (normalized) urls.push(normalized)
      }
    }
  } catch (error) {
    console.warn("[Maya Asset] Could not read brand_assets:", error)
  }

  return uniqueStrings(urls).slice(0, MAX_IMAGE_SOURCES)
}

function buildLandingPageHtml(title: string, previewText: string, instruction: string, imageUrls: string[]): string {
  const direction = inferDesignDirection(instruction)
  const headline = escapeHtml(toHeadline(extractPrimaryIntent(instruction)))
  const safeTitle = escapeHtml(title)
  const safePreview = escapeHtml(previewText)
  const heroImage = imageUrls[0] || ""
  const imageTiles = imageUrls.slice(1, 5)

  const imageGalleryHtml =
    imageTiles.length > 0
      ? imageTiles
          .map(
            (url) => `
              <figure class="image-tile">
                <img src="${escapeHtml(url)}" alt="User brand image" loading="lazy" />
              </figure>
            `,
          )
          .join("")
      : `
        <div class="image-placeholder">Add 3-4 brand photos in chat and Maya will repopulate this gallery.</div>
      `

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      :root {
        --bg: ${direction.bg};
        --panel: ${direction.panel};
        --text: ${direction.text};
        --muted: ${direction.muted};
        --accent: ${direction.accent};
        --accent-soft: ${direction.accentSoft};
        --border: ${direction.border};
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: linear-gradient(180deg, var(--bg) 0%, #ffffff 60%);
        color: var(--text);
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .wrap {
        max-width: 1080px;
        margin: 0 auto;
        padding: 32px 20px 56px;
      }
      .hero {
        display: grid;
        grid-template-columns: 1.15fr 1fr;
        gap: 24px;
        align-items: stretch;
      }
      .panel {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 24px;
        padding: 28px;
      }
      h1 {
        margin: 0 0 12px;
        font-size: clamp(28px, 5vw, 54px);
        line-height: 1.05;
        letter-spacing: -0.02em;
      }
      .sub {
        margin: 0;
        color: var(--muted);
        font-size: clamp(16px, 2vw, 20px);
        line-height: 1.45;
      }
      .cta-row {
        margin-top: 22px;
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 12px 18px;
        border-radius: 999px;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        text-decoration: none;
        border: 1px solid var(--accent);
      }
      .btn-primary { background: var(--accent); color: #fff; }
      .btn-ghost { background: transparent; color: var(--accent); }
      .hero-media {
        border-radius: 24px;
        overflow: hidden;
        border: 1px solid var(--border);
        background: var(--accent-soft);
        min-height: 360px;
      }
      .hero-media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .hero-media .placeholder {
        height: 100%;
        display: grid;
        place-items: center;
        color: var(--muted);
        font-size: 14px;
        padding: 24px;
        text-align: center;
      }
      .meta {
        margin-top: 28px;
        padding: 16px 18px;
        border: 1px solid var(--border);
        border-radius: 16px;
        background: #fff;
        color: var(--muted);
        font-size: 14px;
        line-height: 1.6;
      }
      .gallery {
        margin-top: 24px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }
      .image-tile {
        margin: 0;
        border: 1px solid var(--border);
        border-radius: 18px;
        overflow: hidden;
        min-height: 170px;
        background: #fff;
      }
      .image-tile img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .image-placeholder {
        border: 1px dashed var(--border);
        border-radius: 16px;
        min-height: 170px;
        display: grid;
        place-items: center;
        color: var(--muted);
        background: #fff;
        padding: 16px;
        text-align: center;
      }
      @media (max-width: 860px) {
        .hero { grid-template-columns: 1fr; }
        .gallery { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="hero">
        <div class="panel">
          <h1>${headline}</h1>
          <p class="sub">${safePreview}</p>
          <div class="cta-row">
            <a class="btn btn-primary" href="#contact">Book now</a>
            <a class="btn btn-ghost" href="#proof">See work</a>
          </div>
          <div class="meta">
            <strong>${safeTitle}</strong><br />
            Generated from your latest request and brand images inside Maya chat.
          </div>
        </div>
        <div class="hero-media">
          ${
            heroImage
              ? `<img src="${escapeHtml(heroImage)}" alt="Hero image from user library" />`
              : `<div class="placeholder">No hero image found yet. Upload one in chat and regenerate.</div>`
          }
        </div>
      </section>
      <section class="gallery">${imageGalleryHtml}</section>
    </main>
  </body>
</html>`
}

function buildCalendarHtml(title: string, previewText: string, instruction: string, imageUrls: string[]): string {
  const direction = inferDesignDirection(instruction)
  const safeTitle = escapeHtml(title)
  const safePreview = escapeHtml(previewText)
  const heroImage = imageUrls[0] || ""

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      body { margin: 0; font-family: Inter, sans-serif; background: ${direction.bg}; color: ${direction.text}; }
      .wrap { max-width: 980px; margin: 0 auto; padding: 30px 20px 50px; }
      .card { background: #fff; border: 1px solid ${direction.border}; border-radius: 20px; padding: 20px; }
      h1 { margin: 0 0 8px; font-size: 34px; }
      p { margin: 0 0 18px; color: ${direction.muted}; }
      .hero { width: 100%; border-radius: 14px; margin: 14px 0 20px; max-height: 300px; object-fit: cover; border: 1px solid ${direction.border}; }
      table { width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 14px; border: 1px solid ${direction.border}; }
      th, td { border-bottom: 1px solid ${direction.border}; padding: 12px; text-align: left; vertical-align: top; }
      th { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: ${direction.muted}; background: ${direction.accentSoft}; }
      tr:last-child td { border-bottom: none; }
      .pill { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; border: 1px solid ${direction.border}; }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="card">
        <h1>${safeTitle}</h1>
        <p>${safePreview}</p>
        ${
          heroImage
            ? `<img class="hero" src="${escapeHtml(heroImage)}" alt="Calendar cover image" />`
            : ""
        }
        <table>
          <thead>
            <tr><th>Day</th><th>Post Direction</th><th>CTA</th></tr>
          </thead>
          <tbody>
            <tr><td><span class="pill">Monday</span></td><td>Authority post linked to your current offer.</td><td>Comment "PLAN" for details.</td></tr>
            <tr><td><span class="pill">Wednesday</span></td><td>Behind-the-scenes storytelling and proof.</td><td>Save this for later.</td></tr>
            <tr><td><span class="pill">Friday</span></td><td>Direct invitation with offer framing.</td><td>Send me "START" in DM.</td></tr>
          </tbody>
        </table>
      </section>
    </main>
  </body>
</html>`
}

function buildPdfHtml(title: string, previewText: string, instruction: string, imageUrls: string[]): string {
  const direction = inferDesignDirection(instruction)
  const safeTitle = escapeHtml(title)
  const safePreview = escapeHtml(previewText)
  const coverImage = imageUrls[0] || ""

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      body { margin: 0; background: #f7f7f7; font-family: Inter, sans-serif; color: ${direction.text}; }
      .page { max-width: 900px; margin: 28px auto; padding: 0 16px; }
      .sheet { background: #fff; border: 1px solid ${direction.border}; border-radius: 20px; overflow: hidden; }
      .cover { padding: 28px; background: linear-gradient(140deg, ${direction.accentSoft}, #fff); }
      h1 { margin: 0 0 10px; font-size: 34px; line-height: 1.1; }
      p { margin: 0; color: ${direction.muted}; line-height: 1.6; }
      .cover img { width: 100%; margin-top: 18px; border-radius: 12px; max-height: 280px; object-fit: cover; border: 1px solid ${direction.border}; }
      .content { padding: 26px 28px 30px; }
      .step { margin: 0 0 16px; padding: 14px; border: 1px solid ${direction.border}; border-radius: 12px; }
      .step strong { display: block; margin-bottom: 6px; }
    </style>
  </head>
  <body>
    <main class="page">
      <article class="sheet">
        <section class="cover">
          <h1>${safeTitle}</h1>
          <p>${safePreview}</p>
          ${
            coverImage
              ? `<img src="${escapeHtml(coverImage)}" alt="Workbook cover image" />`
              : ""
          }
        </section>
        <section class="content">
          <div class="step"><strong>Step 1 - Clarify the promise</strong>Define the exact transformation and audience outcome.</div>
          <div class="step"><strong>Step 2 - Build the framework</strong>Break the process into 3-5 actionable sections.</div>
          <div class="step"><strong>Step 3 - Add implementation tasks</strong>Finish each section with checklists and prompts.</div>
        </section>
      </article>
    </main>
  </body>
</html>`
}

function buildPreviewHtmlForAsset(
  assetType: MayaGeneratedAssetType,
  title: string,
  previewText: string,
  instruction: string,
  imageUrls: string[],
): string {
  if (assetType === "calendar") {
    return buildCalendarHtml(title, previewText, instruction, imageUrls)
  }
  if (assetType === "pdf") {
    return buildPdfHtml(title, previewText, instruction, imageUrls)
  }
  return buildLandingPageHtml(title, previewText, instruction, imageUrls)
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
  const imageUrls = await loadUserImageUrls(normalizedUserId)

  const previewHtml = buildPreviewHtmlForAsset(input.assetType, title, previewText, instruction, imageUrls)
  const url = `/maya/asset/${encodeURIComponent(id)}`

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

  try {
    const persistedPage = await persistMayaAssetAsPersonalPage({
      userId: normalizedUserId,
      asset,
    })
    asset.url = persistedPage.liveUrl
  } catch (error) {
    console.error("[Maya Asset] Failed to persist personal page (falling back to draft URL):", error)
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

export async function updateMayaGeneratedAsset(input: {
  userId: string | number
  assetType: MayaGeneratedAssetType
  instruction: string
  assetLabel?: string
  assetId?: string
}): Promise<MayaGeneratedAsset> {
  const normalizedUserId = String(input.userId || "").trim()
  if (!normalizedUserId) {
    throw new Error("Cannot update Maya asset without a user id")
  }

  const editInstruction = sanitizeInstruction(input.instruction)
  if (!editInstruction) {
    throw new Error("Cannot update Maya asset without an edit instruction")
  }

  const existingRows = await sql`
    SELECT memory_data
    FROM maya_personal_memory
    WHERE user_id = ${normalizedUserId}
    LIMIT 1
  `

  const existingMemoryData = ((existingRows[0] as any)?.memory_data as Record<string, unknown> | undefined) ?? {}
  const existingAssets = parseExistingAssets(existingMemoryData.generated_assets)
  const lastGeneratedAssetId =
    typeof (existingMemoryData.last_generated_asset as Record<string, unknown> | undefined)?.id === "string"
      ? ((existingMemoryData.last_generated_asset as Record<string, unknown>).id as string)
      : ""

  const normalizedLabel = sanitizePreviewText(input.assetLabel || "").toLowerCase()
  const normalizedAssetId = typeof input.assetId === "string" ? input.assetId.trim() : ""
  const targetAsset =
    existingAssets.find((asset) => asset.id === normalizedAssetId && asset.assetType === input.assetType) ||
    existingAssets.find((asset) => asset.assetType === input.assetType && asset.id === lastGeneratedAssetId) ||
    existingAssets.find(
      (asset) =>
        asset.assetType === input.assetType &&
        normalizedLabel.length > 0 &&
        asset.title.toLowerCase().includes(normalizedLabel),
    ) ||
    existingAssets.find((asset) => asset.assetType === input.assetType) ||
    null

  if (!targetAsset) {
    return createMayaGeneratedAsset({
      userId: normalizedUserId,
      assetType: input.assetType,
      instruction: editInstruction,
    })
  }

  const nowIso = new Date().toISOString()
  const imageUrls = await loadUserImageUrls(normalizedUserId)
  const mergedInstruction = sanitizeInstruction(
    `${targetAsset.instruction || ""}\nEdit request: ${editInstruction}`.trim(),
  )
  const previewText = sanitizePreviewText(
    `Updated with your latest edit: ${extractPrimaryIntent(editInstruction)}.`,
  )
  const previewHtml = buildPreviewHtmlForAsset(
    targetAsset.assetType,
    targetAsset.title,
    previewText,
    mergedInstruction,
    imageUrls,
  )

  const updatedAsset: MayaGeneratedAsset = {
    ...targetAsset,
    instruction: mergedInstruction,
    previewText,
    previewHtml,
    createdAt: nowIso,
    status: "draft",
  }

  try {
    const persistedPage = await persistMayaAssetAsPersonalPage({
      userId: normalizedUserId,
      asset: updatedAsset,
    })
    updatedAsset.url = persistedPage.liveUrl
  } catch (error) {
    console.error("[Maya Asset] Failed to persist updated personal page:", error)
  }

  const nextAssets = [updatedAsset, ...existingAssets.filter((asset) => asset.id !== targetAsset.id)].slice(0, MAX_STORED_ASSETS)
  const memoryPatch = {
    generated_assets: nextAssets,
    last_generated_asset: updatedAsset,
    generated_assets_updated_at: nowIso,
  }

  await sql`
    INSERT INTO maya_personal_memory (user_id, memory_data, updated_at)
    VALUES (${normalizedUserId}, ${JSON.stringify(memoryPatch)}::jsonb, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET
      memory_data = COALESCE(maya_personal_memory.memory_data, '{}'::jsonb) || ${JSON.stringify(memoryPatch)}::jsonb,
      updated_at = NOW()
  `

  return updatedAsset
}

export async function getMayaGeneratedAsset(
  userId: string | number,
  assetId: string,
): Promise<MayaGeneratedAsset | null> {
  const normalizedUserId = String(userId || "").trim()
  const normalizedAssetId = (assetId || "").trim()
  if (!normalizedUserId || !normalizedAssetId) return null

  const rows = await sql`
    SELECT memory_data
    FROM maya_personal_memory
    WHERE user_id = ${normalizedUserId}
    LIMIT 1
  `

  const memoryData = ((rows[0] as any)?.memory_data as Record<string, unknown> | undefined) ?? {}
  const assets = parseExistingAssets(memoryData.generated_assets)
  return assets.find((asset) => asset.id === normalizedAssetId) || null
}

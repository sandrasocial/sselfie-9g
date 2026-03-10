import { sql } from "@/lib/db/client"
import { persistMayaAssetAsPersonalPage } from "@/lib/maya/personal-pages"
import { mergeMayaMemoryData } from "@/lib/maya/memory-store"
import {
  getDefaultMayaInstagramTrendSignals,
  getLatestMayaInstagramTrendSignals,
  type MayaInstagramTrendSignals,
} from "@/lib/maya/calendar-trends"
import { composeMayaLandingCopy } from "@/lib/maya/page-generation/copy-composer"
import { isMayaPageRendererV2Enabled, STUDIO_CHECKOUT_URL } from "@/lib/maya/page-generation/constants"
import { selectLandingImages } from "@/lib/maya/page-generation/image-selector"
import { renderMayaLandingHtml } from "@/lib/maya/page-generation/render-landing"
import { resolveMayaLandingSnapshot, type MayaLandingSnapshotResolution } from "@/lib/maya/page-generation/snapshot-resolver"
import {
  sanitizeHeadline,
  sanitizePageTitle,
  sanitizePreview,
  sanitizeUserFacingText,
} from "@/lib/maya/page-generation/sanitizers"
import type { MayaLandingPageBlueprint } from "@/lib/maya/page-generation/types"
import { generateInstagramCaption, extractHashtagsFromCaption, limitHashtags } from "@/lib/feed-planner/caption-writer"
import type {
  MayaCalendarAssetPreviewData,
  MayaGeneratedAsset,
  MayaGeneratedAssetPreviewData,
  MayaGeneratedAssetType,
  MayaPageAssetPreviewData,
  MayaPdfAssetPreviewData,
} from "@/lib/maya/generated-asset-types"

export type {
  MayaCalendarAssetPreviewData,
  MayaGeneratedAsset,
  MayaGeneratedAssetPreviewData,
  MayaGeneratedAssetType,
  MayaPageAssetPreviewData,
  MayaPdfAssetPreviewData,
} from "@/lib/maya/generated-asset-types"

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

  return sanitizeUserFacingText(cleaned || instruction, 220)
}

function toHeadline(seed: string): string {
  return sanitizeHeadline(seed)
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
  const shortSeed = sanitizeUserFacingText(seed.split(" ").slice(0, 6).join(" "), 72)
  if (assetType === "calendar") {
    const calendarSeed = shortSeed && !/\?|can you|please/i.test(shortSeed) ? shortSeed : ""
    return sanitizePageTitle("calendar", calendarSeed ? `${calendarSeed} - Instagram Calendar` : "Instagram Content Calendar")
  }
  if (assetType === "pdf") {
    return sanitizePageTitle("pdf", shortSeed ? `Workbook: ${shortSeed}` : "Workbook")
  }
  return sanitizePageTitle("page", shortSeed ? `Landing Page: ${shortSeed}` : "Landing Page")
}

function buildPreviewText(assetType: MayaGeneratedAssetType, instruction: string): string {
  const seed = extractPrimaryIntent(instruction)
  if (assetType === "calendar") {
    return sanitizePreview(`Built an Instagram-ready calendar around ${seed || "your offer"} with hooks, story-led captions, and copy-ready hashtags.`)
  }
  if (assetType === "pdf") {
    return sanitizePreview(`Drafted a workbook outline for: ${seed}. Includes intro, step-by-step framework, and action pages.`)
  }
  return sanitizePreview(`Drafted a landing page structure for: ${seed}. Includes headline, offer, proof, and CTA sections.`)
}

function buildPageFallbackMetadataFromSnapshot(input: {
  instruction: string
  snapshot: MayaLandingSnapshotResolution | null
}): { title: string; previewText: string } | null {
  const snapshot = input.snapshot
  if (!snapshot) return null

  const offer = sanitizeUserFacingText(snapshot.resolvedOffer || "", 72)
  const audience = sanitizeUserFacingText(snapshot.resolvedAudience || "", 96)
  const transformation = sanitizeHeadline(snapshot.resolvedTransformation || "")

  const titleSeed =
    transformation && transformation !== "Build your next offer with Maya"
      ? transformation
      : offer

  if (!titleSeed) return null

  const previewLines = [
    offer ? `Drafted a landing page for ${offer}.` : "Drafted a landing page from your saved Maya offer context.",
    audience ? `Written for ${audience}.` : "",
    transformation && transformation !== "Build your next offer with Maya"
      ? `Centers the promise: ${transformation}.`
      : "Includes a clear promise, proof, and CTA.",
  ].filter(Boolean)

  return {
    title: sanitizePageTitle("page", `Landing Page: ${titleSeed}`),
    previewText: sanitizePreview(previewLines.join(" ")),
  }
}

function buildLandingHeadline(title: string, instruction: string): string {
  const titleSeed = sanitizeUserFacingText(title.replace(/^landing page:\s*/i, ""), 96)
  if (titleSeed && !/^landing page$/i.test(titleSeed)) {
    return toHeadline(titleSeed)
  }

  return toHeadline(extractPrimaryIntent(instruction))
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

function buildLandingPreviewData(input: {
  title: string
  previewText: string
  blueprint?: MayaLandingPageBlueprint
  imageUrls: string[]
}): MayaPageAssetPreviewData {
  const blueprint = input.blueprint
  const heroImageUrl = blueprint?.heroImageUrl || input.imageUrls[0]
  const supportImageUrls = uniqueStrings([
    ...(blueprint?.supportImageUrls || []),
    ...input.imageUrls.slice(heroImageUrl ? 1 : 0, 4),
  ]).slice(0, 3)

  return {
    kind: "page",
    eyebrow: "Maya Page Draft",
    headline: sanitizeHeadline(blueprint?.hook || input.title),
    truth: sanitizeUserFacingText(blueprint?.truth || input.previewText, 220),
    ctaLabel: sanitizeUserFacingText(blueprint?.ctaLabel || "Join Studio", 48),
    heroImageUrl: heroImageUrl || undefined,
    supportImageUrls,
    proofBullets: (blueprint?.proofBullets || [])
      .map((bullet) => sanitizeUserFacingText(bullet, 120))
      .filter(Boolean)
      .slice(0, 3),
  }
}

function buildCalendarPreviewData(input: {
  previewText: string
  posts: MayaCalendarPostPlan[]
}): MayaCalendarAssetPreviewData {
  const now = new Date()
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(now)

  return {
    kind: "calendar",
    monthLabel,
    summary: sanitizeUserFacingText(input.previewText, 180),
    posts: input.posts.slice(0, 9).map((post) => ({
      id: post.id,
      dayLabel: post.dayLabel,
      postType: post.postType,
      hook: sanitizeUserFacingText(post.hook, 90),
      overlay: sanitizeUserFacingText(post.coverOverlay || post.cta || post.hook, 72),
      imageUrl: post.imageUrl,
    })),
  }
}

function buildPdfPreviewData(input: {
  title: string
  instruction: string
}): MayaPdfAssetPreviewData {
  const chapterSeed = sanitizeUserFacingText(extractPrimaryIntent(input.instruction), 160)
  const chapters = uniqueStrings([
    "Define the promise",
    "Build the framework",
    chapterSeed ? `Apply it to ${chapterSeed.toLowerCase()}` : "Add implementation prompts",
  ]).slice(0, 3)

  return {
    kind: "pdf",
    headline: sanitizeHeadline(input.title),
    chapters,
  }
}

interface MayaPageGenerationPayload {
  title: string
  previewText: string
  previewHtml: string
  previewData?: MayaGeneratedAssetPreviewData
  blueprint?: MayaLandingPageBlueprint
}

async function generateLandingPageV2(input: {
  userId: string
  assetId: string
  instruction: string
}): Promise<MayaPageGenerationPayload> {
  const snapshot = await resolveMayaLandingSnapshot(input.userId)
  const images = await selectLandingImages({
    userId: input.userId,
    instruction: input.instruction,
    styleHint: snapshot.resolvedStyle,
    offerHint: snapshot.resolvedOffer,
  })
  const copy = composeMayaLandingCopy({
    instruction: input.instruction,
    snapshot,
    heroImageUrl: images.heroImageUrl,
    supportImageUrls: images.supportImageUrls,
  })
  const render = renderMayaLandingHtml({
    assetId: input.assetId,
    title: copy.title,
    previewText: copy.previewText,
    checkoutUrl: STUDIO_CHECKOUT_URL,
    blueprint: copy.blueprint,
  })

  return {
    title: sanitizePageTitle("page", render.title),
    previewText: sanitizePreview(render.previewText),
    previewHtml: render.html,
    previewData: buildLandingPreviewData({
      title: render.title,
      previewText: render.previewText,
      blueprint: copy.blueprint,
      imageUrls: [images.heroImageUrl, ...images.supportImageUrls].filter(Boolean),
    }),
    blueprint: copy.blueprint,
  }
}

async function generateCalendarAsset(input: {
  userId: string
  assetId: string
  instruction: string
}): Promise<MayaPageGenerationPayload> {
  const [snapshot, imageUrls, trendSignals] = await Promise.all([
    resolveMayaLandingSnapshot(input.userId),
    loadUserImageUrls(input.userId),
    getLatestMayaInstagramTrendSignals(),
  ])

  const fallbackIntent = sanitizeUserFacingText(extractPrimaryIntent(input.instruction), 120)
  const fallbackOffer =
    fallbackIntent && !/\b(could|can you|please|amazing maya|help me)\b/i.test(fallbackIntent)
      ? fallbackIntent
      : "signature offer"
  const offer = normalizeCalendarContextValue(snapshot.resolvedOffer || fallbackOffer, "signature offer", {
    maxLength: 84,
    maxWords: 7,
  })
  const audience = normalizeCalendarContextValue(snapshot.resolvedAudience, "your ideal audience", {
    maxLength: 84,
    maxWords: 8,
  })
  const transformation = normalizeCalendarContextValue(
    snapshot.resolvedTransformation,
    "a clear transformation outcome",
    {
      maxLength: 96,
      maxWords: 10,
    },
  )
  const style = normalizeCalendarContextValue(snapshot.resolvedStyle, "minimal refined", {
    maxLength: 64,
    maxWords: 5,
  })
  const title =
    offer === "signature offer"
      ? sanitizePageTitle("calendar", "Instagram Content Calendar")
      : sanitizePageTitle("calendar", `${offer} - Instagram Calendar`)
  const previewText = sanitizePreview(
    `9-post IG calendar for ${offer}. Story-led hooks, copy-ready captions, and hashtag sets tuned for ${audience}.`,
  )
  const posts = buildCalendarPosts({
    instruction: `${input.instruction} Style: ${style}`,
    imageUrls,
    trendSignals,
    offer,
    audience,
    transformation,
  })
  const postsWithStoryCaptions = await enrichCalendarPostsWithCaptions({
    posts,
    offer,
    audience,
    transformation,
    trendSignals,
    brandProfile: snapshot.brandProfile || {},
  })
  const previewHtml = buildCalendarHtml({
    title,
    previewText,
    instruction: input.instruction,
    imageUrls,
    posts: postsWithStoryCaptions,
    trendSignals,
  })

  return {
    title,
    previewText,
    previewHtml,
    previewData: buildCalendarPreviewData({
      previewText,
      posts: postsWithStoryCaptions,
    }),
  }
}

function buildLandingPageHtml(
  assetId: string,
  title: string,
  previewText: string,
  instruction: string,
  imageUrls: string[],
): string {
  const direction = inferDesignDirection(instruction)
  const headline = escapeHtml(buildLandingHeadline(title, instruction))
  const safeTitle = escapeHtml(title)
  const safePreview = escapeHtml(previewText)
  const heroImage = imageUrls[0] || ""
  const imageTiles = imageUrls.slice(1, 5)
  const safeCheckoutUrl = escapeHtml(STUDIO_CHECKOUT_URL)
  const safeAssetId = escapeHtml(assetId)

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
      .lead-section {
        margin-top: 24px;
      }
      .lead-card {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 22px;
      }
      .lead-grid {
        margin-top: 14px;
        display: grid;
        grid-template-columns: 1fr 1fr auto;
        gap: 10px;
      }
      .field {
        width: 100%;
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 11px 12px;
        font-size: 14px;
      }
      .lead-btn {
        border: 1px solid var(--accent);
        border-radius: 12px;
        background: var(--accent);
        color: #fff;
        padding: 11px 16px;
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
      }
      .lead-status {
        margin-top: 10px;
        color: var(--muted);
        font-size: 13px;
        min-height: 18px;
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
        .lead-grid { grid-template-columns: 1fr; }
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
            <a class="btn btn-primary js-checkout-btn" href="${safeCheckoutUrl}" target="_blank" rel="noreferrer">Join Studio</a>
            <a class="btn btn-ghost" href="#lead-form">Get the offer guide</a>
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
      <section class="lead-section" id="lead-form">
        <div class="lead-card">
          <h2 style="margin:0 0 8px; font-size:22px;">Want Maya to send this offer sequence?</h2>
          <p style="margin:0; color:var(--muted); line-height:1.5;">Drop your email and continue directly to Studio checkout.</p>
          <form id="maya-lead-form" class="lead-grid">
            <input class="field" type="text" name="name" placeholder="First name" maxlength="120" />
            <input class="field" type="email" name="email" placeholder="Email address" required />
            <button class="lead-btn" type="submit">Continue</button>
          </form>
          <p class="lead-status" id="maya-lead-status"></p>
        </div>
      </section>
    </main>
    <script>
      (function () {
        const pageId = ${JSON.stringify(safeAssetId)}
        const checkoutUrl = ${JSON.stringify(STUDIO_CHECKOUT_URL)}
        const leadForm = document.getElementById("maya-lead-form")
        const leadStatus = document.getElementById("maya-lead-status")
        const checkoutButton = document.querySelector(".js-checkout-btn")

        const track = (event, properties) => {
          const payload = {
            event,
            path: window.location.pathname,
            properties: properties || {},
          }
          if (navigator.sendBeacon) {
            try {
              const blob = new Blob([JSON.stringify(payload)], { type: "application/json" })
              navigator.sendBeacon("/api/analytics/event", blob)
              return
            } catch {}
          }
          fetch("/api/analytics/event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true,
          }).catch(() => {})
        }

        track("maya_public_page_view", { pageId })

        if (checkoutButton) {
          checkoutButton.addEventListener("click", function () {
            track("maya_public_page_checkout_clicked", { pageId, placement: "hero" })
          })
        }

        if (!leadForm) return

        leadForm.addEventListener("submit", async function (event) {
          event.preventDefault()
          const formData = new FormData(leadForm)
          const payload = {
            pageId,
            name: formData.get("name"),
            email: formData.get("email"),
            source: "landing_page_form",
          }

          if (leadStatus) leadStatus.textContent = "Saving your details..."

          try {
            const response = await fetch("/api/maya/public/lead", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })

            if (!response.ok) {
              throw new Error("Could not save your details")
            }

            track("maya_public_page_lead_captured", { pageId, placement: "form" })
            if (leadStatus) leadStatus.textContent = "Perfect. Redirecting you to Studio checkout..."
            window.setTimeout(() => {
              window.location.href = checkoutUrl
            }, 500)
          } catch (error) {
            if (leadStatus) leadStatus.textContent = "Please try again, or use the Studio button above."
          }
        })
      })()
    </script>
  </body>
</html>`
}

type CalendarPostType = "Reel" | "Carousel" | "Post"

interface MayaCalendarCarouselSlide {
  id: string
  overlay: string
  direction: string
}

interface MayaCalendarPostPlan {
  id: string
  dayLabel: string
  postType: CalendarPostType
  hook: string
  direction: string
  cta: string
  caption: string
  hashtags: string
  coverOverlay: string
  carouselSlides: MayaCalendarCarouselSlide[]
  imageUrl?: string
}

interface MayaCalendarRenderInput {
  title: string
  previewText: string
  instruction: string
  imageUrls: string[]
  posts: MayaCalendarPostPlan[]
  trendSignals: MayaInstagramTrendSignals
}

const CALENDAR_DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Bonus A", "Bonus B"]
const CALENDAR_POST_TYPES: CalendarPostType[] = ["Reel", "Carousel", "Post", "Reel", "Carousel", "Post", "Reel", "Carousel", "Post"]
const CALENDAR_FALLBACK_IMAGES = [
  "/assets/brand-strategy/pillar1.png",
  "/assets/brand-strategy/pillar2.png",
  "/assets/brand-strategy/journals.png",
  "/assets/brand-strategy/flowers.png",
  "/assets/brand-strategy/ocean.png",
]
const CALENDAR_CONTEXT_STOPWORDS = new Set([
  "create",
  "build",
  "generate",
  "draft",
  "calendar",
  "content",
  "instagram",
  "landing",
  "page",
  "could",
  "can",
  "you",
  "please",
  "help",
  "maya",
  "amazing",
  "this",
  "that",
  "with",
  "for",
  "and",
  "the",
])

function keywordToHashtag(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
  if (!normalized) return ""
  return `#${normalized.replace(/\s+/g, "")}`
}

function normalizeCalendarContextValue(
  value: string,
  fallback: string,
  options: {
    maxLength?: number
    maxWords?: number
  } = {},
): string {
  const maxLength = options.maxLength ?? 96
  const maxWords = options.maxWords ?? 8
  const cleaned = sanitizeUserFacingText(value || "", maxLength)
    .replace(/\b(could you|can you|please|help me|amazing maya)\b/gi, " ")
    .replace(/\b(create|build|generate|draft)\b/gi, " ")
    .replace(/\b(content calendar|instagram calendar|landing page)\b/gi, " ")
    .replace(/[?]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!cleaned) return fallback

  const tokens = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !CALENDAR_CONTEXT_STOPWORDS.has(token.toLowerCase()))
    .slice(0, maxWords)

  if (tokens.length < 2) return fallback
  return sanitizeUserFacingText(tokens.join(" "), maxLength) || fallback
}

function extractContextKeywords(value: string): string[] {
  return sanitizeUserFacingText(value || "", 180)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .filter((token) => !CALENDAR_CONTEXT_STOPWORDS.has(token))
}

function buildKeywordPool(input: { instruction: string; offer: string; audience: string; transformation: string }): string[] {
  const tokens = [
    ...extractContextKeywords(input.offer),
    ...extractContextKeywords(input.audience),
    ...extractContextKeywords(input.transformation),
    ...extractContextKeywords(input.instruction),
  ]

  const deduped: string[] = []
  const seen = new Set<string>()
  for (const token of tokens) {
    if (seen.has(token)) continue
    seen.add(token)
    deduped.push(token)
    if (deduped.length >= 10) break
  }

  return deduped
}

function buildHashtagSet(baseSeed: string, keywords: string[]): string {
  const seedHashtags = uniqueStrings((baseSeed.match(/#[a-z0-9_]+/gi) || []).map((tag) => tag.toLowerCase()))
  const keywordHashtags = uniqueStrings(keywords.map(keywordToHashtag).filter(Boolean))
  const combined = uniqueStrings([...seedHashtags, ...keywordHashtags]).slice(0, 5)

  if (combined.length === 0) {
    return "#personalbrand #contentstrategy #instagramtips #storytelling #creatorbusiness"
  }

  return combined.join(" ")
}

function composeCaption(input: {
  hook: string
  direction: string
  cta: string
  hashtags: string
}): string {
  const lines = [
    sanitizeUserFacingText(input.hook, 120),
    "",
    sanitizeUserFacingText(input.direction, 200),
    sanitizeUserFacingText(input.cta, 120),
    "",
    sanitizeUserFacingText(input.hashtags, 180),
  ].filter(Boolean)

  return lines.join("\n")
}

function buildCarouselSlides(input: {
  postId: string
  hook: string
  direction: string
  cta: string
}): MayaCalendarCarouselSlide[] {
  const educationalLine = sanitizeUserFacingText(input.direction, 64)
    .replace(/^Tell\s+/i, "")
    .replace(/^Share\s+/i, "")
    .replace(/^Break down\s+/i, "")
    .replace(/^Use\s+/i, "")
    .trim()

  return [
    {
      id: `${input.postId}-slide-1`,
      overlay: sanitizeUserFacingText(input.hook, 48),
      direction: "Slide 01 - Hook",
    },
    {
      id: `${input.postId}-slide-2`,
      overlay: sanitizeUserFacingText(educationalLine || input.direction, 52),
      direction: "Slide 02 - Value",
    },
    {
      id: `${input.postId}-slide-3`,
      overlay: sanitizeUserFacingText(input.cta, 52),
      direction: "Slide 03 - CTA",
    },
  ]
}

function buildCalendarPosts(input: {
  instruction: string
  imageUrls: string[]
  trendSignals: MayaInstagramTrendSignals
  offer: string
  audience: string
  transformation: string
}): MayaCalendarPostPlan[] {
  const hooks = input.trendSignals.hookPatterns.length > 0 ? input.trendSignals.hookPatterns : ["Start with one clear hook."]
  const ctas = input.trendSignals.ctaPatterns.length > 0 ? input.trendSignals.ctaPatterns : ["Save this for your next post."]
  const hashtagSeeds = input.trendSignals.hashtagSets.length > 0 ? input.trendSignals.hashtagSets : ["#contentstrategy #personalbrand #instagramtips"]
  const keywords = buildKeywordPool({
    instruction: input.instruction,
    offer: input.offer,
    audience: input.audience,
    transformation: input.transformation,
  })

  const storyDirections = [
    `Tell a real moment where ${input.audience} felt stuck before finding your approach.`,
    `Break down a 3-step framework you use to create ${input.transformation}.`,
    `Share a single client-style win and what made it work.`,
    `Show your process behind one result from ${input.offer}.`,
    `Post a myth-vs-truth carousel about the mistake your audience keeps repeating.`,
    `Share a calm behind-the-scenes day to humanize your brand.`,
    `Teach one repeatable tactic people can use today.`,
    `Use a before/after narrative that highlights emotional change, not just numbers.`,
    `Close the week with a direct invitation into your offer with confidence.`,
  ]

  const posts: MayaCalendarPostPlan[] = []

  for (let index = 0; index < 9; index += 1) {
    const dayLabel = CALENDAR_DAY_LABELS[index] || `Day ${index + 1}`
    const postType = CALENDAR_POST_TYPES[index] || "Post"
    const hook = sanitizeHeadline(hooks[index % hooks.length] || hooks[0])
    const cta = sanitizeUserFacingText(ctas[index % ctas.length] || ctas[0], 120)
    const direction = sanitizeUserFacingText(storyDirections[index] || storyDirections[0], 220)
    const baseHashtagSet = sanitizeUserFacingText(hashtagSeeds[index % hashtagSeeds.length] || hashtagSeeds[0], 180)
    const hashtags = sanitizeUserFacingText(
      buildHashtagSet(baseHashtagSet, keywords.slice(index % 3, (index % 3) + 4)),
      200,
    )
    const postId = `post-${index + 1}`
    const carouselSlides =
      postType === "Carousel"
        ? buildCarouselSlides({
            postId,
            hook,
            direction,
            cta,
          })
        : []
    const caption = composeCaption({
      hook,
      direction,
      cta,
      hashtags,
    })

    posts.push({
      id: postId,
      dayLabel,
      postType,
      hook,
      direction,
      cta,
      caption,
      hashtags,
      coverOverlay: postType === "Carousel" ? carouselSlides[0]?.overlay || hook : hook,
      carouselSlides,
      imageUrl: input.imageUrls[index % Math.max(1, input.imageUrls.length)] || undefined,
    })
  }

  return posts
}

function getCalendarCaptionType(position: number): "story" | "value" | "motivational" {
  const pattern: Array<"story" | "value" | "motivational"> = [
    "story",
    "value",
    "motivational",
    "story",
    "value",
    "motivational",
    "story",
    "value",
    "motivational",
  ]
  return pattern[position - 1] || "story"
}

function parseCalendarHashtagSeeds(trendSignals: MayaInstagramTrendSignals): string[] {
  const parsed = trendSignals.hashtagSets.flatMap((set) =>
    String(set || "")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.startsWith("#")),
  )
  return limitHashtags(parsed, 5).map((tag) => `#${tag}`)
}

function parseCalendarContentPillars(brandProfile: Record<string, unknown>): any[] {
  const raw = brandProfile?.content_pillars
  if (!raw) return []
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as { pillars?: unknown[] }).pillars)) {
      return (parsed as { pillars: unknown[] }).pillars
    }
  } catch {
    return []
  }
  return []
}

async function enrichCalendarPostsWithCaptions(input: {
  posts: MayaCalendarPostPlan[]
  offer: string
  audience: string
  transformation: string
  trendSignals: MayaInstagramTrendSignals
  brandProfile: Record<string, unknown>
}): Promise<MayaCalendarPostPlan[]> {
  const trendHashtags = parseCalendarHashtagSeeds(input.trendSignals)
  const previousCaptions: Array<{ position: number; caption: string }> = []
  const contentPillars = parseCalendarContentPillars(input.brandProfile)
  const brandVoice =
    String(input.brandProfile?.brand_voice || input.brandProfile?.brand_vibe || "authentic").trim() || "authentic"

  const enrichedPosts: MayaCalendarPostPlan[] = []

  for (const post of input.posts) {
    const captionType = getCalendarCaptionType(Number(post.id.replace("post-", "")))
    const fallbackCaption = post.caption
    const fallbackHashtags = post.hashtags

    try {
      const generated = await generateInstagramCaption({
        postPosition: Number(post.id.replace("post-", "")),
        shotType: post.postType.toLowerCase(),
        purpose: `${input.offer} ${post.postType}`,
        emotionalTone: captionType === "motivational" ? "inspiring" : captionType === "value" ? "helpful" : "warm",
        brandProfile: input.brandProfile,
        targetAudience: input.audience,
        brandVoice,
        contentPillar: post.postType,
        hookConcept: post.hook,
        storyConcept: post.direction,
        ctaConcept: post.cta,
        hashtags: trendHashtags,
        previousCaptions,
        researchData: {
          research_summary: input.trendSignals.formatNotes.join(" "),
          best_hooks: input.trendSignals.hookPatterns.slice(0, 6),
          trending_hashtags: trendHashtags,
        },
        captionType,
        contentPillars,
      })

      const nextCaption = String(generated.caption || "").trim() || fallbackCaption
      const hashtags = limitHashtags(extractHashtagsFromCaption(nextCaption), 5)
      const hashtagString = hashtags.length > 0 ? hashtags.map((tag) => `#${tag}`).join(" ") : fallbackHashtags
      const captionWithHashtags = hashtags.length > 0
        ? nextCaption.replace(/\s*(#[a-zA-Z0-9_]+\s*)+$/g, "").trim() + `\n\n${hashtagString}`
        : nextCaption

      enrichedPosts.push({
        ...post,
        caption: captionWithHashtags,
        hashtags: hashtagString,
      })

      previousCaptions.push({
        position: Number(post.id.replace("post-", "")),
        caption: captionWithHashtags,
      })
    } catch (error) {
      console.error("[Maya Calendar] Caption generation failed, using fallback:", error)
      enrichedPosts.push({
        ...post,
        caption: fallbackCaption,
        hashtags: fallbackHashtags,
      })
      previousCaptions.push({
        position: Number(post.id.replace("post-", "")),
        caption: fallbackCaption,
      })
    }
  }

  return enrichedPosts
}

function buildCalendarHtml(input: MayaCalendarRenderInput): string {
  const safeTitle = escapeHtml(input.title)
  const safePreview = escapeHtml(input.previewText)
  const heroImage = input.imageUrls[0] || CALENDAR_FALLBACK_IMAGES[0]
  const trendNotesHtml = input.trendSignals.formatNotes
    .slice(0, 5)
    .map((note) => `<li>${escapeHtml(note)}</li>`)
    .join("")

  const feedGridHtml = input.posts
    .map((post) => {
      const tileImage = post.imageUrl || CALENDAR_FALLBACK_IMAGES[(Number(post.id.replace("post-", "")) - 1) % CALENDAR_FALLBACK_IMAGES.length]
      const overlayText = post.postType === "Carousel" ? post.coverOverlay : ""
      return `
        <a class="feed-tile" href="#${escapeHtml(post.id)}">
          <img src="${escapeHtml(tileImage)}" alt="${escapeHtml(post.dayLabel)} ${escapeHtml(post.postType)}" loading="lazy" />
          <div class="feed-tile-overlay"></div>
          <div class="feed-tile-meta">
            <span>${escapeHtml(post.dayLabel)}</span>
            <span>${escapeHtml(post.postType)}</span>
          </div>
          ${
            overlayText
              ? `<div class="feed-overlay-copy">${escapeHtml(overlayText)}</div>`
              : ""
          }
        </a>
      `
    })
    .join("")

  const cardsHtml = input.posts
    .map((post) => {
      const captionId = `caption-${post.id}`
      const captionPreviewId = `caption-preview-${post.id}`
      const mediaImage = post.imageUrl || CALENDAR_FALLBACK_IMAGES[(Number(post.id.replace("post-", "")) - 1) % CALENDAR_FALLBACK_IMAGES.length]
      const carouselSlidesHtml =
        post.carouselSlides.length > 0
          ? `
            <div class="carousel-preview">
              ${post.carouselSlides
                .map(
                  (slide) => `
                    <div class="carousel-slide">
                      <div class="carousel-slide-label">${escapeHtml(slide.direction)}</div>
                      <div class="carousel-slide-copy">${escapeHtml(slide.overlay)}</div>
                    </div>
                  `,
                )
                .join("")}
            </div>
          `
          : ""

      return `
        <article class="post-card" id="${escapeHtml(post.id)}">
          <div class="post-header">
            <div class="post-profile">
              <span class="profile-dot">S</span>
              <div class="profile-meta">
                <p class="profile-name">sselfie</p>
                <p class="profile-sub">${escapeHtml(post.postType)}</p>
              </div>
            </div>
            <button class="menu-pill" type="button">MENU</button>
          </div>
          <div class="post-media">
            <img src="${escapeHtml(mediaImage)}" alt="${escapeHtml(post.postType)} concept image" loading="lazy" />
            <div class="post-media-dim"></div>
            <div class="post-meta">
              <span class="post-pill">${escapeHtml(post.dayLabel)}</span>
              <span class="post-pill post-pill-type">${escapeHtml(post.postType)}</span>
            </div>
            ${
              post.postType === "Carousel"
                ? `<div class="overlay-pill">
                     <div class="overlay-label">TEXT OVERLAY</div>
                     <div class="overlay-copy">${escapeHtml(post.coverOverlay)}</div>
                   </div>`
                : ""
            }
          </div>
          <div class="post-body">
            <div class="post-hook">${escapeHtml(post.hook)}</div>
            <p class="post-direction">${escapeHtml(post.direction)}</p>
            <p class="post-cta">${escapeHtml(post.cta)}</p>
            ${carouselSlidesHtml}
            <div class="caption-block">
              <p class="caption-preview is-collapsed" id="${escapeHtml(captionPreviewId)}">
                <span class="caption-author">sselfie</span>
                <span>${escapeHtml(post.caption)}</span>
              </p>
              <button
                class="caption-toggle"
                type="button"
                data-caption-toggle
                data-target="${escapeHtml(captionPreviewId)}"
                data-expanded="false"
                aria-expanded="false"
              >
                Read full caption
              </button>
            </div>
            <div class="hashtag-row">${escapeHtml(post.hashtags)}</div>
            <textarea id="${escapeHtml(captionId)}" class="caption-copy-source">${escapeHtml(post.caption)}</textarea>
            <button class="copy-btn" data-copy-target="${escapeHtml(captionId)}">Copy Caption</button>
          </div>
        </article>
      `
    })
    .join("")

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      :root {
        --obsidian: #0a0a0a;
        --porcelain: #ffffff;
        --pearl: #f5f5f5;
        --smoke: #666666;
        --whisper: #e5e5e5;
        --bg-base: #0b0d10;
        --glass-1: rgba(255, 255, 255, 0.04);
        --glass-2: rgba(255, 255, 255, 0.07);
        --glass-3: rgba(255, 255, 255, 0.1);
        --glass-4: rgba(255, 255, 255, 0.14);
        --border-faint: rgba(255, 255, 255, 0.07);
        --border-subtle: rgba(255, 255, 255, 0.12);
        --border-medium: rgba(255, 255, 255, 0.18);
        --text-1: #ffffff;
        --text-2: rgba(255, 255, 255, 0.75);
        --text-3: rgba(255, 255, 255, 0.5);
        --text-4: rgba(255, 255, 255, 0.3);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: var(--text-1);
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at 12% 0%, rgba(255, 255, 255, 0.08), transparent 46%),
          radial-gradient(circle at 88% 10%, rgba(255, 255, 255, 0.05), transparent 44%),
          var(--bg-base);
      }
      .wrap {
        max-width: 1240px;
        margin: 0 auto;
        padding: 24px 20px 48px;
      }
      .site-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        border-bottom: 1px solid var(--border-subtle);
        background: rgba(10, 10, 10, 0.9);
        backdrop-filter: blur(20px);
        position: sticky;
        top: 0;
        z-index: 30;
        padding: 16px clamp(16px, 4vw, 48px);
      }
      .logo {
        font-family: "Cormorant Garamond", Georgia, serif;
        font-size: 20px;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        color: var(--text-1);
      }
      .header-label {
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.5em;
        text-transform: uppercase;
        color: var(--text-4);
      }
      .hero-fullbleed {
        position: relative;
        min-height: min(86vh, 760px);
        display: flex;
        align-items: flex-end;
        padding: clamp(22px, 5vw, 56px);
        overflow: hidden;
        border-bottom: 1px solid var(--border-subtle);
        margin-bottom: 6px;
      }
      .hero-bg {
        position: absolute;
        inset: 0;
      }
      .hero-bg img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center 30%;
        filter: brightness(0.58);
      }
      .hero-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          to bottom,
          rgba(10, 10, 10, 0.18) 0%,
          rgba(10, 10, 10, 0.05) 40%,
          rgba(10, 10, 10, 0.74) 76%,
          rgba(10, 10, 10, 1) 100%
        );
      }
      .hero-content {
        position: relative;
        z-index: 2;
        width: min(100%, 980px);
      }
      .hero-eyebrow {
        margin: 0 0 14px;
        color: var(--text-4);
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.5em;
        text-transform: uppercase;
      }
      .hero-title {
        margin: 0 0 10px;
        font-family: "Cormorant Garamond", Georgia, serif;
        text-transform: uppercase;
        font-weight: 300;
        font-size: clamp(42px, 7vw, 94px);
        line-height: 1.04;
        letter-spacing: -0.01em;
      }
      .hero-preview {
        margin: 0;
        color: var(--text-2);
        font-weight: 300;
        line-height: 1.8;
        font-size: clamp(14px, 1.65vw, 20px);
        max-width: 760px;
      }
      .hero-meta {
        margin-top: 28px;
        padding-top: 20px;
        border-top: 1px solid var(--border-subtle);
        display: flex;
        gap: 14px;
        flex-wrap: wrap;
      }
      .hero-meta span {
        border: 1px solid var(--border-medium);
        border-radius: 999px;
        padding: 6px 12px;
        font-size: 10px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.24em;
        color: var(--text-2);
        background: rgba(10, 10, 10, 0.5);
      }
      .section {
        margin-top: 18px;
        border: 1px solid var(--border-subtle);
        border-radius: 14px;
        background: var(--glass-2);
        backdrop-filter: blur(20px);
        overflow: hidden;
      }
      .section-label {
        margin: 0;
        padding: 16px 18px;
        border-bottom: 1px solid var(--border-faint);
        color: var(--text-4);
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.5em;
        text-transform: uppercase;
      }
      .trend-notes {
        padding: 14px 18px 16px;
      }
      .trend-notes ul {
        margin: 0;
        padding-left: 18px;
        color: var(--text-2);
        line-height: 1.7;
        font-size: 14px;
        font-weight: 300;
      }
      .feed-grid {
        padding: 12px;
        display: grid;
        gap: 1px;
        background: var(--border-faint);
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .feed-tile {
        position: relative;
        aspect-ratio: 1 / 1;
        overflow: hidden;
        background: var(--obsidian);
        text-decoration: none;
      }
      .feed-tile img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .feed-tile-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(to top, rgba(10, 10, 10, 0.84), rgba(10, 10, 10, 0.15) 56%, rgba(10, 10, 10, 0.08));
      }
      .feed-tile-meta {
        position: absolute;
        left: 8px;
        right: 8px;
        bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
      }
      .feed-tile-meta span {
        border: 1px solid var(--border-medium);
        border-radius: 999px;
        background: var(--glass-3);
        color: var(--text-1);
        font-size: 9px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        padding: 5px 8px;
      }
      .feed-overlay-copy {
        position: absolute;
        left: 8px;
        right: 8px;
        top: 8px;
        border: 1px solid var(--border-medium);
        border-radius: 8px;
        background: rgba(10, 10, 10, 0.72);
        color: var(--text-1);
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.04em;
        line-height: 1.35;
        padding: 7px 8px;
      }
      .cards-grid {
        margin-top: 18px;
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .post-card {
        border-radius: 16px;
        border: 1px solid var(--border-subtle);
        background: var(--glass-2);
        backdrop-filter: blur(20px);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        min-height: 460px;
      }
      .post-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 12px 14px;
        border-bottom: 1px solid var(--border-faint);
      }
      .post-profile {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .profile-dot {
        width: 28px;
        height: 28px;
        border-radius: 999px;
        border: 1px solid var(--border-medium);
        background: var(--glass-3);
        color: var(--text-1);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 500;
      }
      .profile-meta {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .profile-name {
        margin: 0;
        font-size: 14px;
        font-weight: 500;
        color: var(--text-1);
      }
      .profile-sub {
        margin: 0;
        font-size: 12px;
        font-weight: 300;
        color: var(--text-3);
      }
      .menu-pill {
        border: 1px solid var(--border-medium);
        border-radius: 999px;
        background: var(--glass-2);
        color: var(--text-2);
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        padding: 7px 11px;
      }
      .post-media {
        position: relative;
        height: 250px;
        background: var(--glass-2);
      }
      .post-media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .post-media-dim {
        position: absolute;
        inset: 0;
        background: linear-gradient(to top, rgba(10, 10, 10, 0.85), rgba(10, 10, 10, 0.2) 55%, rgba(10, 10, 10, 0));
      }
      .post-meta {
        position: absolute;
        left: 10px;
        right: 10px;
        bottom: 10px;
        display: flex;
        justify-content: space-between;
        gap: 8px;
      }
      .post-pill {
        border-radius: 999px;
        border: 1px solid var(--border-medium);
        background: var(--glass-4);
        color: var(--text-1);
        font-size: 10px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        padding: 5px 9px;
      }
      .post-pill-type {
        color: var(--text-2);
      }
      .overlay-pill {
        position: absolute;
        left: 10px;
        right: 10px;
        top: 10px;
        border: 1px solid var(--border-medium);
        border-radius: 10px;
        background: rgba(10, 10, 10, 0.74);
        padding: 8px;
      }
      .overlay-label {
        font-size: 9px;
        font-weight: 500;
        letter-spacing: 0.25em;
        text-transform: uppercase;
        color: var(--text-4);
      }
      .overlay-copy {
        margin-top: 4px;
        color: var(--text-1);
        font-size: 12px;
        font-weight: 500;
        line-height: 1.35;
      }
      .post-body {
        display: flex;
        flex-direction: column;
        padding: 14px 14px 16px;
        gap: 10px;
      }
      .post-hook {
        font-family: "Cormorant Garamond", Georgia, serif;
        text-transform: uppercase;
        font-size: 28px;
        line-height: 1.08;
        letter-spacing: -0.01em;
        color: var(--text-1);
        font-weight: 300;
      }
      .post-direction {
        margin: 0;
        color: var(--text-2);
        font-size: 14px;
        font-weight: 300;
        line-height: 1.8;
      }
      .post-cta {
        margin: 0;
        color: var(--text-2);
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        line-height: 1.35;
      }
      .carousel-preview {
        display: grid;
        gap: 6px;
      }
      .carousel-slide {
        border: 1px solid var(--border-faint);
        border-radius: 8px;
        background: var(--glass-1);
        padding: 7px 9px;
      }
      .carousel-slide-label {
        font-size: 9px;
        font-weight: 500;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--text-4);
      }
      .carousel-slide-copy {
        margin-top: 3px;
        font-size: 12px;
        font-weight: 300;
        line-height: 1.5;
        color: var(--text-2);
      }
      .caption-block {
        border: 1px solid var(--border-faint);
        border-radius: 10px;
        background: var(--glass-1);
        padding: 8px 9px;
      }
      .caption-preview {
        margin: 0;
        color: var(--text-2);
        font-size: 12px;
        font-weight: 300;
        line-height: 1.55;
      }
      .caption-preview.is-collapsed {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
        overflow: hidden;
      }
      .caption-author {
        color: var(--text-1);
        font-weight: 500;
        margin-right: 6px;
      }
      .caption-toggle {
        margin-top: 8px;
        border: 0;
        background: transparent;
        color: var(--text-3);
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        padding: 0;
        cursor: pointer;
      }
      .caption-toggle:hover {
        color: var(--text-1);
      }
      .hashtag-row {
        font-size: 11px;
        color: var(--text-3);
        line-height: 1.5;
      }
      .caption-copy-source {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }
      .copy-btn {
        margin-top: auto;
        border: 1px solid var(--border-medium);
        border-radius: 10px;
        background: var(--glass-2);
        color: var(--text-1);
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        padding: 10px 10px;
        cursor: pointer;
      }
      .copy-btn:hover {
        background: var(--glass-3);
      }
      @media (max-width: 1024px) {
        .cards-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .hero-fullbleed { min-height: min(72vh, 620px); }
      }
      @media (max-width: 640px) {
        .wrap { padding: 14px 10px 24px; }
        .site-header { padding: 12px 14px; }
        .logo { font-size: 18px; letter-spacing: 0.16em; }
        .header-label { display: none; }
        .hero-fullbleed { min-height: min(68vh, 520px); padding: 20px 14px; }
        .hero-title { font-size: clamp(34px, 11vw, 56px); }
        .hero-preview { font-size: 14px; line-height: 1.7; }
        .hero-meta { margin-top: 20px; padding-top: 14px; gap: 8px; }
        .hero-meta span { letter-spacing: 0.14em; }
        .section-label { padding: 12px 14px; letter-spacing: 0.38em; }
        .trend-notes { padding: 12px 14px 14px; }
        .feed-grid { padding: 8px; }
        .cards-grid { grid-template-columns: 1fr; gap: 12px; }
      }
    </style>
  </head>
  <body>
    <header class="site-header">
      <div class="logo">SSELFIE</div>
      <div class="header-label">INSTAGRAM CALENDAR</div>
    </header>
    <section class="hero-fullbleed">
      <div class="hero-bg">
        <img src="${escapeHtml(heroImage)}" alt="Calendar hero image" />
      </div>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <p class="hero-eyebrow">CREATED INSIDE MAYA</p>
        <h1 class="hero-title">${safeTitle}</h1>
        <p class="hero-preview">${safePreview}</p>
        <div class="hero-meta">
          <span>9 posts planned</span>
          <span>Hooks ready</span>
          <span>Captions copy-ready</span>
          <span>IG mix: reels + carousels + post</span>
        </div>
      </div>
    </section>
    <main class="wrap">
      <section class="section">
        <p class="section-label">01 — CURRENT INSTAGRAM DIRECTION</p>
        <div class="trend-notes">
          <ul>${trendNotesHtml}</ul>
        </div>
      </section>
      <section class="section">
        <p class="section-label">02 — FEED GRID PREVIEW</p>
        <div class="feed-grid">${feedGridHtml}</div>
      </section>
      <section class="cards-grid">${cardsHtml}</section>
    </main>
    <script>
      (function () {
        const copyButtons = Array.from(document.querySelectorAll(".copy-btn"))
        copyButtons.forEach((button) => {
          button.addEventListener("click", async () => {
            const id = button.getAttribute("data-copy-target")
            const target = id ? document.getElementById(id) : null
            if (!target) return
            const value = target.textContent || ""
            try {
              await navigator.clipboard.writeText(value)
              button.textContent = "Copied"
              setTimeout(() => {
                button.textContent = "Copy Caption"
              }, 1200)
            } catch {
              button.textContent = "Copy Failed"
              setTimeout(() => {
                button.textContent = "Copy Caption"
              }, 1200)
            }
          })
        })

        const captionToggles = Array.from(document.querySelectorAll("[data-caption-toggle]"))
        captionToggles.forEach((button) => {
          button.addEventListener("click", () => {
            const targetId = button.getAttribute("data-target")
            const target = targetId ? document.getElementById(targetId) : null
            if (!target) return

            const expanded = button.getAttribute("data-expanded") === "true"
            if (expanded) {
              target.classList.add("is-collapsed")
              button.setAttribute("data-expanded", "false")
              button.setAttribute("aria-expanded", "false")
              button.textContent = "Read full caption"
              return
            }

            target.classList.remove("is-collapsed")
            button.setAttribute("data-expanded", "true")
            button.setAttribute("aria-expanded", "true")
            button.textContent = "Show less"
          })
        })
      })()
    </script>
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
  assetId: string,
  assetType: MayaGeneratedAssetType,
  title: string,
  previewText: string,
  instruction: string,
  imageUrls: string[],
): string {
  if (assetType === "calendar") {
    const trendSignals = getDefaultMayaInstagramTrendSignals()
    const fallbackOffer = normalizeCalendarContextValue(
      sanitizeUserFacingText(extractPrimaryIntent(instruction), 120),
      "signature offer",
      {
        maxLength: 84,
        maxWords: 7,
      },
    )
    const posts = buildCalendarPosts({
      instruction,
      imageUrls,
      trendSignals,
      offer: fallbackOffer,
      audience: "your ideal audience",
      transformation: "a clear transformation",
    })
    return buildCalendarHtml({
      title,
      previewText,
      instruction,
      imageUrls,
      posts,
      trendSignals,
    })
  }
  if (assetType === "pdf") {
    return buildPdfHtml(title, previewText, instruction, imageUrls)
  }
  return buildLandingPageHtml(assetId, title, previewText, instruction, imageUrls)
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
      const title =
        typeof row.title === "string" ? sanitizePageTitle(assetType, row.title) : buildTitle(assetType, "")
      const instruction = typeof row.instruction === "string" ? sanitizeInstruction(row.instruction) : ""
      const previewText = typeof row.previewText === "string" ? sanitizePreview(row.previewText) : ""
      const previewHtml = typeof row.previewHtml === "string" ? row.previewHtml : ""
      const previewData =
        row.previewData && typeof row.previewData === "object"
          ? (row.previewData as MayaGeneratedAssetPreviewData)
          : undefined
      const blueprint =
        row.blueprint && typeof row.blueprint === "object" ? (row.blueprint as MayaLandingPageBlueprint) : undefined
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
        previewData,
        blueprint,
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
  const v2Enabled =
    input.assetType === "page" &&
    isMayaPageRendererV2Enabled(process.env.FEATURE_MAYA_PAGE_RENDERER_V2)
  const calendarRendererEnabled = input.assetType === "calendar"

  let title = buildTitle(input.assetType, instruction)
  let previewText = buildPreviewText(input.assetType, instruction)
  let previewHtml = ""
  let previewData: MayaGeneratedAssetPreviewData | undefined
  let blueprint: MayaLandingPageBlueprint | undefined

  if (calendarRendererEnabled) {
    try {
      const calendarAsset = await generateCalendarAsset({
        userId: normalizedUserId,
        assetId: id,
        instruction,
      })
      title = calendarAsset.title
      previewText = calendarAsset.previewText
      previewHtml = calendarAsset.previewHtml
      previewData = calendarAsset.previewData
    } catch (error) {
      console.error("[Maya Asset] Calendar generation failed, falling back to legacy renderer:", error)
    }
  } else if (v2Enabled) {
    try {
      const v2Page = await generateLandingPageV2({
        userId: normalizedUserId,
        assetId: id,
        instruction,
      })
      title = v2Page.title
      previewText = v2Page.previewText
      previewHtml = v2Page.previewHtml
      previewData = v2Page.previewData
      blueprint = v2Page.blueprint
    } catch (error) {
      console.error("[Maya Asset] V2 landing generation failed, falling back to legacy renderer:", error)
    }
  }

  if (input.assetType === "page" && !previewHtml) {
    try {
      const fallbackSnapshot = await resolveMayaLandingSnapshot(normalizedUserId)
      const fallbackMetadata = buildPageFallbackMetadataFromSnapshot({
        instruction,
        snapshot: fallbackSnapshot,
      })

      if (fallbackMetadata) {
        title = fallbackMetadata.title
        previewText = fallbackMetadata.previewText
      }
    } catch (error) {
      console.error("[Maya Asset] Page fallback metadata resolution failed:", error)
    }
  }

  if (!previewHtml) {
    const imageUrls = await loadUserImageUrls(normalizedUserId)
    previewHtml = buildPreviewHtmlForAsset(id, input.assetType, title, previewText, instruction, imageUrls)
    previewData =
      input.assetType === "calendar"
        ? buildCalendarPreviewData({
            previewText,
            posts: buildCalendarPosts({
              instruction,
              imageUrls,
              trendSignals: getDefaultMayaInstagramTrendSignals(),
              offer: normalizeCalendarContextValue(
                sanitizeUserFacingText(extractPrimaryIntent(instruction), 120),
                "signature offer",
                {
                  maxLength: 84,
                  maxWords: 7,
                },
              ),
              audience: "your ideal audience",
              transformation: "a clear transformation",
            }),
          })
        : input.assetType === "pdf"
          ? buildPdfPreviewData({ title, instruction })
          : buildLandingPreviewData({ title, previewText, blueprint, imageUrls })
  }
  const url = `/maya/asset/${encodeURIComponent(id)}`

  const asset: MayaGeneratedAsset = {
    id,
    assetType: input.assetType,
    title,
    instruction,
    previewText,
    previewHtml,
    previewData,
    blueprint,
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

  await mergeMayaMemoryData(normalizedUserId, memoryPatch)

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
  const mergedInstruction = sanitizeInstruction(
    `${targetAsset.instruction || ""}\nEdit request: ${editInstruction}`.trim(),
  )
  const v2Enabled =
    targetAsset.assetType === "page" &&
    isMayaPageRendererV2Enabled(process.env.FEATURE_MAYA_PAGE_RENDERER_V2)
  const calendarRendererEnabled = targetAsset.assetType === "calendar"

  let updatedTitle = sanitizePageTitle(targetAsset.assetType, targetAsset.title)
  let previewText = sanitizePreview(`Updated with your latest edit: ${extractPrimaryIntent(editInstruction)}.`)
  let previewHtml = ""
  let previewData = targetAsset.previewData
  let blueprint = targetAsset.blueprint

  if (calendarRendererEnabled) {
    try {
      const calendarAsset = await generateCalendarAsset({
        userId: normalizedUserId,
        assetId: targetAsset.id,
        instruction: mergedInstruction,
      })
      updatedTitle = calendarAsset.title
      previewText = calendarAsset.previewText
      previewHtml = calendarAsset.previewHtml
      previewData = calendarAsset.previewData
      blueprint = undefined
    } catch (error) {
      console.error("[Maya Asset] Calendar update failed, falling back to legacy renderer:", error)
    }
  } else if (v2Enabled) {
    try {
      const v2Page = await generateLandingPageV2({
        userId: normalizedUserId,
        assetId: targetAsset.id,
        instruction: mergedInstruction,
      })
      updatedTitle = v2Page.title
      previewText = v2Page.previewText
      previewHtml = v2Page.previewHtml
      previewData = v2Page.previewData
      blueprint = v2Page.blueprint
    } catch (error) {
      console.error("[Maya Asset] V2 landing update failed, falling back to legacy renderer:", error)
    }
  }

  if (!previewHtml) {
    const imageUrls = await loadUserImageUrls(normalizedUserId)
    previewHtml = buildPreviewHtmlForAsset(
      targetAsset.id,
      targetAsset.assetType,
      updatedTitle,
      previewText,
      mergedInstruction,
      imageUrls,
    )
    previewData =
      targetAsset.assetType === "calendar"
        ? buildCalendarPreviewData({
            previewText,
            posts: buildCalendarPosts({
              instruction: mergedInstruction,
              imageUrls,
              trendSignals: getDefaultMayaInstagramTrendSignals(),
              offer: normalizeCalendarContextValue(
                sanitizeUserFacingText(extractPrimaryIntent(mergedInstruction), 120),
                "signature offer",
                {
                  maxLength: 84,
                  maxWords: 7,
                },
              ),
              audience: "your ideal audience",
              transformation: "a clear transformation",
            }),
          })
        : targetAsset.assetType === "pdf"
          ? buildPdfPreviewData({ title: updatedTitle, instruction: mergedInstruction })
          : buildLandingPreviewData({ title: updatedTitle, previewText, blueprint, imageUrls })
  }

  const updatedAsset: MayaGeneratedAsset = {
    ...targetAsset,
    title: updatedTitle,
    instruction: mergedInstruction,
    previewText,
    previewHtml,
    previewData,
    blueprint,
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

  await mergeMayaMemoryData(normalizedUserId, memoryPatch)

  return updatedAsset
}

function mapPageTypeToAssetType(pageType: string): MayaGeneratedAssetType {
  if (pageType === "calendar") return "calendar"
  if (pageType === "workbook") return "pdf"
  return "page"
}

export async function regenerateMayaPersonalPageById(input: {
  userId: string | number
  pageId: string
}): Promise<{
  success: true
  assetId: string
  pageId: string
  liveUrl: string
  version: number
  updatedAt: string
}> {
  const normalizedUserId = String(input.userId || "").trim()
  const normalizedPageId = String(input.pageId || "").trim()
  if (!normalizedUserId || !normalizedPageId) {
    throw new Error("Cannot regenerate page without user and page id")
  }

  const rows = await sql`
    SELECT id, page_type, title, page_jsonb
    FROM personal_pages
    WHERE id = ${normalizedPageId}
      AND user_id = ${normalizedUserId}
    LIMIT 1
  `

  const row = (rows[0] || {}) as {
    id?: string
    page_type?: string
    title?: string | null
    page_jsonb?: Record<string, unknown> | null
  }

  if (!row.id) {
    throw new Error("Page not found")
  }

  const assetType = mapPageTypeToAssetType(String(row.page_type || "landing").trim())
  const pageJson =
    row.page_jsonb && typeof row.page_jsonb === "object"
      ? (row.page_jsonb as Record<string, unknown>)
      : {}
  const rawInstruction =
    (typeof pageJson.instruction === "string" && pageJson.instruction) ||
    row.title ||
    (assetType === "calendar"
      ? "Create a content calendar draft for my current offer"
      : assetType === "pdf"
        ? "Workbook draft"
        : "Create a landing page draft for my current offer")
  const instruction = sanitizeInstruction(rawInstruction)
  const updatedAt = new Date().toISOString()

  let title = sanitizePageTitle(assetType, String(row.title || ""))
  let previewText = buildPreviewText(assetType, instruction)
  let previewHtml = ""
  let previewData: MayaGeneratedAssetPreviewData | undefined
  let blueprint: MayaLandingPageBlueprint | undefined

  const v2Enabled =
    assetType === "page" &&
    isMayaPageRendererV2Enabled(process.env.FEATURE_MAYA_PAGE_RENDERER_V2)
  const calendarRendererEnabled = assetType === "calendar"

  if (calendarRendererEnabled) {
    try {
      const calendarAsset = await generateCalendarAsset({
        userId: normalizedUserId,
        assetId: row.id,
        instruction,
      })
      title = calendarAsset.title
      previewText = calendarAsset.previewText
      previewHtml = calendarAsset.previewHtml
      previewData = calendarAsset.previewData
      blueprint = undefined
    } catch (error) {
      console.error("[Maya Asset] Calendar regenerate failed, falling back to legacy renderer:", error)
    }
  } else if (v2Enabled) {
    try {
      const v2Page = await generateLandingPageV2({
        userId: normalizedUserId,
        assetId: row.id,
        instruction,
      })
      title = v2Page.title
      previewText = v2Page.previewText
      previewHtml = v2Page.previewHtml
      previewData = v2Page.previewData
      blueprint = v2Page.blueprint
    } catch (error) {
      console.error("[Maya Asset] Regenerate V2 failed, falling back to legacy renderer:", error)
    }
  }

  if (!previewHtml) {
    const imageUrls = await loadUserImageUrls(normalizedUserId)
    previewHtml = buildPreviewHtmlForAsset(row.id, assetType, title, previewText, instruction, imageUrls)
    previewData =
      assetType === "calendar"
        ? buildCalendarPreviewData({
            previewText,
            posts: buildCalendarPosts({
              instruction,
              imageUrls,
              trendSignals: getDefaultMayaInstagramTrendSignals(),
              offer: normalizeCalendarContextValue(
                sanitizeUserFacingText(extractPrimaryIntent(instruction), 120),
                "signature offer",
                {
                  maxLength: 84,
                  maxWords: 7,
                },
              ),
              audience: "your ideal audience",
              transformation: "a clear transformation",
            }),
          })
        : assetType === "pdf"
          ? buildPdfPreviewData({ title, instruction })
          : buildLandingPreviewData({ title, previewText, blueprint, imageUrls })
  }

  const regeneratedAsset: MayaGeneratedAsset = {
    id: row.id,
    assetType,
    title,
    instruction,
    previewText,
    previewHtml,
    previewData,
    blueprint,
    createdAt: updatedAt,
    status: "draft",
  }

  const persistedPage = await persistMayaAssetAsPersonalPage({
    userId: normalizedUserId,
    asset: regeneratedAsset,
  })

  const existingRows = await sql`
    SELECT memory_data
    FROM maya_personal_memory
    WHERE user_id = ${normalizedUserId}
    LIMIT 1
  `
  const existingMemoryData = ((existingRows[0] as any)?.memory_data as Record<string, unknown> | undefined) ?? {}
  const existingAssets = parseExistingAssets(existingMemoryData.generated_assets)
  const nextAssets = [regeneratedAsset, ...existingAssets.filter((asset) => asset.id !== regeneratedAsset.id)].slice(
    0,
    MAX_STORED_ASSETS,
  )

  await mergeMayaMemoryData(normalizedUserId, {
    generated_assets: nextAssets,
    last_generated_asset: regeneratedAsset,
    generated_assets_updated_at: updatedAt,
  })

  return {
    success: true,
    assetId: regeneratedAsset.id,
    pageId: regeneratedAsset.id,
    liveUrl: persistedPage.liveUrl,
    version: persistedPage.version,
    updatedAt,
  }
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
  const inMemory = assets.find((asset) => asset.id === normalizedAssetId)
  if (inMemory) return inMemory

  const pageRows = await sql`
    SELECT id, page_type, title, page_jsonb, published_html, live_url, updated_at
    FROM personal_pages
    WHERE id = ${normalizedAssetId}
      AND user_id = ${normalizedUserId}
    LIMIT 1
  `

  const page = (pageRows[0] || {}) as {
    id?: string
    page_type?: string | null
    title?: string | null
    page_jsonb?: Record<string, unknown> | null
    published_html?: string | null
    live_url?: string | null
    updated_at?: string | null
  }

  if (!page.id || !page.published_html) return null

  const pageJson =
    page.page_jsonb && typeof page.page_jsonb === "object"
      ? (page.page_jsonb as Record<string, unknown>)
      : {}
  const assetType = mapPageTypeToAssetType(String(page.page_type || "landing"))
  const title = sanitizePageTitle(assetType, String(page.title || ""))
  const previewText =
    typeof pageJson.previewText === "string" && pageJson.previewText.trim().length > 0
      ? sanitizePreview(pageJson.previewText)
      : buildPreviewText(assetType, String(pageJson.instruction || page.title || ""))

  return {
    id: page.id,
    assetType,
    title,
    instruction: sanitizeInstruction(String(pageJson.instruction || page.title || "")),
    previewText,
    previewHtml: page.published_html,
    previewData:
      pageJson.previewData && typeof pageJson.previewData === "object"
        ? (pageJson.previewData as MayaGeneratedAssetPreviewData)
        : undefined,
    blueprint:
      pageJson.blueprint && typeof pageJson.blueprint === "object"
        ? (pageJson.blueprint as MayaLandingPageBlueprint)
        : undefined,
    url: typeof page.live_url === "string" ? page.live_url : undefined,
    createdAt: page.updated_at || new Date(0).toISOString(),
    status: "draft",
  }
}

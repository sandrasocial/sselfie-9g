import "server-only"

import { sql } from "@/lib/db/client"
import { callContentKitLlm, extractJsonArray } from "@/lib/content-kit/llm"
import { getLatestAnalyticsReports } from "@/lib/analytics/reports"
import { SANDRA_VOICE_RULES } from "@/lib/content-engine/brief-generator"
import type { CarouselDeck, CarouselSlide } from "@/lib/content-kit/types"

const SLIDE_RULES = `
SLIDE RULES (these render to fixed 1080x1350 editorial templates, so respect limits):
- Each carousel: 7 to 9 slides. Slide 1 kind "hook", last slide kind "cta", middle slides "step", "list" or "quote".
- "hook": title max 9 words (the scroll-stopper), optional body max 16 words, eyebrow max 4 words.
- "step": stepNumber (1,2,3...), title max 8 words, body 1-3 short sentences (max 40 words total).
- "list": title max 8 words, items: 3-5 strings of max 9 words each.
- "quote": title is the quote itself, max 18 words. body optional, max 10 words (attribution or context).
- "cta": title max 8 words, body max 25 words. The CTA is always a comment keyword or a save/share ask, matching how Sandra actually converts (comment PROMPT / SELFIE / KIT, or "save this").
- footer is optional and rarely needed (the template already shows @sandra.social).
- NEVER use an em-dash anywhere. No emoji in titles. At most one emoji total per carousel, in a body line, only if it truly earns its place.
- caption: Sandra-voice Instagram caption, 60-120 words, line breaks allowed, ends with the same comment keyword or save ask as the cta slide, then 5-8 niche hashtags on the final line.
`.trim()

type GeneratorInput = {
  count?: number
  topic?: string
  /** Background images (Vercel Blob URLs, e.g. Phase 2 demo images or her selfies).
   * Applied photo-first: hook gets the first, extra images become pure photo proof
   * slides after the hook, the CTA gets the last. */
  imageUrls?: string[]
}

function isAllowedImageUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com")
  } catch {
    return false
  }
}

/** Niche-viral layout (@prompts.ig pattern, hers by typography): photo hook ->
 * photo proof block -> clean teaching slides (save-bait) -> photo CTA.
 * With 4+ images the hook becomes the signature 2x2 grid (same person, four worlds). */
function applyImages(slides: CarouselSlide[], imageUrls: string[]): CarouselSlide[] {
  if (imageUrls.length === 0) return slides
  const result = slides.map((slide) => ({ ...slide }))

  let used = 1
  if (imageUrls.length >= 4) {
    result[0].kind = "grid"
    result[0].gridUrls = imageUrls.slice(0, 4)
    used = 4
  } else {
    result[0].imageUrl = imageUrls[0]
  }

  const remaining = imageUrls.slice(used)
  const last = result[result.length - 1]
  let ctaImage: string | undefined
  if (remaining.length > 0 && last.kind === "cta") {
    ctaImage = remaining[remaining.length - 1]
    last.imageUrl = ctaImage
  }

  const middles = ctaImage ? remaining.slice(0, -1) : remaining
  if (middles.length > 0) {
    const proofSlides: CarouselSlide[] = middles.map((url) => ({
      kind: "photo",
      title: "",
      imageUrl: url,
    }))
    result.splice(1, 0, ...proofSlides)
  }
  return result
}

type RawCarousel = {
  title: string
  slug: string
  caption: string
  slides: CarouselSlide[]
}

function sanitizeSlides(slides: CarouselSlide[]): CarouselSlide[] {
  // Hard guard: no em-dashes ever reach a rendered slide.
  const clean = (value?: string) => value?.replace(/—/g, ":").trim()
  return slides.map((slide) => ({
    ...slide,
    eyebrow: clean(slide.eyebrow),
    title: clean(slide.title) || "",
    body: clean(slide.body),
    footer: clean(slide.footer),
    items: slide.items?.map((item) => clean(item) || "").filter(Boolean),
  }))
}

export async function generateCarousels(input: GeneratorInput = {}): Promise<CarouselDeck[]> {
  const imageUrls = (input.imageUrls ?? []).filter(isAllowedImageUrl).slice(0, 8)
  // Selected images describe ONE deck's visuals, so image runs default to a single deck.
  const count = Math.min(Math.max(input.count ?? (imageUrls.length > 0 ? 1 : 2), 1), 4)

  const briefs = await getLatestAnalyticsReports({ reportType: "content_brief_weekly", limit: 1 })
  const brief = briefs[0]?.payload ?? null
  const briefPeriodStart: string | null = briefs[0]?.period_start
    ? new Date(briefs[0].period_start).toISOString().slice(0, 10)
    : null

  const topPosts = (await sql`
    SELECT DISTINCT ON (media_id) media_id, hook_line, format, views, saves, shares
    FROM ig_media_snapshots
    WHERE hook_line IS NOT NULL
    ORDER BY media_id, captured_on DESC
  `) as Array<{ hook_line: string; format: string; views: number | null; saves: number | null; shares: number | null }>
  const winners = topPosts
    .filter((post) => (post.views ?? 0) > 0)
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 8)
    .map(
      (post) =>
        `- [${post.format}] "${post.hook_line}" · ${post.views?.toLocaleString()} views · ${post.saves ?? 0} saves · ${post.shares ?? 0} shares`,
    )
    .join("\n")

  const carouselPieces = Array.isArray(brief?.contentPlan)
    ? brief.contentPlan
        .filter((piece: any) => piece.format === "carousel")
        .map(
          (piece: any) =>
            `- "${piece.title}" · hook: "${piece.hook}" · outline: ${(piece.carouselOutline || []).join(" / ")}`,
        )
        .join("\n")
    : ""

  const prompt = `You are Sandra's carousel writer for @sandra.social (Instagram, AI photoshoots from one selfie, personal branding for women entrepreneurs).

${SANDRA_VOICE_RULES}

${SLIDE_RULES}

HER REAL WINNERS (live data from ig_media_snapshots, study the patterns):
${winners || "- (no snapshot data available)"}

THIS WEEK'S BRIEF CAROUSEL IDEAS (expand these first${input.topic ? ", unless the requested topic overrides" : ""}):
${carouselPieces || "- (no weekly brief found: invent carousels from her winners and niche)"}
${input.topic ? `\nREQUESTED TOPIC (priority): ${input.topic}` : ""}

Write ${count} complete carousel deck(s). Teach something stealable: her audience saves carousels that give them numbered, concrete steps they can use today (selfie angles, ChatGPT photo prompts, posing, editing prompts like color grading / lens looks / outfit changes).

Return ONLY a JSON array, no commentary:
[
  {
    "title": "internal working title",
    "slug": "kebab-case-slug",
    "caption": "the Instagram caption",
    "slides": [
      { "kind": "hook", "eyebrow": "...", "title": "...", "body": "..." },
      { "kind": "step", "stepNumber": 1, "title": "...", "body": "..." },
      { "kind": "list", "title": "...", "items": ["...", "..."] },
      { "kind": "quote", "title": "..." },
      { "kind": "cta", "title": "...", "body": "..." }
    ]
  }
]`

  const text = await callContentKitLlm(prompt)
  const raw = extractJsonArray(text) as RawCarousel[]
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("LLM returned an empty carousel array")

  const decks: CarouselDeck[] = []
  for (const carousel of raw.slice(0, count)) {
    if (!carousel.title || !Array.isArray(carousel.slides) || carousel.slides.length < 5) continue
    const slides = applyImages(sanitizeSlides(carousel.slides), imageUrls)
    const slug = (carousel.slug || carousel.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)
    const caption = (carousel.caption || "").replace(/—/g, ":")
    const rows = (await sql`
      INSERT INTO content_carousels (title, slug, caption, slides, source_period_start)
      VALUES (${carousel.title}, ${slug}, ${caption}, ${JSON.stringify(slides)}, ${briefPeriodStart})
      RETURNING id, created_at
    `) as Array<{ id: number; created_at: string }>
    decks.push({
      id: rows[0].id,
      title: carousel.title,
      slug,
      caption,
      slides,
      status: "draft",
      sourcePeriodStart: briefPeriodStart,
      createdAt: new Date(rows[0].created_at).toISOString(),
    })
  }

  if (decks.length === 0) throw new Error("LLM output failed validation: no usable carousels")
  return decks
}

export async function listCarousels(limit = 20): Promise<CarouselDeck[]> {
  const rows = (await sql`
    SELECT id, title, slug, caption, slides, status, source_period_start, created_at
    FROM content_carousels
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as Array<any>
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    caption: row.caption,
    slides: row.slides,
    status: row.status,
    sourcePeriodStart: row.source_period_start
      ? new Date(row.source_period_start).toISOString().slice(0, 10)
      : null,
    createdAt: new Date(row.created_at).toISOString(),
  }))
}

export async function getCarousel(id: number): Promise<CarouselDeck | null> {
  const rows = (await sql`
    SELECT id, title, slug, caption, slides, status, source_period_start, created_at
    FROM content_carousels
    WHERE id = ${id}
    LIMIT 1
  `) as Array<any>
  if (!rows[0]) return null
  const row = rows[0]
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    caption: row.caption,
    slides: row.slides,
    status: row.status,
    sourcePeriodStart: row.source_period_start
      ? new Date(row.source_period_start).toISOString().slice(0, 10)
      : null,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

export async function setCarouselStatus(id: number, status: "draft" | "approved" | "posted") {
  await sql`UPDATE content_carousels SET status = ${status} WHERE id = ${id}`
}

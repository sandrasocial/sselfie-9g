import "server-only"

import { sql } from "@/lib/db/client"
import { callContentKitLlm, extractJsonArray } from "@/lib/content-kit/llm"
import { getLatestAnalyticsReports } from "@/lib/analytics/reports"
import { getShoot } from "@/lib/content-kit/shoot-generator"
import { listAdminSelfies } from "@/lib/content-kit/demo-generator"
import type { CarouselDeck, CarouselSlide } from "@/lib/content-kit/types"
import { getPublishedVaultCollectionBySourceShootId } from "@/lib/vault/published-collections"
import {
  pickContentStyleReference,
  redesignContentSlide,
} from "@/lib/content-kit/slide-redesign-generator"
import {
  audienceBlock,
  funnelBlock,
  noFakeBlock,
  proofBlock,
  sanitizeGroundedText,
  voiceBlock,
} from "@/lib/content/grounding"
import { getCarouselDesignGuide } from "@/lib/app-v3/maya/carousel-design-systems"

const SLIDE_RULES = `
SLIDE RULES (these render to fixed 1080x1350 editorial templates, so respect limits):
- Each carousel: 7 to 10 slides. Slide 1 kind "hook", last slide kind "cta", middle slides "step", "list" or "quote".
- "hook": title max 9 words (the scroll-stopper), optional body max 16 words, eyebrow max 4 words.
- "step": stepNumber (1,2,3...), title max 8 words, body 1-3 short sentences (max 40 words total).
- "list": title max 8 words, items: 3-5 strings of max 9 words each.
- "quote": title is the quote itself, max 18 words. body optional, max 10 words (attribution or context).
- "cta": title max 8 words, body max 25 words. The CTA is always a comment keyword or a save/share ask, matching how Sandra actually converts (comment PROMPT / SELFIE / KIT, or "save this").
- footer is optional and rarely needed (the template already shows @sandra.social).
- NEVER use an em-dash anywhere. No emoji in titles. At most one emoji total per carousel, in a body line, only if it truly earns its place.
- caption: Sandra-voice Instagram caption, 60-120 words, line breaks allowed, ends with the same comment keyword or save ask as the cta slide, then 5-8 niche hashtags on the final line.
`.trim()

const TUTORIAL_SLIDE_RULES = `
TUTORIAL CAROUSEL RULES:
- Build one 8 to 10 slide tutorial deck: cover/hook, bad example, setting stack, composition tip, pose tip, before-after, edit/preset, CTA.
- Allowed kinds: "hook", "step", "list", "quote", "photo", "before-after", "cta".
- Use "before-after" exactly once.
- Add "accents" to 2-4 practical teaching slides. Accent types: "arrow", "circle", "squiggle". Targets: top-left, top-right, middle-left, middle-right, bottom-left, bottom-right, center, keyword.
- Real screenshot/reference slides must be redesigned by gpt-image-2 from the real frame, not rebuilt by a coded lesson template.
- Keep text short because the image model bakes all headline, helper text and callouts into the finished slide.
- CTA keyword must be one of KIT, PROMPT, PRESET, or SELFIE. Default to KIT unless Sandra asked for a different funnel.
`.trim()

type GeneratorInput = {
  count?: number
  topic?: string
  mode?: "standard" | "tutorial"
  /** Approved Shoot Studio row. When present, this is the source of visual truth. */
  sourceShootId?: number
  /** Optional additional background images, only used after the approved shoot images. */
  imageUrls?: string[]
  /** Screenshots, product proof, or other assets layered above teaching slides. */
  overlayUrls?: string[]
  /** Optional hand-picked rows from content_reel_references. Omit to use the current top tutorial references. */
  reelReferenceIds?: number[]
  /** Tutorial CTA keyword. Defaults to KIT. */
  keyword?: "KIT" | "PROMPT" | "PRESET" | "SELFIE"
}

function isAllowedImageUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com")
  } catch {
    return false
  }
}

async function resolveShootImages(
  sourceShootId?: number,
  minApprovedImages = 2
): Promise<{
  imageUrls: string[]
  title: string | null
  id: number | null
}> {
  if (!sourceShootId) return { imageUrls: [], title: null, id: null }
  const publishedCollection = await getPublishedVaultCollectionBySourceShootId(sourceShootId)
  const publishedImages =
    publishedCollection?.cards
      .map((card) => card.exampleImage)
      .filter((url): url is string => Boolean(url)) ?? []
  if (publishedCollection && publishedImages.length >= minApprovedImages) {
    return {
      imageUrls: publishedImages,
      title: publishedCollection.title,
      id: sourceShootId,
    }
  }

  const shoot = await getShoot(sourceShootId)
  if (!shoot) throw new Error("Shoot not found")
  const images = shoot.shots
    .filter(shot => shot.status === "approved" && shot.imageUrl)
    .map(shot => shot.imageUrl as string)
  if (images.length < minApprovedImages) {
    throw new Error(
      `Approve at least ${minApprovedImages} rendered shoot image${minApprovedImages === 1 ? "" : "s"} before building this carousel`
    )
  }
  return { imageUrls: images, title: shoot.title, id: shoot.id }
}

export type ContentReelReference = {
  id: number
  mediaId: string
  permalink: string | null
  hookLine: string | null
  views: number | null
  kind: "cover" | "scene"
  sceneIndex: number | null
  imageUrl: string
  label: string | null
  createdAt: string
}

export async function listContentReelReferences({
  limit = 14,
  ids,
}: {
  limit?: number
  ids?: number[]
} = {}): Promise<ContentReelReference[]> {
  const safeLimit = Math.min(Math.max(ids?.length ? 240 : limit, 1), 240)
  const rows = (await sql`
    SELECT id, media_id, permalink, hook_line, views, kind, scene_index, image_url, label, created_at
    FROM content_reel_references
    WHERE image_url IS NOT NULL
    ORDER BY COALESCE(views, 0) DESC, media_id, scene_index NULLS FIRST
    LIMIT ${safeLimit}
  `) as Array<{
    id: number
    media_id: string
    permalink: string | null
    hook_line: string | null
    views: number | null
    kind: "cover" | "scene"
    scene_index: number | null
    image_url: string
    label: string | null
    created_at: string
  }>
  const selectedIds = new Set((ids ?? []).filter(id => Number.isFinite(id)))
  return rows
    .filter(row => selectedIds.size === 0 || selectedIds.has(row.id))
    .slice(0, limit)
    .map(row => ({
      id: row.id,
      mediaId: row.media_id,
      permalink: row.permalink,
      hookLine: row.hook_line,
      views: row.views,
      kind: row.kind,
      sceneIndex: row.scene_index,
      imageUrl: row.image_url,
      label: row.label,
      createdAt: new Date(row.created_at).toISOString(),
    }))
}

type RawCarousel = {
  title: string
  slug: string
  caption: string
  slides: CarouselSlide[]
}

function sanitizeSlides(slides: CarouselSlide[]): CarouselSlide[] {
  // Hard guard: no em-dashes ever reach a rendered slide.
  const clean = (value?: string) => (value ? sanitizeGroundedText(value).trim() : undefined)
  return slides.map(slide => ({
    ...slide,
    eyebrow: clean(slide.eyebrow),
    title: clean(slide.title) || "",
    body: clean(slide.body),
    footer: clean(slide.footer),
    items: slide.items?.map(item => clean(item) || "").filter(Boolean),
  }))
}

function ensureTutorialShape(slides: CarouselSlide[], keyword: string): CarouselSlide[] {
  const shaped = sanitizeSlides(slides)
    .filter(slide =>
      ["hook", "step", "list", "quote", "cta", "photo", "before-after"].includes(slide.kind)
    )
    .slice(0, 10)

  if (shaped.length === 0 || shaped[0].kind !== "hook") {
    shaped.unshift({
      kind: "hook",
      eyebrow: "Tutorial",
      title: "The shot is not random",
      body: "Use the same tiny stack every time.",
    })
  }

  if (!shaped.some(slide => slide.kind === "before-after")) {
    const insertAt = Math.min(Math.max(shaped.length - 2, 1), 7)
    shaped.splice(insertAt, 0, {
      kind: "before-after",
      eyebrow: "Before / After",
      title: "From flat to finished",
      body: "Same idea. Better light, crop, and styling.",
      accents: [{ type: "arrow", target: "center" }],
    })
  }

  const last = shaped[shaped.length - 1]
  if (last?.kind !== "cta") {
    shaped.push({
      kind: "cta",
      eyebrow: "Save this",
      title: `Comment ${keyword}`,
      body: "I will send you the simple version to try from one selfie.",
    })
  }

  return shaped.slice(0, 10)
}

function referencesSummary(refs: ContentReelReference[]): string {
  if (refs.length === 0) return "- No reel references found."
  return refs
    .slice(0, 12)
    .map(ref => {
      const label = ref.label || (ref.kind === "cover" ? "cover" : `scene ${ref.sceneIndex ?? "?"}`)
      return `- #${ref.id} ${ref.kind}: ${label} · ${ref.views ?? 0} views · hook: "${ref.hookLine || "unknown"}"`
    })
    .join("\n")
}

function pickTutorialReference({
  slide,
  index,
  coverRefs,
  sceneRefs,
  sourceImages,
  uploadedImages,
  uploadedOverlays,
}: {
  slide: CarouselSlide
  index: number
  coverRefs: string[]
  sceneRefs: string[]
  sourceImages: string[]
  uploadedImages: string[]
  uploadedOverlays: string[]
}): string | null {
  const scenePool = [...sceneRefs, ...uploadedOverlays, ...sourceImages, ...uploadedImages].filter(
    isAllowedImageUrl
  )
  const coverPool = [...coverRefs, ...sourceImages, ...uploadedImages, ...sceneRefs].filter(
    isAllowedImageUrl
  )
  if (slide.kind === "hook" || slide.kind === "photo" || slide.kind === "cta") {
    return coverPool[index % Math.max(coverPool.length, 1)] ?? null
  }
  return scenePool[index % Math.max(scenePool.length, 1)] ?? coverPool[0] ?? null
}

async function redesignTutorialSlides({
  slides,
  topic,
  coverRefs,
  sceneRefs,
  sourceImages,
  uploadedImages,
  uploadedOverlays,
}: {
  slides: CarouselSlide[]
  topic: string
  coverRefs: string[]
  sceneRefs: string[]
  sourceImages: string[]
  uploadedImages: string[]
  uploadedOverlays: string[]
}): Promise<CarouselSlide[]> {
  const style = await pickContentStyleReference("tutorial")
  if (!style) throw new Error("No tutorial style references found")

  return Promise.all(
    slides.map(async (slide, index) => {
      const referenceUrl = pickTutorialReference({
        slide,
        index,
        coverRefs,
        sceneRefs,
        sourceImages,
        uploadedImages,
        uploadedOverlays,
      })
      if (!referenceUrl) throw new Error("No tutorial reference frame available")

      const imageUrl = await redesignContentSlide({
        referenceUrl,
        styleReferenceUrl: style.imageUrl,
        styleLabel: style.label,
        category: "tutorial",
        topic,
        slide,
      })

      return {
        ...slide,
        imageUrl,
        headlineRender: "baked" as const,
        overlayAssets: undefined,
        accents: undefined,
        gridUrls: undefined,
      }
    })
  )
}

// CAROUSEL-RESTORE: composite the real selected photos with locally-rendered text instead of baking
// each slide through gpt-image-2. Baking regenerated the slide, over-processed the photo, and
// garbled text (the "looked better before" regression — same root cause we fixed for stories).
// Photo-backed slides (hook/photo/cta) carry the real photo and the renderer composites the copy
// over it; teaching slides (step/list/quote) render as clean editorial text frames; before-after
// gets a real before+after pair; grid keeps its 2x2 photos.
function compositePhotoshootCarouselSlides({
  slides,
  referenceUrls,
}: {
  slides: CarouselSlide[]
  referenceUrls: string[]
}): CarouselSlide[] {
  const pool = referenceUrls.filter(isAllowedImageUrl)
  if (pool.length === 0) throw new Error("No carousel reference image available")
  const pick = (i: number) => pool[i % pool.length]
  let cursor = 0
  return slides.map(slide => {
    if (slide.kind === "grid") return slide
    if (slide.kind === "before-after") {
      const before = pick(cursor++)
      const after = pick(cursor++)
      return {
        ...slide,
        imageUrl: before ?? slide.imageUrl,
        overlayAssets: after ? [{ url: after }] : slide.overlayAssets,
      }
    }
    const photoBacked = slide.kind === "hook" || slide.kind === "photo" || slide.kind === "cta"
    if (!photoBacked) return slide // clean editorial text frame (step/list/quote)
    return { ...slide, imageUrl: pick(cursor++), headlineRender: "composited" as const }
  })
}

export async function generateCarousels(input: GeneratorInput = {}): Promise<CarouselDeck[]> {
  if (input.mode === "tutorial") return generateTutorialCarousels(input)

  const sourceShoot = await resolveShootImages(input.sourceShootId)
  const imageUrls = [
    ...sourceShoot.imageUrls,
    ...(input.imageUrls ?? []).filter(isAllowedImageUrl),
  ].slice(0, 8)
  // Shoot-sourced runs describe one designed object, so default to one deck.
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
  `) as Array<{
    hook_line: string
    format: string
    views: number | null
    saves: number | null
    shares: number | null
  }>
  const winners = topPosts
    .filter(post => (post.views ?? 0) > 0)
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 8)
    .map(
      post =>
        `- [${post.format}] "${post.hook_line}" · ${post.views?.toLocaleString()} views · ${post.saves ?? 0} saves · ${post.shares ?? 0} shares`
    )
    .join("\n")

  const carouselPieces = Array.isArray(brief?.contentPlan)
    ? brief.contentPlan
        .filter((piece: any) => piece.format === "carousel")
        .map(
          (piece: any) =>
            `- "${piece.title}" · hook: "${piece.hook}" · outline: ${(piece.carouselOutline || []).join(" / ")}`
        )
        .join("\n")
    : ""

  const prompt = `You are Sandra's carousel writer for @sandra.social (Instagram, AI-assisted brand imagery from one selfie, personal branding for women building from their phone).

${voiceBlock()}

${noFakeBlock()}

${audienceBlock()}

${proofBlock()}

${funnelBlock()}

${getCarouselDesignGuide()}

${SLIDE_RULES}

HER REAL WINNERS (live data from ig_media_snapshots, study the patterns):
${winners || "- (no snapshot data available)"}

THIS WEEK'S BRIEF CAROUSEL IDEAS (expand these first${input.topic ? ", unless the requested topic overrides" : ""}):
${carouselPieces || "- (no weekly brief found: invent carousels from her winners and niche)"}
${input.topic ? `\nREQUESTED TOPIC (priority): ${input.topic}` : ""}
${sourceShoot.title ? `\nSOURCE PHOTOSHOOT (visual source of truth): "${sourceShoot.title}". Write this carousel as an extension of that exact shoot. The approved shoot photos will be the grounded reference frames for the model-designed slides, so keep the copy short enough to bake into a finished shoot-based content piece.` : ""}

Write ${count} complete carousel deck(s). Teach something stealable: her audience saves carousels that give them numbered, concrete steps they can use today (selfie angles, ChatGPT photo prompts, posing, editing prompts like color grading / lens looks / outfit changes).

Every carousel must:
- Speak to one of the real pain points in the audience block.
- Use the reach-vs-desire truth: teach the selfie/AI skill, then connect it to the income, identity, relief, or visibility she wants.
- Use the proof block's save-bait structure: numbered steps, clear cover text, one keyword/save CTA, no known-flop formats.
- Use Sandra's no-fake doctrine. Promise "Look like yourself, at your best." Never imply trickery.
- Choose one of the carousel design systems. The image model renders the final slide, so write concise copy that can be baked cleanly into the image.

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
  if (!Array.isArray(raw) || raw.length === 0)
    throw new Error("LLM returned an empty carousel array")

  const decks: CarouselDeck[] = []
  for (const carousel of raw.slice(0, count)) {
    if (!carousel.title || !Array.isArray(carousel.slides) || carousel.slides.length < 5) continue
    const sanitized = sanitizeSlides(carousel.slides)
    const fallbackSelfies = imageUrls.length
      ? []
      : await listAdminSelfies().catch(() => [] as string[])
    const slides = compositePhotoshootCarouselSlides({
      slides: sanitized,
      referenceUrls: [...imageUrls, ...fallbackSelfies],
    })
    const slug = (carousel.slug || carousel.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 60)
    const caption = sanitizeGroundedText(carousel.caption || "")
    await sql`
      ALTER TABLE content_carousels
      ADD COLUMN IF NOT EXISTS source_shoot_id integer,
      ADD COLUMN IF NOT EXISTS source_shoot_title text
    `
    const rows = (await sql`
      INSERT INTO content_carousels (title, slug, caption, slides, source_period_start, source_shoot_id, source_shoot_title)
      VALUES (${carousel.title}, ${slug}, ${caption}, ${JSON.stringify(slides)}, ${briefPeriodStart}, ${sourceShoot.id}, ${sourceShoot.title})
      RETURNING id, created_at
    `) as Array<{ id: number; created_at: string }>
    decks.push({
      id: rows[0].id,
      title: carousel.title,
      slug,
      caption,
      slides,
      status: "draft",
      sourceShootId: sourceShoot.id,
      sourceShootTitle: sourceShoot.title,
      sourcePeriodStart: briefPeriodStart,
      createdAt: new Date(rows[0].created_at).toISOString(),
    })
  }

  if (decks.length === 0) throw new Error("LLM output failed validation: no usable carousels")
  return decks
}

export async function generateTutorialCarousels(input: GeneratorInput): Promise<CarouselDeck[]> {
  const sourceShoot = await resolveShootImages(input.sourceShootId, 1)
  const reelReferences = await listContentReelReferences({
    limit: 14,
    ids: input.reelReferenceIds,
  }).catch(error => {
    console.error("[content-kit] reel references unavailable:", error)
    return [] as ContentReelReference[]
  })

  const uploadedImages = (input.imageUrls ?? []).filter(isAllowedImageUrl)
  const uploadedOverlays = (input.overlayUrls ?? []).filter(isAllowedImageUrl)
  const coverRefs = reelReferences.filter(ref => ref.kind === "cover").map(ref => ref.imageUrl)
  const sceneRefs = reelReferences.filter(ref => ref.kind === "scene").map(ref => ref.imageUrl)
  const keyword = input.keyword ?? "KIT"
  const topic =
    input.topic?.trim() || "a selfie tutorial carousel from Sandra's strongest reel references"

  const briefs = await getLatestAnalyticsReports({ reportType: "content_brief_weekly", limit: 1 })
  const briefPeriodStart: string | null = briefs[0]?.period_start
    ? new Date(briefs[0].period_start).toISOString().slice(0, 10)
    : null

  const prompt = `You are Sandra's tutorial carousel writer for @sandra.social.

${voiceBlock()}

${noFakeBlock()}

${audienceBlock()}

${proofBlock()}

${funnelBlock()}

${getCarouselDesignGuide()}

${TUTORIAL_SLIDE_RULES}

REEL REFERENCES AVAILABLE FROM content_reel_references:
${referencesSummary(reelReferences)}

REQUESTED TUTORIAL TOPIC:
${topic}

VISUAL SOURCE RULE:
Every finished slide must come from the real reel frame or approved image reference. Do not invent a new café cover or unrelated scene.

${sourceShoot.title ? `SOURCE PHOTOSHOOT: "${sourceShoot.title}". Use it as the visual source when slide copy talks about the finished result.` : ""}

Write ONE premium editorial tutorial carousel. It should feel like a practical saved post, not a loud Canva tutorial.

Rules:
- The tutorial must teach one clear visual method: settings, light, pose, crop, prompt, edit, or phone setup.
- Use Sandra's exact promise: "Look like yourself, at your best."
- Avoid "elevate", "elevated", "flawless", "perfect skin", "fake photoshoot", "no one will know", and any trickery language.
- Keep the iPhone/settings/screenshot slides practical and precise.
- Use short serif-friendly titles. No em-dashes. No emojis.
- CTA slide: ask them to comment ${keyword}.

Return ONLY a JSON array with one object:
[
  {
    "title": "internal working title",
    "slug": "kebab-case-slug",
    "caption": "Sandra voice caption, 70-120 words, ends by asking them to comment ${keyword}",
    "slides": [
      { "kind": "hook", "eyebrow": "Tutorial", "title": "...", "body": "..." },
      { "kind": "step", "stepNumber": 1, "title": "Bad example", "body": "...", "accents": [{ "type": "circle", "target": "center" }] },
      { "kind": "list", "title": "The setting stack", "items": ["...", "..."], "accents": [{ "type": "arrow", "target": "middle-right" }] },
      { "kind": "step", "stepNumber": 2, "title": "...", "body": "..." },
      { "kind": "step", "stepNumber": 3, "title": "...", "body": "..." },
      { "kind": "before-after", "eyebrow": "Before / After", "title": "From this to this", "body": "..." },
      { "kind": "step", "stepNumber": 4, "title": "The edit", "body": "..." },
      { "kind": "cta", "eyebrow": "Save this", "title": "Comment ${keyword}", "body": "I will send you the simple version to try." }
    ]
  }
]`

  const text = await callContentKitLlm(prompt)
  const raw = extractJsonArray(text) as RawCarousel[]
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("LLM returned an empty tutorial carousel array")
  }

  const carousel = raw[0]
  if (!carousel.title || !Array.isArray(carousel.slides) || carousel.slides.length < 5) {
    throw new Error("LLM output failed validation: tutorial carousel was incomplete")
  }

  const shapedSlides = ensureTutorialShape(carousel.slides, keyword)
  const slides = await redesignTutorialSlides({
    slides: shapedSlides,
    topic,
    coverRefs,
    sceneRefs,
    sourceImages: sourceShoot.imageUrls,
    uploadedImages,
    uploadedOverlays,
  })
  const title = sanitizeGroundedText(carousel.title || `Tutorial carousel: ${topic}`).trim()
  const slug = (carousel.slug || title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
  const caption = sanitizeGroundedText(carousel.caption || "")

  await sql`
    ALTER TABLE content_carousels
    ADD COLUMN IF NOT EXISTS source_shoot_id integer,
    ADD COLUMN IF NOT EXISTS source_shoot_title text
  `
  const rows = (await sql`
    INSERT INTO content_carousels (title, slug, caption, slides, source_period_start, source_shoot_id, source_shoot_title)
    VALUES (${title}, ${slug}, ${caption}, ${JSON.stringify(slides)}, ${briefPeriodStart}, ${sourceShoot.id}, ${sourceShoot.title})
    RETURNING id, created_at
  `) as Array<{ id: number; created_at: string }>

  return [
    {
      id: rows[0].id,
      title,
      slug,
      caption,
      slides,
      status: "draft",
      sourceShootId: sourceShoot.id,
      sourceShootTitle: sourceShoot.title,
      sourcePeriodStart: briefPeriodStart,
      createdAt: new Date(rows[0].created_at).toISOString(),
    },
  ]
}

export async function listCarousels(limit = 20): Promise<CarouselDeck[]> {
  await sql`
    ALTER TABLE content_carousels
    ADD COLUMN IF NOT EXISTS source_shoot_id integer,
    ADD COLUMN IF NOT EXISTS source_shoot_title text
  `
  const rows = (await sql`
    SELECT id, title, slug, caption, slides, status, source_period_start, source_shoot_id, source_shoot_title, created_at
    FROM content_carousels
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as Array<any>
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    caption: row.caption,
    slides: row.slides,
    status: row.status,
    sourceShootId: row.source_shoot_id ?? null,
    sourceShootTitle: row.source_shoot_title ?? null,
    sourcePeriodStart: row.source_period_start
      ? new Date(row.source_period_start).toISOString().slice(0, 10)
      : null,
    createdAt: new Date(row.created_at).toISOString(),
  }))
}

export async function getCarousel(id: number): Promise<CarouselDeck | null> {
  await sql`
    ALTER TABLE content_carousels
    ADD COLUMN IF NOT EXISTS source_shoot_id integer,
    ADD COLUMN IF NOT EXISTS source_shoot_title text
  `
  const rows = (await sql`
    SELECT id, title, slug, caption, slides, status, source_period_start, source_shoot_id, source_shoot_title, created_at
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
    sourceShootId: row.source_shoot_id ?? null,
    sourceShootTitle: row.source_shoot_title ?? null,
    sourcePeriodStart: row.source_period_start
      ? new Date(row.source_period_start).toISOString().slice(0, 10)
      : null,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

export async function setCarouselStatus(id: number, status: "draft" | "approved" | "posted") {
  await sql`UPDATE content_carousels SET status = ${status} WHERE id = ${id}`
}

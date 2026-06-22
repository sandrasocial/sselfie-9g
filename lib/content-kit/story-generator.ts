import "server-only"

import { sql } from "@/lib/db/client"
import { callContentKitLlm, callContentKitVision, extractJsonArray } from "@/lib/content-kit/llm"
import { getShoot } from "@/lib/content-kit/shoot-generator"
import { listAdminSelfies } from "@/lib/content-kit/demo-generator"
import { getPublishedVaultCollectionBySourceShootId } from "@/lib/vault/published-collections"
import type { StorySequence, StorySlide } from "@/lib/content-kit/types"
import {
  audienceBlock,
  funnelBlock,
  noFakeBlock,
  proofBlock,
  sanitizeGroundedText,
  voiceBlock,
} from "@/lib/content/grounding"

// Condensed from Sandra's own Story Prompt Engineer spec:
// docs/funnel/STORY_SLIDE_DOCTRINE_2026-06-12.md (that doc wins on conflict).
const STORY_DOCTRINE = `
STORY DOCTRINE (Sandra's own framework, non-negotiable):
- Audience: women who secretly want to become visible online but fear being judged
  "while they're still becoming her". Visibility is the method, income the outcome,
  confidence the bridge. Core belief: a woman with a phone and a story is unstoppable.
- Sequences SELL THROUGH STORYTELLING, not constant teaching. 5 to 12 slides (roughly one
  per selected photo), each with a different emotional job, ALWAYS ending in the CTA, in this arc:
  hook (make her feel seen, bold + minimal) ->
  tension (name the hidden fear, intimate + honest) ->
  shift (new way of seeing it, a realization) ->
  proof OR teaching (credible / one tiny lesson) ->
  desire (paint the future identity, aspirational) ->
  bridge (the product as the natural next step, never salesy) ->
  cta (one clear action to a PAID offer).
- Slide text: SHORT lines, one idea per slide, readable in 2 seconds on a phone.
  Mark 1-2 lines per slide with "emphasis": true: the identity phrases ("visible
  online", "still becoming her", "You stop hiding"). Never more than 3 emphasized
  phrases per slide.
- The handwritten "note" is OPTIONAL and goes on only 2-4 slides, never all. When you use one
  it MUST be in Sandra's real voice (texting a close friend: lowercase, warm, short, human, never
  corporate, never a slogan) AND it must speak to THAT exact slide's moment. A generic or
  mismatched note is worse than none, so leave "note" out unless it genuinely deepens that slide.
  Do NOT reuse stock phrases; write a fresh line that sounds like her for that specific slide.
- CTA architecture (the FINAL slide, ALWAYS present, exactly this structure):
  line 1 (size "lead"): short desire question, e.g. "Want the full collection I used?"
  line 2 (size "support"): "DM me:"
  line 3 (size "keyword"): ONE keyword for a PAID offer only: VAULT (the Prompt Vault), PRESETS,
    or SUITE. Never a free keyword (no PROMPT, no KIT, no START).
  line 4 (size "support"): short warm reassurance, e.g. "and I'll send you the link."
  Every sequence MUST end with this CTA pointing to a paid offer.
- Never the word "reinvention". No em-dashes anywhere. No emoji unless one truly
  earns its place in a CTA.
`.trim()

type StoryRow = {
  id: number
  title: string
  topic: string
  slides: StorySlide[]
  status: "draft" | "approved" | "posted"
  created_at: string
}

function isAllowedImageUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com")
  } catch {
    return false
  }
}

async function resolveShootImages(sourceShootId?: number): Promise<{
  imageUrls: string[]
  title: string | null
  id: number | null
}> {
  if (!sourceShootId) return { imageUrls: [], title: null, id: null }
  const publishedCollection = await getPublishedVaultCollectionBySourceShootId(sourceShootId)
  const publishedImages =
    publishedCollection?.cards
      .map(card => card.exampleImage)
      .filter((url): url is string => Boolean(url)) ?? []
  if (publishedCollection && publishedImages.length >= 2) {
    return { imageUrls: publishedImages, title: publishedCollection.title, id: sourceShootId }
  }

  const shoot = await getShoot(sourceShootId)
  if (!shoot) throw new Error("Shoot not found")
  const imageUrls = shoot.shots
    .filter(shot => shot.status === "approved" && shot.imageUrl)
    .map(shot => shot.imageUrl as string)
  if (imageUrls.length < 2) {
    throw new Error("Approve at least 2 rendered shoot images before building a story sequence")
  }
  return { imageUrls, title: shoot.title, id: shoot.id }
}

function sanitizeSlides(slides: StorySlide[]): StorySlide[] {
  const clean = (value?: string) => (value ? sanitizeGroundedText(value).trim() : undefined)
  return slides.map(slide => {
    const lines = (slide.lines || [])
      .map(line => ({
        text: clean(line.text) || "",
        size: line.size === "keyword" || line.size === "support" ? line.size : ("lead" as const),
        emphasis: Boolean(line.emphasis),
      }))
      .filter(line => line.text.length > 0)
    // Guarantee one big serif statement per non-CTA slide, so an all-"support" slide (e.g. a list)
    // never renders entirely tiny. Promote the first line to lead.
    if (slide.role !== "cta" && lines.length > 0 && !lines.some(line => line.size === "lead")) {
      lines[0] = { ...lines[0], size: "lead" }
    }
    return {
      role: slide.role,
      note: clean(slide.note),
      lines,
    }
  })
}

// Every sequence must end with a CTA to a PAID offer (Sandra's rule). Guarantee exactly one CTA at
// the end, with a paid keyword, appending a default if the writer forgot one.
const PAID_CTA_KEYWORDS = new Set(["VAULT", "PRESETS", "SUITE"])

const DEFAULT_CTA_SLIDE: StorySlide = {
  role: "cta",
  lines: [
    { text: "Want the full collection I used?", size: "lead", emphasis: false },
    { text: "DM me:", size: "support", emphasis: false },
    { text: "VAULT", size: "keyword", emphasis: false },
    { text: "and I'll send you the link.", size: "support", emphasis: false },
  ],
}

function normalizeCta(cta: StorySlide): StorySlide {
  const lines = (cta.lines || []).map(line =>
    line.size === "keyword"
      ? {
          ...line,
          // Force the keyword onto a paid offer; the doctrine forbids free keywords here.
          text: PAID_CTA_KEYWORDS.has(line.text.trim().toUpperCase())
            ? line.text.trim().toUpperCase()
            : "VAULT",
        }
      : line
  )
  if (!lines.some(line => line.size === "keyword" && line.text.trim())) return DEFAULT_CTA_SLIDE
  return { ...cta, role: "cta", lines }
}

// Returns the story body (no CTA, capped to leave room) plus exactly one paid CTA as the last slide.
function assembleWithCta(slides: StorySlide[], targetTotal: number): StorySlide[] {
  const body = slides.filter(slide => slide.role !== "cta").slice(0, Math.max(targetTotal - 1, 1))
  const writerCta = slides.find(slide => slide.role === "cta")
  const cta = writerCta ? normalizeCta(writerCta) : DEFAULT_CTA_SLIDE
  return [...body, cta]
}

// STORY-OVERLAY-02: a vision pass reads each background and decides where the text should sit so it
// lands in the photo's clean negative space (away from the face), plus a smart-crop focal point and
// how much scrim it needs. The deterministic renderer then obeys these fields — the LLM proposes,
// the renderer (and later, Sandra's editor) disposes. We never regenerate the photo.
type OverlayPlacement = {
  textZone: "top" | "bottom"
  textAlign: "left" | "center" | "right"
  objectPosition: string
  scrimStrength: "light" | "medium" | "strong"
}

const DEFAULT_PLACEMENT: OverlayPlacement = {
  textZone: "bottom",
  textAlign: "left",
  objectPosition: "50% 50%",
  scrimStrength: "medium",
}

const OVERLAY_VISION_SYSTEM = "You are a precise visual layout analyst. Return only valid JSON."

const OVERLAY_VISION_PROMPT = `You are placing a text overlay on a vertical 1080x1920 (9:16) Instagram Story that uses this photo as the full-bleed background. The text must NEVER cover the person's face, eyes, or head.

Return ONLY this JSON, no commentary:
{
  "faceX": 0-100 (horizontal percent of the centre of the person's face),
  "faceY": 0-100 (vertical percent of the centre of the person's face; 0 = very top, 100 = very bottom),
  "subjectFillsFrame": true or false (true if the person fills most of the vertical frame so there is no clean empty band),
  "textAlign": "left" | "center" | "right" (the horizontal side with the most clean empty space, away from the face),
  "scrim": "light" | "medium" | "strong" (how much dark overlay the text needs to stay readable: light if the text area is dark and simple, strong if bright or busy)
}

faceY is the single most important value: the text is placed in the OPPOSITE half of the frame from the face. If the face is in the top half, text goes to the bottom; if the face is in the bottom half, text goes to the top. Look carefully and report the real face position.`

function clampPct(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return 50
  return Math.max(0, Math.min(100, Math.round(n)))
}

function parsePlacement(raw: string): OverlayPlacement {
  const start = raw.indexOf("{")
  const end = raw.lastIndexOf("}")
  if (start === -1 || end === -1) return DEFAULT_PLACEMENT
  let obj: any
  try {
    obj = JSON.parse(raw.slice(start, end + 1))
  } catch {
    return DEFAULT_PLACEMENT
  }
  const faceX = clampPct(obj?.faceX)
  const faceY = clampPct(obj?.faceY)
  const subjectFillsFrame = obj?.subjectFillsFrame === true
  const scrim = obj?.scrim === "light" || obj?.scrim === "strong" ? obj.scrim : "medium"
  return {
    // Deterministic: text always sits in the opposite vertical half from the face, so it can never
    // cover her face. This is far more reliable than letting the model free-choose a zone.
    textZone: faceY < 50 ? "bottom" : "top",
    textAlign: obj?.textAlign === "center" ? "center" : obj?.textAlign === "right" ? "right" : "left",
    objectPosition: `${faceX}% ${faceY}%`,
    // A subject that fills the frame has no clean band, so the text needs a stronger scrim to read.
    scrimStrength: subjectFillsFrame ? "strong" : scrim,
  }
}

function analyzeBackgroundForOverlay(
  url: string,
  cache: Map<string, Promise<OverlayPlacement>>
): Promise<OverlayPlacement> {
  const cached = cache.get(url)
  if (cached) return cached
  const promise = callContentKitVision(OVERLAY_VISION_PROMPT, [url], OVERLAY_VISION_SYSTEM)
    .then(parsePlacement)
    .catch(() => DEFAULT_PLACEMENT)
  cache.set(url, promise)
  return promise
}

async function compositeStorySlides({
  slides,
  backgroundUrls,
  overlayUrls,
}: {
  slides: StorySlide[]
  backgroundUrls: string[]
  overlayUrls: string[]
}): Promise<StorySlide[]> {
  const backgrounds = backgroundUrls.filter(isAllowedImageUrl)
  const proof = overlayUrls.filter(isAllowedImageUrl)

  // First pass (sync, deterministic order): resolve the background + any proof image per slide.
  let proofCursor = 0
  const base = slides.map((slide, index) => {
    // Respect the admin-selected order; cycle if there are fewer backgrounds than slides.
    const imageUrl =
      backgrounds.length > 0 ? backgrounds[index % backgrounds.length] : slide.imageUrl
    const wantsProof = slide.role === "proof" || slide.role === "teaching"
    const overlayAssets =
      wantsProof && proofCursor < proof.length
        ? [{ url: proof[proofCursor++], placement: "middle-right" as const }]
        : undefined
    return { slide, imageUrl, overlayAssets }
  })

  // Second pass (parallel, cached per URL): vision placement. CTA stays centered + bottom (the
  // keyword is the hero); other slides follow the vision pass. Falls back to safe defaults on error.
  const placementCache = new Map<string, Promise<OverlayPlacement>>()
  return Promise.all(
    base.map(async ({ slide, imageUrl, overlayAssets }) => {
      const isCta = slide.role === "cta"
      const placement =
        imageUrl && !isCta ? await analyzeBackgroundForOverlay(imageUrl, placementCache) : DEFAULT_PLACEMENT
      return {
        ...slide,
        imageUrl,
        headlineRender: "composited" as const,
        textZone: isCta ? ("bottom" as const) : placement.textZone,
        textAlign: isCta ? ("center" as const) : placement.textAlign,
        objectPosition: placement.objectPosition,
        scrimStrength: placement.scrimStrength,
        overlayAssets,
      }
    })
  )
}

export async function generateStorySequence(input: {
  topic: string
  sourceShootId?: number
  imageUrls?: string[]
  overlayUrls?: string[]
}): Promise<StorySequence> {
  const topic = input.topic.trim()
  if (topic.length < 5) throw new Error("Tell me the story idea first")
  const sourceShoot = await resolveShootImages(input.sourceShootId)
  const selectedImageUrls = (input.imageUrls ?? []).filter(isAllowedImageUrl)
  const imageUrls = (
    selectedImageUrls.length > 0 ? selectedImageUrls : sourceShoot.imageUrls
  ).slice(0, 12)
  const overlayUrls = (input.overlayUrls ?? []).filter(isAllowedImageUrl).slice(0, 12)
  // One slide per selected photo (incl. the final CTA), clamped to a sane range.
  const targetSlides = Math.max(5, Math.min(12, imageUrls.length || 6))

  const prompt = `You are Sandra's Instagram Story strategist for @sandra.social (selfie education, AI-assisted brand imagery from one selfie, personal branding for women).

${voiceBlock()}

${noFakeBlock()}

${audienceBlock()}

${proofBlock()}

${funnelBlock()}

${STORY_DOCTRINE}

TODAY'S STORY IDEA (from Sandra): ${topic}
${sourceShoot.title ? `\nSOURCE PHOTOSHOOT CONTEXT: "${sourceShoot.title}". Sandra may have selected only some images from this shoot. Write this as story copy layered onto the selected image backgrounds, so it feels like the story version of those exact visuals, not a separate design.` : ""}

NO-FAKE REMINDER FOR THE DESIRE/BRIDGE BEAT:
Identity content must never imply she becomes someone else. The promise is "Look like yourself, at your best." Use story to create recognition and permission, then bridge to the keyword/capture mechanic.

PROOF REMINDER:
Stories support the funnel. Use them to warm desire, handle the fake fear, and point to the right keyword or Vault step when the sequence earns it.

Write the story across exactly ${targetSlides} slides following the doctrine arc. The FINAL slide MUST be the CTA slide (role "cta") with a keyword for a PAID offer (VAULT, PRESETS, or SUITE). Line sizes: "lead" = the big serif statement (max 16 words), "support" = smaller context line (max 18 words), "keyword" = only the CTA keyword. 1-3 lines per slide (CTA slide has 4).

Return ONLY a JSON array of slides, no commentary:
[
  { "role": "hook", "lines": [ { "text": "...", "size": "lead", "emphasis": true }, { "text": "...", "size": "support" } ], "note": "..." },
  { "role": "cta", "lines": [ { "text": "Want the full collection I used?", "size": "lead" }, { "text": "DM me:", "size": "support" }, { "text": "VAULT", "size": "keyword" }, { "text": "and I'll send you the link.", "size": "support" } ] }
]`

  const text = await callContentKitLlm(prompt)
  const raw = extractJsonArray(text) as StorySlide[]
  if (!Array.isArray(raw) || raw.length < 4) throw new Error("LLM returned too few story slides")

  const fallbackSelfies = imageUrls.length
    ? []
    : await listAdminSelfies().catch(() => [] as string[])
  const slides = await compositeStorySlides({
    slides: assembleWithCta(sanitizeSlides(raw.slice(0, 12)), targetSlides),
    backgroundUrls: [...imageUrls, ...fallbackSelfies],
    overlayUrls,
  })
  const title = topic.slice(0, 90)
  await sql`
    ALTER TABLE content_story_sequences
    ADD COLUMN IF NOT EXISTS source_shoot_id integer,
    ADD COLUMN IF NOT EXISTS source_shoot_title text
  `
  const rows = (await sql`
    INSERT INTO content_story_sequences (title, topic, slides, source_shoot_id, source_shoot_title)
    VALUES (${title}, ${topic}, ${JSON.stringify(slides)}, ${sourceShoot.id}, ${sourceShoot.title})
    RETURNING id, created_at
  `) as Array<{ id: number; created_at: string }>

  return {
    id: rows[0].id,
    title,
    topic,
    slides,
    status: "draft",
    sourceShootId: sourceShoot.id,
    sourceShootTitle: sourceShoot.title,
    createdAt: new Date(rows[0].created_at).toISOString(),
  }
}

export async function listStorySequences(limit = 20): Promise<StorySequence[]> {
  await sql`
    ALTER TABLE content_story_sequences
    ADD COLUMN IF NOT EXISTS source_shoot_id integer,
    ADD COLUMN IF NOT EXISTS source_shoot_title text
  `
  const rows = (await sql`
    SELECT id, title, topic, slides, status, source_shoot_id, source_shoot_title, created_at
    FROM content_story_sequences
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as StoryRow[]
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    topic: row.topic,
    slides: row.slides,
    status: row.status,
    sourceShootId: (row as any).source_shoot_id ?? null,
    sourceShootTitle: (row as any).source_shoot_title ?? null,
    createdAt: new Date(row.created_at).toISOString(),
  }))
}

export async function getStorySequence(id: number): Promise<StorySequence | null> {
  await sql`
    ALTER TABLE content_story_sequences
    ADD COLUMN IF NOT EXISTS source_shoot_id integer,
    ADD COLUMN IF NOT EXISTS source_shoot_title text
  `
  const rows = (await sql`
    SELECT id, title, topic, slides, status, source_shoot_id, source_shoot_title, created_at
    FROM content_story_sequences
    WHERE id = ${id}
    LIMIT 1
  `) as StoryRow[]
  if (!rows[0]) return null
  const row = rows[0]
  return {
    id: row.id,
    title: row.title,
    topic: row.topic,
    slides: row.slides,
    status: row.status,
    sourceShootId: (row as any).source_shoot_id ?? null,
    sourceShootTitle: (row as any).source_shoot_title ?? null,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

// STORY-OVERLAY-03: persist hand-edited slides from the admin editor. Cleans the text but PRESERVES
// every placement field (zone/align/crop/scrim/scale/offset/image/overlays) so Sandra's manual
// edits survive. Always "composited" — the editor never bakes.
function clampNum(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

function sanitizeEditedSlides(slides: unknown): StorySlide[] {
  if (!Array.isArray(slides)) throw new Error("slides must be an array")
  const clean = (value?: unknown) =>
    typeof value === "string" && value.trim() ? sanitizeGroundedText(value).trim() : undefined
  return slides.slice(0, 12).map((raw: any) => {
    const lines = (Array.isArray(raw?.lines) ? raw.lines : [])
      .map((line: any) => ({
        text: clean(line?.text) || "",
        size:
          line?.size === "keyword" || line?.size === "support" ? line.size : ("lead" as const),
        emphasis: Boolean(line?.emphasis),
      }))
      .filter((line: { text: string }) => line.text.length > 0)
    if (raw?.role !== "cta" && lines.length > 0 && !lines.some((l: any) => l.size === "lead")) {
      lines[0] = { ...lines[0], size: "lead" }
    }
    const imageUrl = typeof raw?.imageUrl === "string" && isAllowedImageUrl(raw.imageUrl) ? raw.imageUrl : undefined
    const overlayAssets = Array.isArray(raw?.overlayAssets)
      ? raw.overlayAssets
          .filter((a: any) => typeof a?.url === "string" && isAllowedImageUrl(a.url))
          .map((a: any) => ({ url: a.url, placement: a.placement, label: a.label, fit: a.fit }))
      : undefined
    return {
      role: raw?.role,
      lines,
      note: clean(raw?.note),
      imageUrl,
      headlineRender: "composited" as const,
      textZone: raw?.textZone === "top" ? ("top" as const) : ("bottom" as const),
      textAlign:
        raw?.textAlign === "center" ? "center" : raw?.textAlign === "right" ? "right" : "left",
      objectPosition: typeof raw?.objectPosition === "string" ? raw.objectPosition : "50% 50%",
      scrimStrength:
        raw?.scrimStrength === "light" || raw?.scrimStrength === "strong"
          ? raw.scrimStrength
          : "medium",
      textScale: clampNum(raw?.textScale, 0.6, 1.6, 1),
      textOffsetX: Math.round(clampNum(raw?.textOffsetX, -480, 480, 0)),
      textOffsetY: Math.round(clampNum(raw?.textOffsetY, -900, 900, 0)),
      overlayAssets,
    }
  })
}

export async function updateStorySlides(id: number, slides: unknown): Promise<StorySequence | null> {
  const safe = sanitizeEditedSlides(slides)
  await sql`UPDATE content_story_sequences SET slides = ${JSON.stringify(safe)} WHERE id = ${id}`
  return getStorySequence(id)
}

export async function setStoryStatus(id: number, status: "draft" | "approved" | "posted") {
  await sql`UPDATE content_story_sequences SET status = ${status} WHERE id = ${id}`
}

export async function deleteStorySequence(id: number) {
  await sql`DELETE FROM content_story_sequences WHERE id = ${id}`
}

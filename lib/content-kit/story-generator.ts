import "server-only"

import { sql } from "@/lib/db/client"
import { callContentKitLlm, extractJsonArray } from "@/lib/content-kit/llm"
import { getShoot } from "@/lib/content-kit/shoot-generator"
import { listAdminSelfies } from "@/lib/content-kit/demo-generator"
import { getPublishedVaultCollectionBySourceShootId } from "@/lib/vault/published-collections"
import {
  pickContentStyleReference,
  redesignContentSlide,
} from "@/lib/content-kit/slide-redesign-generator"
import type { CarouselSlide, StorySequence, StorySlide } from "@/lib/content-kit/types"
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
- Sequences SELL THROUGH STORYTELLING, not constant teaching. 5-8 slides, each with a
  different emotional job, in this arc:
  hook (make her feel seen, bold + minimal) ->
  tension (name the hidden fear, intimate + honest) ->
  shift (new way of seeing it, a realization) ->
  proof OR teaching (credible / one tiny lesson) ->
  desire (paint the future identity, aspirational) ->
  bridge (the product as the natural next step, never salesy) ->
  cta (one clear action).
- Slide text: SHORT lines, one idea per slide, readable in 2 seconds on a phone.
  Mark 1-2 lines per slide with "emphasis": true: the identity phrases ("visible
  online", "still becoming her", "You stop hiding"). Never more than 3 emphasized
  phrases per slide.
- Each slide may carry ONE tiny handwritten note (field "note") that deepens the
  emotion: "this is the part nobody says", "I get it", "this is the shift",
  "main character, but real", "I'll send it". Use on 3-5 slides, not all.
- CTA architecture (last slide, exactly this structure):
  line 1 (size "lead"): short desire question, e.g. "Want the exact prompts I used?"
  line 2 (size "support"): "DM me:"
  line 3 (size "keyword"): ONE keyword: PROMPT, KIT or START
  line 4 (size "support"): short reassurance, e.g. "and I'll send them over."
  note: "I'll send it"
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
      .map((card) => card.exampleImage)
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
  return slides.map(slide => ({
    role: slide.role,
    note: clean(slide.note),
    lines: (slide.lines || [])
      .map(line => ({
        text: clean(line.text) || "",
        size: line.size === "keyword" || line.size === "support" ? line.size : ("lead" as const),
        emphasis: Boolean(line.emphasis),
      }))
      .filter(line => line.text.length > 0),
  }))
}

function storySlideToCarouselSlide(slide: StorySlide, index: number): CarouselSlide {
  const lead = slide.lines.filter(line => line.size === "lead" || line.size === "keyword")
  const support = slide.lines.filter(line => line.size === "support")
  return {
    kind: index === 0 ? "hook" : slide.role === "cta" ? "cta" : "photo",
    eyebrow: slide.note || slide.role,
    title: lead.map(line => line.text).join(" "),
    body: support.map(line => line.text).join(" "),
  }
}

async function redesignStorySlides({
  slides,
  topic,
  referenceUrls,
}: {
  slides: StorySlide[]
  topic: string
  referenceUrls: string[]
}): Promise<StorySlide[]> {
  const style = await pickContentStyleReference("story-sequence")
  if (!style) throw new Error("No story-sequence style references found")
  const pool = referenceUrls.filter(isAllowedImageUrl)
  if (pool.length === 0) throw new Error("No story reference image available")

  return Promise.all(
    slides.map(async (slide, index) => {
      const imageUrl = await redesignContentSlide({
        referenceUrl: pool[index % pool.length],
        styleReferenceUrl: style.imageUrl,
        styleLabel: style.label,
        category: "story-sequence",
        topic,
        slide: storySlideToCarouselSlide(slide, index),
      })
      return {
        ...slide,
        imageUrl,
        headlineRender: "baked" as const,
        overlayAssets: undefined,
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
  const imageUrls = [
    ...sourceShoot.imageUrls,
    ...(input.imageUrls ?? []).filter(isAllowedImageUrl),
  ].slice(0, 8)
  const overlayUrls = (input.overlayUrls ?? []).filter(isAllowedImageUrl).slice(0, 8)

  const prompt = `You are Sandra's Instagram Story strategist for @sandra.social (selfie education, AI-assisted brand imagery from one selfie, personal branding for women).

${voiceBlock()}

${noFakeBlock()}

${audienceBlock()}

${proofBlock()}

${funnelBlock()}

${STORY_DOCTRINE}

TODAY'S STORY IDEA (from Sandra): ${topic}
${sourceShoot.title ? `\nSOURCE PHOTOSHOOT (visual source of truth): "${sourceShoot.title}". Write this as story copy layered onto that same approved photoshoot, so it feels like the story version of the shoot, not a separate design.` : ""}

NO-FAKE REMINDER FOR THE DESIRE/BRIDGE BEAT:
Identity content must never imply she becomes someone else. The promise is "Look like yourself, at your best." Use story to create recognition and permission, then bridge to the keyword/capture mechanic.

PROOF REMINDER:
Stories support the funnel. Use them to warm desire, handle the fake fear, and point to the right keyword or Vault step when the sequence earns it.

Write ONE story sequence (5-8 slides) following the doctrine arc. Line sizes: "lead" = the big serif statement (max 16 words), "support" = smaller context line (max 18 words), "keyword" = only the CTA keyword. 1-3 lines per slide (CTA slide has 4).

Return ONLY a JSON array of slides, no commentary:
[
  { "role": "hook", "lines": [ { "text": "...", "size": "lead", "emphasis": true }, { "text": "...", "size": "support" } ], "note": "..." },
  { "role": "cta", "lines": [ { "text": "Want ...?", "size": "lead" }, { "text": "DM me:", "size": "support" }, { "text": "PROMPT", "size": "keyword" }, { "text": "and I'll send them over.", "size": "support" } ], "note": "I'll send it" }
]`

  const text = await callContentKitLlm(prompt)
  const raw = extractJsonArray(text) as StorySlide[]
  if (!Array.isArray(raw) || raw.length < 4) throw new Error("LLM returned too few story slides")

  const fallbackSelfies = imageUrls.length
    ? []
    : await listAdminSelfies().catch(() => [] as string[])
  const slides = await redesignStorySlides({
    slides: sanitizeSlides(raw.slice(0, 8)),
    topic,
    referenceUrls: [...imageUrls, ...overlayUrls, ...fallbackSelfies],
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

export async function setStoryStatus(id: number, status: "draft" | "approved" | "posted") {
  await sql`UPDATE content_story_sequences SET status = ${status} WHERE id = ${id}`
}

export async function deleteStorySequence(id: number) {
  await sql`DELETE FROM content_story_sequences WHERE id = ${id}`
}

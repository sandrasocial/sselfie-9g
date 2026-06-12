import "server-only"

import { sql } from "@/lib/db/client"
import { callContentKitLlm, extractJsonArray } from "@/lib/content-kit/llm"
import { SANDRA_VOICE_RULES } from "@/lib/content-engine/brief-generator"
import type { StorySequence, StorySlide } from "@/lib/content-kit/types"

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

function sanitizeSlides(slides: StorySlide[], imageUrls: string[]): StorySlide[] {
  const clean = (value?: string) => value?.replace(/—/g, ":").trim()
  return slides.map((slide, index) => ({
    role: slide.role,
    note: clean(slide.note),
    lines: (slide.lines || [])
      .map((line) => ({
        text: clean(line.text) || "",
        size: line.size === "keyword" || line.size === "support" ? line.size : ("lead" as const),
        emphasis: Boolean(line.emphasis),
      }))
      .filter((line) => line.text.length > 0),
    // One photoshoot, rotated across slides. Identity preservation is structural:
    // the photo is the untouched background layer, never re-generated.
    imageUrl: imageUrls.length > 0 ? imageUrls[index % imageUrls.length] : undefined,
  }))
}

export async function generateStorySequence(input: {
  topic: string
  imageUrls?: string[]
}): Promise<StorySequence> {
  const topic = input.topic.trim()
  if (topic.length < 5) throw new Error("Tell me the story idea first")
  const imageUrls = (input.imageUrls ?? []).filter(isAllowedImageUrl).slice(0, 8)

  const prompt = `You are Sandra's Instagram Story strategist for @sandra.social (selfie education, AI photoshoots from one selfie, personal branding for women).

${SANDRA_VOICE_RULES}

${STORY_DOCTRINE}

TODAY'S STORY IDEA (from Sandra): ${topic}

Write ONE story sequence (5-8 slides) following the doctrine arc. Line sizes: "lead" = the big serif statement (max 16 words), "support" = smaller context line (max 18 words), "keyword" = only the CTA keyword. 1-3 lines per slide (CTA slide has 4).

Return ONLY a JSON array of slides, no commentary:
[
  { "role": "hook", "lines": [ { "text": "...", "size": "lead", "emphasis": true }, { "text": "...", "size": "support" } ], "note": "..." },
  { "role": "cta", "lines": [ { "text": "Want ...?", "size": "lead" }, { "text": "DM me:", "size": "support" }, { "text": "PROMPT", "size": "keyword" }, { "text": "and I'll send them over.", "size": "support" } ], "note": "I'll send it" }
]`

  const text = await callContentKitLlm(prompt)
  const raw = extractJsonArray(text) as StorySlide[]
  if (!Array.isArray(raw) || raw.length < 4) throw new Error("LLM returned too few story slides")

  const slides = sanitizeSlides(raw.slice(0, 8), imageUrls)
  const title = topic.slice(0, 90)
  const rows = (await sql`
    INSERT INTO content_story_sequences (title, topic, slides)
    VALUES (${title}, ${topic}, ${JSON.stringify(slides)})
    RETURNING id, created_at
  `) as Array<{ id: number; created_at: string }>

  return {
    id: rows[0].id,
    title,
    topic,
    slides,
    status: "draft",
    createdAt: new Date(rows[0].created_at).toISOString(),
  }
}

export async function listStorySequences(limit = 20): Promise<StorySequence[]> {
  const rows = (await sql`
    SELECT id, title, topic, slides, status, created_at
    FROM content_story_sequences
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as StoryRow[]
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    topic: row.topic,
    slides: row.slides,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
  }))
}

export async function getStorySequence(id: number): Promise<StorySequence | null> {
  const rows = (await sql`
    SELECT id, title, topic, slides, status, created_at
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
    createdAt: new Date(row.created_at).toISOString(),
  }
}

export async function setStoryStatus(id: number, status: "draft" | "approved" | "posted") {
  await sql`UPDATE content_story_sequences SET status = ${status} WHERE id = ${id}`
}

export async function deleteStorySequence(id: number) {
  await sql`DELETE FROM content_story_sequences WHERE id = ${id}`
}

import "server-only"

import OpenAI, { toFile } from "openai"
import sharp from "sharp"
import { put } from "@vercel/blob"
import { sql } from "@/lib/db/client"
import { SANDRA_VOICE_RULES } from "@/lib/content-engine/brief-generator"
import { callContentKitLlm, callContentKitVision } from "@/lib/content-kit/llm"
import type { Shoot, ShootMessage, ShootShot } from "@/lib/content-kit/types"

// SHOOT-STUDIO-01: Sandra's real workflow, automated. Inspiration images + her selfie →
// vault-anatomy shot prompts (the comment-PROMPT giveaway asset) → gpt-image-2 edit with
// the selfie as identity anchor and the inspiration images as style ground truth.
// Same flagship pipeline as app-v3 (app/api/app-v3/maya/generate/route.ts).

const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"
const PORTRAIT_SIZE = process.env.APP_V3_PORTRAIT_SIZE || "1024x1536"
const SHOTS_PER_SHOOT = 4

// Prepended at GENERATION time only — never stored in the shareable prompt. The shareable
// prompt says "uploaded reference photos" (the buyer's own selfie in ChatGPT); here we
// attach selfie + inspiration together, so the image roles must be explicit or the model
// could lift a face from the inspiration. Structural no-fake guard, not prompt-dependent.
const IMAGE_ROLE_GUARD =
  "Image roles for this generation: the FIRST input image is the woman whose face, identity, skin tone, hair color and body must be preserved exactly, natural and recognizable. Every other input image is a style reference ONLY, for outfit, location, light, color grading and mood. Never copy a face, skin, hair color or body from the style references."

const IDENTITY_GUARD =
  "Keep the face natural, recognizable and completely true to the first reference image. Do not alter facial features, skin texture or identity."

function isAllowedUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com")
  } catch {
    return false
  }
}

function stripEmDashes(text: string): string {
  return text.replace(/—/g, ":")
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

async function readImage(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Could not load an input image")
  const contentType = res.headers.get("content-type") || ""
  if (!contentType.startsWith("image/")) throw new Error("Input URL did not return an image")
  return Buffer.from(await res.arrayBuffer())
}

async function normalizeForOpenAI(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer, { animated: false })
    .rotate()
    .resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer()
}

// ── Prompt writing ──────────────────────────────────────────────────────────────

// Condensed from .agents/skills/vault-prompt-writer/SKILL.md (the committed skill is the
// source of truth — keep this block aligned with it).
const VAULT_ANATOMY = `Each shot prompt must follow the SSELFIE vault anatomy, in this exact order, each section a labeled paragraph:
1. Series header: "Create image N of a ${SHOTS_PER_SHOOT}-part [collection name] editorial photoshoot." (shot 2+ : "Create image N of the same [collection name] editorial photoshoot.")
2. Identity lock, verbatim: "Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, face shape, skin tone, natural skin texture, body proportions, age, hair color, and overall look from the reference photos."
3. "Scene:" location, architecture, materials, light quality.
4. "Outfit:" every garment with fabric, fit, color, finish, shoes, bag. Specific, never vague.
5. "Hair:" style + movement, ending with "Keep the person's natural hair color from the uploaded reference photos."
6. "Makeup:" finish-first, named tones, "polished, not heavy glam".
7. "Accessories/props:" what is in hand or worn, plus explicit exclusions ("No phone").
8. "Pose:" body position, each hand, head angle, expression. Mid-motion beats static.
9. "Camera + lens:" "shot on Canon EOS R5 with a [35mm/50mm/85mm] lens", framing, "no wide-angle distortion".
10. "Camera angle:" height and distance.
11. "Composition:" "vertical 9:16", subject placement, background, leading lines.
12. "Body proportion lock:" (full/three-quarter shots) natural head size, leg length, torso, hips, shoulders; avoid stretched legs, tiny head, warped feet, runway exaggeration.
13. "Mood:" 3-5 short phrases.
14. "Color grading:" named palette per surface, saturation level, "subtle film grain", editorial contrast.
15. "Image quality:" "vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp editorial sharpness, no blur, no low-resolution softness, no compression haze."
16. "Avoid:" comma list, always including: distorted hands, extra fingers, plastic skin, heavy glam makeup, cartoonish AI style, CGI, blur, random logos. Plus shot-specific failure modes.

Series consistency: ONE shoot means same outfit, hair, makeup, location and grade in every shot. Only Scene details, Accessories/props, Pose, Camera and Composition vary. Shot arc: arrival/establishing, lifestyle action, seated or still hero, close-up or detail.

The prompts must work for ANY woman pasting them into ChatGPT with her own selfie. Never reference a specific person. No em-dashes anywhere. No-fake doctrine: realistic, recognizable, true-to-you; never "perfect face", "flawless skin", "look rich", "no one will know".`

const SHOOT_JSON_CONTRACT = `Respond with ONLY a JSON object, no commentary:
{
  "title": "Collection name, 2-4 words, editorial (e.g. 'Quiet Luxury London')",
  "shots": [
    {
      "title": "Collection Name · Shot Name",
      "whenToUse": "1-2 sentences in Sandra's voice: where to post it, what caption energy.",
      "mood": "five · dot · separated · lowercase · tags",
      "prompt": "the full vault-anatomy prompt"
    }
  ]
}
Exactly ${SHOTS_PER_SHOOT} shots.`

function buildCreatePrompt(notes?: string): string {
  return `You are SSELFIE's vault prompt writer. Study the attached inspiration images: the style, vibe, outfit, makeup, hair, accessories, location, light and color grade. Then write a ${SHOTS_PER_SHOOT}-shot editorial photoshoot that recreates EXACTLY that world, as copy-paste ChatGPT prompts.

${notes ? `Sandra's direction for this shoot: ${notes}\n\n` : ""}${VAULT_ANATOMY}

${SANDRA_VOICE_RULES}

${SHOOT_JSON_CONTRACT}`
}

function extractJsonObject(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")
  if (start === -1 || end === -1) throw new Error("LLM response contained no JSON object")
  return JSON.parse(candidate.slice(start, end + 1))
}

function sanitizeShots(raw: any[]): Omit<ShootShot, "id" | "status">[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("LLM returned no shots")
  return raw.slice(0, SHOTS_PER_SHOOT).map((shot) => {
    if (typeof shot?.prompt !== "string" || shot.prompt.trim().length < 200) {
      throw new Error("LLM returned an incomplete shot prompt")
    }
    return {
      title: stripEmDashes(String(shot.title || "Untitled shot")).trim(),
      whenToUse: stripEmDashes(String(shot.whenToUse || "")).trim(),
      mood: stripEmDashes(String(shot.mood || "")).trim(),
      prompt: stripEmDashes(shot.prompt).trim(),
    }
  })
}

// ── Image generation ────────────────────────────────────────────────────────────

type ImgQuality = "low" | "medium" | "high"

async function generateShotImage(input: {
  selfieUrl: string
  inspirationUrls: string[]
  prompt: string
  quality: ImgQuality
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured")
  const openai = new OpenAI({ apiKey })

  // Selfie FIRST (identity), inspiration after (style). Cap 4 total inputs.
  const urls = [input.selfieUrl, ...input.inspirationUrls].slice(0, 4)
  const files = await Promise.all(
    urls.map(async (url, i) =>
      toFile(await normalizeForOpenAI(await readImage(url)), `shoot-input-${i}.png`, { type: "image/png" }),
    ),
  )

  const fullPrompt = `${IMAGE_ROLE_GUARD}\n\n${input.prompt}\n\n${IDENTITY_GUARD}`
  const editInput: Record<string, unknown> = {
    model: OPENAI_IMAGE_MODEL,
    image: files.length === 1 ? files[0] : files,
    prompt: fullPrompt,
    n: 1,
    size: PORTRAIT_SIZE,
    quality: input.quality,
    output_format: "png",
  }
  if (OPENAI_IMAGE_MODEL !== "gpt-image-2") editInput.input_fidelity = "high"

  const response = await openai.images.edit(editInput as any)
  const b64 = response.data?.[0]?.b64_json
  if (!b64) throw new Error("No image data returned from OpenAI")

  const blob = await put(`content-kit/shoots/${Date.now()}-${Math.floor(Math.random() * 1e6)}.png`, Buffer.from(b64, "base64"), {
    access: "public",
    contentType: "image/png",
  })
  return blob.url
}

// ── Row mapping + persistence ───────────────────────────────────────────────────

function mapRow(row: any): Shoot {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    inspirationUrls: Array.isArray(row.inspiration_urls) ? row.inspiration_urls : [],
    selfieUrl: row.selfie_url,
    shots: Array.isArray(row.shots) ? row.shots : [],
    messages: Array.isArray(row.messages) ? row.messages : [],
    createdAt: new Date(row.created_at).toISOString(),
  }
}

async function saveShots(id: number, shots: ShootShot[], messages?: ShootMessage[]) {
  if (messages) {
    await sql`
      UPDATE content_shoots
      SET shots = ${JSON.stringify(shots)}::jsonb, messages = ${JSON.stringify(messages)}::jsonb, updated_at = NOW()
      WHERE id = ${id}
    `
  } else {
    await sql`
      UPDATE content_shoots SET shots = ${JSON.stringify(shots)}::jsonb, updated_at = NOW() WHERE id = ${id}
    `
  }
}

export async function listShoots(limit = 20): Promise<Shoot[]> {
  const rows = (await sql`
    SELECT * FROM content_shoots WHERE status != 'archived' ORDER BY created_at DESC LIMIT ${limit}
  `) as any[]
  return rows.map(mapRow)
}

export async function getShoot(id: number): Promise<Shoot | null> {
  const rows = (await sql`SELECT * FROM content_shoots WHERE id = ${id} LIMIT 1`) as any[]
  return rows.length ? mapRow(rows[0]) : null
}

// ── Actions ─────────────────────────────────────────────────────────────────────

export async function createShoot(input: {
  inspirationUrls: string[]
  selfieUrl: string
  notes?: string
}): Promise<Shoot> {
  const inspirationUrls = input.inspirationUrls.filter(isAllowedUrl).slice(0, 3)
  if (inspirationUrls.length === 0) throw new Error("Add at least one inspiration image")
  if (!isAllowedUrl(input.selfieUrl)) throw new Error("Pick one of your selfies")

  const raw = await callContentKitVision(buildCreatePrompt(input.notes?.trim() || undefined), inspirationUrls)
  const parsed = extractJsonObject(raw)
  const title = stripEmDashes(String(parsed.title || "Untitled shoot")).trim()
  const drafts = sanitizeShots(parsed.shots)

  const shots: ShootShot[] = drafts.map((shot, i) => ({ ...shot, id: `shot-${i + 1}`, status: "draft" }))
  const messages: ShootMessage[] = [
    ...(input.notes?.trim()
      ? [{ role: "sandra" as const, text: input.notes.trim(), at: new Date().toISOString() }]
      : []),
    {
      role: "agent",
      text: `Here's "${title}": ${shots.length} shots in that exact world. Generating the photos now. Kill what misses, approve what's you, or tell me what to change.`,
      at: new Date().toISOString(),
    },
  ]

  const rows = (await sql`
    INSERT INTO content_shoots (title, slug, inspiration_urls, selfie_url, shots, messages)
    VALUES (${title}, ${toSlug(title)}, ${JSON.stringify(inspirationUrls)}::jsonb, ${input.selfieUrl},
            ${JSON.stringify(shots)}::jsonb, ${JSON.stringify(messages)}::jsonb)
    RETURNING *
  `) as any[]
  const shoot = mapRow(rows[0])

  // Draft pass renders medium (~82s, ~$0.06/shot). Finals re-roll high per shot.
  const results = await Promise.allSettled(
    shoot.shots.map((shot) =>
      generateShotImage({ selfieUrl: shoot.selfieUrl, inspirationUrls, prompt: shot.prompt, quality: "medium" }),
    ),
  )
  shoot.shots = shoot.shots.map((shot, i) => {
    const r = results[i]
    return r.status === "fulfilled" ? { ...shot, imageUrl: r.value } : shot
  })
  const failures = results.filter((r) => r.status === "rejected").length
  if (failures > 0) {
    console.error(`[shoot-studio] ${failures}/${results.length} shot generations failed for shoot ${shoot.id}`)
    shoot.messages = [
      ...shoot.messages,
      {
        role: "agent",
        text: `${failures} shot${failures > 1 ? "s" : ""} didn't render. Hit regenerate on the empty card${failures > 1 ? "s" : ""} and I'll re-run ${failures > 1 ? "them" : "it"}.`,
        at: new Date().toISOString(),
      },
    ]
  }
  await saveShots(shoot.id, shoot.shots, shoot.messages)
  return shoot
}

const REFINE_CONTRACT = `Respond with ONLY a JSON object:
{
  "reply": "1-2 sentences back to Sandra in her own voice (warm, close friend, contractions).",
  "shots": [ { "id": "shot-1", "title": "...", "whenToUse": "...", "mood": "...", "prompt": "..." } ]
}
Return ALL shots, every field, even untouched ones. Apply Sandra's change everywhere it logically applies (an outfit change applies to every shot; "make shot 3 a close-up" applies to one). Keep the vault anatomy intact in every prompt. No em-dashes.`

export async function refineShoot(id: number, message: string): Promise<Shoot> {
  const shoot = await getShoot(id)
  if (!shoot) throw new Error("Shoot not found")
  const ask = message.trim()
  if (!ask) throw new Error("Say what you want changed")

  const raw = await callContentKitLlm(
    `You are SSELFIE's vault prompt writer, refining the photoshoot "${shoot.title}" for Sandra.

Current shots JSON:
${JSON.stringify(shoot.shots.map(({ imageUrl, status, ...rest }) => rest), null, 2)}

Sandra says: "${ask}"

${VAULT_ANATOMY}

${SANDRA_VOICE_RULES}

${REFINE_CONTRACT}`,
  )
  const parsed = extractJsonObject(raw)
  const updated = sanitizeShots(parsed.shots)
  const reply = stripEmDashes(String(parsed.reply || "Done. Regenerating the changed shots now.")).trim()

  // Only re-render shots whose prompt actually changed; keep approvals on untouched shots.
  const nextShots: ShootShot[] = shoot.shots.map((existing, i) => {
    const next = updated[i]
    if (!next) return existing
    const changed = next.prompt !== existing.prompt
    return {
      ...existing,
      ...next,
      imageUrl: changed ? undefined : existing.imageUrl,
      status: changed ? "draft" : existing.status,
    }
  })

  const changedIdx = nextShots
    .map((shot, i) => (shot.imageUrl === undefined ? i : -1))
    .filter((i) => i >= 0)
  const results = await Promise.allSettled(
    changedIdx.map((i) =>
      generateShotImage({
        selfieUrl: shoot.selfieUrl,
        inspirationUrls: shoot.inspirationUrls,
        prompt: nextShots[i].prompt,
        quality: "medium",
      }),
    ),
  )
  results.forEach((r, j) => {
    if (r.status === "fulfilled") nextShots[changedIdx[j]] = { ...nextShots[changedIdx[j]], imageUrl: r.value }
  })

  const messages: ShootMessage[] = [
    ...shoot.messages,
    { role: "sandra", text: ask, at: new Date().toISOString() },
    { role: "agent", text: reply, at: new Date().toISOString() },
  ]
  await saveShots(shoot.id, nextShots, messages)
  return { ...shoot, shots: nextShots, messages }
}

export async function regenerateShot(id: number, shotId: string, quality: ImgQuality = "medium"): Promise<Shoot> {
  const shoot = await getShoot(id)
  if (!shoot) throw new Error("Shoot not found")
  const idx = shoot.shots.findIndex((shot) => shot.id === shotId)
  if (idx === -1) throw new Error("Shot not found")

  const imageUrl = await generateShotImage({
    selfieUrl: shoot.selfieUrl,
    inspirationUrls: shoot.inspirationUrls,
    prompt: shoot.shots[idx].prompt,
    quality,
  })
  shoot.shots[idx] = { ...shoot.shots[idx], imageUrl, status: "draft" }
  await saveShots(shoot.id, shoot.shots)
  return shoot
}

export async function setShotStatus(id: number, shotId: string, status: ShootShot["status"]): Promise<void> {
  const shoot = await getShoot(id)
  if (!shoot) throw new Error("Shoot not found")
  const shots = shoot.shots.map((shot) => (shot.id === shotId ? { ...shot, status } : shot))
  await saveShots(id, shots)
}

export async function setShootStatus(id: number, status: Shoot["status"]): Promise<void> {
  await sql`UPDATE content_shoots SET status = ${status}, updated_at = NOW() WHERE id = ${id}`
}

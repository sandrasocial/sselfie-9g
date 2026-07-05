import "server-only"

import OpenAI, { toFile } from "openai"
import sharp from "sharp"
import { put } from "@vercel/blob"
import { sql } from "@/lib/db/client"
import type { DemoPair } from "@/lib/content-kit/types"

// Same flagship pipeline as app-v3 (app/api/app-v3/maya/generate/route.ts):
// gpt-image-2 images.edit with the reference selfie attached keeps her likeness.
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"
const PORTRAIT_SIZE = process.env.APP_V3_PORTRAIT_SIZE || "1024x1536"

const ADMIN_EMAIL = "ssa@ssasocial.com"

// No-fake doctrine: every demo edit keeps her face. Appended server-side so no
// prompt, however phrased, can drift into face-altering territory.
const IDENTITY_GUARD =
  "Keep the face natural, recognizable and completely true to the original selfie. Do not alter facial features, skin texture or identity."

function isAllowedReferenceUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com")
  } catch {
    return false
  }
}

async function readImage(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Could not load reference selfie")
  const contentType = res.headers.get("content-type") || ""
  if (!contentType.startsWith("image/")) throw new Error("Reference URL did not return an image")
  return Buffer.from(await res.arrayBuffer())
}

/** Normalize to a PNG the edit endpoint accepts (flatten alpha, cap dimensions, fix EXIF). */
async function normalizeForOpenAI(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer, { animated: false })
    .rotate()
    .resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer()
}

/** Side-by-side before/after composite at carousel/reel-cover dimensions (1080x1350). */
async function buildComposite(before: Buffer, after: Buffer): Promise<Buffer> {
  const half = { width: 538, height: 1350, fit: "cover" as const }
  const [left, right] = await Promise.all([
    sharp(before).rotate().resize(half).png().toBuffer(),
    sharp(after).rotate().resize(half).png().toBuffer(),
  ])
  return sharp({
    create: { width: 1080, height: 1350, channels: 3, background: "#FFFFFF" },
  })
    .composite([
      { input: left, left: 0, top: 0 },
      { input: right, left: 542, top: 0 },
    ])
    .png()
    .toBuffer()
}

export async function listAdminSelfies(): Promise<string[]> {
  const rows = (await sql`
    SELECT uai.image_url
    FROM user_avatar_images uai
    JOIN users u ON u.id = uai.user_id
    WHERE u.email = ${ADMIN_EMAIL} AND uai.is_active = true
    ORDER BY uai.uploaded_at DESC
    LIMIT 24
  `) as Array<{ image_url: string }>
  return rows.map((row) => row.image_url).filter((url) => typeof url === "string" && url.length > 0)
}

export async function listDemoPairs(limit = 30): Promise<DemoPair[]> {
  const rows = (await sql`
    SELECT id, title, edit_prompt, before_url, after_url, composite_url, created_at
    FROM content_demo_pairs
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as Array<any>
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    editPrompt: row.edit_prompt,
    beforeUrl: row.before_url,
    afterUrl: row.after_url,
    compositeUrl: row.composite_url ?? null,
    createdAt: new Date(row.created_at).toISOString(),
  }))
}

export async function generateDemoPair(input: {
  selfieUrl: string
  prompt: string
  title?: string
}): Promise<DemoPair> {
  if (!isAllowedReferenceUrl(input.selfieUrl)) throw new Error("That selfie URL can't be used here")
  const editPrompt = input.prompt.trim()
  if (editPrompt.length < 10) throw new Error("Write the editing prompt first")

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured")
  const openai = new OpenAI({ apiKey })

  const originalBuffer = await readImage(input.selfieUrl)
  const normalized = await normalizeForOpenAI(originalBuffer)
  const selfieFile = await toFile(normalized, "demo-reference.png", { type: "image/png" })

  const fullPrompt = `${editPrompt}\n\n${IDENTITY_GUARD}`
  const editInput: Record<string, unknown> = {
    model: OPENAI_IMAGE_MODEL,
    image: selfieFile,
    prompt: fullPrompt,
    n: 1,
    size: PORTRAIT_SIZE,
    quality: "high",
    output_format: "png",
    moderation: "low",
  }
  if (OPENAI_IMAGE_MODEL !== "gpt-image-2") editInput.input_fidelity = "high"

  const response = await openai.images.edit(editInput as any)
  const b64 = response.data?.[0]?.b64_json
  if (!b64) throw new Error("No image data returned from OpenAI")
  const afterBuffer = Buffer.from(b64, "base64")

  const composite = await buildComposite(originalBuffer, afterBuffer)

  const stamp = Date.now()
  const [afterBlob, compositeBlob] = await Promise.all([
    put(`content-kit/demos/${stamp}-after.png`, afterBuffer, { access: "public", contentType: "image/png" }),
    put(`content-kit/demos/${stamp}-before-after.png`, composite, { access: "public", contentType: "image/png" }),
  ])

  const title = (input.title || editPrompt.slice(0, 80)).trim()
  const rows = (await sql`
    INSERT INTO content_demo_pairs (title, edit_prompt, before_url, after_url, composite_url)
    VALUES (${title}, ${editPrompt}, ${input.selfieUrl}, ${afterBlob.url}, ${compositeBlob.url})
    RETURNING id, created_at
  `) as Array<{ id: number; created_at: string }>

  return {
    id: rows[0].id,
    title,
    editPrompt,
    beforeUrl: input.selfieUrl,
    afterUrl: afterBlob.url,
    compositeUrl: compositeBlob.url,
    createdAt: new Date(rows[0].created_at).toISOString(),
  }
}

export async function deleteDemoPair(id: number) {
  await sql`DELETE FROM content_demo_pairs WHERE id = ${id}`
}

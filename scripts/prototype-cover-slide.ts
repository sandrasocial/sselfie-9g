// CONTENT-CAROUSEL-03 prototype #2 — FACE/COVER slide. Tests identity preservation
// (the real risk on cover/result slides): Sandra's selfies (identity anchor) + an
// approved cover style-ref -> a new editorial cover with her in a new world + baked
// serif hero text. Matches production images.edit shape (gpt-image-2).
//
//   npx tsx scripts/prototype-cover-slide.ts
// Output: ./prototype-cover.png

import OpenAI, { toFile } from "openai"
import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { readFileSync } from "node:fs"
import sharp from "sharp"

config({ path: ".env.local" })

const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"
const SIZE = process.env.APP_V3_PORTRAIT_SIZE || "1024x1536"
const STYLE_REF = "/Users/MD760HA/Desktop/Selfie Tutorial Carousels ChatGPT /1AE45188-7B5B-444B-A396-6C2484D0BBE4.png"

const PROMPT = `Create one premium 4:5 Instagram carousel COVER slide in the SSELFIE luxury editorial style.

STYLE: match the LAST reference image — dark/warm quiet-luxury editorial, elegant serif hero typography, Scandinavian-calm, expensive. Never a white card, never a flat template.

IDENTITY (critical): the FIRST reference images are the real woman. Preserve her EXACT face, bone structure, skin tone, age, hair, and body proportions. She must be clearly recognizable as the same woman. Realistic, natural skin texture with visible pores. NOT smoothed, NOT plastic, NOT younger, no beauty-filter, no identity change. Keep her face hers.

SCENE (new world): place her in a bright, minimal, sunlit café — seated at a small marble table, quiet-luxury outfit (tailored blazer, neutral tones), soft natural window light, editorial street-café mood.

OVERLAY (baked in, integrated into the scene over a soft dark scrim so text stays legible, lower-left):
- Serif hero, caps + italic mix: "FULL BODY SELFIE" with a smaller italic line "at home".
Keep it elegant and minimal.

RULES: editorial serif display. Muted palette. No white lesson card, no emoji, no green checks, no bright red, no neon, no chunky TikTok caption, no Canva look. Realistic and true-to-her. Render text spelled exactly as written.`

async function toPngFromUrl(url: string) {
  const res = await fetch(url)
  const buf = Buffer.from(await res.arrayBuffer())
  return sharp(buf).png().toBuffer()
}
async function toPngFromFile(path: string) {
  return sharp(readFileSync(path)).png().toBuffer()
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY missing")
  const sql = neon(process.env.DATABASE_URL!)
  const openai = new OpenAI({ apiKey })

  const u = await sql`SELECT id FROM users WHERE email = 'ssa@ssasocial.com' LIMIT 1`
  // Face selfies first (identity), then full-body — the anchor recipe the app uses.
  const rows = (await sql`
    SELECT image_url, image_type FROM user_avatar_images
    WHERE user_id = ${u[0].id} AND is_active = true
      AND image_type IN ('selfie','side-profile','full-body')
    ORDER BY CASE image_type WHEN 'selfie' THEN 0 WHEN 'side-profile' THEN 1 ELSE 2 END
    LIMIT 4
  `) as { image_url: string; image_type: string }[]
  console.log(`Identity anchors: ${rows.map((r) => r.image_type).join(", ")}`)

  const selfieFiles = await Promise.all(
    rows.map(async (r, i) => toFile(await toPngFromUrl(r.image_url), `selfie-${i}.png`, { type: "image/png" })),
  )
  const styleFile = await toFile(await toPngFromFile(STYLE_REF), "style-ref.png", { type: "image/png" })
  const files = [...selfieFiles, styleFile] // identity first, style last

  const editInput: Record<string, unknown> = {
    model: MODEL, image: files, prompt: PROMPT, n: 1, size: SIZE, quality: "high", output_format: "png",
  }
  if (MODEL !== "gpt-image-2") editInput.input_fidelity = "high"

  console.log(`Generating cover (${MODEL}, ${SIZE})...`)
  const res = await openai.images.edit(editInput as any)
  const b64 = res.data?.[0]?.b64_json
  if (!b64) throw new Error("No image returned")
  const { writeFileSync } = await import("node:fs")
  writeFileSync("prototype-cover.png", Buffer.from(b64, "base64"))
  console.log("Saved ./prototype-cover.png")
}

main().catch((e) => { console.error(e?.message || e); process.exit(1) })

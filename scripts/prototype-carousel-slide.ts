// CONTENT-CAROUSEL-03 prototype — prove the "image model is the designer" workflow
// on ONE slide before Codex builds the pipeline. Matches the production call shape
// in lib/content-kit/shoot-generator.ts (openai.images.edit, gpt-image-2).
//
//   npx tsx scripts/prototype-carousel-slide.ts
//
// Inputs: 1 real reel screenshot (visual base) + 1 approved style-ref slide. No selfie
// (this is a camera-UI step slide). Output saved local: ./prototype-slide.png

import OpenAI, { toFile } from "openai"
import { config } from "dotenv"
import { readFileSync, writeFileSync } from "node:fs"
import sharp from "sharp"

config({ path: ".env.local" })

const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"
const SIZE = process.env.APP_V3_PORTRAIT_SIZE || "1024x1536"

const BASE_SCREENSHOT = "reel-references/01_580634views_17998351151710853/scene_007.jpg"
const STYLE_REF = "/Users/MD760HA/Desktop/Selfie Tutorial Carousels ChatGPT /0EA755C7-AADC-468C-8EA0-A893D3783571.png"

const PROMPT = `Create one premium Instagram carousel tutorial slide (4:5 portrait) in the SSELFIE luxury editorial style.

STYLE: match the second reference image exactly — a dark, warm editorial interior (taupe, charcoal, cream), a real iPhone shown in the scene displaying its camera screen, soft natural light, candle, plant, quiet-luxury mood. This is the look to reproduce. Never a white card, never a flat template.

VISUAL BASE: the first reference image is a real iPhone camera screenshot showing the live camera UI. Preserve its meaning and the on-screen settings/values exactly (exposure dial, "CONTOUR LIGHT", the -0.7 / -1.0 readout). Present it as the phone's screen within the editorial scene.

OVERLAY (redesign only this, integrated into the scene, not a card):
- Small uppercase sans label: "STEP 02"
- Serif hero headline, caps + italic mix: "Adjust Exposure to -0.7"
- One line of minimal serif helper text: "Darkens the shot so your phone stops faking the light"
- One muted oxblood/burgundy (#6E2A35) thin callout: a small label "EXPOSURE" with a slim hand-drawn arrow pointing to the exposure control. Muted, refined, never bright red.

RULES: elegant serif display + minimal sans/serif helper. Muted oxblood accents only. No bright red, no green checkmarks, no emoji, no chunky TikTok captions, no black-outlined text, no Canva look, no white lesson card. Keep it expensive, editorial, Scandinavian-calm. Render all text spelled exactly as written.`

async function toPng(path: string) {
  const buf = readFileSync(path)
  return sharp(buf).png().toBuffer()
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY missing")
  const openai = new OpenAI({ apiKey })

  console.log(`Model ${MODEL}, size ${SIZE}`)
  const files = [
    await toFile(await toPng(BASE_SCREENSHOT), "base-screenshot.png", { type: "image/png" }),
    await toFile(await toPng(STYLE_REF), "style-ref.png", { type: "image/png" }),
  ]

  const editInput: Record<string, unknown> = {
    model: MODEL,
    image: files,
    prompt: PROMPT,
    n: 1,
    size: SIZE,
    quality: "high",
    output_format: "png",
  }
  if (MODEL !== "gpt-image-2") editInput.input_fidelity = "high"

  console.log("Generating (gpt-image-2 high quality can take 1-3 min)...")
  const res = await openai.images.edit(editInput as any)
  const b64 = res.data?.[0]?.b64_json
  if (!b64) throw new Error("No image returned")
  writeFileSync("prototype-slide.png", Buffer.from(b64, "base64"))
  console.log("Saved ./prototype-slide.png")
}

main().catch((e) => { console.error(e?.message || e); process.exit(1) })

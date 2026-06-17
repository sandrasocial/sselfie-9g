// Real-output verification of the BRANCH customer path (CAROUSEL-04): faithfully
// replicates lib/content-kit/slide-redesign-generator.ts promptForSlide (identity-scene)
// + slidePlan, generating the 3 customer graphic formats from Sandra's selfie + a
// category style anchor. Non-tutorial brand topic to test breadth. Output: ./verify-cust-*.png

import OpenAI, { toFile } from "openai"
import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import sharp from "sharp"
import { writeFileSync } from "node:fs"

config({ path: ".env.local" })
const sql = neon(process.env.DATABASE_URL!)
const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"

type Slide = { kind: string; eyebrow?: string; title?: string; body?: string; visualConcept?: string; imagePromptDirection?: string; purpose?: string }
type Cat = "tutorial" | "photoshoot-carousel" | "story-sequence"

function slideText(s: Slide) {
  return [s.eyebrow && `Small label: "${s.eyebrow}"`, s.title && `Main headline: "${s.title}"`, s.body && `Supporting line: "${s.body}"`].filter(Boolean).join("\n")
}
function slidePlan(s: Slide) {
  return [s.purpose && `Slide purpose: ${s.purpose}`, s.visualConcept && `Visual concept: ${s.visualConcept}`, s.imagePromptDirection && `Image direction: ${s.imagePromptDirection}`].filter(Boolean).join("\n")
}
// mirrors branch promptForSlide (identity-scene branch)
function prompt(s: Slide, category: Cat, topic: string, styleLabel: string | null) {
  const grounding = "The FIRST reference image is the identity reference. Preserve the person's face, age, skin texture, hair, body proportions and recognizable energy. Do not copy a plain selfie background unless the slide explicitly asks for it. Build a new slide-specific editorial scene from the visual concept and image direction."
  return `Create one finished SSELFIE editorial slide.

Content type: ${category}
Topic: ${topic}
Slide kind: ${s.kind}
Style anchor: ${styleLabel || "approved SSELFIE reference"}

${grounding}

Match the SECOND reference image's style: premium editorial, quiet luxury, elegant serif typography, clean supporting type, muted oxblood accent (#6E2A35), warm neutral palette, calm Scandinavian spacing. Never a white lesson card, never a flat Canva template.

Render the slide text inside the image, integrated into the scene:
${slideText(s)}

Slide-specific creative plan:
${slidePlan(s) || "Use the slide title/body as the creative direction."}

Rules:
- Render all text spelled exactly as written.
- No extra words, placeholder letters, random UI labels, logos, emoji, green checks, neon, bright red, chunky social captions, or black-outlined text.
- Keep the slide full-bleed and finished. No separate card, no border, no post mockup.`
}

async function png(url: string) { return sharp(Buffer.from(await (await fetch(url)).arrayBuffer())).rotate().png().toBuffer() }
async function anchor(cat: Cat) { const r = (await sql`SELECT image_url,label FROM content_style_references WHERE category=${cat} ORDER BY random() LIMIT 1`) as any[]; return r[0] }

async function gen(name: string, selfieUrl: string, cat: Cat, topic: string, s: Slide) {
  const a = await anchor(cat)
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  const files = [await toFile(await png(selfieUrl), "reference-frame.png", { type: "image/png" }), await toFile(await png(a.image_url), "style-anchor.png", { type: "image/png" })]
  const res = await openai.images.edit({ model: MODEL, image: files, prompt: prompt(s, cat, topic, a.label), n: 1, size: cat === "story-sequence" ? "1024x1536" : "1024x1280", quality: "high", output_format: "png" } as any)
  writeFileSync(`verify-cust-${name}.png`, Buffer.from(res.data[0].b64_json!, "base64"))
  console.log(`  ✓ verify-cust-${name}.png (anchor ${a.label})`)
}

async function main() {
  const u = (await sql`SELECT id FROM users WHERE email='ssa@ssasocial.com' LIMIT 1`) as any[]
  const selfie = (await sql`SELECT image_url FROM user_avatar_images WHERE user_id=${u[0].id} AND is_active=true AND image_type='selfie' LIMIT 1`) as any[]
  const sf = selfie[0].image_url
  const topic = "Why showing your face grows your personal brand"
  console.log("Generating 3 customer graphics via branch identity-scene path...\n")
  await gen("carousel", sf, "photoshoot-carousel", topic, { kind: "hook", eyebrow: "PERSONAL BRAND", title: "People buy from faces they trust", body: "Your brand grows the day you stop hiding", visualConcept: "founder seated in a sunlit minimal studio, confident, editorial", imagePromptDirection: "warm neutral palette, soft window light, full upper body" })
  await gen("reelcover", sf, "story-sequence", topic, { kind: "hook", title: "Stop hiding your face", body: "The one move that grew my brand", visualConcept: "founder standing by a window, quiet luxury, cinematic", imagePromptDirection: "moody warm light, vertical full body" })
  await gen("story", sf, "story-sequence", "The day I stopped hiding online", { kind: "quote", title: "It started changing how people saw me", body: "this part", visualConcept: "founder at a cafe, reflective, editorial street style", imagePromptDirection: "natural light, candid, emotional" })
  console.log("\nDone.")
}
main().catch(e => { console.error(e?.message || e); process.exit(1) })

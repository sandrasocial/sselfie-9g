// Verification harness — generates real slides via the SHIPPED redesign logic
// (faithfully replicates lib/content-kit/slide-redesign-generator.ts) across the
// surfaces Sandra named: admin tutorial slide + user-facing carousel / reel cover /
// story — on a NON-tutorial brand topic to test intelligence/breadth.
// Output: ./verify-*.png (gitignored). Read-only on data except Blob writes for outputs.

import OpenAI, { toFile } from "openai"
import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import sharp from "sharp"
import { writeFileSync } from "node:fs"

config({ path: ".env.local" })
const sql = neon(process.env.DATABASE_URL!)
const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"
const CAROUSEL_SIZE = "1024x1280"
const STORY_SIZE = "1024x1536"

type Slide = { kind: string; eyebrow?: string; title?: string; body?: string; items?: string[]; stepNumber?: number }
type Cat = "tutorial" | "photoshoot-carousel" | "story-sequence"

// ---- verbatim from slide-redesign-generator.ts ----
function slideText(s: Slide): string {
  return [
    s.eyebrow ? `Small label: "${s.eyebrow}"` : "",
    s.title ? `Main headline: "${s.title}"` : "",
    s.body ? `Supporting line: "${s.body}"` : "",
    s.items?.length ? `List items: ${s.items.map(i => `"${i}"`).join(", ")}` : "",
    s.stepNumber ? `Step number: "${String(s.stepNumber).padStart(2, "0")}"` : "",
  ].filter(Boolean).join("\n")
}
function promptForSlide(slide: Slide, category: Cat, topic: string, styleLabel?: string | null) {
  const grounding = category === "tutorial"
    ? "The FIRST reference image is the real reel frame. Preserve its meaning exactly: if it is a phone camera screenshot, keep the UI values, controls, settings labels, sliders and visual instruction truthful. You may restage it as a phone screen inside an editorial scene, but do not invent different settings or change the teaching point."
    : "The FIRST reference image is the visual base. Preserve the important subject, identity cues, mood and meaning while redesigning the slide."
  return `Create one finished SSELFIE editorial slide.

Content type: ${category}
Topic: ${topic}
Slide kind: ${slide.kind}
Style anchor: ${styleLabel || "approved SSELFIE reference"}

${grounding}

Match the SECOND reference image's style: premium editorial, quiet luxury, elegant serif typography, clean supporting type, muted oxblood accent (#6E2A35), warm neutral palette, calm Scandinavian spacing. Never a white lesson card, never a flat Canva template.

Render the slide text inside the image, integrated into the scene:
${slideText(slide)}

Rules:
- Render all text spelled exactly as written.
- No extra words, placeholder letters, random UI labels, logos, emoji, green checks, neon, bright red, chunky social captions, or black-outlined text.
- Keep the original reference frame recognizable and useful.
- Keep the slide full-bleed and finished. No separate card, no border, no post mockup.
- Use subtle burgundy callouts only where they clarify the tutorial.`
}
// ---------------------------------------------------

async function pngFromUrl(url: string) { return sharp(Buffer.from(await (await fetch(url)).arrayBuffer())).rotate().png().toBuffer() }
async function anchor(cat: Cat): Promise<{ url: string; label: string | null }> {
  const r = (await sql`SELECT image_url, label FROM content_style_references WHERE category=${cat} ORDER BY random() LIMIT 1`) as any[]
  return { url: r[0].image_url, label: r[0].label }
}

async function redesign(name: string, refUrl: string, cat: Cat, topic: string, slide: Slide) {
  const a = await anchor(cat)
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  const files = [
    await toFile(await pngFromUrl(refUrl), "reference-frame.png", { type: "image/png" }),
    await toFile(await pngFromUrl(a.url), "style-anchor.png", { type: "image/png" }),
  ]
  const res = await openai.images.edit({
    model: MODEL, image: files, prompt: promptForSlide(slide, cat, topic, a.label),
    n: 1, size: cat === "story-sequence" ? STORY_SIZE : CAROUSEL_SIZE, quality: "high", output_format: "png",
  } as any)
  const b64 = res.data?.[0]?.b64_json
  if (!b64) throw new Error("no image")
  writeFileSync(`verify-${name}.png`, Buffer.from(b64, "base64"))
  console.log(`  ✓ verify-${name}.png  (anchor: ${a.label})`)
}

async function main() {
  // Real references from the DB
  const scene = (await sql`SELECT image_url FROM content_reel_references WHERE kind='scene' AND media_id='17998351151710853' ORDER BY scene_index LIMIT 1 OFFSET 6`) as any[]
  const u = (await sql`SELECT id FROM users WHERE email='ssa@ssasocial.com' LIMIT 1`) as any[]
  const selfie = (await sql`SELECT image_url FROM user_avatar_images WHERE user_id=${u[0].id} AND is_active=true AND image_type='selfie' LIMIT 1`) as any[]
  const sceneUrl = scene[0]?.image_url
  const selfieUrl = selfie[0].image_url
  console.log("References ready. Generating 4 slides...\n")

  // 1. ADMIN tutorial slide (real screenshot redesign)
  await redesign("admin-tutorial", sceneUrl, "tutorial", "How to take better full body selfies",
    { kind: "step", stepNumber: 2, title: "Adjust Exposure to -0.7", body: "Darkens the shot so your phone stops faking the light" })

  // NON-tutorial brand topic for the user-facing surfaces (tests intelligence):
  const topic = "Why showing your face grows your personal brand"

  // 2. USER carousel slide
  await redesign("user-carousel", selfieUrl, "photoshoot-carousel", topic,
    { kind: "hook", eyebrow: "PERSONAL BRAND", title: "People buy from faces they trust", body: "Your brand grows the day you stop hiding" })

  // 3. USER reel cover (9:16)
  await redesign("user-reelcover", selfieUrl, "story-sequence", topic,
    { kind: "hook", title: "Stop hiding your face", body: "The one move that grew my brand" })

  // 4. USER story slide (9:16, emotional)
  await redesign("user-story", selfieUrl, "story-sequence", "The day I stopped hiding online",
    { kind: "quote", title: "It started changing how people saw me", body: "this part" })

  console.log("\nDone. ./verify-admin-tutorial.png, verify-user-carousel.png, verify-user-reelcover.png, verify-user-story.png")
}
main().catch(e => { console.error(e?.message || e); process.exit(1) })

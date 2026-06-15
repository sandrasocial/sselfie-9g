// CONTENT-CAROUSEL-03 — ingest Sandra's approved ChatGPT carousel slides as the
// style-reference library (style anchors for gpt-image-2). Uploads each image to
// Blob (content-kit/style-references/) and registers a row. Read-from-disk only,
// no IG/network beyond Blob. Idempotent (clears + reinserts).
//
//   npx tsx scripts/ingest-style-references.ts
//   STYLE_DIR="/path/to/folder" npx tsx scripts/ingest-style-references.ts

import { neon } from "@neondatabase/serverless"
import { put } from "@vercel/blob"
import { config } from "dotenv"
import { readdirSync, readFileSync } from "node:fs"
import { join, extname } from "node:path"
import { homedir } from "node:os"

config({ path: ".env.local" })

const STYLE_DIR = process.env.STYLE_DIR || join(homedir(), "Desktop", "Selfie Tutorial Carousels ChatGPT ")
const IMG = new Set([".png", ".jpg", ".jpeg", ".webp"])

function contentType(ext: string): string {
  if (ext === ".png") return "image/png"
  if (ext === ".webp") return "image/webp"
  return "image/jpeg"
}

async function main() {
  const sql = neon(process.env.DATABASE_URL!)
  const files = readdirSync(STYLE_DIR).filter((f) => IMG.has(extname(f).toLowerCase()))
  if (!files.length) throw new Error(`No images found in ${STYLE_DIR}`)
  console.log(`Found ${files.length} approved style slides in ${STYLE_DIR}\n`)

  await sql`DELETE FROM content_style_references`
  let n = 0
  for (const file of files) {
    const ext = extname(file).toLowerCase()
    const bytes = readFileSync(join(STYLE_DIR, file))
    const blob = await put(`content-kit/style-references/${file.replace(/\s+/g, "_")}`, bytes, {
      access: "public",
      contentType: contentType(ext),
      addRandomSuffix: false,
      allowOverwrite: true,
    })
    await sql`
      INSERT INTO content_style_references (image_url, label, source_filename)
      VALUES (${blob.url}, ${"approved-chatgpt-slide"}, ${file})
    `
    n++
    console.log(`  ✓ ${file} → ${(bytes.length / 1e6).toFixed(2)}MB`)
  }
  console.log(`\nUploaded ${n} style references to Blob + content_style_references.`)
}

main().catch((e) => { console.error(e); process.exit(1) })

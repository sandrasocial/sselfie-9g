// CONTENT-CAROUSEL-03 — ingest Sandra's APPROVED ChatGPT generations as the
// style-reference library (style anchors for the image-to-image redesign workflow).
// Categorized so each redesign picks the right anchor: tutorial / photoshoot-carousel
// / story-sequence. Uploads to Blob + registers rows. Idempotent (clears + reinserts).
//
//   npx tsx scripts/ingest-style-references.ts

import { neon } from "@neondatabase/serverless"
import { put } from "@vercel/blob"
import { config } from "dotenv"
import { readdirSync, readFileSync, existsSync } from "node:fs"
import { join, extname } from "node:path"
import { homedir } from "node:os"

config({ path: ".env.local" })

const DESKTOP = join(homedir(), "Desktop")
// folder, category
const FOLDERS: { dir: string; category: string }[] = [
  { dir: join(DESKTOP, "Selfie Tutorial Carousels ChatGPT "), category: "tutorial" },
  { dir: join(DESKTOP, "Carousels & Story slides ChatGPT ", "Carousels "), category: "photoshoot-carousel" },
  { dir: join(DESKTOP, "Carousels & Story slides ChatGPT ", "Story Sequences"), category: "story-sequence" },
]
const IMG = new Set([".png", ".jpg", ".jpeg", ".webp"])
const ctype = (e: string) => (e === ".png" ? "image/png" : e === ".webp" ? "image/webp" : "image/jpeg")

async function main() {
  const sql = neon(process.env.DATABASE_URL!)
  await sql`ALTER TABLE content_style_references ADD COLUMN IF NOT EXISTS category TEXT`
  await sql`DELETE FROM content_style_references`

  let total = 0
  for (const { dir, category } of FOLDERS) {
    if (!existsSync(dir)) { console.log(`  ! missing: ${dir}`); continue }
    const files = readdirSync(dir).filter((f) => IMG.has(extname(f).toLowerCase()))
    console.log(`\n[${category}] ${files.length} slides`)
    for (const file of files) {
      const bytes = readFileSync(join(dir, file))
      const blob = await put(`content-kit/style-references/${category}/${file.replace(/\s+/g, "_")}`, bytes, {
        access: "public", contentType: ctype(extname(file).toLowerCase()),
        addRandomSuffix: false, allowOverwrite: true,
      })
      await sql`
        INSERT INTO content_style_references (image_url, label, source_filename, category)
        VALUES (${blob.url}, ${category}, ${file}, ${category})
      `
      total++
    }
    console.log(`  ✓ ${files.length} uploaded`)
  }
  console.log(`\nTotal style references: ${total}`)
}

main().catch((e) => { console.error(e); process.exit(1) })

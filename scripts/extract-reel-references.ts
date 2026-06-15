// CONTENT-CAROUSEL-01 Phase 1 — offline reel-reference extractor.
//
// Ranks @sandra.social reels by views (from ig_media_snapshots), fetches each
// winner's video via the IG Graph API, and uses ffmpeg to slice per-scene
// reference stills. Output is LOCAL ONLY (./reel-references/) — no Blob, no DB
// writes — so we can eyeball the references before wiring anything into the app.
//
//   npx tsx scripts/extract-reel-references.ts            # top 3 reels
//   REELS_LIMIT=6 SCENE=0.3 npx tsx scripts/extract-reel-references.ts
//
// Requires (all already present): .env.local with DATABASE_URL, an active row
// in instagram_connections, and ffmpeg on PATH.

import { neon } from "@neondatabase/serverless"
import { put } from "@vercel/blob"
import { config } from "dotenv"
import { execFileSync } from "node:child_process"
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs"
import { join } from "node:path"

config({ path: ".env.local" })

const GRAPH_BASE = "https://graph.facebook.com/v21.0"
const REELS_LIMIT = Number(process.env.REELS_LIMIT ?? 3)
// Tutorials only: selfie / iPhone-settings / editing. The ChatGPT / AI-prompt
// reels are a separate category and are excluded here (Sandra's call 2026-06-15).
const EXCLUDE_RE = /chatgpt|chat gpt|\bgpt\b|prompt/i
const SCENE = Number(process.env.SCENE ?? 0.3) // ffmpeg scene-change sensitivity (0-1, lower = more frames)
const MAX_FRAMES = Number(process.env.MAX_FRAMES ?? 30)
const UPLOAD = process.env.UPLOAD === "1" // also push frames to Blob + content_reel_references
const OUT_ROOT = join(process.cwd(), "reel-references")

type Connection = { access_token: string; instagram_user_id: string; instagram_username: string }
type ReelRow = { media_id: string; views: number | null; hook_line: string | null; permalink: string | null }

function checkFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" })
  } catch {
    throw new Error("ffmpeg not found on PATH. Install it (brew install ffmpeg) and retry.")
  }
}

async function getConnection(sql: ReturnType<typeof neon>): Promise<Connection> {
  const rows = (await sql`
    SELECT access_token, instagram_user_id, instagram_username
    FROM instagram_connections
    WHERE is_active = true
    ORDER BY id DESC
    LIMIT 1
  `) as Connection[]
  if (!rows[0]) throw new Error("No active instagram_connections row.")
  return rows[0]
}

async function rankedReels(sql: ReturnType<typeof neon>, pool: number): Promise<ReelRow[]> {
  // Snapshots accumulate one row per media per night; collapse to the best-known
  // view count per reel, then rank. Pull a deep pool so excludes don't starve us.
  return (await sql`
    SELECT media_id,
           MAX(views) AS views,
           MAX(hook_line) AS hook_line,
           MAX(permalink) AS permalink
    FROM ig_media_snapshots
    WHERE format = 'reel'
    GROUP BY media_id
    ORDER BY MAX(views) DESC NULLS LAST
    LIMIT ${pool}
  `) as ReelRow[]
}

function isExcluded(hook: string | null): boolean {
  return EXCLUDE_RE.test(hook || "")
}

async function fetchMedia(mediaId: string, token: string) {
  const res = await fetch(
    `${GRAPH_BASE}/${mediaId}?fields=media_url,thumbnail_url,media_product_type,permalink&access_token=${encodeURIComponent(token)}`,
    { cache: "no-store" },
  )
  const json: any = await res.json()
  if (json?.error) throw new Error(`Graph error for ${mediaId}: ${json.error.message || "unknown"}`)
  return json as { media_url?: string; thumbnail_url?: string; media_product_type?: string; permalink?: string }
}

async function download(url: string, dest: string) {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`download failed (${res.status})`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(dest, buf)
  return buf.length
}

function extractScenes(videoPath: string, outDir: string): number {
  // Keep frame 0 (the cover) plus every scene change above the threshold.
  const pattern = join(outDir, "scene_%03d.jpg")
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i", videoPath,
      "-vf", `select='eq(n\\,0)+gt(scene\\,${SCENE})'`,
      "-vsync", "vfr",
      "-frames:v", String(MAX_FRAMES),
      "-q:v", "3",
      pattern,
    ],
    { stdio: "ignore" },
  )
  // Count what landed.
  return readdirSync(outDir).filter((f: string) => f.startsWith("scene_")).length
}

async function uploadReferences(sql: ReturnType<typeof neon>, dir: string, reel: ReelRow): Promise<number> {
  // Idempotent: clear this reel's prior rows, then re-upload to stable Blob paths.
  await sql`DELETE FROM content_reel_references WHERE media_id = ${reel.media_id}`
  const files = readdirSync(dir).filter((f) => f === "cover.jpg" || f.startsWith("scene_"))
  let count = 0
  for (const file of files) {
    const isCover = file === "cover.jpg"
    const sceneIndex = isCover ? null : Number(file.match(/scene_(\d+)/)?.[1] ?? 0)
    const bytes = readFileSync(join(dir, file))
    const blob = await put(`content-kit/reel-references/${reel.media_id}/${file}`, bytes, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: false,
      allowOverwrite: true,
    })
    await sql`
      INSERT INTO content_reel_references (media_id, permalink, hook_line, views, kind, scene_index, image_url)
      VALUES (${reel.media_id}, ${reel.permalink}, ${reel.hook_line}, ${reel.views},
              ${isCover ? "cover" : "scene"}, ${sceneIndex}, ${blob.url})
    `
    count++
  }
  return count
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing from .env.local")
  checkFfmpeg()
  const sql = neon(process.env.DATABASE_URL)

  const conn = await getConnection(sql)
  console.log(`Account: @${conn.instagram_username} (ig_user_id ${conn.instagram_user_id})`)

  const pool = await rankedReels(sql, Math.max(REELS_LIMIT * 4, 60))
  const excluded = pool.filter((r) => isExcluded(r.hook_line))
  const reels = pool.filter((r) => !isExcluded(r.hook_line)).slice(0, REELS_LIMIT)

  if (excluded.length) {
    console.log(`Excluded ${excluded.length} ChatGPT/prompt reels (separate category):`)
    excluded.forEach((r) => console.log(`    - ${(r.views ?? 0).toLocaleString()} views — "${(r.hook_line || "").slice(0, 70)}"`))
    console.log("")
  }

  console.log(`Top ${reels.length} tutorial reels by views:\n`)
  reels.forEach((r, i) => {
    console.log(`  ${i + 1}. ${(r.views ?? 0).toLocaleString()} views — "${(r.hook_line || "(no hook)").slice(0, 80)}"`)
  })
  console.log("")

  if (!existsSync(OUT_ROOT)) mkdirSync(OUT_ROOT, { recursive: true })

  const summary: any[] = []
  for (let i = 0; i < reels.length; i++) {
    const r = reels[i]
    const label = `${String(i + 1).padStart(2, "0")}_${r.views ?? 0}views_${r.media_id}`
    const dir = join(OUT_ROOT, label)
    mkdirSync(dir, { recursive: true })
    try {
      const media = await fetchMedia(r.media_id, conn.access_token)
      if (media.thumbnail_url) await download(media.thumbnail_url, join(dir, "cover.jpg")).catch(() => {})
      if (!media.media_url) {
        console.log(`  ✗ ${label}: no media_url returned (skipping frames)`)
        summary.push({ ...r, frames: 0, note: "no media_url" })
        continue
      }
      const videoPath = join(dir, "reel.mp4")
      const bytes = await download(media.media_url, videoPath)
      const frames = extractScenes(videoPath, dir)
      writeFileSync(
        join(dir, "meta.json"),
        JSON.stringify({ media_id: r.media_id, views: r.views, hook: r.hook_line, permalink: r.permalink, frames }, null, 2),
      )
      let uploaded = 0
      if (UPLOAD) uploaded = await uploadReferences(sql, dir, r)
      console.log(
        `  ✓ ${label}: ${(bytes / 1e6).toFixed(1)}MB video → ${frames} scene stills` +
          (UPLOAD ? ` → ${uploaded} refs in app library` : ""),
      )
      summary.push({ ...r, frames, uploaded })
    } catch (err: any) {
      console.log(`  ✗ ${label}: ${err.message}`)
      summary.push({ ...r, frames: 0, note: err.message })
    }
  }

  console.log(`\nDone. Local references under: ${OUT_ROOT}`)
  if (UPLOAD) {
    const totalRefs = summary.reduce((n, s) => n + (s.uploaded || 0), 0)
    console.log(`Uploaded ${totalRefs} references to Blob + content_reel_references (app library).`)
  } else {
    console.log("Local only. Re-run with UPLOAD=1 to push into the app library (Blob + content_reel_references).")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

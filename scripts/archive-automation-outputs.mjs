/**
 * Archive old automation outputs to output/automation/archive/YYYY-MM/
 * Retention: triage 7 days, all other digests/audits 30 days.
 * Run manually or from cron; safe to run repeatedly (idempotent).
 *
 * Rollback: move files back from archive/ to output/automation/
 */
import { readdirSync, mkdirSync, renameSync } from "node:fs"
import { join, resolve } from "node:path"

const ROOT = resolve(process.cwd(), "output", "automation")
const TRIAGE_RETENTION_DAYS = 7
const OTHER_RETENTION_DAYS = 30

function parseDateFromName(name) {
  const triageMatch = name.match(/^triage-(\d{4})-(\d{2})-(\d{2})-(\d{2})\.md$/)
  if (triageMatch) {
    return { date: new Date(`${triageMatch[1]}-${triageMatch[2]}-${triageMatch[3]}T${triageMatch[4]}:00:00Z`), isTriage: true }
  }
  const dateMatch = name.match(/^[a-z-]+-(\d{4})-(\d{2})-(\d{2})\.md$/)
  if (dateMatch) {
    return { date: new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`), isTriage: false }
  }
  return null
}

function main() {
  const now = new Date()
  const triageCutoff = new Date(now)
  triageCutoff.setDate(triageCutoff.getDate() - TRIAGE_RETENTION_DAYS)
  const otherCutoff = new Date(now)
  otherCutoff.setDate(otherCutoff.getDate() - OTHER_RETENTION_DAYS)

  let archived = 0
  try {
    const entries = readdirSync(ROOT, { withFileTypes: true })
    for (const ent of entries) {
      if (!ent.isFile() || !ent.name.endsWith(".md")) continue
      const parsed = parseDateFromName(ent.name)
      if (!parsed) continue
      const cutoff = parsed.isTriage ? triageCutoff : otherCutoff
      if (parsed.date >= cutoff) continue
      const yearMonth = `${parsed.date.getFullYear()}-${String(parsed.date.getMonth() + 1).padStart(2, "0")}`
      const archiveDir = join(ROOT, "archive", yearMonth)
      mkdirSync(archiveDir, { recursive: true })
      const src = join(ROOT, ent.name)
      const dest = join(archiveDir, ent.name)
      renameSync(src, dest)
      archived++
      console.log(`[archive-automation] ${ent.name} -> archive/${yearMonth}/`)
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      console.log("[archive-automation] output/automation not found, skipping")
      return
    }
    console.error("[archive-automation] error:", err.message)
    process.exitCode = 1
    return
  }
  console.log(`[archive-automation] archived ${archived} file(s)`)
}

main()

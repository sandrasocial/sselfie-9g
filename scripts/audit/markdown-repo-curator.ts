import { promises as fs } from "node:fs"
import path from "node:path"
import { REPO_ROOT, normalizeWorkspacePath, walkFiles, writeReport } from "./_shared"

type CliMode = "scan" | "apply"

function parseArgs(argv: string[]) {
  const mode = (argv[2] as CliMode) || "scan"
  const manifestIndex = argv.findIndex((arg) => arg === "--manifest")
  const manifest = manifestIndex >= 0 ? argv[manifestIndex + 1] : undefined
  return { mode, manifest }
}

async function runScan() {
  const allFiles = await walkFiles(REPO_ROOT)
  const markdownFiles = allFiles.filter((file) => file.endsWith(".md"))
  const referenceFiles = allFiles.filter((file) => /\.(md|ts|tsx|js|jsx|mjs|cjs|json)$/.test(file))
  const relFiles = markdownFiles.map((file) => normalizeWorkspacePath(file))
  const rootMarkdown = relFiles.filter((file) => !file.includes("/"))
  const docsMarkdown = relFiles.filter((file) => file.startsWith("docs/"))

  const referenceIndex = new Map<string, string>()
  for (const file of referenceFiles) {
    const text = await fs.readFile(file, "utf8").catch(() => "")
    referenceIndex.set(file, text)
  }

  const byBasename = new Map<string, string[]>()
  for (const file of relFiles) {
    const base = path.basename(file)
    const bucket = byBasename.get(base) || []
    bucket.push(file)
    byBasename.set(base, bucket)
  }
  const duplicates = [...byBasename.entries()].filter(([, files]) => files.length > 1)

  const staleCandidates: Array<{ file: string; refs: number }> = []
  for (const file of markdownFiles) {
    const rel = normalizeWorkspacePath(file)
    if (rel.startsWith(".github/")) continue
    if (rel.startsWith("docs/")) continue
    if (["README.md", "CLAUDE.md", "AGENTS.md"].includes(rel)) continue
    const targetName = path.basename(file)
    const targetPath = normalizeWorkspacePath(file)
    let refs = 0
    for (const [refFile, content] of referenceIndex.entries()) {
      if (refFile === file) continue
      if (content.includes(targetName) || content.includes(targetPath)) refs += 1
    }
    staleCandidates.push({ file: rel, refs })
  }

  staleCandidates.sort((a, b) => a.refs - b.refs || a.file.localeCompare(b.file))

  const lines: string[] = []
  lines.push("# Markdown Hygiene Report")
  lines.push("")
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push("")
  lines.push("## Inventory")
  lines.push(`- Total markdown files: ${relFiles.length}`)
  lines.push(`- Root markdown files: ${rootMarkdown.length}`)
  lines.push(`- docs/ markdown files: ${docsMarkdown.length}`)
  lines.push("")
  lines.push("## Root Markdown Files")
  for (const file of rootMarkdown) lines.push(`- ${file}`)
  lines.push("")
  lines.push("## Duplicate Markdown Basenames")
  if (duplicates.length === 0) {
    lines.push("- No duplicate basenames found.")
  } else {
    for (const [name, files] of duplicates.slice(0, 40)) {
      lines.push(`- ${name} (${files.length})`)
      for (const file of files.slice(0, 8)) lines.push(`  - ${file}`)
    }
  }
  lines.push("")
  lines.push("## Low-Reference Candidates (Review Before Delete)")
  for (const candidate of staleCandidates.slice(0, 40)) {
    lines.push(`- ${candidate.file} (references: ${candidate.refs})`)
  }
  lines.push("")
  lines.push("## Manifest Template")
  lines.push("Use this format with `pnpm audit:markdown-hygiene:apply -- --manifest <file>`:")
  lines.push("```")
  lines.push("DELETE path/to/file.md")
  lines.push("MOVE path/from.md -> docs/archive/path/to.md")
  lines.push("```")

  const reportPath = await writeReport("markdown-hygiene", lines)
  console.log(`[markdown-repo-curator] wrote ${reportPath}`)
}

async function runApply(manifestPath?: string) {
  if (!manifestPath) {
    throw new Error("Manifest path is required for apply mode. Use --manifest <file>.")
  }

  const absManifest = path.isAbsolute(manifestPath) ? manifestPath : path.join(REPO_ROOT, manifestPath)
  const raw = await fs.readFile(absManifest, "utf8")
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))

  const actions: string[] = []
  for (const line of lines) {
    if (line.startsWith("DELETE ")) {
      const target = line.replace(/^DELETE\s+/, "").trim()
      const absTarget = path.join(REPO_ROOT, target)
      await fs.unlink(absTarget)
      actions.push(`deleted ${target}`)
      continue
    }

    if (line.startsWith("MOVE ")) {
      const payload = line.replace(/^MOVE\s+/, "")
      const [from, to] = payload.split("->").map((x) => x.trim())
      if (!from || !to) throw new Error(`Invalid MOVE line: ${line}`)
      const absFrom = path.join(REPO_ROOT, from)
      const absTo = path.join(REPO_ROOT, to)
      await fs.mkdir(path.dirname(absTo), { recursive: true })
      await fs.rename(absFrom, absTo)
      actions.push(`moved ${from} -> ${to}`)
      continue
    }

    throw new Error(`Unknown manifest action: ${line}`)
  }

  const out: string[] = []
  out.push("# Markdown Hygiene Apply Log")
  out.push("")
  out.push(`Manifest: ${normalizeWorkspacePath(absManifest)}`)
  out.push(`Generated: ${new Date().toISOString()}`)
  out.push("")
  for (const action of actions) out.push(`- ${action}`)
  const reportPath = await writeReport("markdown-hygiene-apply", out)
  console.log(`[markdown-repo-curator] apply complete: ${reportPath}`)
}

async function main() {
  const { mode, manifest } = parseArgs(process.argv)
  if (mode === "scan") {
    await runScan()
    return
  }

  if (mode === "apply") {
    await runApply(manifest)
    return
  }

  throw new Error(`Unknown mode: ${mode}`)
}

main().catch((error) => {
  console.error("[markdown-repo-curator] failed", error)
  process.exitCode = 1
})

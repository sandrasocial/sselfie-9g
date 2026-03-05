import path from "node:path"
import { REPO_ROOT, isCodeFile, normalizeWorkspacePath, readText, walkFiles, writeReport } from "./_shared"

type NodeStats = {
  file: string
  imports: number
  importedBy: number
  lines: number
  score: number
}

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]

function resolveImport(fromFile: string, specifier: string, allFiles: Set<string>): string | null {
  if (!specifier.startsWith(".")) return null
  const base = path.resolve(path.dirname(fromFile), specifier)

  const candidates = [
    base,
    ...EXTENSIONS.map((ext) => `${base}${ext}`),
    ...EXTENSIONS.map((ext) => path.join(base, `index${ext}`)),
  ]

  for (const candidate of candidates) {
    if (allFiles.has(candidate)) return candidate
  }
  return null
}

async function main() {
  const [appFiles, libFiles, componentFiles] = await Promise.all([
    walkFiles(path.join(REPO_ROOT, "app")),
    walkFiles(path.join(REPO_ROOT, "lib")),
    walkFiles(path.join(REPO_ROOT, "components")),
  ])
  const codeFiles = [...appFiles, ...libFiles, ...componentFiles].filter(isCodeFile)
  const codeSet = new Set(codeFiles)

  const importsByFile = new Map<string, Set<string>>()
  const importedByFile = new Map<string, Set<string>>()
  const lineCount = new Map<string, number>()

  for (const file of codeFiles) {
    const content = await readText(file).catch(() => "")
    lineCount.set(file, content ? content.split("\n").length : 0)
    const importSpecs = [
      ...content.matchAll(/^\s*import\s.+from\s+['"](.+)['"]/gm),
      ...content.matchAll(/^\s*export\s.+from\s+['"](.+)['"]/gm),
    ].map((m) => m[1])

    const resolved = new Set<string>()
    for (const specifier of importSpecs) {
      const target = resolveImport(file, specifier, codeSet)
      if (target) resolved.add(target)
    }
    importsByFile.set(file, resolved)
  }

  for (const [from, targets] of importsByFile.entries()) {
    for (const target of targets) {
      const bucket = importedByFile.get(target) || new Set<string>()
      bucket.add(from)
      importedByFile.set(target, bucket)
    }
  }

  const stats: NodeStats[] = codeFiles.map((file) => {
    const imports = importsByFile.get(file)?.size || 0
    const importedBy = importedByFile.get(file)?.size || 0
    const lines = lineCount.get(file) || 0
    const score = importedBy * 2 + imports + lines / 200
    return {
      file: normalizeWorkspacePath(file),
      imports,
      importedBy,
      lines,
      score: Number(score.toFixed(2)),
    }
  })

  const hubs = [...stats].sort((a, b) => b.score - a.score).slice(0, 20)

  const lines: string[] = []
  lines.push("# Dependency Gravity Scan")
  lines.push("")
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push("")
  lines.push("## High Gravity Files")
  for (const hub of hubs.slice(0, 12)) {
    lines.push(`- ${hub.file}`)
    lines.push(`  - imports: ${hub.imports}`)
    lines.push(`  - imported by: ${hub.importedBy}`)
    lines.push(`  - lines: ${hub.lines}`)
    lines.push(`  - gravity score: ${hub.score}`)
  }
  lines.push("")
  lines.push("## Hub Dependency Map")
  for (const hub of hubs.slice(0, 5)) {
    const absFile = path.join(REPO_ROOT, hub.file)
    const children = [...(importsByFile.get(absFile) || new Set<string>())]
      .map((f) => normalizeWorkspacePath(f))
      .slice(0, 8)
    const parents = [...(importedByFile.get(absFile) || new Set<string>())]
      .map((f) => normalizeWorkspacePath(f))
      .slice(0, 8)

    lines.push(`- ${hub.file}`)
    lines.push("  - depends on:")
    if (children.length === 0) lines.push("    - none")
    for (const child of children) lines.push(`    - ${child}`)
    lines.push("  - depended on by:")
    if (parents.length === 0) lines.push("    - none")
    for (const parent of parents) lines.push(`    - ${parent}`)
  }
  lines.push("")

  const reportPath = await writeReport("gravity-scan", lines)
  console.log(`[gravity-scanner] wrote ${reportPath}`)
}

main().catch((error) => {
  console.error("[gravity-scanner] failed", error)
  process.exitCode = 1
})

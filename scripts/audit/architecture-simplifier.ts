import path from "node:path"
import { REPO_ROOT, isCodeFile, normalizeWorkspacePath, readText, walkFiles, writeReport } from "./_shared"

type FileInfo = {
  file: string
  lines: number
  imports: number
}

function groupByPrefix(paths: string[], segmentDepth = 2): Map<string, number> {
  const map = new Map<string, number>()
  for (const file of paths) {
    const parts = file.split("/")
    const key = parts.slice(0, segmentDepth).join("/")
    map.set(key, (map.get(key) || 0) + 1)
  }
  return map
}

async function main() {
  const [libFiles, componentFiles, appFiles] = await Promise.all([
    walkFiles(path.join(REPO_ROOT, "lib")),
    walkFiles(path.join(REPO_ROOT, "components")),
    walkFiles(path.join(REPO_ROOT, "app")),
  ])
  const codeFiles = [...libFiles, ...componentFiles, ...appFiles].filter(isCodeFile)

  const fileInfos: FileInfo[] = []
  for (const file of codeFiles) {
    const content = await readText(file).catch(() => "")
    if (!content) continue
    const lines = content.split("\n").length
    const imports = [...content.matchAll(/^\s*import\s.+from\s+['"].+['"]/gm)].length
    fileInfos.push({
      file: normalizeWorkspacePath(file),
      lines,
      imports,
    })
  }

  const biggestFiles = fileInfos.sort((a, b) => b.lines - a.lines).slice(0, 25)
  const highFanInCandidates = fileInfos
    .filter((f) => f.imports >= 20 || f.lines >= 600)
    .sort((a, b) => b.imports + b.lines / 100 - (a.imports + a.lines / 100))
    .slice(0, 20)

  const relLibFiles = libFiles.map(normalizeWorkspacePath)
  const duplicateFamilies = new Map<string, string[]>()
  for (const file of relLibFiles) {
    const name = path.basename(file).replace(/\.(ts|tsx|js|jsx)$/, "")
    const family = name
      .replace(/-(v\d+|old|legacy|new|simple|optimized|copy)$/i, "")
      .replace(/_(v\d+|old|legacy|new|simple|optimized|copy)$/i, "")
    const bucket = duplicateFamilies.get(family) || []
    bucket.push(file)
    duplicateFamilies.set(family, bucket)
  }

  const simplificationFamilies = [...duplicateFamilies.entries()]
    .filter(([, files]) => files.length >= 3)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20)

  const areaDensity = groupByPrefix([...relLibFiles, ...componentFiles.map(normalizeWorkspacePath), ...appFiles.map(normalizeWorkspacePath)], 2)
  const denseAreas = [...areaDensity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)

  const lines: string[] = []
  lines.push("# Architecture Simplification Opportunities")
  lines.push("")
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push("")
  lines.push("## Large Files (Refactor Risk)")
  for (const item of biggestFiles.slice(0, 15)) {
    lines.push(`- ${item.file}: ${item.lines} lines, ${item.imports} imports`)
  }
  lines.push("")
  lines.push("## High-Gravity Refactor Targets")
  for (const item of highFanInCandidates.slice(0, 12)) {
    lines.push(`- ${item.file}: ${item.lines} lines, ${item.imports} imports`)
  }
  lines.push("")
  lines.push("## Duplicate Module Families")
  if (simplificationFamilies.length === 0) {
    lines.push("- No obvious duplicate families detected by naming pattern.")
  } else {
    for (const [family, files] of simplificationFamilies) {
      lines.push(`- ${family}: ${files.length} files`)
      for (const file of files.slice(0, 6)) lines.push(`  - ${file}`)
    }
  }
  lines.push("")
  lines.push("## Dense Areas (Potential Over-Abstraction)")
  for (const [area, count] of denseAreas) {
    lines.push(`- ${area}: ${count} files`)
  }
  lines.push("")
  lines.push("## Simplifier Recommendations")
  lines.push("- Collapse duplicate families to one canonical module per concern.")
  lines.push("- Extract highly volatile logic from large files into narrow helper modules only when tests exist.")
  lines.push("- Keep API routes thin and move business logic to one shared module per domain.")
  lines.push("")

  const reportPath = await writeReport("architecture-simplifier", lines)
  console.log(`[architecture-simplifier] wrote ${reportPath}`)
}

main().catch((error) => {
  console.error("[architecture-simplifier] failed", error)
  process.exitCode = 1
})

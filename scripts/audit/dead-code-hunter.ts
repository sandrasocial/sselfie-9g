import { execSync } from "node:child_process"
import path from "node:path"
import { REPO_ROOT, isCodeFile, normalizeWorkspacePath, readText, uniq, walkFiles, writeReport } from "./_shared"

type DuplicateSymbol = {
  name: string
  files: string[]
}

function safeExec(command: string): string {
  try {
    return execSync(command, { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()
  } catch (error: any) {
    const stdout = error?.stdout?.toString?.() || ""
    return stdout.trim()
  }
}

function normalizeDepNameForSearch(dep: string): string {
  return dep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

async function main() {
  const [appFiles, libFiles, componentFiles] = await Promise.all([
    walkFiles(path.join(REPO_ROOT, "app")),
    walkFiles(path.join(REPO_ROOT, "lib")),
    walkFiles(path.join(REPO_ROOT, "components")),
  ])
  const codeFiles = [...appFiles, ...libFiles, ...componentFiles].filter(isCodeFile)

  const routeFiles = appFiles.filter((f) => f.endsWith("/route.ts") || f.endsWith("/route.tsx"))
  const routePaths = routeFiles.map((file) => {
    const rel = normalizeWorkspacePath(file)
    return `/${rel.replace(/^app\//, "").replace(/\/route\.tsx?$/, "")}`
  })

  const routeRefs = new Map<string, number>()
  for (const routePath of routePaths) {
    if (!routePath.startsWith("/api/")) continue
    const escaped = routePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const matches = safeExec(`rg -l "${escaped}" app components lib --glob "*.{ts,tsx,js,jsx}"`).split("\n").filter(Boolean)
    const externalSignal = /\/api\/(webhooks|cron)\//.test(routePath)
    routeRefs.set(routePath, externalSignal ? Math.max(matches.length, 1) : matches.length)
  }

  const potentiallyOrphanedRoutes = [...routeRefs.entries()]
    .filter(([route, refs]) => route !== "/api" && refs === 0)
    .map(([route]) => route)
    .slice(0, 60)

  const packageJson = JSON.parse(await readText(path.join(REPO_ROOT, "package.json")))
  const deps = Object.keys(packageJson.dependencies || {})
  const unusedDeps: string[] = []
  for (const dep of deps) {
    const escaped = normalizeDepNameForSearch(dep)
    const found = safeExec(`rg -n "from ['\\"]${escaped}['\\"]|require\\(['\\"]${escaped}['\\"]\\)" app lib components scripts --glob "*.{ts,tsx,js,jsx,mjs,cjs}"`)
    if (!found) {
      unusedDeps.push(dep)
    }
  }

  const exportedSymbolMap = new Map<string, string[]>()
  for (const file of codeFiles) {
    const content = await readText(file).catch(() => "")
    if (!content) continue
    const relative = normalizeWorkspacePath(file)
    const exportMatches = [
      ...content.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g),
      ...content.matchAll(/export\s+const\s+([A-Za-z0-9_]+)\s*=/g),
      ...content.matchAll(/export\s+class\s+([A-Za-z0-9_]+)/g),
    ]
    for (const match of exportMatches) {
      const symbol = match[1]
      const bucket = exportedSymbolMap.get(symbol) || []
      bucket.push(relative)
      exportedSymbolMap.set(symbol, bucket)
    }
  }

  const duplicateSymbols: DuplicateSymbol[] = []
  const ignoreSymbols = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD", "runtime", "dynamic", "maxDuration"])
  for (const [name, files] of exportedSymbolMap.entries()) {
    if (ignoreSymbols.has(name)) continue
    if (files.length > 1) {
      duplicateSymbols.push({ name, files: uniq(files) })
    }
  }
  duplicateSymbols.sort((a, b) => b.files.length - a.files.length)

  const tsPruneRaw = safeExec("pnpm exec ts-prune")
  const tsPruneLines = tsPruneRaw.split("\n").filter(Boolean).slice(0, 50)

  const staleArtifacts = safeExec(
    "find . -type f \\( -name '*.bak' -o -name '*.old' -o -name '*.disabled' -o -name '*.removed' \\) -not -path './node_modules/*' -not -path './.next/*' -not -path './.claude/*'",
  )
    .split("\n")
    .filter(Boolean)
    .slice(0, 50)

  const lines: string[] = []
  lines.push("# Dead Code Findings")
  lines.push("")
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push("")
  lines.push("## Potentially Orphaned API Routes")
  lines.push(`- Count: ${potentiallyOrphanedRoutes.length}`)
  for (const route of potentiallyOrphanedRoutes.slice(0, 30)) {
    lines.push(`- ${route}`)
  }
  lines.push("")
  lines.push("## Potentially Unused Dependencies (Heuristic)")
  lines.push(`- Count: ${unusedDeps.length}`)
  for (const dep of unusedDeps.slice(0, 30)) {
    lines.push(`- ${dep}`)
  }
  lines.push("")
  lines.push("## Duplicate Exported Symbols")
  lines.push(`- Count: ${duplicateSymbols.length}`)
  for (const symbol of duplicateSymbols.slice(0, 20)) {
    lines.push(`- ${symbol.name} (${symbol.files.length} files)`)
    for (const file of symbol.files.slice(0, 4)) {
      lines.push(`  - ${file}`)
    }
  }
  lines.push("")
  lines.push("## Unused Exports (`ts-prune` sample)")
  if (tsPruneLines.length === 0) {
    lines.push("- No findings or command unavailable.")
  } else {
    for (const line of tsPruneLines) lines.push(`- ${line}`)
  }
  lines.push("")
  lines.push("## Stale Artifacts")
  if (staleArtifacts.length === 0) {
    lines.push("- No stale artifact files found.")
  } else {
    for (const file of staleArtifacts) lines.push(`- ${file.replace(/^\.\//, "")}`)
  }
  lines.push("")

  const reportPath = await writeReport("dead-code-scan", lines)
  console.log(`[dead-code-hunter] wrote ${reportPath}`)
}

main().catch((error) => {
  console.error("[dead-code-hunter] failed", error)
  process.exitCode = 1
})

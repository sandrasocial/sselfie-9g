import path from "node:path"
import { REPO_ROOT, isCodeFile, normalizeWorkspacePath, readText, walkFiles, writeReport } from "./_shared"

type PromptSite = {
  file: string
  hasAuthorityImport: boolean
  markers: string[]
}

function hasPromptSignal(content: string): string[] {
  const markers: string[] = []
  if (/You are /i.test(content)) markers.push("persona_string")
  if (/prompt/i.test(content)) markers.push("prompt_keyword")
  if (/generateText|streamText|chat\.completions|messages:/i.test(content)) markers.push("model_invocation")
  if (/system\s*:\s*["'`]/i.test(content)) markers.push("system_inline")
  return markers
}

function hasAuthorityImport(content: string): boolean {
  return /legacy-authority|prompt-authority|generation\/prompt\/index|generation\/prompt\/route-audit|createAuthorityAudit|auditLogMayaChatGeneration|auditPromptRoute/i.test(
    content,
  )
}

async function main() {
  const [appFiles, libFiles] = await Promise.all([
    walkFiles(path.join(REPO_ROOT, "app")),
    walkFiles(path.join(REPO_ROOT, "lib")),
  ])
  const codeFiles = [...appFiles, ...libFiles].filter(isCodeFile)

  const authorityFiles = codeFiles
    .map((file) => normalizeWorkspacePath(file))
    .filter((file) => /prompt-authority|legacy-authority|generation\/prompt\/index|prompt\/audit/i.test(file))

  const promptSites: PromptSite[] = []
  for (const file of codeFiles) {
    const content = await readText(file).catch(() => "")
    if (!content) continue
    const markers = hasPromptSignal(content)
    if (markers.length < 2) continue
    const relative = normalizeWorkspacePath(file)
    promptSites.push({
      file: relative,
      hasAuthorityImport: hasAuthorityImport(content),
      markers,
    })
  }

  const shadowPrompts = promptSites
    .filter((site) => !site.hasAuthorityImport)
    .sort((a, b) => b.markers.length - a.markers.length)
    .slice(0, 80)

  const authorityPromptSites = promptSites.filter((site) => site.hasAuthorityImport)
  const likelyDuplicates = new Map<string, string[]>()
  for (const site of promptSites) {
    const key = site.markers.sort().join("+")
    const bucket = likelyDuplicates.get(key) || []
    bucket.push(site.file)
    likelyDuplicates.set(key, bucket)
  }

  const duplicateClusters = [...likelyDuplicates.entries()]
    .filter(([, files]) => files.length >= 4)
    .sort((a, b) => b[1].length - a[1].length)

  const lines: string[] = []
  lines.push("# Prompt Authority Scan")
  lines.push("")
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push("")
  lines.push("## Central Authority Layer Files")
  if (authorityFiles.length === 0) {
    lines.push("- No central authority files detected.")
  } else {
    for (const file of authorityFiles.slice(0, 20)) lines.push(`- ${file}`)
  }
  lines.push("")
  lines.push("## Prompt Sources")
  lines.push(`- Total prompt-like sites: ${promptSites.length}`)
  lines.push(`- Routed through authority: ${authorityPromptSites.length}`)
  lines.push(`- Shadow prompt sites: ${shadowPrompts.length}`)
  lines.push("")
  lines.push("## Shadow Prompts (Bypass Candidates)")
  for (const site of shadowPrompts.slice(0, 30)) {
    lines.push(`- ${site.file} [${site.markers.join(", ")}]`)
  }
  lines.push("")
  lines.push("## Duplicate Prompt Pattern Clusters")
  if (duplicateClusters.length === 0) {
    lines.push("- No large duplicate clusters detected by marker signature.")
  } else {
    for (const [cluster, files] of duplicateClusters.slice(0, 8)) {
      lines.push(`- ${cluster}: ${files.length} files`)
      for (const file of files.slice(0, 5)) {
        lines.push(`  - ${file}`)
      }
    }
  }
  lines.push("")
  lines.push("## Recommendation")
  lines.push("- Move shadow prompt sites into the authority registry and keep rendering/copy concerns separate from prompt governance.")
  lines.push("")

  const reportPath = await writeReport("prompt-authority-check", lines)
  console.log(`[prompt-authority-inspector] wrote ${reportPath}`)
}

main().catch((error) => {
  console.error("[prompt-authority-inspector] failed", error)
  process.exitCode = 1
})

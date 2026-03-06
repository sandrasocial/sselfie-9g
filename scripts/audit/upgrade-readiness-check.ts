import { execSync } from "node:child_process"
import path from "node:path"
import { REPO_ROOT, readText, writeReport } from "./_shared"

type OutdatedEntry = {
  current?: string
  latest?: string
  wanted?: string
  package?: string
}

function safeOutdated(): Record<string, OutdatedEntry> {
  try {
    const raw = execSync("pnpm outdated --format json", {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim()
    return raw ? JSON.parse(raw) : {}
  } catch (error: any) {
    const stdout = error?.stdout?.toString?.() || ""
    if (!stdout.trim()) return {}
    try {
      return JSON.parse(stdout)
    } catch {
      return {}
    }
  }
}

function major(version?: string): number | null {
  if (!version) return null
  const m = version.match(/(\d+)\./)
  return m ? Number(m[1]) : null
}

function breakingRisk(current?: string, latest?: string): "high" | "medium" | "low" {
  const c = major(current)
  const l = major(latest)
  if (c == null || l == null) return "low"
  if (l - c >= 2) return "high"
  if (l > c) return "medium"
  return "low"
}

async function main() {
  const packageJson = JSON.parse(await readText(path.join(REPO_ROOT, "package.json")))
  const outdated = safeOutdated()
  const entries = Object.entries(outdated).map(([name, meta]) => ({
    name,
    current: meta.current,
    latest: meta.latest,
    wanted: meta.wanted,
    risk: breakingRisk(meta.current, meta.latest),
  }))

  const corePackages = ["next", "react", "stripe", "@ai-sdk/openai", "@ai-sdk/anthropic", "replicate", "typescript"]
  const coreRows = corePackages.map((pkg) => {
    const current = packageJson.dependencies?.[pkg] || packageJson.devDependencies?.[pkg] || "not-installed"
    const o = entries.find((entry) => entry.name === pkg)
    return {
      name: pkg,
      current,
      latest: o?.latest || current,
      risk: o?.risk || "low",
      outdated: Boolean(o),
    }
  })

  const highRisk = entries.filter((e) => e.risk === "high")
  const mediumRisk = entries.filter((e) => e.risk === "medium")

  const lines: string[] = []
  lines.push("# Upgrade Readiness Check")
  lines.push("")
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push("")
  lines.push("## Core Stack Snapshot")
  for (const row of coreRows) {
    lines.push(
      `- ${row.name}: current=${row.current}, latest=${row.latest}, outdated=${row.outdated ? "yes" : "no"}, risk=${row.risk}`,
    )
  }
  lines.push("")
  lines.push("## High-Risk Upgrades (Major Gap >=2)")
  if (highRisk.length === 0) {
    lines.push("- None detected.")
  } else {
    for (const row of highRisk.slice(0, 25)) {
      lines.push(`- ${row.name}: ${row.current} -> ${row.latest}`)
    }
  }
  lines.push("")
  lines.push("## Medium-Risk Upgrades (Major Gap =1)")
  if (mediumRisk.length === 0) {
    lines.push("- None detected.")
  } else {
    for (const row of mediumRisk.slice(0, 30)) {
      lines.push(`- ${row.name}: ${row.current} -> ${row.latest}`)
    }
  }
  lines.push("")
  lines.push("## Full Outdated Count")
  lines.push(`- Packages outdated: ${entries.length}`)
  lines.push("")
  lines.push("## Recommendation")
  lines.push("- Upgrade core runtime libraries in isolated PRs with snapshot tests and smoke checks.")
  lines.push("- Upgrade toolchain packages (eslint/typescript/test) after runtime stability.")
  lines.push("")

  const reportPath = await writeReport("upgrade-readiness", lines)
  console.log(`[upgrade-readiness-check] wrote ${reportPath}`)
}

main().catch((error) => {
  console.error("[upgrade-readiness-check] failed", error)
  process.exitCode = 1
})

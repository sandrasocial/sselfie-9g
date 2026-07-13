import path from "node:path"
import { isCodeFile, normalizeWorkspacePath, readText, walkFiles, writeReport } from "./audit/_shared"

type Finding = {
  file: string
  line: number
  type: "banned_phrase" | "font_drift" | "color_drift"
  detail: string
}

const ROOT = process.cwd()

const TARGET_DIRS = [
  "app/selfie-guide",
  "app/brand-strategy",
  "app/checkout",
  "app/strategy",
  "components/selfie-guide",
  "components/strategy",
  "lib/email/templates",
]

const TARGET_FILES = ["app/page.tsx", "app/globals.css"]

const EXCLUDED_PATH_PARTS = [
  `${path.sep}archived${path.sep}`,
  `${path.sep}critical-bug-alert.tsx`,
  `${path.sep}feedback-admin-notification.tsx`,
  `${path.sep}freebie-guide-email.tsx`,
  `${path.sep}freebie-strategy-email.ts`,
]

const BANNED_PHRASES = [
  "unlock your potential",
  "leverage",
  "utilize",
  "optimize",
  "game-changer",
  "level up",
  "strategic visibility",
  "transform your life overnight",
  "robust solution",
  "robust",
  "scalable",
  "synergy",
  "dear valued customer",
  "new face",
  "AI headshot",
  "headshot app",
  "AI photo app",
  "prompt marketplace",
]

const FONT_DRIFT_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "Georgia", pattern: /Georgia/i },
  { label: "Times New Roman", pattern: /Times New Roman/i },
  { label: "Roboto", pattern: /Roboto/i },
  { label: "Helvetica Neue", pattern: /Helvetica Neue/i },
  { label: "-apple-system", pattern: /-apple-system/i },
  { label: "BlinkMacSystemFont", pattern: /BlinkMacSystemFont/i },
  { label: "system-ui", pattern: /system-ui/i },
]

const ALLOWED_HEX = new Set([
  "#0a0a0a",
  "#0d0c0b",
  "#0c0a09",
  "#0b0b0b",
  "#000000",
  "#1c1b19",
  "#1c1917",
  "#171717",
  "#292524",
  "#2a2720",
  "#2e2c29",
  "#3a3630",
  "#ffffff",
  "#f5f5f5",
  "#f0ede8",
  "#e7e5e4",
  "#f2f2f2",
  "#fafaf9",
  "#e5e5e5",
  "#c8c4bb",
  "#d6d3d1",
  "#a8a49c",
  "#a8a29e",
  "#8a8780",
  "#57534e",
  "#666666",
])

function findLineNumber(content: string, offset: number): number {
  return content.slice(0, offset).split("\n").length
}

async function collectTargetFiles(): Promise<string[]> {
  const files = TARGET_FILES.map((relative) => path.join(ROOT, relative))
  for (const relative of TARGET_DIRS) {
    const abs = path.join(ROOT, relative)
    const walked = await walkFiles(abs)
    files.push(
      ...walked.filter((file) => {
        if (!isCodeFile(file) && !file.endsWith(".css")) return false
        return !EXCLUDED_PATH_PARTS.some((part) => file.includes(part))
      }),
    )
  }
  return [...new Set(files)]
}

async function main() {
  const files = await collectTargetFiles()
  const findings: Finding[] = []

  for (const file of files) {
    const content = await readText(file).catch(() => "")
    if (!content) continue
    const relative = normalizeWorkspacePath(file)
    const hasCanonicalBodyFont = /Inter/i.test(content)
    const hasCanonicalDisplayFont = /Cormorant Garamond/i.test(content)

    for (const phrase of BANNED_PHRASES) {
      const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig")
      for (const match of content.matchAll(regex)) {
        const index = match.index ?? 0
        findings.push({
          file: relative,
          line: findLineNumber(content, index),
          type: "banned_phrase",
          detail: `Banned phrase detected: ${phrase}`,
        })
      }
    }

    for (const rule of FONT_DRIFT_PATTERNS) {
      if (["Georgia", "Times New Roman"].includes(rule.label) && hasCanonicalDisplayFont) {
        continue
      }
      if (
        ["Roboto", "Helvetica Neue", "-apple-system", "BlinkMacSystemFont", "system-ui"].includes(rule.label) &&
        hasCanonicalBodyFont
      ) {
        continue
      }
      const match = content.match(new RegExp(rule.pattern.source, "i"))
      if (match) {
        const index = content.search(new RegExp(rule.pattern.source, "i"))
        findings.push({
          file: relative,
          line: findLineNumber(content, index),
          type: "font_drift",
          detail: `Non-canonical font stack detected: ${rule.label}`,
        })
      }
    }

    if (relative !== "app/globals.css") {
      for (const match of content.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
        const hex = match[0].toLowerCase()
        if (ALLOWED_HEX.has(hex)) continue
        const index = match.index ?? 0
        findings.push({
          file: relative,
          line: findLineNumber(content, index),
          type: "color_drift",
          detail: `Raw color outside the approved neutral palette: ${hex}`,
        })
      }
    }
  }

  const groupedCounts = {
    banned_phrase: findings.filter((finding) => finding.type === "banned_phrase").length,
    font_drift: findings.filter((finding) => finding.type === "font_drift").length,
    color_drift: findings.filter((finding) => finding.type === "color_drift").length,
  }

  const lines: string[] = []
  lines.push("# Brand Consistency Audit")
  lines.push("")
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push("")
  lines.push("## Scope")
  lines.push(`- Files scanned: ${files.length}`)
  lines.push("- Surfaces: public paid routes, supporting public components, and live email templates")
  lines.push("- Brand law: docs/brand/SSELFIE_BRAND_CONSTITUTION.md")
  lines.push("- Detailed voice: docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md")
  lines.push("")
  lines.push("## Findings")
  if (findings.length === 0) {
    lines.push("- No brand drift detected in the scanned surfaces.")
  } else {
    for (const finding of findings.slice(0, 40)) {
      lines.push(`- ${finding.type} :: ${finding.file}:${finding.line} :: ${finding.detail}`)
    }
  }

  lines.push("")
  lines.push("## Summary")
  lines.push(`- Banned phrase hits: ${groupedCounts.banned_phrase}`)
  lines.push(`- Font drift hits: ${groupedCounts.font_drift}`)
  lines.push(`- Color drift hits: ${groupedCounts.color_drift}`)
  lines.push(
    findings.length === 0
      ? "- Brand consistency is healthy."
      : "- Fix design token and typography drift first. Keep any customer-facing copy changes in draft for Sandra approval.",
  )

  const reportPath = await writeReport("brand-consistency-audit", lines)
  console.log(`[brand-consistency-audit] wrote ${reportPath}`)

  if (findings.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error("[brand-consistency-audit] failed", error)
  process.exitCode = 1
})

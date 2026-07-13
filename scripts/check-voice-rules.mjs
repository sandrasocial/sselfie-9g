#!/usr/bin/env node
// Voice guard: fails when customer-facing copy breaks Sandra's locked language rules.
// Scope: email templates + JSX/TSX string copy.
// Brand law: docs/brand/SSELFIE_BRAND_CONSTITUTION.md
// Detailed voice: docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md
// Run: node scripts/check-voice-rules.mjs
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { join, relative } from "node:path"

const ROOT = process.cwd()
const SCAN_DIRS = ["lib/email/templates", "app", "components"]
const OUTPUT_DIR = join(ROOT, "output", "automation")

// Product/content files where em-dashes are AI-generation prompt text, not Sandra's copy.
const ALLOWLIST = [
  "lib/ai-prompts/prompt-data.ts",
  // Protected trees (separate cleanup later — see CLAUDE.md Dead Code Map):
  "app/feed-planner/",
  "app/api/feed-planner/",
  "app/api/feed/",
  "components/feed-planner/",
]

const BANNED_RULES = [
  { label: "hype phrase: game changer", pattern: /game.changer/i },
  { label: "hype word: skyrocket", pattern: /skyrocket/i },
  { label: "corporate word: synergy", pattern: /\bsynergy\b/i },
  { label: "hype phrase: unlock your potential", pattern: /unlock your potential/i },
  { label: "corporate word: leverage", pattern: /\bleverage\b/i },
  { label: "corporate word: utilize", pattern: /\butilize\b/i },
  { label: "corporate word: optimize", pattern: /\boptimize\b/i },
  { label: "corporate word: robust", pattern: /\brobust\b/i },
  { label: "corporate word: scalable", pattern: /\bscalable\b/i },
  { label: "old positioning word: elevate/elevated", pattern: /\belevate(?:d)?\b/i },
  { label: "old positioning phrase: strategic visibility", pattern: /\bstrategic visibility\b/i },
  { label: "hype phrase: level up", pattern: /\blevel up\b/i },
  { label: "rejected phrase: new face", pattern: /\bnew face\b/i },
  { label: "rejected phrase: need a studio", pattern: /\b(?:do not|don't|doesn't|need|needs|needed)\s+(?:a\s+)?studio\b/i },
  { label: "old category: narrow AI/headshot framing", pattern: /\bAI headshot\b|\bheadshot app\b|\bAI photo app\b/i },
  { label: "old category: prompt marketplace", pattern: /\bprompt marketplace\b/i },
]

const EM_DASH = /—|&mdash;/

function isAllowed(rel) {
  return ALLOWLIST.some((entry) => rel === entry || rel.startsWith(entry))
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue
      yield* walk(full)
    } else if (/\.(ts|tsx)$/.test(name)) {
      yield full
    }
  }
}

function isCommentLine(line) {
  const trimmed = line.trim()
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("{/*") ||
    trimmed.endsWith("*/}") ||
    trimmed.includes("{/*") ||
    trimmed.includes("*/}")
  )
}

function shouldSkipRule(line, label) {
  if (label.includes("elevate") && /app-elevated|elevated park|sbs2-module-unlock/i.test(line)) {
    return true
  }
  if (/\bconsole\./.test(line)) return true
  return false
}

const violations = []

function nowStamp(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const hh = String(date.getHours()).padStart(2, "0")
  const mm = String(date.getMinutes()).padStart(2, "0")
  const ss = String(date.getSeconds()).padStart(2, "0")
  return `${y}${m}${d}-${hh}${mm}${ss}`
}

function writeVoiceReport() {
  mkdirSync(OUTPUT_DIR, { recursive: true })
  const reportPath = join(OUTPUT_DIR, `voice-rules-check-${nowStamp()}.md`)
  const lines = [
    "# SSELFIE Voice Rules Check",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Scope",
    `- Directories: ${SCAN_DIRS.join(", ")}`,
    "- Brand law: docs/brand/SSELFIE_BRAND_CONSTITUTION.md",
    "- Detailed voice: docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md",
    "",
    "## Summary",
    `- Violations: ${violations.length}`,
    "",
    "## Findings",
  ]

  if (violations.length === 0) {
    lines.push("- No voice violations detected.")
  } else {
    for (const violation of violations.slice(0, 220)) lines.push(`- ${violation}`)
    if (violations.length > 220) lines.push(`- ... ${violations.length - 220} additional findings omitted`)
  }

  writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8")
  return reportPath
}

for (const dir of SCAN_DIRS) {
  let entries
  try {
    entries = [...walk(join(ROOT, dir))]
  } catch {
    continue
  }
  for (const file of entries) {
    const rel = relative(ROOT, file)
    if (isAllowed(rel)) continue
    const lines = readFileSync(file, "utf8").split("\n")
    lines.forEach((line, index) => {
      if (isCommentLine(line)) return
      if (EM_DASH.test(line)) {
        violations.push(`${rel}:${index + 1} em-dash: ${line.trim().slice(0, 90)}`)
      }
      for (const rule of BANNED_RULES) {
        if (shouldSkipRule(line, rule.label)) continue
        if (rule.pattern.test(line)) {
          violations.push(`${rel}:${index + 1} banned language (${rule.label}): ${line.trim().slice(0, 90)}`)
        }
      }
    })
  }
}

if (violations.length > 0) {
  const reportPath = writeVoiceReport()
  console.error(`Voice rules check FAILED — ${violations.length} violation(s):\n`)
  for (const v of violations) console.error("  " + v)
  console.error(`\nReport: ${reportPath}`)
  console.error(
    "\nRules: no em-dashes in copy, no banned language. Start with docs/brand/SSELFIE_BRAND_CONSTITUTION.md.",
  )
  process.exit(1)
}

const reportPath = writeVoiceReport()
console.log(`[voice-rules-check] wrote ${reportPath}`)
console.log("Voice rules check passed.")

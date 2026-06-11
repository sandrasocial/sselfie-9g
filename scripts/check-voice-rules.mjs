#!/usr/bin/env node
// Voice guard: fails when customer-facing copy breaks Sandra's locked language rules.
// Scope: email templates + JSX/TSX string copy. See docs/audits/VOICE_AUDIT_2026-06-10.md.
// Run: node scripts/check-voice-rules.mjs
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const ROOT = process.cwd()
const SCAN_DIRS = ["lib/email/templates", "app", "components"]

// Product/content files where em-dashes are AI-generation prompt text, not Sandra's copy.
const ALLOWLIST = [
  "lib/ai-prompts/prompt-data.ts",
  // Protected trees (separate cleanup later — see CLAUDE.md Dead Code Map):
  "app/feed-planner/",
  "app/api/feed-planner/",
  "app/api/feed/",
  "components/feed-planner/",
]

const BANNED_WORDS = [
  /game.changer/i,
  /skyrocket/i,
  /\bsynergy\b/i,
  /unlock your potential/i,
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
  return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")
}

const violations = []

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
      for (const pattern of BANNED_WORDS) {
        if (pattern.test(line)) {
          violations.push(`${rel}:${index + 1} banned word (${pattern}): ${line.trim().slice(0, 90)}`)
        }
      }
    })
  }
}

if (violations.length > 0) {
  console.error(`Voice rules check FAILED — ${violations.length} violation(s):\n`)
  for (const v of violations) console.error("  " + v)
  console.error("\nRules: no em-dashes in copy, no banned words. See CLAUDE.md > Sandra's Preferences.")
  process.exit(1)
}

console.log("Voice rules check passed.")

#!/usr/bin/env node
/**
 * Run all daily automation scripts in order: audits → digests → triage → archive.
 * Use: node scripts/run-automation-daily.mjs (or npm run automation:daily)
 * Requires: DATABASE_URL in env or .env.local
 * Writes: output/automation/*.md then archives old files.
 */
import { execSync } from "node:child_process"
import { resolve } from "node:path"
import dotenv from "dotenv"

const root = resolve(process.cwd())
dotenv.config({ path: resolve(root, ".env.local") })
dotenv.config({ path: resolve(root, ".env") })

if (!process.env.DATABASE_URL) {
  console.error("[run-automation-daily] DATABASE_URL is required. Set it in .env.local or the environment.")
  process.exit(1)
}

const scripts = [
  "node scripts/audit-revenue-sources.mjs",
  "node scripts/audit-subscription-data.mjs",
  "node scripts/funnel-digest.mjs",
  "node scripts/support-digest.mjs",
  "node scripts/triage-hourly.mjs",
  "node scripts/archive-automation-outputs.mjs",
]

console.log("[run-automation-daily] Starting daily automation run...")
for (const cmd of scripts) {
  console.log("[run-automation-daily] Running:", cmd)
  try {
    execSync(cmd, { cwd: root, stdio: "inherit", env: process.env })
  } catch (err) {
    console.error("[run-automation-daily] Failed:", cmd, err.message)
    process.exitCode = 1
    break
  }
}
console.log("[run-automation-daily] Done.")

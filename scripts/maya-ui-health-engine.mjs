import { spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

function pad2(value) {
  return String(value).padStart(2, "0")
}

function makeReportPath() {
  const now = new Date()
  const dir = resolve(process.cwd(), "output", "automation")
  mkdirSync(dir, { recursive: true })
  const fileName = `maya-ui-health-${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}.md`
  return resolve(dir, fileName)
}

function runCommand(label, cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  })
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim()
  return {
    label,
    status: result.status === 0 ? "pass" : "fail",
    detail: output.split("\n").slice(-12).join("\n") || "No output",
  }
}

async function runStaticChecks() {
  const checks = []

  const appShell = await readFile(resolve(process.cwd(), "components/sselfie/sselfie-app.tsx"), "utf8")
  checks.push({
    label: "maya shell isolates scroll container",
    status:
      appShell.includes('activeTab === "maya"') &&
      appShell.includes('"h-full overflow-hidden"') &&
      appShell.includes("overflow-y-auto")
        ? "pass"
        : "fail",
    detail: "Maya tab must avoid nested overflow-y shell to prevent mobile fixed-layer drift.",
  })

  const memoryLayer = await readFile(resolve(process.cwd(), "lib/maya/memory-layer.ts"), "utf8")
  checks.push({
    label: "calendar soft-create intent coverage",
    status:
      memoryLayer.includes("SOFT_CREATE_ACTION_REGEX") &&
      memoryLayer.includes('assetType === "page" || assetType === "calendar"')
        ? "pass"
        : "fail",
    detail: "Calendar asks like 'can you give me an HTML content calendar' should route to structured asset creation.",
  })

  const chatInterface = await readFile(resolve(process.cwd(), "components/sselfie/maya/maya-chat-interface.tsx"), "utf8")
  checks.push({
    label: "calendar preview card renderer present",
    status: chatInterface.includes("tool-createAssetPreview") && chatInterface.includes("MayaGeneratedAssetCard")
      ? "pass"
      : "fail",
    detail: "Calendar/page preview markers must render via MayaGeneratedAssetCard instead of plain text fallback.",
  })

  return checks
}

async function main() {
  const commandChecks = [
    runCommand("tool orchestration + marker tests", "pnpm", [
      "exec",
      "vitest",
      "run",
      "tests/maya-tool-orchestrator.test.ts",
      "tests/maya-tool-markers.test.ts",
    ]),
    runCommand("maya chat UI rendering tests", "pnpm", [
      "exec",
      "vitest",
      "run",
      "tests/maya-generated-asset-card.test.tsx",
      "tests/maya-chat-interface-inline-feed.test.tsx",
      "tests/maya-layout-hygiene.test.ts",
    ]),
  ]

  const staticChecks = await runStaticChecks()
  const failed = [...commandChecks, ...staticChecks].filter((check) => check.status === "fail")

  const lines = [
    "# Maya UI Health Engine",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Command Checks",
  ]

  for (const check of commandChecks) {
    lines.push(`- ${check.status === "pass" ? "PASS" : "FAIL"} ${check.label}`)
    lines.push(`  - Detail: ${check.detail.replace(/\n/g, " ").slice(0, 600)}`)
  }

  lines.push("")
  lines.push("## Static Contract Checks")
  for (const check of staticChecks) {
    lines.push(`- ${check.status === "pass" ? "PASS" : "FAIL"} ${check.label}`)
    lines.push(`  - Detail: ${check.detail}`)
  }

  lines.push("")
  lines.push("## Summary")
  lines.push(`- Failed checks: ${failed.length}`)
  lines.push(
    failed.length === 0
      ? "- Maya UI pipeline healthy (calendar + mobile shell contracts passing)."
      : "- Maya UI pipeline has regressions. Fix failing checks before shipping.",
  )

  const reportPath = makeReportPath()
  writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8")
  console.log(`[maya-ui-health-engine] wrote ${reportPath}`)

  if (failed.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error("[maya-ui-health-engine] failed", error)
  process.exitCode = 1
})

import { spawnSync } from "node:child_process"
import path from "node:path"
import { readText, writeReport } from "./audit/_shared"

type CheckResult = {
  label: string
  status: "pass" | "fail"
  detail: string
}

type Finding = {
  file: string
  line: number
  type: "voice_drift" | "missing_anchor" | "route_contract"
  detail: string
}

const ROOT = process.cwd()

const MAYA_VOICE_FILES = [
  "lib/maya/core-personality.ts",
  "lib/maya/studio-pro-system-prompt.ts",
]

const MAYA_ROUTE_FILE = "app/api/maya/chat/route.ts"

const BANNED_VOICE_PATTERNS = [
  /dear valued customer/i,
  /game-changer/i,
  /synergy/i,
  /robust solution/i,
  /\bunlock\b/i,
  /\blevel up\b/i,
  /transform your life overnight/i,
]

const REQUIRED_ANCHORS: Array<{ label: string; file: string; pattern: RegExp }> = [
  { label: "maya warm tone", file: "lib/maya/core-personality.ts", pattern: /\bwarm\b/i },
  { label: "maya real tone", file: "lib/maya/core-personality.ts", pattern: /\breal\b/i },
  { label: "maya short sentences rule", file: "lib/maya/core-personality.ts", pattern: /short sentences/i },
  {
    label: "maya anti-robot rule",
    file: "lib/maya/core-personality.ts",
    pattern: /never sound like AI or a robot/i,
  },
  {
    label: "maya visibility mission",
    file: "lib/maya/core-personality.ts",
    pattern: /Visibility\s*=\s*Financial Freedom/i,
  },
  {
    label: "studio pro character consistency",
    file: "lib/maya/studio-pro-system-prompt.ts",
    pattern: /Character Consistency/i,
  },
  {
    label: "studio pro text rendering",
    file: "lib/maya/studio-pro-system-prompt.ts",
    pattern: /Text Rendering Excellence/i,
  },
]

const REQUIRED_ROUTE_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "tool orchestration", pattern: /orchestrateMayaTurn/ },
  { label: "tool marker stripping", pattern: /stripMayaToolMarkers/ },
  { label: "tool marker formatting", pattern: /formatMayaToolMarker/ },
  { label: "skill router", pattern: /selectMayaSkill/ },
]

const COMMANDS: Array<{ label: string; args: string[] }> = [
  {
    label: "prompt authority CI",
    args: ["-s", "check:prompt-authority"],
  },
  {
    label: "prompt authority inventory",
    args: ["-s", "audit:prompt-authority"],
  },
  {
    label: "maya ui health",
    args: ["-s", "audit:maya-ui-health"],
  },
  {
    label: "maya inline tool regression tests",
    args: [
      "-s",
      "vitest",
      "run",
      "tests/maya-tool-dispatcher.test.ts",
      "tests/maya-tool-orchestrator.test.ts",
      "tests/maya-tool-markers.test.ts",
      "tests/maya-chat-interface-inline-feed.test.tsx",
      "tests/maya-skill-router.test.ts",
    ],
  },
]

function runCommand(label: string, args: string[]): CheckResult {
  const result = spawnSync("pnpm", args, {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  })
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim()
  const detail = output.split("\n").slice(-12).join("\n") || "No output"
  return {
    label,
    status: result.status === 0 ? "pass" : "fail",
    detail,
  }
}

async function scanVoiceDrift(findings: Finding[]) {
  for (const relativeFile of MAYA_VOICE_FILES) {
    const fullPath = path.join(ROOT, relativeFile)
    const content = await readText(fullPath).catch(() => "")
    if (!content) continue
    const lines = content.split("\n")

    for (const [index, line] of lines.entries()) {
      for (const pattern of BANNED_VOICE_PATTERNS) {
        if (!pattern.test(line)) continue
        findings.push({
          file: relativeFile,
          line: index + 1,
          type: "voice_drift",
          detail: `Banned voice phrase matched: ${pattern}`,
        })
      }
    }
  }
}

async function scanAnchors(findings: Finding[]) {
  for (const anchor of REQUIRED_ANCHORS) {
    const content = await readText(path.join(ROOT, anchor.file)).catch(() => "")
    if (content && anchor.pattern.test(content)) continue
    findings.push({
      file: anchor.file,
      line: 1,
      type: "missing_anchor",
      detail: `Missing Maya anchor: ${anchor.label}`,
    })
  }
}

async function scanRouteContract(findings: Finding[]) {
  const content = await readText(path.join(ROOT, MAYA_ROUTE_FILE)).catch(() => "")
  if (!content) {
    findings.push({
      file: MAYA_ROUTE_FILE,
      line: 1,
      type: "route_contract",
      detail: "Live Maya chat route not found",
    })
    return
  }

  for (const requirement of REQUIRED_ROUTE_PATTERNS) {
    if (requirement.pattern.test(content)) continue
    findings.push({
      file: MAYA_ROUTE_FILE,
      line: 1,
      type: "route_contract",
      detail: `Missing live Maya route contract: ${requirement.label}`,
    })
  }
}

async function main() {
  const commandResults = COMMANDS.map((command) => runCommand(command.label, command.args))
  const findings: Finding[] = []

  await scanVoiceDrift(findings)
  await scanAnchors(findings)
  await scanRouteContract(findings)

  const failedChecks = commandResults.filter((result) => result.status === "fail")
  const lines: string[] = []
  lines.push("# Maya Quality Audit")
  lines.push("")
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push("")
  lines.push("## Command Checks")

  for (const result of commandResults) {
    lines.push(`- ${result.status === "pass" ? "PASS" : "FAIL"} ${result.label}`)
    lines.push(`  - Detail: ${result.detail.replace(/\n/g, " ").slice(0, 500)}`)
  }

  lines.push("")
  lines.push("## Prompt, Route, And UI Findings")
  if (findings.length === 0) {
    lines.push("- No Maya voice, route, or UI contract drift detected.")
  } else {
    for (const finding of findings.slice(0, 25)) {
      lines.push(`- ${finding.type} :: ${finding.file}:${finding.line} :: ${finding.detail}`)
    }
  }

  lines.push("")
  lines.push("## Summary")
  lines.push(`- Command failures: ${failedChecks.length}`)
  lines.push(`- Prompt or route findings: ${findings.length}`)
  lines.push(
    failedChecks.length === 0 && findings.length === 0
      ? "- Maya quality is healthy."
      : "- Maya quality needs review. Fix low-risk prompt, route, or inline tool drift first.",
  )

  const reportPath = await writeReport("maya-quality-audit", lines)
  console.log(`[maya-quality-audit] wrote ${reportPath}`)

  if (failedChecks.length > 0 || findings.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error("[maya-quality-audit] failed", error)
  process.exitCode = 1
})

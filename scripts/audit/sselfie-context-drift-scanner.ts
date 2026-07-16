import { access, readFile } from "node:fs/promises"
import path from "node:path"
import { REPO_ROOT, normalizeWorkspacePath, walkFiles, writeReport } from "./_shared"

type Severity = "P0" | "P1" | "P2"

type Finding = {
  severity: Severity
  file: string
  line: number
  rule: string
  detail: string
}

const SOURCE_OF_TRUTH = "docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md"
const BRAND_CONSTITUTION = "docs/brand/SSELFIE_BRAND_CONSTITUTION.md"
const PURPOSE_MESSAGING_LOCK = "docs/brand/SSELFIE_PURPOSE_MESSAGING_LOCK_2026-07-07.md"
const COMPANY_KERNEL = "docs/business/SSELFIE_COMPANY_KERNEL_2026-07-16.md"

const REQUIRED_POINTER_FILES = [
  "CLAUDE.md",
  "docs/CODEX_CONTEXT.md",
  "AGENTS.md",
  "README.md",
  "docs/README.md",
  ".agents/product-marketing-context.md",
  ".agents/skills/sselfie-brand-guardian/SKILL.md",
  ".agents/skills/reel-hooks/SKILL.md",
  ".agents/claude-templates/README.md",
  ".agents/claude-templates/agents/revenue-campaign-director.md",
  ".agents/claude-templates/skills/funnel-expert/SKILL.md",
  ".agents/claude-templates/skills/funnel-expert.md",
  ".agents/claude-templates/skills/resend-broadcast/SKILL.md",
  ".agents/claude-templates/skills/sselfie-community-manager/SKILL.md",
  ".agents/claude-templates/scheduled-tasks/daily-email-draft/SKILL.md",
  ".agents/claude-templates/scheduled-tasks/daily-story-sequence-draft/SKILL.md",
  ".agents/claude-templates/scheduled-tasks/weekly-content-brief-draft/SKILL.md",
]

const REQUIRED_COMPANY_POINTER_FILES = [
  "CLAUDE.md",
  "docs/CODEX_CONTEXT.md",
  "AGENTS.md",
  "docs/README.md",
  "tasks/README.md",
  ".agents/product-marketing-context.md",
  ".agents/skills/sselfie-brand-guardian/SKILL.md",
  ".agents/claude-templates/README.md",
  ".agents/claude-templates/agents/revenue-campaign-director.md",
  ".agents/claude-templates/skills/funnel-expert/SKILL.md",
  ".agents/claude-templates/skills/funnel-expert.md",
  ".agents/claude-templates/skills/sselfie-community-manager/SKILL.md",
  ".agents/claude-templates/scheduled-tasks/daily-email-draft/SKILL.md",
  ".agents/claude-templates/scheduled-tasks/daily-story-sequence-draft/SKILL.md",
  ".agents/claude-templates/scheduled-tasks/weekly-content-brief-draft/SKILL.md",
]

const OPTIONAL_AGENT_CONTEXT_FILES = [
  ".claude/settings.json",
  ".claude/agents/revenue-campaign-director.md",
  ".claude/agents/stripe-credit-reviewer.md",
  ".claude/agents/suite-ux-customer-auditor.md",
  ".claude/skills/funnel-expert/SKILL.md",
  ".claude/skills/funnel-expert.md",
  ".claude/skills/resend-broadcast/SKILL.md",
  ".claude/skills/ai-seo/SKILL.md",
  ".claude/skills/churn-prevention/SKILL.md",
  ".claude/skills/email-sequence/SKILL.md",
  ".claude/skills/launch-strategy/SKILL.md",
  ".claude/skills/marketing-psychology/SKILL.md",
  ".claude/skills/onboarding-cro/SKILL.md",
  ".claude/skills/paid-ads/SKILL.md",
  ".claude/skills/paywall-upgrade-cro/SKILL.md",
  ".claude/skills/referral-program/SKILL.md",
  ".claude/skills/ux-ui-quality/SKILL.md",
]

const CLAUDE_TEMPLATE_MIRRORS = [
  {
    template: ".agents/claude-templates/agents/revenue-campaign-director.md",
    local: ".claude/agents/revenue-campaign-director.md",
  },
  {
    template: ".agents/claude-templates/skills/funnel-expert/SKILL.md",
    local: ".claude/skills/funnel-expert/SKILL.md",
  },
  {
    template: ".agents/claude-templates/skills/funnel-expert.md",
    local: ".claude/skills/funnel-expert.md",
  },
  {
    template: ".agents/claude-templates/skills/resend-broadcast/SKILL.md",
    local: ".claude/skills/resend-broadcast/SKILL.md",
  },
  {
    template: ".agents/claude-templates/skills/sselfie-community-manager/SKILL.md",
    local: "/Users/MD760HA/.claude/skills/sselfie-community-manager/SKILL.md",
  },
  {
    template: ".agents/claude-templates/scheduled-tasks/daily-email-draft/SKILL.md",
    local: "/Users/MD760HA/.claude/scheduled-tasks/daily-email-draft/SKILL.md",
  },
  {
    template: ".agents/claude-templates/scheduled-tasks/daily-story-sequence-draft/SKILL.md",
    local: "/Users/MD760HA/.claude/scheduled-tasks/daily-story-sequence-draft/SKILL.md",
  },
  {
    template: ".agents/claude-templates/scheduled-tasks/weekly-content-brief-draft/SKILL.md",
    local: "/Users/MD760HA/.claude/scheduled-tasks/weekly-content-brief-draft/SKILL.md",
  },
]

const SUPERSEDED_FILES = [
  "docs/brand/VOICE_BIBLE.md",
  "docs/brand/SSELFIE_CONTENT_GROUNDING.md",
  "docs/studio-flagship/STUDIO_MARKETING_PAGE_PASTE_READY.md",
  "docs/studio-flagship/STUDIO_MARKETING_PAGE_SANDRA_VOICE_2026-06-26.md",
]

const REPO_SCAN_DIRS = ["docs/brand", "docs/studio-flagship"]

const DESKTOP_STUDIO_FOLDER = "/Users/MD760HA/Desktop/SSELFIE-Studio-Flagship-v2-2026-06-25"

const DANGEROUS_CURRENT_PHRASES: Array<{ label: string; pattern: RegExp; allowIfSuperseded?: boolean }> = [
  { label: "rejected Studio copy: need a studio", pattern: /\b(?:do not|don't|doesn't|need|needs|needed)\s+(?:a\s+)?studio\b/i },
  { label: "rejected identity phrase: new face", pattern: /\bnew face\b/i },
  { label: "rejected readiness phrase: not-ready-yet", pattern: /not-ready-yet/i },
  { label: "old category: AI headshot", pattern: /\bAI headshot\b|\bheadshot app\b/i },
  { label: "old category: AI photo app", pattern: /\bAI photo app\b/i },
  { label: "old category: prompt marketplace", pattern: /\bprompt marketplace\b/i },
  { label: "robotic positioning: operating system", pattern: /\bpersonal brand operating system\b|\boperating system\b/i },
  { label: "robotic positioning: brand move", pattern: /\bbrand move\b/i },
  { label: "robotic shorthand: known-for", pattern: /\bknown-for\b/i },
  { label: "stale audience count: 180K", pattern: /\b180K\+?\b/i },
  { label: "stale age range: 25-45", pattern: /\b25\s*[–-]\s*45\b/i },
  { label: "stale price: $27", pattern: /\$27\b/i },
  { label: "stale paid guide price: 17", pattern: /(?:€|\$)17\b/i },
  { label: "stale Blueprint price: $47", pattern: /\$47\b/i },
  { label: "retired lead route", pattern: /\/freebie\/brand-strategy\b/i },
  { label: "retired app destination", pattern: /\/studio\?tab=maya\b/i },
  { label: "stale customer count", pattern: /\b29 paying customers\b/i },
  { label: "old destination: identity", pattern: /Identity is the destination/i },
  { label: "old bridge: visibility transformation", pattern: /Visibility is the transformation/i },
]

const BANNED_VOICE_PHRASES: Array<{ label: string; pattern: RegExp }> = [
  { label: "corporate word: leverage", pattern: /\bleverage\b/i },
  { label: "corporate word: utilize", pattern: /\butilize\b/i },
  { label: "corporate word: optimize", pattern: /\boptimize\b/i },
  { label: "hype word: unlock", pattern: /\bunlock\b/i },
  { label: "hype phrase: level up", pattern: /\blevel up\b/i },
  { label: "hype phrase: game-changing", pattern: /\bgame-changing\b|\bgame changer\b/i },
  { label: "hype word: robust", pattern: /\brobust\b/i },
  { label: "hype word: scalable", pattern: /\bscalable\b/i },
  { label: "old positioning word: elevate/elevated", pattern: /\belevate(?:d)?\b/i },
  { label: "old positioning phrase: strategic visibility", pattern: /\bstrategic visibility\b/i },
]

function lineFor(content: string, index: number): number {
  return content.slice(0, index).split("\n").length
}

function isMarkdownOrText(file: string): boolean {
  return /\.(md|mdx|txt)$/i.test(file)
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

function isSuperseded(content: string): boolean {
  return /SUPERSEDED 2026-06-27/i.test(content)
}

async function collectFiles(): Promise<string[]> {
  const files = new Set<string>()

  for (const rel of REQUIRED_POINTER_FILES) files.add(path.join(REPO_ROOT, rel))
  for (const rel of OPTIONAL_AGENT_CONTEXT_FILES) {
    const file = path.join(REPO_ROOT, rel)
    if (await exists(file)) files.add(file)
  }
  files.add(path.join(REPO_ROOT, BRAND_CONSTITUTION))
  files.add(path.join(REPO_ROOT, SOURCE_OF_TRUTH))
  files.add(path.join(REPO_ROOT, COMPANY_KERNEL))

  for (const dir of REPO_SCAN_DIRS) {
    const abs = path.join(REPO_ROOT, dir)
    const walked = await walkFiles(abs)
    for (const file of walked.filter(isMarkdownOrText)) files.add(file)
  }

  if (await exists(DESKTOP_STUDIO_FOLDER)) {
    const walked = await walkFiles(DESKTOP_STUDIO_FOLDER)
    for (const file of walked.filter(isMarkdownOrText)) files.add(file)
  }

  return [...files].sort()
}

function displayPath(file: string): string {
  if (file.startsWith(REPO_ROOT)) return normalizeWorkspacePath(file)
  return file
}

function scanFile(file: string, content: string): Finding[] {
  const findings: Finding[] = []
  const display = displayPath(file)
  const superseded = isSuperseded(content)
  const isSourceFile =
    display === BRAND_CONSTITUTION ||
    display === SOURCE_OF_TRUTH ||
    display === PURPOSE_MESSAGING_LOCK ||
    display.includes("/source/2026-06-27/")

  if (REQUIRED_POINTER_FILES.includes(display) && !content.includes(BRAND_CONSTITUTION)) {
    findings.push({
      severity: "P0",
      file: display,
      line: 1,
      rule: "missing_constitution_pointer",
      detail: `Must point agents to ${BRAND_CONSTITUTION}`,
    })
  }

  if (REQUIRED_COMPANY_POINTER_FILES.includes(display) && !content.includes(COMPANY_KERNEL)) {
    findings.push({
      severity: "P0",
      file: display,
      line: 1,
      rule: "missing_company_kernel_pointer",
      detail: `Must point agents to ${COMPANY_KERNEL}`,
    })
  }

  if (SUPERSEDED_FILES.includes(display) && !superseded) {
    findings.push({
      severity: "P0",
      file: display,
      line: 1,
      rule: "missing_superseded_banner",
      detail: "High-risk old source file must be clearly marked SUPERSEDED.",
    })
  }

  if (!superseded && !isSourceFile) {
    for (const rule of DANGEROUS_CURRENT_PHRASES) {
      for (const match of content.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags.includes("g") ? rule.pattern.flags : `${rule.pattern.flags}g`))) {
        findings.push({
          severity: "P1",
          file: display,
          line: lineFor(content, match.index ?? 0),
          rule: "dangerous_context_phrase",
          detail: rule.label,
        })
      }
    }
  }

  if (!superseded && !isSourceFile && display.includes("STUDIO-READY")) {
    for (const rule of BANNED_VOICE_PHRASES) {
      for (const match of content.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags.includes("g") ? rule.pattern.flags : `${rule.pattern.flags}g`))) {
        findings.push({
          severity: "P2",
          file: display,
          line: lineFor(content, match.index ?? 0),
          rule: "studio_ready_voice_drift",
          detail: rule.label,
        })
      }
    }
  }

  return findings
}

async function main() {
  const constitutionPath = path.join(REPO_ROOT, BRAND_CONSTITUTION)
  const constitutionExists = await exists(constitutionPath)
  const sourcePath = path.join(REPO_ROOT, SOURCE_OF_TRUTH)
  const sourceExists = await exists(sourcePath)
  const kernelPath = path.join(REPO_ROOT, COMPANY_KERNEL)
  const kernelExists = await exists(kernelPath)
  const findings: Finding[] = []

  if (!constitutionExists) {
    findings.push({
      severity: "P0",
      file: BRAND_CONSTITUTION,
      line: 1,
      rule: "missing_brand_constitution",
      detail: "The highest-level SSELFIE brand contract is missing.",
    })
  }

  if (!sourceExists) {
    findings.push({
      severity: "P0",
      file: SOURCE_OF_TRUTH,
      line: 1,
      rule: "missing_source_of_truth",
      detail: "Current SSELFIE source-of-truth doc is missing.",
    })
  }

  if (!kernelExists) {
    findings.push({
      severity: "P0",
      file: COMPANY_KERNEL,
      line: 1,
      rule: "missing_company_kernel",
      detail: "The controlling SSELFIE company contract is missing.",
    })
  }

  for (const requiredFile of REQUIRED_POINTER_FILES) {
    if (!(await exists(path.join(REPO_ROOT, requiredFile)))) {
      findings.push({
        severity: "P0",
        file: requiredFile,
        line: 1,
        rule: "missing_required_context_file",
        detail: "Required tracked agent or brand context is missing.",
      })
    }
  }

  const files = await collectFiles()
  for (const file of files) {
    const content = await readFile(file, "utf8").catch(() => "")
    if (!content) continue
    findings.push(...scanFile(file, content))
  }

  for (const mirror of CLAUDE_TEMPLATE_MIRRORS) {
    const templatePath = path.join(REPO_ROOT, mirror.template)
    const localPath = path.isAbsolute(mirror.local)
      ? mirror.local
      : path.join(REPO_ROOT, mirror.local)
    if (!(await exists(localPath))) continue
    const [template, local] = await Promise.all([
      readFile(templatePath, "utf8"),
      readFile(localPath, "utf8"),
    ])
    if (template !== local) {
      findings.push({
        severity: "P0",
        file: mirror.local,
        line: 1,
        rule: "claude_local_template_drift",
        detail: `Local Claude file must mirror ${mirror.template}`,
      })
    }
  }

  const counts = {
    P0: findings.filter((finding) => finding.severity === "P0").length,
    P1: findings.filter((finding) => finding.severity === "P1").length,
    P2: findings.filter((finding) => finding.severity === "P2").length,
  }

  const lines: string[] = []
  lines.push("# SSELFIE Context Drift Scan")
  lines.push("")
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push("")
  lines.push("## Scope")
  lines.push(`- Files scanned: ${files.length}`)
  lines.push(`- Brand Constitution: ${BRAND_CONSTITUTION}`)
  lines.push(`- Source of truth: ${SOURCE_OF_TRUTH}`)
  lines.push(`- Company Kernel: ${COMPANY_KERNEL}`)
  lines.push(`- Desktop Studio folder: ${DESKTOP_STUDIO_FOLDER}`)
  lines.push("")
  lines.push("## Summary")
  lines.push(`- P0 blockers: ${counts.P0}`)
  lines.push(`- P1 context drift: ${counts.P1}`)
  lines.push(`- P2 Studio-ready voice drift: ${counts.P2}`)
  lines.push("")
  lines.push("## Findings")
  if (findings.length === 0) {
    lines.push("- No context drift detected.")
  } else {
    for (const finding of findings.slice(0, 120)) {
      lines.push(`- ${finding.severity} :: ${finding.rule} :: ${finding.file}:${finding.line} :: ${finding.detail}`)
    }
    if (findings.length > 120) lines.push(`- ... ${findings.length - 120} additional findings omitted`)
  }

  lines.push("")
  lines.push("## Next Step")
  if (counts.P0 > 0) {
    lines.push("- Fix P0 blockers before allowing agents to use Studio or brand copy docs.")
  } else if (counts.P1 > 0) {
    lines.push("- Review P1 context drift before pasting anything into Studio.")
  } else {
    lines.push("- Context hierarchy is healthy. Continue from the current priority in CLAUDE.md and docs/CODEX_CONTEXT.md.")
  }

  const reportPath = await writeReport("sselfie-context-drift", lines)
  console.log(`[sselfie-context-drift] wrote ${reportPath}`)

  if (counts.P0 > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error("[sselfie-context-drift] failed", error)
  process.exitCode = 1
})

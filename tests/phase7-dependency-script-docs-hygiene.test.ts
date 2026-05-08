// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(relPath: string) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

describe("phase 7 dependency, script, and docs hygiene", () => {
  it("keeps pnpm as the only active lockfile and package manager", () => {
    expect(fs.existsSync(path.join(ROOT, "pnpm-lock.yaml"))).toBe(true)
    expect(fs.existsSync(path.join(ROOT, "package-lock.json"))).toBe(false)

    const pkg = JSON.parse(read("package.json"))
    expect(pkg.packageManager).toBe("pnpm@10.23.0")
    expect(pkg.engines.node).toBe(">=20")
  })

  it("removes unused stale mail and database packages while keeping live vector search", () => {
    const pkg = JSON.parse(read("package.json"))
    const dependencies = { ...pkg.dependencies, ...pkg.devDependencies }

    expect(dependencies["@vercel/postgres"]).toBeUndefined()
    expect(dependencies.nodemailer).toBeUndefined()
    expect(dependencies["@upstash/vector"]).toBeDefined()
    expect(read("lib/upstash-vector.ts")).toContain("@upstash/vector")
  })

  it("runs daily automation through pnpm", () => {
    const workflow = read(".github/workflows/automation-daily.yml")

    expect(workflow).toContain("pnpm/action-setup")
    expect(workflow).toContain("cache: \"pnpm\"")
    expect(workflow).toContain("pnpm install --frozen-lockfile")
    expect(workflow).toContain("pnpm automation:daily")
    expect(workflow).not.toContain("npm ci")
    expect(workflow).not.toContain("npm run")
  })

  it("exposes a compact diagnostics suite with required and advisory checks", () => {
    const pkg = JSON.parse(read("package.json"))
    const runner = read("scripts/run-core-diagnostics.mjs")

    expect(pkg.scripts["diagnostics:core"]).toBe("node scripts/run-core-diagnostics.mjs")
    for (const command of [
      "verify:repo",
      "routes:inventory",
      "routes:classify",
      "audit:integration-health",
      "automation:journey-smoke",
      "audit:maya-quality",
    ]) {
      expect(runner).toContain(command)
    }

    expect(runner).toContain("audit:brand-consistency")
    expect(runner).toContain("lint:tokens")
    expect(runner).toContain("ADVISORY")
  })

  it("labels stale planning docs so they do not compete with live truth", () => {
    for (const relPath of [
      "docs/ACADEMY-BUYER-HOME-PLAN-2026-04-24.md",
      "docs/MAYA_2_0_E2E_EXECUTION_PLAN_2026-05-01.md",
      "docs/MAYA_AUDIT_AND_REPOSITIONING_2026-05-01.md",
    ]) {
      expect(read(relPath).slice(0, 400)).toContain("Planning snapshot")
    }

    expect(read("docs/source-of-truth/dependency-script-docs-hygiene.md")).toContain("pnpm is canonical")
  })
})

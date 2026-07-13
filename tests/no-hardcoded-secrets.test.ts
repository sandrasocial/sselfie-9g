// @vitest-environment node
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

type CredentialPattern = {
  type: string
  pattern: RegExp
}

const credentialPatterns: CredentialPattern[] = [
  { type: "database URL", pattern: /postgres(?:ql)?:\/\/[^\s'"`]{4,}/g },
  { type: "Stripe live secret key", pattern: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/g },
  { type: "Stripe webhook secret", pattern: /\bwhsec_[A-Za-z0-9]{16,}\b/g },
  { type: "Resend API key", pattern: /\bre_[A-Za-z0-9]{20,}\b/g },
  { type: "OpenAI API key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g },
  { type: "Supabase secret", pattern: /\b(?:sbp|sb_secret)_[A-Za-z0-9_-]{20,}\b/g },
  { type: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g },
  { type: "Vercel token", pattern: /\bvercel_[A-Za-z0-9_-]{20,}\b/g },
  { type: "Anthropic API key", pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },
  { type: "Replicate API token", pattern: /\br8_[A-Za-z0-9]{20,}\b/g },
  {
    type: "hardcoded OpenClaw gateway token",
    pattern: /\b(?:OPENCLAW|GATEWAY)_TOKEN\s*=\s*["'][^"']{16,}["']/g,
  },
  { type: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
]

const clearlyFakeDatabaseFixtures = new Set([
  "docs/archive/testing/README.md",
  "lib/__tests__/academy-entitlements.test.ts",
  "lib/__tests__/academy-products.test.ts",
  "tests/db-client-env-fallback.test.ts",
  "tests/setup.ts",
  "tests/transform-launch-readiness.test.ts",
])

const scannedExtension = /\.(?:[cm]?[jt]sx?|sql|md|json|ya?ml|sh|env(?:\..*)?)$/i

describe("tracked secret hygiene", () => {
  it("keeps database credentials and known live credential formats out of tracked files", () => {
    const trackedFiles = execFileSync("git", ["ls-files", "-z"], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    })
      .split("\0")
      .filter(Boolean)
      .filter((file) => scannedExtension.test(file))

    const findings: string[] = []

    for (const file of trackedFiles) {
      if (!existsSync(file)) continue
      const source = readFileSync(file, "utf8")

      for (const credential of credentialPatterns) {
        credential.pattern.lastIndex = 0
        if (!credential.pattern.test(source)) continue

        if (credential.type === "database URL" && clearlyFakeDatabaseFixtures.has(file)) {
          continue
        }

        findings.push(`${credential.type}: ${file}`)
      }
    }

    expect(findings, `Hardcoded credential formats found:\n${findings.join("\n")}`).toEqual([])
  })
})

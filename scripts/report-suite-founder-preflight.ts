#!/usr/bin/env tsx

import { readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"

function loadProjectEnv(): void {
  const projectRequire = createRequire(`${process.cwd()}/package.json`)
  const nextPackagePath = projectRequire.resolve("next/package.json")
  const envPackagePath = projectRequire.resolve("@next/env", { paths: [dirname(nextPackagePath)] })
  ;(
    projectRequire(envPackagePath) as { loadEnvConfig: (directory: string) => unknown }
  ).loadEnvConfig(process.cwd())
}

function evidencePath(argv: string[]): string | null {
  const argument = argv.find(value => value.startsWith("--evidence="))
  if (!argument) return null
  const path = argument.slice("--evidence=".length).trim()
  return path ? resolve(path) : null
}

async function main(): Promise<void> {
  loadProjectEnv()
  const path = evidencePath(process.argv.slice(2))
  let humanEvidence: unknown = null
  if (path) humanEvidence = JSON.parse(await readFile(path, "utf8"))
  const [
    { createSuiteFounderPreflightFromCurrentSources },
    { serializeSuiteFounderPreflightReport },
  ] = await Promise.all([
    import("@/lib/integrations/suite-founder-preflight-report"),
    import("@/lib/integrations/suite-founder-preflight"),
  ])
  const report = await createSuiteFounderPreflightFromCurrentSources({
    env: process.env,
    humanEvidence,
  })
  process.stdout.write(serializeSuiteFounderPreflightReport(report))
  if (report.state !== "ready_for_sandra_approval") process.exitCode = 1
}

void main().catch(() => {
  process.stderr.write("SUITE founder preflight failed\n")
  process.exitCode = 1
})

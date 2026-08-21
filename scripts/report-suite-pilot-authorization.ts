#!/usr/bin/env tsx

import { createRequire } from "node:module"
import { dirname } from "node:path"

function readProvider(argv: string[]): string | null {
  const equals = argv.find(argument => argument.startsWith("--provider="))
  if (equals) return equals.slice("--provider=".length)
  const index = argv.indexOf("--provider")
  return index >= 0 ? (argv[index + 1] ?? null) : null
}

function loadProjectEnv(): void {
  const projectRequire = createRequire(`${process.cwd()}/package.json`)
  const nextPackagePath = projectRequire.resolve("next/package.json")
  const envPackagePath = projectRequire.resolve("@next/env", { paths: [dirname(nextPackagePath)] })
  const envModule = projectRequire(envPackagePath) as {
    loadEnvConfig: (directory: string) => unknown
  }
  envModule.loadEnvConfig(process.cwd())
}

async function main(): Promise<void> {
  const provider = readProvider(process.argv.slice(2))
  if (provider !== "skool" && provider !== "studio_platform_partner") {
    throw new Error("An exact protected --provider is required")
  }
  if (process.argv.some(argument => /--(?:record|authorize|revoke|dispatch)/.test(argument))) {
    throw new Error("This command is read-only")
  }
  loadProjectEnv()
  const reportModule = await import("@/lib/integrations/suite-pilot-authorization-report")
  const report = await reportModule.getSuitePilotAuthorizationReport(provider, new Date())
  process.stdout.write(reportModule.serializeSuitePilotAuthorizationReport(report))
  if (report.status === "failure" || report.state === "no_evidence") process.exitCode = 1
}

void main().catch(() => {
  process.stderr.write("A protected --provider is required and the ledger must be available\n")
  process.exitCode = 1
})

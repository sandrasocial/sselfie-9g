#!/usr/bin/env tsx

import { createRequire } from "node:module"
import { dirname } from "node:path"

function requestedProvider(argv: string[]): string | null {
  const equalsArgument = argv.find(argument => argument.startsWith("--provider="))
  if (equalsArgument) return equalsArgument.slice("--provider=".length)
  const index = argv.indexOf("--provider")
  return index >= 0 ? (argv[index + 1] ?? null) : null
}

function loadProjectEnv(): void {
  const projectRequire = createRequire(`${process.cwd()}/package.json`)
  const nextPackagePath = projectRequire.resolve("next/package.json")
  const envPackagePath = projectRequire.resolve("@next/env", {
    paths: [dirname(nextPackagePath)],
  })
  const envModule = projectRequire(envPackagePath) as {
    loadEnvConfig: (directory: string) => unknown
  }
  envModule.loadEnvConfig(process.cwd())
}

async function main(): Promise<void> {
  const provider = requestedProvider(process.argv.slice(2))
  if (
    provider !== "sselfie" &&
    provider !== "stripe" &&
    provider !== "resend" &&
    provider !== "manychat" &&
    provider !== "skool" &&
    provider !== "studio_platform_partner"
  ) {
    throw new Error("An exact --provider is required")
  }

  loadProjectEnv()
  const reportModule = await import("@/lib/integrations/integration-readiness-report")
  const report = await reportModule.getIntegrationReadinessReport(provider, new Date())
  process.stdout.write(reportModule.serializeIntegrationReadinessReport(report))
  if (report.status === "failure" || report.state !== "reconciled") process.exitCode = 1
}

void main().catch(() => {
  process.stderr.write(
    "An exact --provider is required and the readiness source must be available\n"
  )
  process.exitCode = 1
})

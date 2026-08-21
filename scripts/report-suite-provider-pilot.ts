#!/usr/bin/env tsx

import { createRequire } from "node:module"
import { dirname } from "node:path"

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
  loadProjectEnv()
  const [{ readSuiteProviderPilotEvidence }, pilot] = await Promise.all([
    import("@/lib/integrations/suite-provider-pilot-report"),
    import("@/lib/integrations/suite-provider-pilot"),
  ])
  const config = pilot.resolveSuiteProviderPilotConfig(process.env)
  const evidence = await readSuiteProviderPilotEvidence(config)
  const report = pilot.createSuiteProviderPilotReport(config, evidence, new Date())
  process.stdout.write(pilot.serializeSuiteProviderPilotReport(report))
  if (report.status === "failure") process.exitCode = 1
}

void main().catch(() => {
  process.stderr.write("SUITE provider pilot shadow report failed\n")
  process.exitCode = 1
})

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
  const { getSuiteMembershipShadowReport, serializeSuiteMembershipShadowReport } =
    await import("@/lib/integrations/suite-membership-shadow-report")
  const report = await getSuiteMembershipShadowReport(new Date())
  process.stdout.write(serializeSuiteMembershipShadowReport(report))
  if (report.status === "failure") process.exitCode = 1
}

void main().catch(() => {
  process.stderr.write("SUITE membership shadow report failed\n")
  process.exitCode = 1
})

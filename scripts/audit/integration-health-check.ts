import path from "node:path"
import { REPO_ROOT, normalizeWorkspacePath, readText, walkFiles, writeReport } from "./_shared"

type IntegrationCheck = {
  name: string
  dependency: string
  envVars: string[]
  requiredPaths: string[]
}

type Finding = {
  name: string
  dependencyOk: boolean
  envOk: boolean
  pathOk: boolean
  missingEnv: string[]
  missingPaths: string[]
}

async function main() {
  const packageJson = JSON.parse(await readText(path.join(REPO_ROOT, "package.json")))
  const allDeps = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
  }

  const files = await walkFiles(REPO_ROOT)
  const relFiles = files.map((f) => normalizeWorkspacePath(f))

  const checks: IntegrationCheck[] = [
    {
      name: "Stripe",
      dependency: "stripe",
      envVars: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
      requiredPaths: ["app/api/webhooks/stripe/route.ts", "app/api/subscription"],
    },
    {
      name: "Supabase Auth",
      dependency: "@supabase/supabase-js",
      envVars: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
      requiredPaths: ["lib/supabase", "app/api/auth"],
    },
    {
      name: "Replicate",
      dependency: "replicate",
      envVars: ["REPLICATE_API_TOKEN"],
      requiredPaths: ["app/api/maya/generate-video/route.ts", "lib/replicate"],
    },
    {
      name: "Upstash Redis",
      dependency: "@upstash/redis",
      envVars: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
      requiredPaths: ["lib/cache.ts"],
    },
    {
      name: "Resend",
      dependency: "resend",
      envVars: ["RESEND_API_KEY"],
      requiredPaths: ["lib/resend", "app/api/cron"],
    },
    {
      name: "Neon Postgres",
      dependency: "@neondatabase/serverless",
      envVars: ["DATABASE_URL"],
      requiredPaths: ["lib/db/client.ts"],
    },
    {
      name: "Vercel Blob",
      dependency: "@vercel/blob",
      envVars: ["BLOB_READ_WRITE_TOKEN"],
      requiredPaths: ["app/api/upload/route.ts"],
    },
  ]

  const findings: Finding[] = checks.map((check) => {
    const dependencyOk = Boolean(allDeps[check.dependency])
    const missingEnv = check.envVars.filter((envVar) => !process.env[envVar])
    const missingPaths = check.requiredPaths.filter(
      (requiredPath) => !relFiles.some((file) => file === requiredPath || file.startsWith(`${requiredPath}/`)),
    )
    return {
      name: check.name,
      dependencyOk,
      envOk: missingEnv.length === 0,
      pathOk: missingPaths.length === 0,
      missingEnv,
      missingPaths,
    }
  })

  const routeFiles = relFiles.filter((file) => file.startsWith("app/api/") && file.endsWith("/route.ts"))
  const stripeSyncFiles = relFiles.filter((file) => /stripe.*sync|sync.*stripe/i.test(file))
  const authMiddlewareFiles = relFiles.filter((file) => /middleware|withAuth|supabase/i.test(file))

  const lines: string[] = []
  lines.push("# Integration Health Check")
  lines.push("")
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push("")
  for (const finding of findings) {
    const grade = finding.dependencyOk && finding.envOk && finding.pathOk ? "✓" : "⚠"
    lines.push(`## ${finding.name} ${grade}`)
    lines.push(`- Dependency: ${finding.dependencyOk ? "ok" : "missing"}`)
    lines.push(`- Environment: ${finding.envOk ? "ok" : `missing ${finding.missingEnv.join(", ")}`}`)
    lines.push(`- Required paths: ${finding.pathOk ? "ok" : `missing ${finding.missingPaths.join(", ")}`}`)
    lines.push("")
  }

  lines.push("## Cross-cutting Signals")
  lines.push(`- API route files: ${routeFiles.length}`)
  lines.push(`- Stripe sync files (possible duplicates): ${stripeSyncFiles.length}`)
  for (const file of stripeSyncFiles.slice(0, 12)) lines.push(`  - ${file}`)
  lines.push(`- Auth middleware-related files: ${authMiddlewareFiles.length}`)
  for (const file of authMiddlewareFiles.slice(0, 12)) lines.push(`  - ${file}`)
  lines.push("")

  const reportPath = await writeReport("integration-health", lines)
  console.log(`[integration-health-check] wrote ${reportPath}`)
}

main().catch((error) => {
  console.error("[integration-health-check] failed", error)
  process.exitCode = 1
})

import path from "node:path"
import { neon } from "@neondatabase/serverless"
import { REPO_ROOT, isCodeFile, normalizeWorkspacePath, readText, walkFiles, writeReport } from "./_shared"

type DirCount = Record<string, number>

function countTopLevel(paths: string[], root: string): DirCount {
  const counts: DirCount = {}
  for (const absPath of paths) {
    const rel = normalizeWorkspacePath(absPath)
    if (!rel.startsWith(`${root}/`)) continue
    const parts = rel.split("/")
    const key = parts[1] || "(root)"
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
}

function topEntries(counts: DirCount, n = 12): Array<[string, number]> {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
}

async function getDbSummary() {
  if (!process.env.DATABASE_URL) {
    return { enabled: false, tables: 0, sample: [] as string[] }
  }

  try {
    const sql = neon(process.env.DATABASE_URL)
    const tableRows = await sql<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `
    return {
      enabled: true,
      tables: tableRows.length,
      sample: tableRows.slice(0, 20).map((t) => t.table_name),
    }
  } catch {
    return { enabled: false, tables: 0, sample: [] as string[] }
  }
}

async function main() {
  const appDir = path.join(REPO_ROOT, "app")
  const libDir = path.join(REPO_ROOT, "lib")
  const componentsDir = path.join(REPO_ROOT, "components")
  const scriptsDir = path.join(REPO_ROOT, "scripts")
  const docsDir = path.join(REPO_ROOT, "docs")

  const [appFiles, libFiles, componentFiles, scriptFiles, docFiles] = await Promise.all([
    walkFiles(appDir),
    walkFiles(libDir),
    walkFiles(componentsDir),
    walkFiles(scriptsDir),
    walkFiles(docsDir),
  ])

  const appCode = appFiles.filter(isCodeFile)
  const libCode = libFiles.filter(isCodeFile)
  const componentCode = componentFiles.filter((f) => /\.(tsx|jsx)$/.test(f))
  const routeFiles = appFiles.filter((f) => f.endsWith("/route.ts") || f.endsWith("/route.tsx"))
  const cronRoutes = routeFiles.filter((f) => normalizeWorkspacePath(f).startsWith("app/api/cron/"))
  const pageFiles = appFiles.filter((f) => f.endsWith("/page.tsx") || f.endsWith("/page.ts"))
  const authSurface = appFiles.filter((f) => /auth|login|signup|session|middleware/i.test(f))
  const aiSurface = [...libCode, ...appCode].filter((f) =>
    /maya|prompt|replicate|anthropic|openai|generation|tool-orchestrator/i.test(f),
  )

  const packageJson = JSON.parse(await readText(path.join(REPO_ROOT, "package.json")))
  const allDeps = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
  }

  const integrations = [
    { name: "Stripe", dependency: "stripe", env: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] },
    { name: "Supabase Auth", dependency: "@supabase/supabase-js", env: ["NEXT_PUBLIC_SUPABASE_URL"] },
    { name: "Replicate", dependency: "replicate", env: ["REPLICATE_API_TOKEN"] },
    {
      name: "Upstash Redis",
      dependency: "@upstash/redis",
      envGroups: [
        {
          label: "Upstash Redis URL",
          anyOf: [
            "UPSTASH_KV_REST_API_URL",
            "UPSTASH_KV_KV_REST_API_URL",
            "UPSTASH_REDIS_REST_URL",
            "UPSTASH_KV_REST_URL",
          ],
        },
        {
          label: "Upstash Redis token",
          anyOf: [
            "UPSTASH_KV_REST_API_TOKEN",
            "UPSTASH_KV_KV_REST_API_TOKEN",
            "UPSTASH_REDIS_REST_TOKEN",
            "UPSTASH_KV_REST_TOKEN",
          ],
        },
      ],
    },
    { name: "Resend", dependency: "resend", env: ["RESEND_API_KEY"] },
    { name: "Neon Postgres", dependency: "@neondatabase/serverless", env: ["DATABASE_URL"] },
    { name: "Vercel Blob", dependency: "@vercel/blob", env: ["BLOB_READ_WRITE_TOKEN"] },
  ].map((integration) => {
    const hasDep = Boolean(allDeps[integration.dependency])
    const envState = integration.envGroups?.length
      ? integration.envGroups.map((group) => {
          const matched = group.anyOf.find((envName) => Boolean(process.env[envName]))
          return matched ? `${matched}:set` : `${group.label}:missing`
        })
      : integration.env.map((e) => (process.env[e] ? `${e}:set` : `${e}:missing`))
    return { ...integration, hasDep, envState }
  })

  const db = await getDbSummary()
  const appDirCounts = countTopLevel(appCode, "app")
  const libDirCounts = countTopLevel(libCode, "lib")
  const scriptDirCounts = countTopLevel(scriptFiles, "scripts")

  const lines: string[] = []
  lines.push("# Architecture Map")
  lines.push("")
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push("")
  lines.push("## Frontend")
  lines.push(`- Next.js App Router pages: ${pageFiles.length}`)
  lines.push(`- React components: ${componentCode.length}`)
  lines.push(`- Main app modules: ${appCode.length}`)
  lines.push("")
  lines.push("## Backend")
  lines.push(`- API routes: ${routeFiles.length}`)
  lines.push(`- Cron routes: ${cronRoutes.length}`)
  lines.push(`- Lib modules: ${libCode.length}`)
  lines.push("")
  lines.push("## External Services")
  for (const integration of integrations) {
    const status = integration.hasDep ? "configured dependency" : "dependency missing"
    lines.push(`- ${integration.name}: ${status} (${integration.envState.join(", ")})`)
  }
  lines.push("")
  lines.push("## Database")
  lines.push(`- Database introspection: ${db.enabled ? "enabled" : "unavailable"}`)
  if (db.enabled) {
    lines.push(`- Public tables: ${db.tables}`)
    lines.push(`- Sample tables: ${db.sample.join(", ")}`)
  }
  lines.push("")
  lines.push("## Auth Flows")
  lines.push(`- Auth-related files (heuristic): ${authSurface.length}`)
  lines.push(
    `- Key files: ${authSurface
      .slice(0, 8)
      .map((f) => `\`${normalizeWorkspacePath(f)}\``)
      .join(", ")}`,
  )
  lines.push("")
  lines.push("## AI Pipelines")
  lines.push(`- AI/prompt/tooling files (heuristic): ${aiSurface.length}`)
  lines.push(
    `- Key hubs: ${aiSurface
      .slice(0, 10)
      .map((f) => `\`${normalizeWorkspacePath(f)}\``)
      .join(", ")}`,
  )
  lines.push("")
  lines.push("## Folder Structure Hotspots")
  lines.push("- app/")
  for (const [name, count] of topEntries(appDirCounts)) {
    lines.push(`  - ${name}: ${count} files`)
  }
  lines.push("- lib/")
  for (const [name, count] of topEntries(libDirCounts)) {
    lines.push(`  - ${name}: ${count} files`)
  }
  lines.push("- scripts/")
  for (const [name, count] of topEntries(scriptDirCounts)) {
    lines.push(`  - ${name}: ${count} files`)
  }
  lines.push("")
  lines.push("## Background Jobs")
  lines.push(`- Cron route files: ${cronRoutes.length}`)
  lines.push(`- Automation scripts: ${scriptFiles.filter((f) => /automation|digest|cron/i.test(f)).length}`)
  lines.push("")

  const reportPath = await writeReport("repo-map", lines)
  console.log(`[repo-cartographer] wrote ${reportPath}`)
}

main().catch((error) => {
  console.error("[repo-cartographer] failed", error)
  process.exitCode = 1
})

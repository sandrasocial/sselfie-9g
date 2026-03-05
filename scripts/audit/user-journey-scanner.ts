import path from "node:path"
import { REPO_ROOT, normalizeWorkspacePath, walkFiles, writeReport } from "./_shared"

function routeFromPageFile(absPath: string): string {
  const rel = normalizeWorkspacePath(absPath).replace(/^app\//, "")
  const route = rel
    .replace(/^page\.tsx?$/, "")
    .replace(/\/page\.tsx?$/, "")
    .replace(/\/index$/, "")
    .replace(/\(.*?\)\//g, "")
    .replace(/\/$/, "")
  return route.length ? `/${route}` : "/"
}

async function main() {
  const appFiles = await walkFiles(path.join(REPO_ROOT, "app"))
  const pageFiles = appFiles.filter((file) => file.endsWith("/page.tsx") || file.endsWith("/page.ts"))
  const routes = pageFiles.map(routeFromPageFile).sort()

  const mustHave = [
    "/",
    "/studio",
    "/freebie/brand-strategy",
    "/checkout/membership",
    "/feed-planner",
    "/academy",
  ]

  const present = mustHave.filter((route) => routes.includes(route))
  const missing = mustHave.filter((route) => !routes.includes(route))

  const apiRouteFiles = appFiles.filter((f) => f.endsWith("/route.ts") || f.endsWith("/route.tsx"))
  const checkoutRoutes = apiRouteFiles
    .map((f) => normalizeWorkspacePath(f))
    .filter((f) => /checkout|stripe|subscription|billing|webhooks\/stripe/i.test(f))
  const chatRoutes = apiRouteFiles.map((f) => normalizeWorkspacePath(f)).filter((f) => /maya|chat|generate|tool/i.test(f))

  const journey: string[] = []
  journey.push("Landing")
  journey.push("→ Signup / Login")
  journey.push("→ Studio (Maya-first shell)")
  journey.push("→ Maya Chat / Tool execution")
  journey.push("→ Asset creation (images/videos/pages/feed)")
  journey.push("→ Save/publish in Studio Hub")
  journey.push("→ Monetization (checkout/subscription/credits)")

  const lines: string[] = []
  lines.push("# User Journey Scan")
  lines.push("")
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push("")
  lines.push("## Canonical Journey (Detected)")
  for (const step of journey) {
    lines.push(`- ${step}`)
  }
  lines.push("")
  lines.push("## Critical Route Presence")
  lines.push(`- Present: ${present.length}`)
  for (const route of present) lines.push(`- ✅ ${route}`)
  lines.push(`- Missing: ${missing.length}`)
  for (const route of missing) lines.push(`- ⚠️ ${route}`)
  lines.push("")
  lines.push("## Product Surface Routes")
  lines.push(`- Total page routes: ${routes.length}`)
  for (const route of routes.filter((r) => /studio|academy|feed|gallery|checkout|freebie|strategy|account|maya/i.test(r)).slice(0, 40)) {
    lines.push(`- ${route}`)
  }
  lines.push("")
  lines.push("## Monetization / Billing Surfaces")
  lines.push(`- API routes detected: ${checkoutRoutes.length}`)
  for (const routeFile of checkoutRoutes.slice(0, 40)) {
    lines.push(`- ${routeFile.replace(/\/route\.tsx?$/, "")}`)
  }
  lines.push("")
  lines.push("## Maya / AI Execution Surfaces")
  lines.push(`- API routes detected: ${chatRoutes.length}`)
  for (const routeFile of chatRoutes.slice(0, 40)) {
    lines.push(`- ${routeFile.replace(/\/route\.tsx?$/, "")}`)
  }
  lines.push("")
  lines.push("## Friction Flags")
  lines.push(
    missing.length === 0
      ? "- No critical route gaps detected in this scan."
      : "- Critical route gaps detected. Prioritize fixing missing routes before funnel optimization.",
  )
  lines.push(
    checkoutRoutes.length === 0
      ? "- No billing routes detected; monetization flow likely broken."
      : "- Billing surfaces are present; verify checkout + webhook contracts manually.",
  )
  lines.push(
    chatRoutes.length < 5
      ? "- Limited chat/tool routes detected; Maya-first execution may be too shallow."
      : "- Chat/tool surface appears substantial; focus on orchestration quality and UX clarity.",
  )
  lines.push("")

  const reportPath = await writeReport("journey-scan", lines)
  console.log(`[user-journey-scanner] wrote ${reportPath}`)
}

main().catch((error) => {
  console.error("[user-journey-scanner] failed", error)
  process.exitCode = 1
})

import { promises as fs } from "node:fs"
import path from "node:path"
import {
  CRON_BUNDLES,
  CRON_ROUTE_OWNERSHIP,
  REMOVED_CRON_ROUTES,
  type RouteClassification,
  getCronRouteOwnership,
} from "@/lib/cron/ownership"

const repoRoot = process.cwd()
const apiRoot = path.join(repoRoot, "app", "api")

type RouteSummary = {
  apiPath: string
  filePath: string
  classification: RouteClassification
}

const classifications: RouteClassification[] = [
  "live",
  "redirect-only",
  "internal/admin",
  "disabled",
  "delete-candidate",
]

async function findRouteFiles(dir: string, results: string[] = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await findRouteFiles(fullPath, results)
      continue
    }
    if (entry.isFile() && entry.name === "route.ts") {
      results.push(fullPath)
    }
  }
  return results
}

function toApiPath(filePath: string) {
  const relative = path.relative(apiRoot, filePath)
  const withoutRouteFile = relative.replace(new RegExp(`${path.sep}route\\.ts$`), "")
  return `/api/${withoutRouteFile.split(path.sep).join("/")}`
}

async function classifyRoute(filePath: string): Promise<RouteSummary> {
  const apiPath = toApiPath(filePath)
  const contents = await fs.readFile(filePath, "utf8")
  const cronOwnership = getCronRouteOwnership(apiPath)

  let classification: RouteClassification = "live"

  if (cronOwnership) {
    classification = cronOwnership.classification
  } else if (apiPath.startsWith("/api/cron/")) {
    classification = "delete-candidate"
  } else if (
    apiPath.startsWith("/api/admin/") ||
    apiPath.startsWith("/api/debug/") ||
    apiPath.startsWith("/api/dev/") ||
    apiPath.startsWith("/api/test/")
  ) {
    classification = "internal/admin"
  } else if (contents.includes("NextResponse.redirect") || contents.includes(" redirect(")) {
    classification = "redirect-only"
  } else if (contents.includes("DISABLED") || contents.includes("disabled: true")) {
    classification = "disabled"
  }

  return {
    apiPath,
    filePath: path.relative(repoRoot, filePath),
    classification,
  }
}

function countByClassification(routes: RouteSummary[]) {
  return classifications.map((classification) => ({
    classification,
    count: routes.filter((route) => route.classification === classification).length,
  }))
}

function countCronBundles() {
  return CRON_BUNDLES.map((bundle) => {
    const routes = CRON_ROUTE_OWNERSHIP.filter((route) => route.bundle === bundle.id)
    return {
      bundle: bundle.id,
      scheduled: routes.filter((route) => route.lifecycle === "scheduled").length,
      manual: routes.filter((route) => route.lifecycle === "manual").length,
    }
  })
}

async function main() {
  const routeFiles = await findRouteFiles(apiRoot)
  const routes = await Promise.all(routeFiles.map(classifyRoute))
  routes.sort((a, b) => a.apiPath.localeCompare(b.apiPath))

  const deleteCandidates = routes.filter((route) => route.classification === "delete-candidate")

  console.log("Route classification")
  console.log(`Total routes: ${routes.length}`)
  for (const item of countByClassification(routes)) {
    console.log(`${item.classification}: ${item.count}`)
  }

  console.log("")
  console.log("Cron ownership bundles")
  for (const item of countCronBundles()) {
    console.log(`${item.bundle}: scheduled=${item.scheduled} manual=${item.manual}`)
  }

  console.log("")
  console.log(`Removed cron routes: ${REMOVED_CRON_ROUTES.length}`)
  for (const route of REMOVED_CRON_ROUTES) {
    console.log(`${route.path} -> ${route.replacement}`)
  }

  if (deleteCandidates.length > 0) {
    console.log("")
    console.log("Delete candidates")
    for (const route of deleteCandidates) {
      console.log(`${route.apiPath} (${route.filePath})`)
    }
  }
}

main().catch((error) => {
  console.error("Failed to classify routes", error)
  process.exit(1)
})

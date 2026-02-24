import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const repoRoot = path.resolve(__dirname, "..")
const apiRoot = path.join(repoRoot, "app", "api")
const targetFile = "route.ts"
const groupNames = ["academy", "auth", "onboarding", "webhooks", "cron", "admin"]

const isGroupSegment = (segment) =>
  (segment.startsWith("(") && segment.endsWith(")")) || segment.startsWith("@")

const findRouteFiles = async (dir, results = []) => {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await findRouteFiles(fullPath, results)
      continue
    }
    if (entry.isFile() && entry.name === targetFile) {
      results.push(fullPath)
    }
  }
  return results
}

const main = async () => {
  try {
    const apiStat = await fs.stat(apiRoot).catch(() => null)
    if (!apiStat || !apiStat.isDirectory()) {
      console.error(`Missing app/api directory at ${apiRoot}`)
      process.exit(1)
    }

    const routeFiles = await findRouteFiles(apiRoot)
    const counts = new Map(groupNames.map((name) => [name, 0]))

    for (const filePath of routeFiles) {
      const relative = path.relative(apiRoot, filePath)
      const segments = relative.split(path.sep).filter(Boolean)
      const firstNonGroup = segments.find((segment) => !isGroupSegment(segment))
      if (firstNonGroup && counts.has(firstNonGroup)) {
        counts.set(firstNonGroup, counts.get(firstNonGroup) + 1)
      }
    }

    console.log("Route inventory")
    console.log(`Total routes: ${routeFiles.length}`)
    for (const name of groupNames) {
      console.log(`${name}: ${counts.get(name)}`)
    }
  } catch (error) {
    console.error("Failed to inventory routes", error)
    process.exit(1)
  }
}

await main()

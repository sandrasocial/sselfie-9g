// @vitest-environment node
import fs from "fs"
import path from "path"
import {
  CRON_BUNDLE_IDS,
  CRON_ROUTE_OWNERSHIP,
  REMOVED_CRON_ROUTES,
  getCronRouteOwnership,
  getScheduledCronPaths,
} from "@/lib/cron/ownership"

const ROOT = process.cwd()

function routeFileFor(apiPath: string) {
  return path.join(ROOT, "app", apiPath.replace(/^\/api\//, "api/"), "route.ts")
}

function readVercelCronPaths() {
  const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8")) as {
    crons: Array<{ path: string; schedule: string }>
  }
  return vercel.crons.map((cron) => cron.path)
}

describe("Phase 5 route and cron diet controls", () => {
  it("assigns every scheduled Vercel cron to exactly one of the five bundles", () => {
    const scheduledFromVercel = readVercelCronPaths().sort()
    const scheduledFromOwnership = getScheduledCronPaths().sort()

    expect(scheduledFromOwnership).toEqual(scheduledFromVercel)

    for (const cronPath of scheduledFromVercel) {
      const owner = getCronRouteOwnership(cronPath)
      expect(owner).toBeDefined()
      expect(CRON_BUNDLE_IDS).toContain(owner?.bundle)
      expect(fs.existsSync(routeFileFor(cronPath))).toBe(true)
    }
  })

  it("keeps current cron route ownership unique", () => {
    const paths = CRON_ROUTE_OWNERSHIP.map((route) => route.path)
    expect(new Set(paths).size).toBe(paths.length)

    for (const route of CRON_ROUTE_OWNERSHIP) {
      expect(CRON_BUNDLE_IDS).toContain(route.bundle)
      expect(fs.existsSync(routeFileFor(route.path))).toBe(true)
    }
  })

  it("removes only verified disabled legacy cron routes", () => {
    const scheduledFromVercel = readVercelCronPaths()

    for (const removedRoute of REMOVED_CRON_ROUTES) {
      expect(scheduledFromVercel).not.toContain(removedRoute.path)
      expect(fs.existsSync(routeFileFor(removedRoute.path))).toBe(false)
      expect(getCronRouteOwnership(removedRoute.replacement)).toBeDefined()
    }
  })

  it("protects canonical customer access and checkout routes from cleanup", () => {
    const customerRoutes = [
      "app/selfie-guide/page.tsx",
      "app/starter-kit/page.tsx",
      "app/masterclass/page.tsx",
      "app/join/studio/page.tsx",
      "app/work-with-me/page.tsx",
      "app/studio/page.tsx",
      "app/academy/page.tsx",
      "app/api/stripe/create-checkout-session/route.ts",
      "app/api/checkout-session/route.ts",
      "app/api/checkout/user-status/route.ts",
    ]

    for (const customerRoute of customerRoutes) {
      expect(fs.existsSync(path.join(ROOT, customerRoute))).toBe(true)
    }
  })

  it("protects live Maya generation routes from stale dead-path cleanup", () => {
    const liveMayaRoutes = [
      "app/api/maya/generate-feed/route.ts",
      "app/api/maya/generate-feed-prompt/route.ts",
      "app/api/maya/generate-image/route.ts",
      "app/api/maya/pro/generate-feed/route.ts",
      "app/api/maya/pro/generate-image/route.ts",
      "app/api/maya/check-generation/route.ts",
      "app/api/maya/pro/check-generation/route.ts",
    ]

    for (const mayaRoute of liveMayaRoutes) {
      expect(fs.existsSync(path.join(ROOT, mayaRoute))).toBe(true)
    }
  })
})

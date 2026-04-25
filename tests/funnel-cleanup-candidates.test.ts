import { existsSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import {
  FUNNEL_CLEANUP_CANDIDATES,
  getFunnelCleanupCandidate,
} from "@/lib/funnel/cleanup-candidates"

const ROOT = process.cwd()

function routeToPagePath(route: string) {
  const cleanRoute = route.replace(/^\/+/, "")
  return path.join(ROOT, "app", cleanRoute, "page.tsx")
}

describe("funnel cleanup candidates", () => {
  it("keeps cleanup candidates explicit and non-destructive", () => {
    expect(FUNNEL_CLEANUP_CANDIDATES.length).toBeGreaterThan(0)
    expect(FUNNEL_CLEANUP_CANDIDATES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          route: "/checkout-upgrade",
          status: "archive_candidate",
          likelyRedirect: "/private-shoot",
        }),
        expect.objectContaining({
          route: "/paid-blueprint",
          status: "support",
        }),
        expect.objectContaining({
          route: "/prompt-guides",
          status: "archive_candidate",
        }),
      ]),
    )
    expect(FUNNEL_CLEANUP_CANDIDATES.every((candidate) => candidate.requiredBeforeAction.length > 0)).toBe(true)
  })

  it("only lists routes that currently exist", () => {
    for (const candidate of FUNNEL_CLEANUP_CANDIDATES) {
      expect(existsSync(routeToPagePath(candidate.route)), candidate.route).toBe(true)
    }
  })

  it("can resolve a cleanup candidate by route", () => {
    expect(getFunnelCleanupCandidate("/why-studio")).toMatchObject({
      status: "support",
      likelyRedirect: "/join/studio",
    })
    expect(getFunnelCleanupCandidate("/not-real")).toBeNull()
  })
})

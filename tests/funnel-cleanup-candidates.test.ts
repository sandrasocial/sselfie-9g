import { existsSync } from "node:fs"
import { readFileSync } from "node:fs"
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
          decision: "redirect",
          likelyRedirect: "/private-shoot",
        }),
        expect.objectContaining({
          route: "/paid-blueprint",
          status: "support",
          decision: "defer",
        }),
        expect.objectContaining({
          route: "/prompt-guides",
          status: "archive_candidate",
          decision: "redirect",
          likelyRedirect: "/why-studio",
        }),
      ]),
    )
    expect(FUNNEL_CLEANUP_CANDIDATES.every((candidate) => candidate.requiredBeforeAction.length > 0)).toBe(true)
    expect(FUNNEL_CLEANUP_CANDIDATES.every((candidate) => candidate.decision)).toBe(true)
  })

  it("only lists routes that currently exist", () => {
    for (const candidate of FUNNEL_CLEANUP_CANDIDATES) {
      expect(existsSync(routeToPagePath(candidate.route)), candidate.route).toBe(true)
    }
  })

  it("can resolve a cleanup candidate by route", () => {
    expect(getFunnelCleanupCandidate("/why-studio")).toMatchObject({
      status: "support",
      decision: "keep",
      likelyRedirect: "/join/studio",
    })
    expect(getFunnelCleanupCandidate("/not-real")).toBeNull()
  })

  it("redirects stale public archive candidates while preserving support pages", () => {
    expect(readFileSync(routeToPagePath("/prompt-guides"), "utf8")).toContain('redirect("/why-studio")')
    expect(readFileSync(routeToPagePath("/ai-tools-personal-branding"), "utf8")).toContain('redirect("/selfie-guide")')
    expect(readFileSync(routeToPagePath("/sselfie-vs-aragon"), "utf8")).toContain('redirect("/why-studio")')

    const sitemap = readFileSync(path.join(ROOT, "app/sitemap.ts"), "utf8")
    expect(sitemap).not.toContain('"/prompt-guides"')
    expect(sitemap).not.toContain('"/ai-tools-personal-branding"')
    expect(sitemap).not.toContain('"/sselfie-vs-aragon"')
    expect(sitemap).toContain('"/why-studio"')
    expect(sitemap).toContain('"/ai-brand-photos"')
  })
})

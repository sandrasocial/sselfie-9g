import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("admin declutter", () => {
  it("keeps the admin entry points focused on current workflows", () => {
    const nav = readFileSync("components/admin/admin-nav.tsx", "utf8")
    const dashboard = readFileSync("components/admin/admin-dashboard.tsx", "utf8")
    const agents = readFileSync("app/admin/agents/page.tsx", "utf8")
    const newsletterReview = readFileSync("app/admin/newsletter-review/page.tsx", "utf8")

    expect(nav).toContain("/admin/maya-studio")
    expect(nav).toContain("/admin/academy")
    expect(nav).not.toContain("/admin/agents")
    expect(dashboard).toContain("Maya Replicate")
    expect(dashboard).toContain("HIDDEN TOOLS")
    expect(dashboard).not.toContain("/admin/diagnostics/system")
    expect(dashboard).toContain("API Monitor")
    expect(agents).toContain('redirect("/admin/maya-studio")')
    expect(newsletterReview).toContain('redirect("/admin")')
  })

  it("keeps analytics usable when one admin report endpoint fails", () => {
    const analytics = readFileSync("app/admin/analytics/page.tsx", "utf8")

    expect(analytics).toContain("fetchAdminJson")
    expect(analytics).toContain("Failed to load")
    expect(analytics).toContain("/admin/funnel-cleanup")
    expect(analytics).not.toContain("Open Launch Queue")
  })

  it("uses the same admin email rule for admin pages and newer admin APIs", () => {
    const helper = readFileSync("lib/admin-feature-flags.ts", "utf8")
    const layout = readFileSync("app/admin/layout.tsx", "utf8")

    expect(helper).toContain("isAdminEmail")
    expect(helper).toContain("ADMIN_EMAILS")
    expect(helper).toContain('role !== "admin"')
    expect(layout).toContain("isAdminEmail")
  })
})

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

describe("funnel cleanup admin page", () => {
  it("exposes the cleanup inventory as a read-only admin review surface", () => {
    const pagePath = path.join(ROOT, "app/admin/funnel-cleanup/page.tsx")
    const nav = readFileSync(path.join(ROOT, "components/admin/admin-nav.tsx"), "utf8")
    const page = readFileSync(pagePath, "utf8")

    expect(existsSync(pagePath)).toBe(true)
    expect(nav).toContain("/admin/funnel-cleanup")
    expect(page).toContain("FUNNEL_CLEANUP_CANDIDATES")
    expect(page).toContain("getFunnelCleanupEvidence")
    expect(page).toContain("non-destructive review list")
    expect(page).toContain("Before Action")
    expect(page).toContain("Last 30 Days")
    expect(page).toContain("decisionLabel")
    expect(page).toContain("candidate.decision")
    expect(page).not.toContain("redirect(")
  })
})

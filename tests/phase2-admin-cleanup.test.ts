// @vitest-environment node

import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("PHASE2-CLEANUP-01 admin simplification", () => {
  it("removes the dead Admin Maya request and rendering path", () => {
    const route = read("app/api/app-v3/maya/chat/route.ts")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(route).not.toContain("adminSession")
    expect(route).not.toContain("ADMIN_MAYA_CONTRACT")
    expect(route).not.toContain("create_admin_carousel")
    expect(route).not.toContain("show_admin_vault_drop_handoff")
    expect(concierge).not.toContain("AdminContentToolCard")
    expect(concierge).not.toContain("extractAdminContentTool")
    expect(concierge).not.toContain("adminSession")
    expect(existsSync("lib/app-v3/maya/admin-persona.ts")).toBe(false)
    expect(existsSync("components/app-v3/admin-content-tool-card.tsx")).toBe(false)
  })

  it("retires Post Now without leaving a live route or admin link", () => {
    const contentPage = read("app/admin/content-brief/page.tsx")
    const adminHome = read("app/admin/page.tsx")
    const commandCenter = read("lib/admin/higher-self-command-center.ts")

    expect(existsSync("lib/admin/post-now.ts")).toBe(false)
    expect(existsSync("app/api/admin/content-kit/post-now/route.ts")).toBe(false)
    expect(existsSync("components/admin/post-now-client.tsx")).toBe(false)
    expect(contentPage).not.toContain("PostNowClient")
    expect(adminHome).not.toContain("content-brief#post-now")
    expect(commandCenter).not.toContain("content-brief#post-now")
  })

  it("keeps the Content page focused on the three live visual tools", () => {
    const contentPage = read("app/admin/content-brief/page.tsx")

    expect(contentPage).toContain("ShootStudioClient")
    expect(contentPage).toContain("ContentKitClient")
    expect(contentPage).toContain("ContentStoryClient")
    expect(contentPage).not.toContain("ContentBriefClient")
    expect(contentPage).not.toContain("MemberPulseSection")
    expect(contentPage).not.toContain("VaultDropEmailPreview")
  })

  it("renders exactly five top-level admin destinations and one Tools index", () => {
    const nav = read("components/admin/admin-nav.tsx")
    const toolsPage = read("app/admin/tools/page.tsx")
    const navItems = nav.match(/\{ label: '[A-Z]+', href: '[^']+' \}/g) ?? []

    expect(navItems).toHaveLength(5)
    expect(nav).toContain("{ label: 'HOME', href: '/admin' }")
    expect(nav).toContain("{ label: 'INBOX', href: '/admin/ig-inbox' }")
    expect(nav).toContain("{ label: 'CONTENT', href: '/admin/content-brief' }")
    expect(nav).toContain("{ label: 'SUPPORT', href: '/admin/customer-support' }")
    expect(nav).toContain("{ label: 'TOOLS', href: '/admin/tools' }")

    for (const href of [
      "/admin/academy",
      "/admin/credits",
      "/admin/testimonials",
      "/admin/webhook-review",
      "/admin/prompt-vault",
      "/admin/selfie-to-brand-shoot",
      "/admin/preview/selfie-to-brand-shoot",
    ]) {
      expect(toolsPage).toContain(`href: "${href}"`)
    }
  })
})

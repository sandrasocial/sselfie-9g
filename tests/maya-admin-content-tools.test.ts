import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")

describe("MAYA-ADMIN-01 content tools in chat", () => {
  it("adds admin-only content tools to the Maya chat route", () => {
    const route = read("app/api/app-v3/maya/chat/route.ts")

    expect(route).toContain("getAdminContentToolContext")
    expect(route).toContain("show_admin_content_sources")
    expect(route).toContain("create_admin_carousel")
    expect(route).toContain("create_admin_story_sequence")
    expect(route).toContain("generateCarousels")
    expect(route).toContain("generateStorySequence")
    expect(route).toContain("...(isAdminSession")
  })

  it("renders admin content tool results inside Maya's chat thread", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const card = read("components/app-v3/admin-content-tool-card.tsx")

    expect(concierge).toContain("extractAdminContentTool")
    expect(concierge).toContain("AdminContentToolCard")
    expect(card).toContain("/api/admin/content-kit/render/")
    expect(card).toContain("/api/admin/content-kit/story/")
    expect(card).toContain("Source shoot")
  })
})

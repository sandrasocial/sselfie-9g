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
    expect(route).toContain("publish_admin_shoot_to_vault")
    expect(route).toContain("show_admin_vault_drop_handoff")
    expect(route).toContain("publishShootToVault")
    expect(route).toContain("getVaultDropEmailPreview")
    expect(route).toContain("There is no ready unpublished shoot to publish")
    expect(route).toContain("is already published to the Vault as")
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
    expect(card).toContain("/api/admin/vault-drop-email")
    expect(card).toContain("Send live now")
    expect(card).toContain("Continue sending")
    expect(card).not.toContain("No emails have sent yet")
    expect(card).toContain("Source shoot")
  })

  it("shares the vault drop preview builder between admin and Maya handoff", () => {
    const route = read("app/api/admin/vault-drop-email/route.ts")
    const workflow = read("lib/admin/vault-drop-email-workflow.ts")

    expect(route).toContain("getVaultDropEmailPreview")
    expect(route).toContain("createVaultDropLiveRun")
    expect(workflow).toContain("export async function getVaultDropEmailPreview")
    expect(workflow).toContain("export async function createVaultDropLiveRun")
    expect(workflow).toContain("A drop needs at least 2 valid pending collections.")
  })
})

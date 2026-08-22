// @vitest-environment node

import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getOrCreateNeonUser: vi.fn(),
  getUserIdFromSupabase: vi.fn(),
  getSuiteAccess: vi.fn(),
  sql: vi.fn(),
}))

vi.mock("server-only", () => ({}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn((location: string) => {
    throw new Error(`redirect:${location}`)
  }),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser } })),
}))

vi.mock("@/lib/user-mapping", () => ({
  getOrCreateNeonUser: mocks.getOrCreateNeonUser,
  getUserIdFromSupabase: mocks.getUserIdFromSupabase,
}))

vi.mock("@/lib/admin-feature-flags", () => ({ isAdminEmail: vi.fn(() => false) }))
vi.mock("@/lib/trial/suite-trial", () => ({
  getSuiteAccess: mocks.getSuiteAccess,
  isMayaEssentialOnlyAccess: vi.fn(() => false),
}))
vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/data/training", () => ({ hasCompletedTrainedModel: vi.fn(async () => false) }))
vi.mock("@/lib/app-v3/video-flag", () => ({ isVideoGenerationEnabled: vi.fn(() => false) }))
vi.mock("@/lib/subscription", () => ({ hasPaidBlueprint: vi.fn(async () => false) }))
vi.mock("@/components/app-v3/app-v3-shell", () => ({
  AppV3Shell: ({
    firstName,
    initialSkoolHandoff,
    initialSection,
    initialAestheticId,
  }: {
    firstName?: string | null
    initialSkoolHandoff?: { key?: string } | null
    initialSection?: string
    initialAestheticId?: string | null
  }) => (
    <div
      data-testid="app-shell"
      data-skool-handoff={initialSkoolHandoff?.key ?? "none"}
      data-initial-section={initialSection}
      data-initial-aesthetic={initialAestheticId ?? "none"}
    >
      {firstName}
    </div>
  ),
}))

describe("App v3 new-user provisioning", () => {
  beforeEach(() => {
    process.env.APP_V3_MEMBERS_ENABLED = "true"
    vi.resetModules()
    mocks.getUser.mockReset()
    mocks.getOrCreateNeonUser.mockReset()
    mocks.getUserIdFromSupabase.mockReset()
    mocks.getSuiteAccess.mockReset()
    mocks.sql.mockReset()

    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "auth-new-member",
          email: "new-member@example.com",
          user_metadata: { name: "New Member" },
        },
      },
    })
    mocks.getOrCreateNeonUser.mockResolvedValue({ id: "neon-new-member" })
    mocks.getUserIdFromSupabase.mockResolvedValue("neon-new-member")
    mocks.getSuiteAccess.mockResolvedValue({ level: "limited" })
    mocks.sql.mockResolvedValue([])
  })

  it("repairs a missing application user before any member APIs can render", async () => {
    const { default: StudioV3Page } = await import("@/app/app/page")
    const element = await StudioV3Page({ searchParams: Promise.resolve({}) })

    expect(renderToStaticMarkup(element)).toContain("New Member")
    expect(mocks.getOrCreateNeonUser).toHaveBeenCalledWith(
      "auth-new-member",
      "new-member@example.com",
      "New Member"
    )
    expect(mocks.getOrCreateNeonUser.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.getUserIdFromSupabase.mock.invocationCallOrder[0]
    )
  })

  it("passes only a verified Skool lesson handoff into the authenticated app", async () => {
    const { default: StudioV3Page } = await import("@/app/app/page")
    const valid = await StudioV3Page({
      searchParams: Promise.resolve({
        source: "skool",
        lesson: "selfie-practice",
        view: "calendar",
        aesthetic: "quiet-luxury",
      }),
    })
    const invalid = await StudioV3Page({
      searchParams: Promise.resolve({ source: "skool", lesson: "arbitrary-prompt" }),
    })

    expect(renderToStaticMarkup(valid)).toContain('data-skool-handoff="selfie-practice"')
    expect(renderToStaticMarkup(valid)).toContain('data-initial-section="create"')
    expect(renderToStaticMarkup(valid)).toContain('data-initial-aesthetic="none"')
    expect(renderToStaticMarkup(invalid)).toContain('data-skool-handoff="none"')
  })

  it("preserves the verified lesson while a signed-out member logs in", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } })
    const { default: StudioV3Page } = await import("@/app/app/page")

    await expect(
      StudioV3Page({
        searchParams: Promise.resolve({ source: "skool", lesson: "editing-practice" }),
      })
    ).rejects.toThrow(
      "redirect:/auth/login?returnTo=%2Fapp%3Fsource%3Dskool%26lesson%3Dediting-practice"
    )
  })
})

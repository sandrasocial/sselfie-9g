import { beforeEach, describe, expect, it, vi } from "vitest"

const { sqlMock, addMock, removeMock } = vi.hoisted(() => ({
  sqlMock: vi.fn(),
  addMock: vi.fn(),
  removeMock: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({ sql: sqlMock }))
vi.mock("@/lib/resend/client", () => ({
  requireResendClient: () => ({
    contacts: {
      segments: {
        add: addMock,
        remove: removeMock,
      },
    },
  }),
}))

import {
  addVaultMayaLaunchHighIntent,
  isVaultMayaLaunchCampaignKey,
  removeVaultMayaLaunchSalesContact,
  VAULT_MAYA_LAUNCH_SEGMENT_ENV,
} from "@/lib/email/campaigns/vault-maya-launch-segments"

describe("Vault Maya launch segment protections", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const envName of Object.values(VAULT_MAYA_LAUNCH_SEGMENT_ENV)) {
      delete process.env[envName]
    }
    sqlMock.mockResolvedValue([])
    addMock.mockResolvedValue({ data: { id: "contact" }, error: null })
    removeMock.mockResolvedValue({ data: { id: "contact", deleted: true }, error: null })
  })

  it("recognises only Vault Maya launch campaign keys", () => {
    expect(isVaultMayaLaunchCampaignKey("vault_maya_launch_inside_commerce")).toBe(true)
    expect(isVaultMayaLaunchCampaignKey("vault_maya_suite_included")).toBe(false)
    expect(isVaultMayaLaunchCampaignKey("vault_maya_first_photo_nudge")).toBe(false)
  })

  it("adds an eligible clicker or checkout starter to high intent", async () => {
    process.env[VAULT_MAYA_LAUNCH_SEGMENT_ENV.highIntent] = "seg-high"

    const result = await addVaultMayaLaunchHighIntent("Sandra@Example.com")

    expect(result).toEqual({ success: true, changed: 1, skipped: false })
    expect(addMock).toHaveBeenCalledWith({ email: "sandra@example.com", segmentId: "seg-high" })
  })

  it("never adds a paid member or current SUITE access holder to high intent", async () => {
    process.env[VAULT_MAYA_LAUNCH_SEGMENT_ENV.highIntent] = "seg-high"
    sqlMock.mockResolvedValue([{ exists: 1 }])

    const result = await addVaultMayaLaunchHighIntent("member@example.com")

    expect(result.reason).toBe("sales_excluded")
    expect(addMock).not.toHaveBeenCalled()
  })

  it("removes a new buyer from every sales segment", async () => {
    process.env[VAULT_MAYA_LAUNCH_SEGMENT_ENV.commerce] = "seg-commerce"
    process.env[VAULT_MAYA_LAUNCH_SEGMENT_ENV.nonbuyers] = "seg-nonbuyers"
    process.env[VAULT_MAYA_LAUNCH_SEGMENT_ENV.highIntent] = "seg-high"

    const result = await removeVaultMayaLaunchSalesContact("buyer@example.com")

    expect(result).toEqual({ success: true, changed: 3, skipped: false })
    expect(removeMock.mock.calls).toEqual([
      [{ email: "buyer@example.com", segmentId: "seg-commerce" }],
      [{ email: "buyer@example.com", segmentId: "seg-nonbuyers" }],
      [{ email: "buyer@example.com", segmentId: "seg-high" }],
    ])
  })

  it("fails closed when launch segments are not configured", async () => {
    const addResult = await addVaultMayaLaunchHighIntent("lead@example.com")
    const removeResult = await removeVaultMayaLaunchSalesContact("buyer@example.com")

    expect(addResult.reason).toBe("segment_not_configured")
    expect(removeResult.reason).toBe("segments_not_configured")
    expect(addMock).not.toHaveBeenCalled()
    expect(removeMock).not.toHaveBeenCalled()
  })
})

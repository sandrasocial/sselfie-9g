// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createContact: vi.fn(),
  sql: vi.fn(),
}))

vi.mock("resend", () => ({
  Resend: vi.fn(() => ({
    contacts: { create: mocks.createContact },
  })),
}))

vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))

vi.mock("@/lib/resend/api-key", () => ({
  getResendApiKey: () => "test-resend-key",
  hasResendApiKey: () => true,
}))

describe("Resend signup contact property mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sql.mockResolvedValue([])
    mocks.createContact.mockResolvedValue({ data: { id: "contact-1" }, error: null })
  })

  it("uses only the canonical live Resend properties for app signups", async () => {
    const { autoSyncUserToResend } = await import("@/lib/resend/auto-sync-user")

    await autoSyncUserToResend("new-user@realmail.com", "New", { source: "app_signup" })

    expect(mocks.createContact).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "new-user@realmail.com",
        properties: {
          acquisition_path: "app_signup",
          lifecycle_stage: "lead",
          membership_status: "active",
        },
      })
    )
  })

  it("maps existing member semantics without inventing new property keys", async () => {
    const { autoSyncUserToResend } = await import("@/lib/resend/auto-sync-user")

    await autoSyncUserToResend("member@realmail.com", "Member", {
      source: "app_update",
      isStudioMember: true,
      subscriptionProduct: "suite_monthly",
    })

    expect(mocks.createContact).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: {
          acquisition_path: "app_update",
          lifecycle_stage: "customer",
          membership_status: "studio_member_active",
          last_product: "suite_monthly",
        },
      })
    )
  })

  it("queues a non-retryable provider failure once for bounded reconciliation", async () => {
    mocks.createContact.mockResolvedValue({
      data: null,
      error: { message: "One or more properties do not exist" },
    })

    const { autoSyncUserToResend } = await import("@/lib/resend/auto-sync-user")
    const result = await autoSyncUserToResend("recoverable@realmail.com", "Recoverable", {
      source: "app_signup",
    })

    expect(result).toEqual({ success: false, error: "One or more properties do not exist" })
    expect(mocks.createContact).toHaveBeenCalledTimes(1)
    expect(mocks.sql).toHaveBeenCalledTimes(1)

    const [query, ...values] = mocks.sql.mock.calls[0]
    expect((query as TemplateStringsArray).join(" ")).toContain("INSERT INTO resend_sync_queue")
    expect(values).toContain("recoverable@realmail.com")
    expect(values).toContain(1)
  })
})

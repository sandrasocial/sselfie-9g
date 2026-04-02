// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mockResend = vi.fn()

vi.mock("resend", () => ({
  Resend: mockResend,
}))

describe("resend auto-sync import safety", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.RESEND_API_KEY
  })

  it("does not construct Resend at import time when RESEND_API_KEY is missing", async () => {
    const mod = await import("@/lib/resend/auto-sync-user")

    expect(mod.autoSyncUserToResend).toBeTypeOf("function")
    expect(mockResend).not.toHaveBeenCalled()
  })

  it("keeps the shared Resend client lazy until requested", async () => {
    const mod = await import("@/lib/resend/client")

    expect(mod.getResendClient()).toBeNull()
    expect(mockResend).not.toHaveBeenCalled()
  })
})

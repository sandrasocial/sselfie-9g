// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  isAppUnsubscribed: vi.fn(),
  hasResendApiKey: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  addSegment: vi.fn(),
  removeSegment: vi.fn(),
}))

vi.mock("@/lib/email/unsubscribe", () => ({
  isAppUnsubscribed: mocks.isAppUnsubscribed,
}))

vi.mock("@/lib/resend/api-key", () => ({
  hasResendApiKey: mocks.hasResendApiKey,
}))

vi.mock("@/lib/resend/client", () => ({
  requireResendClient: () => ({
    contacts: {
      get: mocks.get,
      update: mocks.update,
      create: mocks.create,
      segments: {
        add: mocks.addSegment,
        remove: mocks.removeSegment,
      },
    },
  }),
}))

import {
  addContactToSegment,
  addOrUpdateResendContact,
} from "@/lib/resend/manage-contact"

describe("Resend lifecycle contact properties", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.hasResendApiKey.mockReturnValue(true)
    mocks.isAppUnsubscribed.mockResolvedValue(false)
    mocks.update.mockResolvedValue({ data: { id: "contact_1" }, error: null })
    mocks.create.mockResolvedValue({ data: { id: "contact_1" }, error: null })
    mocks.addSegment.mockResolvedValue({ data: {}, error: null })
    mocks.removeSegment.mockResolvedValue({ data: {}, error: null })
  })

  it("never downgrades a customer back to lead", async () => {
    mocks.get.mockResolvedValue({
      data: {
        id: "contact_1",
        unsubscribed: false,
        properties: {
          acquisition_path: "selfie_guide",
          lifecycle_stage: "customer",
          primary_interest: "selfies",
          last_product: "starter_kit",
        },
      },
      error: null,
    })

    await addOrUpdateResendContact("buyer@example.org", "Buyer", {
      source: "ai-prompts",
      status: "lead",
      product: "ai-photoshoot-prompts",
    })

    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          acquisition_path: "selfie_guide",
          lifecycle_stage: "customer",
          last_product: "starter_kit",
        }),
      }),
    )
  })

  it("recognizes legacy bought_* flags as a customer purchase", async () => {
    mocks.get.mockResolvedValue({
      data: {
        id: "contact_2",
        unsubscribed: false,
        properties: {
          acquisition_path: "selfie_guide",
          lifecycle_stage: "lead",
          primary_interest: "selfies",
        },
      },
      error: null,
    })

    await addOrUpdateResendContact("starter@example.org", "Starter", {
      product: "starter-kit",
      journey: "starter_kit",
      bought_starter_kit: "true",
    })

    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          lifecycle_stage: "customer",
          last_product: "starter_kit",
        }),
      }),
    )
  })

  it("does not touch Resend when the app has a durable unsubscribe", async () => {
    mocks.isAppUnsubscribed.mockResolvedValue(true)

    const result = await addOrUpdateResendContact("optout@example.org", "Optout", {
      source: "selfie-guide",
      status: "lead",
    })

    expect(result.success).toBe(true)
    expect(mocks.get).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it("does not add a globally unsubscribed contact to a segment", async () => {
    mocks.get.mockResolvedValue({
      data: { id: "contact_3", unsubscribed: true, properties: {} },
      error: null,
    })

    const result = await addContactToSegment("global-optout@example.org", "segment_1")

    expect(result.success).toBe(true)
    expect(mocks.addSegment).not.toHaveBeenCalled()
  })
})

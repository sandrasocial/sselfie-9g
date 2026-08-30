// @vitest-environment node

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

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

const property = (value: string) => ({ type: "string", value })
const originalMainSegmentId = process.env.RESEND_AUDIENCE_ID
const originalDisableTestEmails = process.env.RESEND_DISABLE_TEST_EMAILS
const mainSegmentId = "78261eea-8f8b-4381-83c6-79fa7120f1cf"

describe("Resend lifecycle contact properties", () => {
  beforeEach(() => {
    process.env.RESEND_AUDIENCE_ID = `\t${mainSegmentId}\n`
    process.env.RESEND_DISABLE_TEST_EMAILS = "false"
    vi.clearAllMocks()
    mocks.hasResendApiKey.mockReturnValue(true)
    mocks.isAppUnsubscribed.mockResolvedValue(false)
    mocks.update.mockResolvedValue({ data: { id: "contact_1" }, error: null })
    mocks.create.mockResolvedValue({ data: { id: "contact_1" }, error: null })
    mocks.addSegment.mockResolvedValue({ data: {}, error: null })
    mocks.removeSegment.mockResolvedValue({ data: {}, error: null })
  })

  afterAll(() => {
    if (originalMainSegmentId === undefined) delete process.env.RESEND_AUDIENCE_ID
    else process.env.RESEND_AUDIENCE_ID = originalMainSegmentId
    if (originalDisableTestEmails === undefined) delete process.env.RESEND_DISABLE_TEST_EMAILS
    else process.env.RESEND_DISABLE_TEST_EMAILS = originalDisableTestEmails
  })

  it.each([
    {
      label: "Free Selfie Guide",
      email: "new-guide@example.org",
      tags: {
        source: "freebie-selfie-guide",
        status: "lead",
        product: "sselfie-guide",
        journey: "nurture",
      },
      properties: {
        acquisition_path: "selfie_guide",
        lifecycle_stage: "lead",
        primary_interest: "selfies",
      },
    },
    {
      label: "AI Prompts",
      email: "new-prompts@example.org",
      tags: {
        source: "ai-prompts",
        status: "lead",
        journey: "nurture",
      },
      properties: {
        acquisition_path: "ai_prompts",
        lifecycle_stage: "lead",
        primary_interest: "ai_photos",
      },
    },
  ])(
    "creates a new $label contact before assigning its Main Audience segment",
    async ({ email, tags, properties }) => {
      mocks.get.mockResolvedValue({
        data: null,
        error: { statusCode: 404, message: "Contact not found" },
      })

      const result = await addOrUpdateResendContact(email, "New", tags)

      expect(result).toEqual({ success: true, contactId: "contact_1" })
      expect(mocks.create).toHaveBeenCalledWith({
        email,
        firstName: "New",
        properties,
      })
      expect(mocks.addSegment).toHaveBeenCalledWith({ email, segmentId: mainSegmentId })
      expect(mocks.create.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.addSegment.mock.invocationCallOrder[0]
      )
    }
  )

  it("never downgrades a customer back to lead when Resend returns wrapped properties", async () => {
    mocks.get.mockResolvedValue({
      data: {
        id: "contact_1",
        unsubscribed: false,
        properties: {
          acquisition_path: property("selfie_guide"),
          lifecycle_stage: property("customer"),
          primary_interest: property("selfies"),
          last_product: property("starter_kit"),
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
          acquisition_path: property("selfie_guide"),
          lifecycle_stage: property("lead"),
          primary_interest: property("selfies"),
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

  it("never re-segments an existing globally unsubscribed contact", async () => {
    mocks.get.mockResolvedValue({
      data: { id: "contact_3", unsubscribed: true, properties: {} },
      error: null,
    })

    const result = await addOrUpdateResendContact("global-optout@example.org", "Optout", {
      source: "selfie-guide",
      status: "lead",
    })

    expect(result.success).toBe(true)
    expect(mocks.update).toHaveBeenCalled()
    expect(mocks.addSegment).not.toHaveBeenCalled()
  })

  it("paces every provider request during a queue-drain upsert", async () => {
    vi.useFakeTimers()
    const timeoutSpy = vi.spyOn(global, "setTimeout")
    mocks.get.mockResolvedValue({
      data: { id: "contact_4", unsubscribed: false, properties: {} },
      error: null,
    })

    const resultPromise = addOrUpdateResendContact(
      "queued@example.org",
      "Queued",
      { source: "app_signup", status: "lead" },
      { requestIntervalMs: 500 }
    )

    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.success).toBe(true)
    expect(mocks.get).toHaveBeenCalledTimes(1)
    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.addSegment).toHaveBeenCalledTimes(1)
    expect(timeoutSpy).toHaveBeenCalledTimes(2)
    expect(timeoutSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 500)
    expect(timeoutSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 500)
    expect(vi.getTimerCount()).toBe(0)
    timeoutSpy.mockRestore()
    vi.useRealTimers()
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

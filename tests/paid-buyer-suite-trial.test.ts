// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "fs"
import path from "path"

const sqlMock = vi.fn()
const grantSuiteTrialMock = vi.fn()
const sendEmailMock = vi.fn()
const logAnalyticsEventMock = vi.fn()

vi.mock("server-only", () => ({}))

vi.mock("@/lib/db/client", () => ({
  sql: sqlMock,
  getDb: () => sqlMock,
}))

vi.mock("@/lib/trial/suite-trial", () => ({
  grantSuiteTrial: grantSuiteTrialMock,
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: sendEmailMock,
}))

vi.mock("@/lib/analytics/events", () => ({
  logAnalyticsEvent: logAnalyticsEventMock,
}))

describe("paid buyer SUITE trial activation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sqlMock.mockResolvedValue([])
    sendEmailMock.mockResolvedValue({ success: true, messageId: "email_1" })
    logAnalyticsEventMock.mockResolvedValue({ ok: true })
  })

  it("automatically grants a known live buyer and sends day 0 only after a new grant", async () => {
    grantSuiteTrialMock.mockResolvedValue({
      created: true,
      trialEndsAt: new Date("2026-07-19T12:00:00.000Z"),
    })
    const getClaimUrl = vi.fn()
    const { activatePaidBuyerSuiteTrial } = await import(
      "@/lib/payments/paid-buyer-suite-trial"
    )

    const result = await activatePaidBuyerSuiteTrial({
      livemode: true,
      userId: "user_123",
      customerEmail: "buyer@example.com",
      customerName: "Buyer Example",
      productType: "prompt_vault",
      stripeSessionId: "cs_live_123",
      getClaimUrl,
    })

    expect(result).toEqual({ outcome: "auto_activated" })
    expect(grantSuiteTrialMock).toHaveBeenCalledWith(
      "user_123",
      "paid_purchase:prompt_vault:cs_live_123",
    )
    expect(getClaimUrl).not.toHaveBeenCalled()
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "buyer@example.com",
        emailType: "suite_trial_day0",
        tags: ["suite-trial", "day0", "prompt-vault", "paid-buyer"],
      }),
    )
    expect(logAnalyticsEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "trial_claimed",
        userId: "user_123",
        properties: expect.objectContaining({
          source: "paid_buyer_auto_activation",
          product_type: "prompt_vault",
          stripe_session_id: "cs_live_123",
        }),
      }),
    )
  })

  it("preserves the claim-token email for a live guest buyer", async () => {
    const getClaimUrl = vi.fn().mockResolvedValue("https://sselfie.ai/claim/token_123")
    const { activatePaidBuyerSuiteTrial } = await import(
      "@/lib/payments/paid-buyer-suite-trial"
    )

    const result = await activatePaidBuyerSuiteTrial({
      livemode: true,
      userId: null,
      customerEmail: "guest@example.com",
      customerName: "Guest Example",
      productType: "starter_kit",
      stripeSessionId: "cs_live_guest",
      getClaimUrl,
    })

    expect(result).toEqual({ outcome: "claim_email_sent" })
    expect(grantSuiteTrialMock).not.toHaveBeenCalled()
    expect(getClaimUrl).toHaveBeenCalledTimes(1)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "guest@example.com",
        emailType: "suite_trial_unlock",
        tags: ["suite-trial", "unlock", "starter-kit"],
      }),
    )
    expect(sendEmailMock.mock.calls[0][0].text).toContain(
      "https://sselfie.ai/claim/token_123",
    )
  })

  it("does not send a second or misleading trial email when a duplicate webhook finds the trial", async () => {
    grantSuiteTrialMock
      .mockResolvedValueOnce({
        created: true,
        trialEndsAt: new Date("2026-07-19T12:00:00.000Z"),
      })
      .mockResolvedValueOnce({
        created: false,
        trialEndsAt: new Date("2026-07-19T12:00:00.000Z"),
      })
    const getClaimUrl = vi.fn()
    const { activatePaidBuyerSuiteTrial } = await import(
      "@/lib/payments/paid-buyer-suite-trial"
    )
    const input = {
      livemode: true,
      userId: "user_456",
      customerEmail: "buyer@example.com",
      customerName: "Buyer Example",
      productType: "selfie_ai_photos_kit" as const,
      stripeSessionId: "cs_live_duplicate",
      getClaimUrl,
    }

    const first = await activatePaidBuyerSuiteTrial(input)
    const duplicate = await activatePaidBuyerSuiteTrial(input)

    expect(first).toEqual({ outcome: "auto_activated" })
    expect(duplicate).toEqual({ outcome: "already_had_trial" })
    expect(grantSuiteTrialMock).toHaveBeenCalledTimes(2)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(logAnalyticsEventMock).toHaveBeenCalledTimes(1)
    expect(getClaimUrl).not.toHaveBeenCalled()
  })

  it("does not grant or email from a Stripe test checkout", async () => {
    const getClaimUrl = vi.fn()
    const { activatePaidBuyerSuiteTrial } = await import(
      "@/lib/payments/paid-buyer-suite-trial"
    )

    const result = await activatePaidBuyerSuiteTrial({
      livemode: false,
      userId: "user_test",
      customerEmail: "buyer@example.com",
      customerName: "Buyer Example",
      productType: "prompt_vault",
      stripeSessionId: "cs_test_123",
      getClaimUrl,
    })

    expect(result).toEqual({ outcome: "skipped_test_mode" })
    expect(grantSuiteTrialMock).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(getClaimUrl).not.toHaveBeenCalled()
  })

  it("suppresses a repeated guest claim email already delivered for that buyer", async () => {
    sqlMock.mockResolvedValue([{ exists: 1 }])
    const getClaimUrl = vi.fn()
    const { activatePaidBuyerSuiteTrial } = await import(
      "@/lib/payments/paid-buyer-suite-trial"
    )

    const result = await activatePaidBuyerSuiteTrial({
      livemode: true,
      userId: null,
      customerEmail: "guest@example.com",
      customerName: "Guest Example",
      productType: "prompt_vault",
      stripeSessionId: "cs_live_guest_repeat",
      getClaimUrl,
    })

    expect(result).toEqual({ outcome: "claim_email_already_sent" })
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(getClaimUrl).not.toHaveBeenCalled()
  })

  it.each([
    ["lib/payments/handlers/prompt-vault.ts", 'productType: "prompt_vault"'],
    ["lib/payments/handlers/starter-kit.ts", 'productType: "starter_kit"'],
    [
      "lib/payments/handlers/selfie-ai-photos-kit.ts",
      'productType: "selfie_ai_photos_kit"',
    ],
  ])("wires the shared activation contract into %s", (relativePath, productType) => {
    const source = readFileSync(path.join(process.cwd(), relativePath), "utf8")

    expect(source).toContain("activatePaidBuyerSuiteTrial")
    expect(source).toContain(productType)
    expect(source).toContain("livemode: event.livemode")
    expect(source).toContain("getClaimUrl: async () =>")
  })
})

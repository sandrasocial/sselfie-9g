// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()
const retrievePaymentIntentMock = vi.fn()
const sendEmailMock = vi.fn()
const markRevenueEnginePurchaseMock = vi.fn()
const generatePasswordSetupLinkForPurchaseMock = vi.fn()
const updateContactTagsMock = vi.fn()
const addContactToSegmentMock = vi.fn()
const logAnalyticsEventMock = vi.fn()

vi.mock("server-only", () => ({}))

vi.mock("@/lib/db/client", () => ({
  sql: sqlMock,
  getDb: () => sqlMock,
}))

vi.mock("@/lib/stripe", () => ({
  stripe: {
    paymentIntents: {
      retrieve: retrievePaymentIntentMock,
    },
  },
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: sendEmailMock,
}))

vi.mock("@/lib/payments/shared", () => ({
  generatePasswordSetupLinkForPurchase: generatePasswordSetupLinkForPurchaseMock,
  markRevenueEnginePurchase: markRevenueEnginePurchaseMock,
}))

vi.mock("@/lib/academy-entitlements", () => ({
  upsertPurchaseEntitlement: vi.fn(),
}))

vi.mock("@/lib/analytics/events", () => ({
  logAnalyticsEvent: logAnalyticsEventMock,
}))

vi.mock("@/lib/resend/manage-contact", () => ({
  updateContactTags: updateContactTagsMock,
  addContactToSegment: addContactToSegmentMock,
}))

describe("Prompt Vault payment attribution storage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    retrievePaymentIntentMock.mockResolvedValue({
      id: "pi_prompt_vault_attributed",
      amount: 2700,
      currency: "usd",
      customer: "cus_prompt_vault_attributed",
    })
    sendEmailMock.mockResolvedValue({ success: true, messageId: "email_1" })
    markRevenueEnginePurchaseMock.mockResolvedValue(undefined)
    generatePasswordSetupLinkForPurchaseMock.mockResolvedValue(undefined)
    updateContactTagsMock.mockResolvedValue(undefined)
    addContactToSegmentMock.mockResolvedValue(undefined)
    logAnalyticsEventMock.mockResolvedValue(undefined)
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = Array.isArray(strings) ? strings.join(" ") : String(strings)
      if (query.includes("SELECT id, access_token, email_tags")) {
        return []
      }
      if (query.includes("INSERT INTO freebie_subscribers")) {
        return [{ id: 42 }]
      }
      return []
    })
  })

  it("flattens Prompt Vault checkout metadata into stripe_payments reporting columns", async () => {
    const { handlePromptVaultCheckout } = await import("@/lib/payments/handlers/prompt-vault")

    await handlePromptVaultCheckout({
      event: {
        id: "evt_prompt_vault_attributed",
        livemode: true,
      } as any,
      session: {
        id: "cs_prompt_vault_attributed",
        payment_status: "paid",
        amount_total: 2700,
        currency: "usd",
        payment_intent: "pi_prompt_vault_attributed",
        customer: "cus_prompt_vault_attributed",
        customer_details: {
          email: "buyer@example.com",
          name: "Buyer Example",
        },
        metadata: {
          product_type: "prompt_vault",
          source: "prompt_page",
          utm_source: "instagram",
          utm_medium: "manychat",
          utm_campaign: "numbered_prompt",
          utm_content: "prompt_14_marble-wine-shot-2",
          checkout_source: "single_prompt_page",
          cta_keyword: "PROMPT",
          prompt_n: "14",
          prompt_number: "14",
          entry_post_slug: "marble-cafe-reel",
          buyer_stage: "lead",
        },
      } as any,
      isPaymentPaid: true,
      customerEmail: "buyer@example.com",
      userId: null,
      referralPurchaseUserId: null,
      source: "prompt_page",
    })

    const stripePaymentInsert = sqlMock.mock.calls.find(([strings]) => {
      const query = Array.isArray(strings) ? strings.join(" ") : String(strings)
      return query.includes("INSERT INTO stripe_payments")
    })

    expect(stripePaymentInsert).toBeTruthy()
    const [strings, ...values] = stripePaymentInsert!
    const query = Array.isArray(strings) ? strings.join(" ") : String(strings)

    expect(query).toContain("customer_email")
    expect(query).toContain("checkout_session_id")
    expect(query).toContain("source")
    expect(query).toContain("prompt_number")
    expect(values).toEqual(expect.arrayContaining([
      "buyer@example.com",
      "cs_prompt_vault_attributed",
      "prompt_page",
      "instagram",
      "manychat",
      "numbered_prompt",
      "prompt_14_marble-wine-shot-2",
      "single_prompt_page",
      "PROMPT",
      "14",
      "marble-cafe-reel",
      "lead",
    ]))

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "buyer@example.com",
        emailType: "prompt_vault_delivery",
        idempotencyKey: "prompt-vault-delivery:cs_prompt_vault_attributed",
      }),
    )
  })
})

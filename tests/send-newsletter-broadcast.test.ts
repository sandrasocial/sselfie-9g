// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => {
  const campaign = {
    id: 38,
    campaign_name: "Vault flash announce",
    subject_line: "your $27 Vault window",
    preview_text: "The Vault price changes Friday.",
    body_html: "<p>Hey love,</p><p><a href=\"https://sselfie.ai/prompt-vault\">Get the Vault</a></p>",
    body_text: "Hey love,\n\nGet the Vault: https://sselfie.ai/prompt-vault",
    target_audience: {
      segment: "Main Audience",
      audience_id: undefined as string | undefined,
    },
    status: "scheduled",
    approval_status: "approved",
    scheduled_for: null,
    resend_broadcast_id: null,
  }

  return {
    campaign,
    sqlCalls: [] as Array<{ text: string; values: unknown[]; sendConfirmed: boolean }>,
    sendConfirmed: false,
    createBroadcast: vi.fn(),
    sendBroadcast: vi.fn(),
  }
})

vi.mock("@/lib/db/client", () => ({
  getDb: () => {
    return (strings: TemplateStringsArray, ...values: unknown[]) => {
      const text = strings.join("?")
      mocks.sqlCalls.push({ text, values, sendConfirmed: mocks.sendConfirmed })

      if (text.includes("SELECT * FROM admin_email_campaigns")) {
        return Promise.resolve([mocks.campaign])
      }

      return Promise.resolve([])
    }
  },
}))

vi.mock("@/lib/resend/client", () => ({
  requireResendClient: () => ({
    broadcasts: {
      create: mocks.createBroadcast,
      send: mocks.sendBroadcast,
    },
  }),
}))

vi.mock("@/lib/email/link-library", () => ({
  processEmailLinks: (html: string) => html,
  validateEmailLinks: () => [],
}))

describe("sendNewsletterBroadcast", () => {
  beforeEach(() => {
    process.env.RESEND_AUDIENCE_ID = "aud_main"
    process.env.RESEND_FROM_EMAIL = "Sandra @ SSELFIE <hello@sselfie.ai>"
    mocks.campaign.target_audience = {
      segment: "Main Audience",
      audience_id: undefined,
    }
    mocks.sqlCalls.length = 0
    mocks.sendConfirmed = false
    mocks.createBroadcast.mockReset()
    mocks.sendBroadcast.mockReset()
    mocks.createBroadcast.mockResolvedValue({ data: { id: "bcast_123" }, error: null })
    mocks.sendBroadcast.mockImplementation(async () => {
      mocks.sendConfirmed = true
      return { data: { id: "bcast_123" }, error: null }
    })
  })

  it("creates and explicitly sends a Resend broadcast before marking the campaign sent", async () => {
    const { sendNewsletterBroadcast } = await import("@/lib/email/send-newsletter-broadcast")

    await expect(
      sendNewsletterBroadcast(38, {
        totalAudience: 1,
        suppressedCount: 0,
        sendableCount: 1,
      }),
    ).resolves.toBe("bcast_123")

    expect(mocks.createBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        audienceId: "aud_main",
        from: "Sandra @ SSELFIE <hello@sselfie.ai>",
        name: "Vault flash announce",
        previewText: "The Vault price changes Friday.",
        subject: "your $27 Vault window",
        html: expect.stringContaining("Hey love"),
        text: expect.stringContaining("Get the Vault"),
      }),
    )
    expect(mocks.sendBroadcast).toHaveBeenCalledWith("bcast_123", {})

    const finalSentUpdate = mocks.sqlCalls.find((call) => call.text.includes("sent_at ="))
    expect(finalSentUpdate?.sendConfirmed).toBe(true)
  })

  it("prefers a campaign-specific audience so a one-person test cannot hit the main list", async () => {
    mocks.campaign.target_audience = {
      segment: "Sandra only",
      audience_id: "aud_sandra_test",
    }

    const { sendNewsletterBroadcast } = await import("@/lib/email/send-newsletter-broadcast")

    await sendNewsletterBroadcast(38, {
      totalAudience: 1,
      suppressedCount: 0,
      sendableCount: 1,
    })

    expect(mocks.createBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({ audienceId: "aud_sandra_test" }),
    )
  })

  it("marks the campaign failed when Resend send fails after draft creation", async () => {
    mocks.sendBroadcast.mockResolvedValueOnce({
      data: null,
      error: { message: "restricted API key" },
    })

    const { sendNewsletterBroadcast } = await import("@/lib/email/send-newsletter-broadcast")

    await expect(
      sendNewsletterBroadcast(38, {
        totalAudience: 1,
        suppressedCount: 0,
        sendableCount: 1,
      }),
    ).rejects.toThrow("Resend broadcast send failed: restricted API key")

    expect(mocks.createBroadcast).toHaveBeenCalledTimes(1)
    expect(mocks.sendBroadcast).toHaveBeenCalledWith("bcast_123", {})
    expect(mocks.sqlCalls.some((call) => call.text.includes("SET status = 'failed'"))).toBe(true)
  })
})

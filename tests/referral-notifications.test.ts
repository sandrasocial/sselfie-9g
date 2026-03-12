import { beforeEach, describe, expect, it, vi } from "vitest"

const mockSql = vi.fn()
const mockSendEmail = vi.fn()

vi.mock("@/lib/db/client", () => ({
  sql: mockSql,
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: mockSendEmail,
}))

describe("referral bonus notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("builds stable per-referral email types", async () => {
    const { getReferralBonusEmailType } = await import("@/lib/referrals/notifications")

    expect(getReferralBonusEmailType("referred", 7)).toBe("referral-bonus-referred-7")
    expect(getReferralBonusEmailType("referrer", 7)).toBe("referral-bonus-referrer-7")
  })

  it("sends the referrer bonus email once for a qualifying referral", async () => {
    mockSql
      .mockResolvedValueOnce([
        {
          id: 42,
          referrer_email: "caroline@example.com",
          referrer_name: "Caroline Kubas",
          referred_email: "kim@example.com",
          referred_name: "Kim Pottinger",
          credits_awarded_referrer: 50,
          credits_awarded_referred: 25,
        },
      ])
      .mockResolvedValueOnce([])
    mockSendEmail.mockResolvedValue({ success: true, messageId: "msg_123" })

    const { sendReferralBonusNotification } = await import("@/lib/referrals/notifications")

    const result = await sendReferralBonusNotification({
      referralId: 42,
      kind: "referrer",
    })

    expect(result).toEqual({
      success: true,
      status: "sent",
      emailType: "referral-bonus-referrer-42",
    })

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "caroline@example.com",
        emailType: "referral-bonus-referrer-42",
        subject: "Your referral credits are in",
      }),
    )
  })

  it("skips sending when the referral email was already logged", async () => {
    mockSql
      .mockResolvedValueOnce([
        {
          id: 9,
          referrer_email: "caroline@example.com",
          referrer_name: "Caroline Kubas",
          referred_email: "kim@example.com",
          referred_name: "Kim Pottinger",
          credits_awarded_referrer: 50,
          credits_awarded_referred: 25,
        },
      ])
      .mockResolvedValueOnce([{ id: 1 }])

    const { sendReferralBonusNotification } = await import("@/lib/referrals/notifications")

    const result = await sendReferralBonusNotification({
      referralId: 9,
      kind: "referred",
    })

    expect(result).toEqual({
      success: true,
      status: "already_sent",
      emailType: "referral-bonus-referred-9",
    })

    expect(mockSendEmail).not.toHaveBeenCalled()
  })
})

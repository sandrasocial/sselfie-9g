import { beforeEach, describe, expect, it, vi } from "vitest"

const mockSql = vi.fn()
const mockAddCredits = vi.fn()
const mockGrantReferencedBonusCredits = vi.fn()
const mockSendReferralBonusNotification = vi.fn()

vi.mock("@/lib/db/client", () => ({
  sql: mockSql,
}))

vi.mock("@/lib/credits", () => ({
  addCredits: mockAddCredits,
  grantReferencedBonusCredits: mockGrantReferencedBonusCredits,
}))

vi.mock("@/lib/referrals/notifications", () => ({
  sendReferralBonusNotification: mockSendReferralBonusNotification,
}))

describe("referral service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.REFERRAL_BONUSES_ENABLED
    mockSendReferralBonusNotification.mockResolvedValue({
      success: true,
      status: "sent",
      emailType: "referral-bonus-test",
    })
    mockGrantReferencedBonusCredits.mockResolvedValue({
      success: true,
      granted: true,
      newBalance: 50,
    })
  })

  it("tracks a referred signup, grants the referred bonus by default, and is idempotent per referred user", async () => {
    mockSql
      .mockResolvedValueOnce([{ id: "referrer-1" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 9 }])
      .mockResolvedValueOnce([])
    mockAddCredits.mockResolvedValue({ success: true, newBalance: 25 })

    const { buildReferralEventCode, trackReferralSignup } = await import("@/lib/referrals/service")

    const result = await trackReferralSignup({
      referralCode: "abc123",
      referredUserId: "referred-1",
    })

    expect(result).toMatchObject({
      success: true,
      status: "tracked",
      welcomeCreditsGranted: true,
      referrerId: "referrer-1",
    })

    expect(mockAddCredits).toHaveBeenCalledWith(
      "referred-1",
      25,
      "bonus",
      "Welcome reward for signing up with referral"
    )

    expect(mockSendReferralBonusNotification).toHaveBeenCalledWith({
      referralId: 9,
      kind: "referred",
    })

    expect(mockSql).toHaveBeenCalledWith(
      expect.arrayContaining([
        "\n      INSERT INTO referrals (referrer_id, referred_id, referral_code, status)\n      VALUES (",
        ", ",
        ", ",
        ", 'pending')\n      RETURNING id\n    ",
      ]),
      "referrer-1",
      "referred-1",
      buildReferralEventCode("ABC123", "referred-1")
    )
  })

  it("completes the first paid referral purchase and grants the referrer reward once", async () => {
    mockSql
      .mockResolvedValueOnce([
        {
          id: 42,
          referrer_id: "referrer-2",
          referred_id: "referred-2",
          credits_awarded_referrer: 0,
          status: "pending",
        },
      ])
      .mockResolvedValueOnce(undefined)
    const { completeReferralForPurchase } = await import("@/lib/referrals/service")

    const result = await completeReferralForPurchase({
      referredUserId: "referred-2",
      paymentSource: "stripe_webhook:paid_blueprint",
    })

    expect(result).toEqual({
      success: true,
      status: "completed",
      referrerId: "referrer-2",
      referralId: 42,
    })

    expect(mockGrantReferencedBonusCredits).toHaveBeenCalledWith({
      userId: "referrer-2",
      amount: 50,
      description: "Referral reward for referred user's first paid purchase",
      paymentReference: "referral:42",
      grantPurpose: "first_purchase_referrer_reward",
      isTestMode: false,
    })

    expect(mockSendReferralBonusNotification).toHaveBeenCalledWith({
      referralId: 42,
      kind: "referrer",
    })
  })

  it("skips completion when the referral was already rewarded", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: 77,
        referrer_id: "referrer-3",
        referred_id: "referred-3",
        credits_awarded_referrer: 50,
        status: "completed",
      },
    ])

    const { completeReferralForPurchase } = await import("@/lib/referrals/service")

    const result = await completeReferralForPurchase({
      referredUserId: "referred-3",
      paymentSource: "stripe_webhook:subscription",
    })

    expect(result).toEqual({
      success: true,
      status: "already_completed",
      referrerId: "referrer-3",
      referralId: 77,
    })

    expect(mockAddCredits).not.toHaveBeenCalled()
  })

  it("returns a distinct test-mode no-op without rewarding or completing the referral", async () => {
    const { completeReferralForPurchase } = await import("@/lib/referrals/service")

    const result = await completeReferralForPurchase({
      referredUserId: "referred-test",
      paymentSource: "stripe_webhook:test",
      isTestMode: true,
    })

    expect(result).toEqual({
      success: true,
      status: "test_mode_noop",
      referrerId: null,
      referralId: null,
    })
    expect(mockSql).not.toHaveBeenCalled()
    expect(mockGrantReferencedBonusCredits).not.toHaveBeenCalled()
    expect(mockSendReferralBonusNotification).not.toHaveBeenCalled()
  })

  it("leaves a failed referrer reward pending so a later webhook can retry it", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: 81,
        referrer_id: "referrer-failure",
        credits_awarded_referrer: 0,
        status: "pending",
      },
    ])
    mockGrantReferencedBonusCredits.mockResolvedValue({
      success: false,
      granted: false,
      newBalance: 0,
      error: "wallet unavailable",
    })

    const { completeReferralForPurchase } = await import("@/lib/referrals/service")
    await expect(
      completeReferralForPurchase({
        referredUserId: "referred-failure",
        paymentSource: "stripe_webhook:subscription",
      })
    ).resolves.toEqual({
      success: false,
      status: "reward_failed",
      referrerId: "referrer-failure",
      referralId: 81,
      error: "wallet unavailable",
    })

    expect(mockSql).toHaveBeenCalledTimes(1)
    expect(mockSendReferralBonusNotification).not.toHaveBeenCalled()
  })

  it("replay after grant-before-status-update completes without granting twice", async () => {
    const referral = {
      id: 88,
      referrer_id: "referrer-replay",
      credits_awarded_referrer: 0,
      status: "pending",
    }
    mockSql
      .mockResolvedValueOnce([referral])
      .mockRejectedValueOnce(new Error("status update unavailable"))
      .mockResolvedValueOnce([referral])
      .mockResolvedValueOnce(undefined)
    mockGrantReferencedBonusCredits
      .mockResolvedValueOnce({ success: true, granted: true, newBalance: 50 })
      .mockResolvedValueOnce({ success: true, granted: false, newBalance: 50 })

    const { completeReferralForPurchase } = await import("@/lib/referrals/service")
    const input = {
      referredUserId: "referred-replay",
      paymentSource: "stripe_webhook:subscription",
    }

    await expect(completeReferralForPurchase(input)).rejects.toThrow("status update unavailable")
    await expect(completeReferralForPurchase(input)).resolves.toMatchObject({
      success: true,
      status: "completed",
      referralId: 88,
    })
    expect(mockGrantReferencedBonusCredits).toHaveBeenCalledTimes(2)
    expect(mockGrantReferencedBonusCredits.mock.calls[0][0]).toEqual(
      mockGrantReferencedBonusCredits.mock.calls[1][0]
    )
  })

  it("uses the same referenced reward identity across concurrent first-purchase completion", async () => {
    const referral = {
      id: 91,
      referrer_id: "referrer-concurrent",
      credits_awarded_referrer: 0,
      status: "pending",
    }
    mockSql.mockImplementation(async (strings: TemplateStringsArray) =>
      strings.join(" ").includes("SELECT id, referrer_id") ? [referral] : []
    )
    let granted = false
    mockGrantReferencedBonusCredits.mockImplementation(async () => {
      const isFirst = !granted
      granted = true
      return { success: true, granted: isFirst, newBalance: 50 }
    })

    const { completeReferralForPurchase } = await import("@/lib/referrals/service")
    const input = {
      referredUserId: "referred-concurrent",
      paymentSource: "stripe_webhook:subscription",
    }
    const results = await Promise.all([
      completeReferralForPurchase(input),
      completeReferralForPurchase(input),
    ])

    expect(results.every(result => result.success && result.status === "completed")).toBe(true)
    expect(mockGrantReferencedBonusCredits).toHaveBeenCalledTimes(2)
    expect(mockGrantReferencedBonusCredits.mock.calls[0][0]).toEqual(
      mockGrantReferencedBonusCredits.mock.calls[1][0]
    )
    expect(mockGrantReferencedBonusCredits.mock.calls[0][0]).toMatchObject({
      paymentReference: "referral:91",
      grantPurpose: "first_purchase_referrer_reward",
    })
  })

  it("only treats positive payment amounts as referral-eligible purchases", async () => {
    const { isReferralPurchaseEligible } = await import("@/lib/referrals/service")

    expect(isReferralPurchaseEligible(1700)).toBe(true)
    expect(isReferralPurchaseEligible(0)).toBe(false)
    expect(isReferralPurchaseEligible(null)).toBe(false)
  })

  it("only treats very recent accounts as eligible for signup-time referral tracking", async () => {
    const now = new Date("2026-03-12T12:00:00.000Z")
    const { isReferralSignupEligible } = await import("@/lib/referrals/service")

    expect(isReferralSignupEligible("2026-03-12T11:57:30.000Z", now)).toBe(true)
    expect(isReferralSignupEligible("2026-03-12T11:40:00.000Z", now)).toBe(false)
    expect(isReferralSignupEligible("not-a-date", now)).toBe(false)
  })
})

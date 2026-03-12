import { beforeEach, describe, expect, it, vi } from "vitest"

const mockSql = vi.fn()
const mockAddCredits = vi.fn()

vi.mock("@/lib/db/client", () => ({
  sql: mockSql,
}))

vi.mock("@/lib/credits", () => ({
  addCredits: mockAddCredits,
}))

describe("referral service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.REFERRAL_BONUSES_ENABLED
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
      "Welcome reward for signing up with referral",
    )

    expect(mockSql).toHaveBeenCalledWith(
      expect.arrayContaining(["\n      INSERT INTO referrals (referrer_id, referred_id, referral_code, status)\n      VALUES (", ", ", ", ", ", 'pending')\n      RETURNING id\n    "]),
      "referrer-1",
      "referred-1",
      buildReferralEventCode("ABC123", "referred-1"),
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
    mockAddCredits.mockResolvedValue({ success: true, newBalance: 50 })

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

    expect(mockAddCredits).toHaveBeenCalledWith(
      "referrer-2",
      50,
      "bonus",
      "Referral reward for referred user's first paid purchase",
    )
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

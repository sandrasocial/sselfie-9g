// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

type Query = { text: string; values: unknown[] }

const db = vi.hoisted(() => {
  const balances = new Map<string, number>()
  const ledger: Array<{
    userId: string
    transactionType: string
    paymentReference: string
    purpose: string
    isTestMode: boolean
    description: string
    balanceAfter: number
  }> = []
  const lockTails = new Map<string, Promise<void>>()
  let failNextGrant = false

  const transaction = vi.fn(async (build: (tx: any) => Query[]) => {
    const tx = (strings: TemplateStringsArray, ...values: unknown[]): Query => ({
      text: strings.join("?"),
      values,
    })
    const [lockQuery, grantQuery] = build(tx)
    const lockKey = String(lockQuery.values[0])
    const previous = lockTails.get(lockKey) || Promise.resolve()
    let release!: () => void
    const own = new Promise<void>(resolve => {
      release = resolve
    })
    lockTails.set(
      lockKey,
      previous.then(() => own)
    )
    await previous

    try {
      // Value positions pin the identity used by the production SQL. Yield once so concurrent
      // callers actually contend on the same advisory-lock key in this fixture.
      await Promise.resolve()
      const userId = String(grantQuery.values[0])
      const transactionType = String(grantQuery.values[1])
      const paymentReference = String(grantQuery.values[2])
      const isTestMode = grantQuery.values[3] === true
      const purpose = String(grantQuery.values[4])
      const description = String(grantQuery.values[5])
      const amount = Number(grantQuery.values[7])
      const existing = ledger.find(
        row =>
          row.userId === userId &&
          row.transactionType === transactionType &&
          row.paymentReference === paymentReference &&
          row.isTestMode === isTestMode &&
          (row.purpose === purpose || (!row.purpose && row.description === description))
      )

      if (existing) {
        return [[], [{ balance: existing.balanceAfter, granted: false }]]
      }

      if (failNextGrant) {
        failNextGrant = false
        throw new Error("simulated transaction rollback")
      }

      const balance = (balances.get(userId) || 0) + amount
      balances.set(userId, balance)
      ledger.push({
        userId,
        transactionType,
        paymentReference,
        purpose,
        isTestMode,
        description,
        balanceAfter: balance,
      })
      return [[], [{ balance, granted: true }]]
    } finally {
      release()
    }
  })

  const sql = Object.assign(vi.fn(), { transaction })
  return {
    balances,
    ledger,
    lockTails,
    sql,
    transaction,
    failNextGrant: () => {
      failNextGrant = true
    },
  }
})

vi.mock("@/lib/db/client", () => ({ sql: db.sql }))
vi.mock("@/lib/subscription", () => ({
  shouldEnforceLiveSubscriptionRows: vi.fn(() => false),
}))
vi.mock("@/lib/credits-cached", () => ({
  invalidateCreditCache: vi.fn().mockResolvedValue(undefined),
}))

describe("referenced purchase credit grant runtime contract", () => {
  beforeEach(() => {
    db.balances.clear()
    db.ledger.splice(0)
    db.lockTails.clear()
    vi.clearAllMocks()
  })

  it("returns granted:false without a second delta on sequential replay", async () => {
    const { grantReferencedPurchaseCredits } = await import("@/lib/credits")
    const input = {
      userId: "user-1",
      amount: 10,
      description: "Ten credits",
      paymentReference: "pi_1",
      grantPurpose: "credits_topup_10",
      isTestMode: false,
    }

    await expect(grantReferencedPurchaseCredits(input)).resolves.toMatchObject({
      success: true,
      granted: true,
      newBalance: 10,
    })
    await expect(grantReferencedPurchaseCredits(input)).resolves.toMatchObject({
      success: true,
      granted: false,
      newBalance: 10,
    })
    expect(db.balances.get("user-1")).toBe(10)
    expect(db.ledger).toHaveLength(1)
  })

  it("serializes concurrent replay to one wallet delta and ledger row", async () => {
    const { grantReferencedPurchaseCredits } = await import("@/lib/credits")
    const input = {
      userId: "user-2",
      amount: 15,
      description: "Transform starter",
      paymentReference: "pi_2",
      grantPurpose: "transform_starter",
      isTestMode: false,
    }

    const results = await Promise.all([
      grantReferencedPurchaseCredits(input),
      grantReferencedPurchaseCredits(input),
    ])

    expect(results.map(result => result.granted).sort()).toEqual([false, true])
    expect(db.balances.get("user-2")).toBe(15)
    expect(db.ledger).toHaveLength(1)
  })

  it("allows distinct live purposes and references to grant independently", async () => {
    const { grantReferencedPurchaseCredits } = await import("@/lib/credits")
    const base = {
      userId: "user-3",
      amount: 5,
      description: "Purchase credits",
      paymentReference: "pi_3",
      grantPurpose: "purpose-a",
      isTestMode: false,
    }

    const results = await Promise.all([
      grantReferencedPurchaseCredits(base),
      grantReferencedPurchaseCredits({ ...base, grantPurpose: "purpose-b" }),
      grantReferencedPurchaseCredits({ ...base, paymentReference: "pi_4" }),
    ])

    expect(results.every(result => result.success && result.granted)).toBe(true)
    expect(db.balances.get("user-3")).toBe(15)
    expect(db.ledger).toHaveLength(3)
  })

  it("rejects test-mode grants before opening a wallet transaction", async () => {
    const { grantReferencedPurchaseCredits } = await import("@/lib/credits")

    await expect(
      grantReferencedPurchaseCredits({
        userId: "user-test",
        amount: 5,
        description: "Test-mode purchase",
        paymentReference: "pi_test",
        grantPurpose: "credit_topup",
        isTestMode: true,
      })
    ).resolves.toMatchObject({ success: false, granted: false })

    expect(db.transaction).not.toHaveBeenCalled()
    expect(db.balances.has("user-test")).toBe(false)
    expect(db.ledger).toHaveLength(0)
  })

  it("serializes a referenced bonus and keeps distinct purposes independent", async () => {
    const { grantReferencedBonusCredits } = await import("@/lib/credits")
    const base = {
      userId: "user-bonus",
      amount: 4,
      description: "Membership checkout bonus",
      paymentReference: "in_bonus_1",
      grantPurpose: "membership_checkout_bonus",
      isTestMode: false,
    }

    const replay = await Promise.all([
      grantReferencedBonusCredits(base),
      grantReferencedBonusCredits(base),
    ])
    expect(replay.map(result => result.granted).sort()).toEqual([false, true])

    await expect(
      grantReferencedBonusCredits({ ...base, grantPurpose: "referral:42" })
    ).resolves.toMatchObject({ success: true, granted: true })
    expect(db.balances.get("user-bonus")).toBe(8)
    expect(db.ledger).toHaveLength(2)
    expect(db.ledger.every(row => row.transactionType === "bonus")).toBe(true)
  })

  it("rejects test bonuses and rolls back wallet plus ledger on transaction failure", async () => {
    const { grantReferencedBonusCredits } = await import("@/lib/credits")
    const input = {
      userId: "user-bonus-failure",
      amount: 4,
      description: "Membership checkout bonus",
      paymentReference: "in_bonus_failure",
      grantPurpose: "membership_checkout_bonus",
      isTestMode: false,
    }

    await expect(
      grantReferencedBonusCredits({ ...input, isTestMode: true })
    ).resolves.toMatchObject({ success: false, granted: false })
    expect(db.transaction).not.toHaveBeenCalled()

    db.failNextGrant()
    await expect(grantReferencedBonusCredits(input)).resolves.toMatchObject({
      success: false,
      granted: false,
    })
    expect(db.balances.has("user-bonus-failure")).toBe(false)
    expect(db.ledger).toHaveLength(0)
  })
})

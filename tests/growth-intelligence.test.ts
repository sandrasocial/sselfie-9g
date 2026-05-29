import { describe, expect, it } from "vitest"
import { evaluateGrowthPriorities, formatMoney, formatPercent } from "@/lib/admin/growth-intelligence-evaluator"

describe("growth intelligence evaluator", () => {
  it("prioritizes traffic when volume is too low", () => {
    const priorities = evaluateGrowthPriorities({
      vaultVisits: 42,
      freeToVaultClicks: 3,
      checkoutStarts: 2,
      purchases: 1,
      promptCopies: 0,
      buyers: 1,
      flaggedIgConversations: 0,
      igGrowthSignals: 0,
    })

    expect(priorities[0]).toMatchObject({
      label: "Traffic flow",
      status: "urgent",
    })
    expect(priorities.some((priority) => priority.label === "Product activation")).toBe(true)
  })

  it("recognizes healthy checkout and product activation", () => {
    const priorities = evaluateGrowthPriorities({
      vaultVisits: 240,
      freeToVaultClicks: 48,
      checkoutStarts: 30,
      purchases: 6,
      promptCopies: 18,
      buyers: 6,
      flaggedIgConversations: 4,
      igGrowthSignals: 5,
    })

    expect(priorities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Vault bridge", status: "good" }),
        expect.objectContaining({ label: "Checkout conversion", status: "good" }),
        expect.objectContaining({ label: "Product activation", status: "good" }),
        expect.objectContaining({ label: "Audience intelligence", status: "good" }),
      ]),
    )
  })

  it("formats report numbers for admin display", () => {
    expect(formatPercent(3, 12)).toBe("25%")
    expect(formatPercent(3, 0)).toBe("0%")
    expect(formatMoney(2700)).toBe("$27")
  })
})

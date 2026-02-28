import { describe, expect, it } from "vitest"

import { shouldDeductMayaChatCredit } from "@/lib/maya/chat-credit-policy"

describe("maya chat credit policy", () => {
  it("skips deduction for admin users", () => {
    expect(
      shouldDeductMayaChatCredit({
        isPromptBuilder: false,
        isAdmin: true,
        isStudioProMode: false,
      }),
    ).toBe(false)
  })

  it("skips deduction for prompt builder mode", () => {
    expect(
      shouldDeductMayaChatCredit({
        isPromptBuilder: true,
        isAdmin: false,
        isStudioProMode: false,
      }),
    ).toBe(false)
  })

  it("skips deduction in studio pro mode to preserve first-generation credit path", () => {
    expect(
      shouldDeductMayaChatCredit({
        isPromptBuilder: false,
        isAdmin: false,
        isStudioProMode: true,
      }),
    ).toBe(false)
  })

  it("deducts for normal classic/feed chat", () => {
    expect(
      shouldDeductMayaChatCredit({
        isPromptBuilder: false,
        isAdmin: false,
        isStudioProMode: false,
      }),
    ).toBe(true)
  })
})

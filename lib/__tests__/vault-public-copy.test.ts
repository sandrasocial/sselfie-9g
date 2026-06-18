import { describe, expect, it } from "vitest"

import { derivePublicVaultWhenToUse, isInternalVaultUseCopy } from "@/lib/vault/public-copy"

describe("public Vault copy", () => {
  it("replaces Shoot Studio internal publishing guidance before it reaches members", () => {
    const copy = derivePublicVaultWhenToUse({
      title: "Coastal Calm · Arrival",
      mood: "coastal calm · full-body · morning light",
      whenToUse:
        "Full-body establishing shot. Use this for PROMPT MY SELFIE or Summer Brand Shoot series. Caption: 'I took a selfie in my bathroom and now I am on a boat.' Works for reels showing the before-after transformation.",
    })

    expect(copy).toContain("opening image")
    expect(copy).not.toMatch(/PROMPT MY SELFIE|Caption:|before-after|Works for/i)
  })

  it("keeps already member-safe descriptions intact", () => {
    const copy = "Use this when you want a quiet portrait moment with more focus on styling."

    expect(derivePublicVaultWhenToUse({ title: "Quiet City · Portrait", whenToUse: copy })).toBe(copy)
    expect(isInternalVaultUseCopy(copy)).toBe(false)
  })

  it("derives a detail-shot description when the old copy is unsafe", () => {
    const copy = derivePublicVaultWhenToUse({
      title: "Marble Café · Table Detail",
      mood: "marble table · coffee · accessories · detail",
      whenToUse: "Caption: use this as the carousel break slide.",
    })

    expect(copy).toContain("detail image")
    expect(copy).toContain("texture")
  })
})

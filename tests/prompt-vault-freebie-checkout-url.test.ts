// @vitest-environment node

import { describe, expect, it } from "vitest"

import { buildPromptVaultFreebieCheckoutHref } from "@/lib/revenue-engine/prompt-vault-freebie-checkout-url"

describe("buildPromptVaultFreebieCheckoutHref", () => {
  it("carries the freebie access token into Prompt Vault checkout", () => {
    const href = buildPromptVaultFreebieCheckoutHref({
      promptId: "dark-feminine-cafe-shot-1",
      accessToken: " freebie_token_123 ",
    })
    const url = new URL(href, "https://www.sselfie.ai")

    expect(url.pathname).toBe("/checkout/prompt-vault")
    expect(url.searchParams.get("utm_content")).toBe("shoot_dark-feminine-cafe-shot-1")
    expect(url.searchParams.get("cta_keyword")).toBe("full_shoot_after_free_prompt")
    expect(url.searchParams.get("freebie_token")).toBe("freebie_token_123")
  })

  it("does not add an empty token", () => {
    const href = buildPromptVaultFreebieCheckoutHref({
      promptId: "coastal-white-shot-1",
      accessToken: " ",
    })
    const url = new URL(href, "https://www.sselfie.ai")

    expect(url.searchParams.has("freebie_token")).toBe(false)
  })
})

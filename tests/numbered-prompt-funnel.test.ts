// @vitest-environment node

import fs from "node:fs"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  getHighestStaticPromptNumber,
  getStaticPromptByNumber,
  getStaticVaultPromptCards,
  normalizePromptNumber,
} from "@/lib/ai-prompts/prompt-data"
import { buildPromptPageVaultCheckoutHref } from "@/lib/ai-prompts/prompt-lookup"

describe("numbered prompt funnel", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("resolves stable static prompt numbers", () => {
    const prompt = getStaticPromptByNumber("014")

    expect(prompt?.card.number).toBe("14")
    expect(prompt?.card.id).toBe("marble-wine-shot-2")
    expect(prompt?.collectionName).toBe("Marble Café Wine Editorial")
    expect(getStaticVaultPromptCards().length).toBeGreaterThan(90)
    expect(getHighestStaticPromptNumber()).toBeGreaterThanOrEqual(104)
    expect(normalizePromptNumber("0014")).toBe("14")
  })

  it("builds a prompt-page Vault checkout link with prompt_n attribution", () => {
    const href = buildPromptPageVaultCheckoutHref({
      promptNumber: "14",
      promptId: "marble-wine-shot-2",
      promptTitle: "Marble Café · Wine Close-Up",
      freebieToken: "token_123",
    })
    const url = new URL(href, "https://www.sselfie.ai")

    expect(url.pathname).toBe("/checkout/prompt-vault")
    expect(url.searchParams.get("source")).toBe("prompt_page")
    expect(url.searchParams.get("cta_keyword")).toBe("14")
    expect(url.searchParams.get("prompt_n")).toBe("14")
    expect(url.searchParams.get("freebie_token")).toBe("token_123")
  })

  it("keeps the ManyChat prompt resolver behind the shared secret", () => {
    const route = fs.readFileSync(
      path.join(process.cwd(), "app/api/manychat/prompt/route.ts"),
      "utf8",
    )

    expect(route).toContain("MANYCHAT_BRIDGE_SECRET")
    expect(route).toContain("x-bridge-secret")
    expect(route).toContain("getPromptByNumber")
    expect(route).toContain("found: false")
  })

  it("renders the single prompt page through the shared prompt lookup", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/p/[number]/page.tsx"), "utf8")
    const gate = fs.readFileSync(
      path.join(process.cwd(), "components/ai-prompts/single-prompt-gate.tsx"),
      "utf8",
    )

    expect(page).toContain("getPromptByNumber")
    expect(page).toContain("getLiveVaultPromptCount")
    expect(gate).toContain("delivery_context: \"single_prompt\"")
    expect(gate).toContain("prompt_number: promptNumber")
    expect(gate).toContain("ai_prompts_prompt_copied")
  })
})

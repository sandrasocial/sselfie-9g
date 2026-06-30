// @vitest-environment node

import fs from "node:fs"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  extractPromptNumber,
  getHighestStaticPromptNumber,
  getStaticPromptByNumber,
  getStaticVaultPromptCards,
  normalizePromptNumber,
} from "@/lib/ai-prompts/prompt-data"
import {
  buildPromptPageVaultCheckoutHref,
  getCurrentFreePrompt,
} from "@/lib/ai-prompts/prompt-lookup"
import { GET as resolveManychatPrompt } from "@/app/api/manychat/prompt/route"

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

  it("extracts the prompt number from real-world comment text", () => {
    // numbered requests resolve to the matching number
    expect(extractPromptNumber("14")).toBe("14")
    expect(extractPromptNumber("prompt 14")).toBe("14")
    expect(extractPromptNumber("#14")).toBe("14")
    expect(extractPromptNumber("14!! 😍")).toBe("14")
    expect(extractPromptNumber("  014 ")).toBe("14")
    // generic / non-numeric requests safely yield no number (caller falls back)
    expect(extractPromptNumber("PROMPT")).toBeNull()
    expect(extractPromptNumber("fourteen")).toBeNull()
    expect(extractPromptNumber("0")).toBeNull()
    expect(extractPromptNumber("")).toBeNull()
    // strict normalizer is unchanged: messy text stays rejected there
    expect(normalizePromptNumber("prompt 14")).toBeNull()
    expect(normalizePromptNumber("14")).toBe("14")
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

  it("keeps generic PROMPT attribution separate from the prompt number", () => {
    const href = buildPromptPageVaultCheckoutHref({
      promptNumber: "14",
      promptId: "marble-wine-shot-2",
      promptTitle: "Marble Café · Wine Close-Up",
      attribution: {
        source: "prompt_latest",
        utm_campaign: "current_free_prompt",
        utm_content: "prompt_latest",
        checkout_source: "manychat_prompt_reply",
        cta_keyword: "PROMPT",
        buyer_stage: "lead",
      },
    })
    const url = new URL(href, "https://www.sselfie.ai")

    expect(url.searchParams.get("cta_keyword")).toBe("PROMPT")
    expect(url.searchParams.get("prompt_n")).toBe("14")
    expect(url.searchParams.get("utm_campaign")).toBe("current_free_prompt")
    expect(url.searchParams.get("checkout_source")).toBe("manychat_prompt_reply")
  })

  it("keeps the ManyChat prompt resolver behind the shared secret", () => {
    const route = fs.readFileSync(
      path.join(process.cwd(), "app/api/manychat/prompt/route.ts"),
      "utf8",
    )

    expect(route).toContain("MANYCHAT_BRIDGE_SECRET")
    expect(route).toContain("x-bridge-secret")
    expect(route).toContain("latest_five_free_prompts")
    expect(route).toContain("/ai-prompts")
    expect(route).toContain("fallback: true")
  })

  it("resolves a deterministic current free prompt for /p/latest and ManyChat fallback", async () => {
    vi.stubEnv("CURRENT_FREE_PROMPT_NUMBER", "14")

    const prompt = await getCurrentFreePrompt()

    expect(prompt?.number).toBe("14")
    expect(prompt?.card.id).toBe("marble-wine-shot-2")
  })

  it("lets ManyChat resolve PROMPT to the latest five free prompts page", async () => {
    vi.stubEnv("MANYCHAT_BRIDGE_SECRET", "test-secret")
    vi.stubEnv("CURRENT_FREE_PROMPT_NUMBER", "14")

    const response = await resolveManychatPrompt(
      new Request("https://www.sselfie.ai/api/manychat/prompt?n=14", {
        headers: { "x-bridge-secret": "test-secret" },
      }) as any,
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.found).toBe(false)
    expect(json.fallback).toBe(true)
    expect(json.mode).toBe("latest_five_free_prompts")
    expect(json.number).toBeNull()
    expect(json.pageUrl).toContain("https://www.sselfie.ai/ai-prompts?")
    expect(json.pageUrl).toContain("cta_keyword=PROMPT")
    expect(json.pageUrl).toContain("utm_campaign=latest_five_free_prompts")
    expect(json.vaultCheckoutUrl).toContain("cta_keyword=PROMPT")
    expect(json.vaultCheckoutUrl).not.toContain("prompt_n=14")
    expect(json.dm.proofLine).toContain("newest free shoot previews")
    expect(json.dm.followupHours).toEqual([24, 48])
    expect(json.manychatTags).toEqual(expect.arrayContaining(["prompt-requester", "prompt-latest-five"]))
    expect(json.fallbackMessage).toContain("Numbered ManyChat keywords are intentionally retired")
  })

  it("renders the single prompt page through the shared prompt lookup", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/p/[username]/page.tsx"), "utf8")
    const latestPage = fs.readFileSync(path.join(process.cwd(), "app/p/latest/page.tsx"), "utf8")
    const gate = fs.readFileSync(
      path.join(process.cwd(), "components/ai-prompts/single-prompt-gate.tsx"),
      "utf8",
    )
    const subscribeRoute = fs.readFileSync(
      path.join(process.cwd(), "app/api/ai-prompts/subscribe/route.ts"),
      "utf8",
    )
    const singlePromptEmail = fs.readFileSync(
      path.join(process.cwd(), "lib/email/templates/ai-prompts-single-prompt-delivery.ts"),
      "utf8",
    )
    const adminPage = fs.readFileSync(path.join(process.cwd(), "app/admin/prompt-vault/page.tsx"), "utf8")

    expect(page).toContain("getPromptByNumber")
    expect(page).toContain("getLiveVaultPromptCount")
    expect(latestPage).toContain("getCurrentFreePrompt")
    expect(latestPage).toContain("cta_keyword")
    expect(latestPage).toContain("PROMPT")
    expect(gate).toContain("delivery_context: \"single_prompt\"")
    expect(gate).toContain("prompt_number: promptNumber")
    expect(gate).toContain("PROMPT_INTENT_OPTIONS")
    expect(gate).toContain("prompt_checkout_url")
    expect(gate).toContain("quiz_result: promptIntent")
    expect(gate).toContain("appendIntentToHref")
    expect(gate).toContain("If this one gets close, the Vault is the shortcut")
    expect(gate).toContain("ai_prompts_prompt_copied")
    expect(gate).toContain("ai_prompts_after_copy_vault_cta_view")
    expect(gate).toContain("Get the full Vault")
    expect(gate).toContain("...readAttributionParams(promptNumber)")
    expect(subscribeRoute).toContain("cta_keyword: safeAttribution(cta_keyword")
    expect(subscribeRoute).toContain("entry_post_slug: safeAttribution(entry_post_slug")
    expect(subscribeRoute).toContain("prompt-intent-")
    expect(subscribeRoute).toContain("prompt_intent: promptIntent")
    expect(singlePromptEmail).toContain("promptCheckoutUrl")
    expect(singlePromptEmail).toContain("the Vault is the next step")
    expect(singlePromptEmail).toContain("Get the full Vault")
    expect(adminPage).toContain("PROMPT DEMAND BY LINK")
    expect(adminPage).toContain("promptFunnelRows")
    expect(adminPage).toContain("NULLIF(prompt_number, '') AS prompt_number")
  })

  it("keeps the free prompt preview image crisp on mobile before email reveal", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/p/[username]/page.tsx"), "utf8")

    expect(page).toContain(".sp-image-locked")
    expect(page).not.toMatch(/\.sp-image-locked\s*{[^}]*blur\(/s)
  })
})

import { describe, expect, it } from "vitest"

import {
  buildCheckoutEmailCaptureHiddenParams,
  buildSkipCheckoutEmailCaptureHref,
  hasSocialDmCheckoutSignal,
  shouldShowPromptVaultCheckoutEmailCapture,
} from "@/lib/revenue-engine/anonymous-checkout-capture"

describe("anonymous checkout email capture", () => {
  it("detects social DM checkout traffic", () => {
    expect(
      hasSocialDmCheckoutSignal({
        source: "instagram_manychat",
        utm_medium: "manychat",
      }),
    ).toBe(true)

    expect(
      hasSocialDmCheckoutSignal({
        source: "prompt_vault_landing",
        utm_medium: "email",
      }),
    ).toBe(false)
  })

  it("shows the Prompt Vault email capture only for anonymous unrecoverable social traffic", () => {
    const params = {
      source: "instagram_manychat",
      utm_medium: "manychat",
      checkout_source: "instagram_dm",
    }

    expect(
      shouldShowPromptVaultCheckoutEmailCapture({
        params,
        hasRecoverableEmail: false,
        hasAuthUser: false,
        hasFreebieToken: false,
      }),
    ).toBe(true)

    expect(
      shouldShowPromptVaultCheckoutEmailCapture({
        params,
        hasRecoverableEmail: true,
        hasAuthUser: false,
        hasFreebieToken: false,
      }),
    ).toBe(false)
  })

  it("preserves attribution through the capture form and skip link", () => {
    const params = {
      source: "instagram_manychat",
      utm_source: "instagram",
      utm_medium: "manychat",
      utm_campaign: "vault_keyword",
      cta_keyword: "VAULT",
    }

    expect(buildCheckoutEmailCaptureHiddenParams(params)).toEqual(
      expect.arrayContaining([
        { name: "source", value: "instagram_manychat" },
        { name: "utm_medium", value: "manychat" },
        { name: "cta_keyword", value: "VAULT" },
      ]),
    )

    const skipHref = buildSkipCheckoutEmailCaptureHref("/checkout/prompt-vault", params)
    const url = new URL(skipHref, "https://www.sselfie.ai")
    expect(url.pathname).toBe("/checkout/prompt-vault")
    expect(url.searchParams.get("skip_email_capture")).toBe("1")
    expect(url.searchParams.get("utm_campaign")).toBe("vault_keyword")
  })
})

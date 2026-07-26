import { describe, expect, it } from "vitest"

import { isValidRedirectPath, normalizeLegacyStudioRedirect, sanitizeRedirect } from "@/lib/security/url-validator"

describe("redirect URL validator", () => {
  it("allows the live member app redirect path", () => {
    expect(isValidRedirectPath("/app")).toBe(true)
    expect(isValidRedirectPath("/app?tab=academy")).toBe(true)
    expect(sanitizeRedirect("/app", "/studio")).toBe("/app")
  })

  it("allows customers to return to Prompt Vault after password recovery", () => {
    expect(isValidRedirectPath("/prompt-vault")).toBe(true)
    expect(sanitizeRedirect("/prompt-vault", "/app")).toBe("/prompt-vault")
  })

  it("blocks unsafe external redirects", () => {
    expect(isValidRedirectPath("//evil.example")).toBe(false)
    expect(isValidRedirectPath("https://evil.example/app")).toBe(false)
    expect(sanitizeRedirect("//evil.example", "/studio")).toBe("/studio")
  })

  it("normalizes ordinary legacy studio redirects into app v3", () => {
    expect(normalizeLegacyStudioRedirect("/studio")).toBe("/app")
    expect(normalizeLegacyStudioRedirect("/studio?tab=gallery")).toBe("/app?view=photos")
    expect(normalizeLegacyStudioRedirect("/studio?tab=academy")).toBe("/app?view=library")
    expect(normalizeLegacyStudioRedirect("/studio?legacy=1")).toBe("/studio?legacy=1")
  })
})

import { describe, expect, it } from "vitest"

import { isValidRedirectPath, sanitizeRedirect } from "@/lib/security/url-validator"

describe("redirect URL validator", () => {
  it("allows the live member app redirect path", () => {
    expect(isValidRedirectPath("/app")).toBe(true)
    expect(isValidRedirectPath("/app?tab=academy")).toBe(true)
    expect(sanitizeRedirect("/app", "/studio")).toBe("/app")
  })

  it("blocks unsafe external redirects", () => {
    expect(isValidRedirectPath("//evil.example")).toBe(false)
    expect(isValidRedirectPath("https://evil.example/app")).toBe(false)
    expect(sanitizeRedirect("//evil.example", "/studio")).toBe("/studio")
  })
})

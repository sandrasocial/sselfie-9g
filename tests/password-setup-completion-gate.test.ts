// @vitest-environment node
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("password setup completion security gate", () => {
  it("does not redirect into the app when the durable completion marker fails", () => {
    const source = readFileSync("app/auth/setup-password/page.tsx", "utf8")
    const completionFetch = source.indexOf('fetch("/api/auth/password-setup-complete"')
    const failureGuard = source.indexOf("if (!completionResponse.ok)", completionFetch)
    const mandatoryThrow = source.indexOf("throw new Error(", failureGuard)
    const redirect = source.indexOf("router.push(nextAfterSetup)", completionFetch)

    expect(completionFetch).toBeGreaterThan(-1)
    expect(failureGuard).toBeGreaterThan(completionFetch)
    expect(mandatoryThrow).toBeGreaterThan(failureGuard)
    expect(redirect).toBeGreaterThan(mandatoryThrow)
    expect(source.slice(failureGuard, redirect)).not.toContain(
      "Password saved but account setup status could not be updated",
    )
  })
})

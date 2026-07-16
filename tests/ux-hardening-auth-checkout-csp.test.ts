// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

describe("post-phase4 ux hardening", () => {
  it("preserves returnTo when navigating between auth login and sign-up", () => {
    const loginPage = readFile("app/auth/login/page.tsx")
    const signUpPage = readFile("app/auth/sign-up/page.tsx")

    expect(loginPage).toContain("buildReferralSignUpHref")
    expect(loginPage).toContain("LIVE_MEMBER_APP_PATH")
    expect(loginPage).toContain("normalizeLegacyStudioRedirect")
    expect(signUpPage).toContain("buildReferralLoginHref")
  })

  it("routes legacy checkout-upgrade to membership checkout", () => {
    const checkoutUpgradePage = readFile("app/checkout-upgrade/page.tsx")

    expect(checkoutUpgradePage).toContain('redirect(`/checkout/membership${query}`)')
  })

  it("allows google fonts in CSP style/font directives", () => {
    const middleware = readFile("middleware.ts")

    expect(middleware).toContain("https://fonts.googleapis.com")
    expect(middleware).toContain("https://fonts.gstatic.com")
  })

  it("allows Vercel Blob client uploads in CSP connect-src", () => {
    const middleware = readFile("middleware.ts")

    expect(middleware).toContain("https://vercel.com")
    expect(middleware).toContain("https://blob.vercel-storage.com")
    expect(middleware).toContain("https://*.blob.vercel-storage.com")
  })

  it("allows Sentry Replay to start its compression worker", () => {
    const middleware = readFile("middleware.ts")

    expect(middleware).toContain("worker-src 'self' blob:")
  })
})

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("post-purchase account setup flow", () => {
  it("success page redirects directly to product after signInWithPassword (not window.reload)", () => {
    const successContent = readFileSync("components/checkout/success-content.tsx", "utf8")

    // After successful signIn, redirect directly to product — no full page reload
    expect(successContent).toContain("router.push(successAction.href)")
    expect(successContent).not.toMatch(/signInWithPassword[\s\S]{0,200}window\.location\.reload/)
  })

  it("success page CTA for unauthenticated buyer with existing account sends to login with returnTo", () => {
    const successContent = readFileSync("components/checkout/success-content.tsx", "utf8")

    // When hasAccount=true but !isAuthenticated, CTA must route to login with redirect param
    expect(successContent).toContain("!isAuthenticated && userInfo?.hasAccount")
    expect(successContent).toContain("/auth/login?returnTo=")
    expect(successContent).toContain("encodeURIComponent(successAction.href)")
    expect(successContent).toContain("Log in to open your products")
  })

  it("success page account creation form has product-specific copy for visibility_suite", () => {
    const successContent = readFileSync("components/checkout/success-content.tsx", "utf8")

    // Form description must be product-aware — not generic for visibility_suite
    expect(successContent).toContain('resolvedProductType === "visibility_suite"')
    expect(successContent).toContain("your Visibility To Paid Suite")
    expect(successContent).toContain("CREATE PASSWORD AND OPEN MY SUITE")
  })

  it("webhook generates password setup link with product-specific returnTo for visibility_suite", () => {
    const webhook = readFileSync("app/api/webhooks/stripe/route.ts", "utf8")

    // Setup link must include ?next=/academy/access/visibility-suite
    expect(webhook).toContain("/academy/access/visibility-suite")
    expect(webhook).toContain("productSetupNext")
    expect(webhook).toContain("setup-password?next=")
  })

  it("webhook includes password setup CTA in visibility_suite delivery email for new users", () => {
    const webhook = readFileSync("app/api/webhooks/stripe/route.ts", "utf8")

    // New-user email must include a setup link, not just a direct product link
    expect(webhook).toContain("isNewUserForEmail")
    expect(webhook).toContain("purchasePasswordSetupLink")
    expect(webhook).toContain("Create password and open your Suite")
    expect(webhook).toContain("suiteAccessCtaHtml")
    expect(webhook).toContain("suiteAccessCtaText")
  })

  it("webhook tracks isNewUserForEmail in outer scope so delivery email can use it", () => {
    const webhook = readFileSync("app/api/webhooks/stripe/route.ts", "utf8")

    // Variables must be declared before the user-creation if block
    // We assert they appear before the academy product delivery block
    const newUserIdx = webhook.indexOf("let isNewUserForEmail = false")
    const deliveryEmailIdx = webhook.indexOf("suiteAccessCtaHtml")
    expect(newUserIdx).toBeGreaterThan(0)
    expect(deliveryEmailIdx).toBeGreaterThan(0)
    expect(newUserIdx).toBeLessThan(deliveryEmailIdx)
  })

  it("returning users (existing account) get direct product link in email, not setup link", () => {
    const webhook = readFileSync("app/api/webhooks/stripe/route.ts", "utf8")

    // The setup CTA is conditional on isNewUserForEmail — returning users are unaffected
    expect(webhook).toContain("isNewUserForEmail && purchasePasswordSetupLink")
    // Direct link still exists as fallback for returning users
    expect(webhook).toContain("Open your Visibility To Paid Path")
  })

  it("setup password page requires active Supabase session — no unauthenticated access", () => {
    const setupPage = readFileSync("app/auth/setup-password/page.tsx", "utf8")

    // Page must gate on supabase.auth.getUser() and reject unauthenticated requests
    expect(setupPage).toContain("supabase.auth.getUser()")
    expect(setupPage).toContain("Please use the link from your email")
    // Password is set via supabase.auth.updateUser — not a direct DB write
    expect(setupPage).toContain("supabase.auth.updateUser")
    expect(setupPage).not.toContain("fetch(\"/api/complete-account\"")
  })

  it("setup password page reads ?next param and redirects to it after success", () => {
    const setupPage = readFileSync("app/auth/setup-password/page.tsx", "utf8")

    expect(setupPage).toContain('searchParams.get("next")')
    expect(setupPage).toContain("sanitizeRedirect")
    expect(setupPage).toContain("router.push(nextAfterSetup)")
  })

  it("academy access page requires authentication via requireAcademyPageUser", () => {
    const visibilitySuitePage = readFileSync("app/academy/access/visibility-suite/page.tsx", "utf8")

    expect(visibilitySuitePage).toContain("requireAcademyPageUser")
  })

  it("requireAcademyPageUser redirects to /auth/login (not a generic error) when unauthenticated", () => {
    const courseLibrary = readFileSync("app/academy/_lib/course-library.ts", "utf8")

    // Must redirect to /auth/login, not a generic 401 or error page
    expect(courseLibrary).toContain("/auth/login?redirect=")
    // Must also verify Neon user exists (not just Supabase auth)
    expect(courseLibrary).toContain("getUserByAuthId")
  })

  it("complete-account API sets password via Supabase admin and marks password_setup_complete", () => {
    const completeAccount = readFileSync("app/api/complete-account/route.ts", "utf8")

    // Must set password via admin API — not client-side, not a plain DB update
    expect(completeAccount).toContain("admin.updateUserById")
    expect(completeAccount).toContain("password_setup_complete = TRUE")
    // Must confirm email so buyer can log in immediately
    expect(completeAccount).toContain("email_confirm: true")
  })

  it("success page account creation is gated on userInfo.hasAccount being false", () => {
    const successContent = readFileSync("components/checkout/success-content.tsx", "utf8")

    // Form only shown when hasAccount=false AND not already authenticated
    expect(successContent).toContain("userInfo && !userInfo.hasAccount && !isAuthenticated")
  })

  it("starter_kit and masterclass have product-specific next paths in webhook setup link", () => {
    const webhook = readFileSync("app/api/webhooks/stripe/route.ts", "utf8")

    expect(webhook).toContain("/academy/access/starter-kit")
    expect(webhook).toContain("/academy/access/brand-strategy")
    // productSetupNext must cover all major products
    expect(webhook).toContain('productType === "starter_kit" ? "/academy/access/starter-kit"')
    expect(webhook).toContain('productType === "masterclass" ? "/academy/access/brand-strategy"')
  })
})

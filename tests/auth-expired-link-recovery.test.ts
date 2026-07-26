import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { generatePromptVaultDeliveryEmail } from "@/lib/email/templates/prompt-vault-delivery"

describe("expired purchase password link recovery", () => {
  it("keeps Prompt Vault buyers out of the password recovery loop", () => {
    const errorPage = readFileSync("app/auth/error/page.tsx", "utf8")

    expect(errorPage).toContain("Your purchase is safe.")
    expect(errorPage).toContain("/auth/forgot-password?next=")
    expect(errorPage).toContain('href="/access"')
    expect(errorPage).toContain('safeNext === "/prompt-vault"')
    expect(errorPage).toContain("Prompt Vault does not need a password.")
    expect(errorPage).not.toContain("Error: {params.error}")
  })

  it("sends SUITE recovery links directly to the password page", () => {
    const forgotPasswordPage = readFileSync("app/auth/forgot-password/page.tsx", "utf8")

    expect(forgotPasswordPage).toContain('searchParams.get("next")')
    expect(forgotPasswordPage).toContain("sanitizeRedirect")
    expect(forgotPasswordPage).toContain(
      "/auth/setup-password?next=${encodeURIComponent(nextAfterReset)}"
    )
    expect(forgotPasswordPage).not.toContain("/auth/callback?next=")
  })

  it("delivers Prompt Vault with one direct action and no password setup", () => {
    const template = readFileSync("lib/email/templates/prompt-vault-delivery.ts", "utf8")

    expect(template).toContain('renderStoneButton("Open Your Prompt Vault"')
    expect(template).toContain("No login needed.")
    expect(template).not.toContain('renderStoneButton("Set Your Password"')
    expect(template).not.toContain("Set your password:")

    const rendered = generatePromptVaultDeliveryEmail({
      firstName: "Customer",
      accessUrl: "https://sselfie.ai/access/prompt-vault/private-access",
      passwordSetupUrl: "https://sselfie.ai/auth/setup-password?secret=must-not-leak",
    })

    expect(rendered.html).toContain("No login needed.")
    expect(rendered.text).toContain("No login needed.")
    expect(rendered.html).not.toContain("must-not-leak")
    expect(rendered.text).not.toContain("must-not-leak")
  })

  it("does not show Prompt Vault buyers the checkout password form", () => {
    const successContent = readFileSync("components/checkout/success-content.tsx", "utf8")

    expect(successContent).toContain(
      "userInfo && !userInfo.hasAccount && !isAuthenticated && !isPromptVaultPurchase"
    )
  })

  it("sends malformed or expired callback requests to recovery instead of the homepage", () => {
    const callback = readFileSync("app/auth/callback/route.ts", "utf8")

    expect(callback).toContain('new URL("/auth/error", origin)')
    expect(callback).toContain('errorUrl.searchParams.set("next", safeNext)')
    expect(callback).not.toContain('No code provided in callback, redirecting to home')
    expect(callback).not.toContain('return NextResponse.redirect(`${origin}/`)')
  })

  it("waits for the browser recovery session and records completed password setup", () => {
    const setupPage = readFileSync("app/auth/setup-password/page.tsx", "utf8")

    expect(setupPage).toContain("supabase.auth.onAuthStateChange")
    expect(setupPage).toContain('event === "PASSWORD_RECOVERY"')
    expect(setupPage).toContain('fetch("/api/auth/password-setup-complete"')
  })
})

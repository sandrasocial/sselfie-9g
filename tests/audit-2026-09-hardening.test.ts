// @vitest-environment node
//
// Regression coverage for the SSELFIE Systems Audit (commit 98d29b8) fixes.
// Each block below pins one behaviour that was actually wrong in production, so a future
// refactor cannot quietly restore it.

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

const repoFile = (relativePath: string) => resolve(process.cwd(), relativePath)
const source = (relativePath: string) => readFileSync(repoFile(relativePath), "utf8")

describe("audit: dead unauthenticated endpoints are gone", () => {
  // Every one of these answered the public internet with no auth check and had zero
  // callers anywhere in the app. instagram/analytics returned SELECT * from
  // instagram_connections, which includes the Meta access_token and refresh_token.
  const removed = [
    "app/api/instagram/analytics/route.ts",
    "app/api/instagram/test-graph-api/route.ts",
    "app/api/check-email-logs/route.ts",
    "app/api/test-purchase-email/route.ts",
    "app/api/images/favorites/route.ts",
    "app/api/images/status/route.ts",
    "app/api/webhooks/stripe/test/route.ts",
  ]

  it.each(removed)("%s no longer exists", path => {
    expect(existsSync(repoFile(path))).toBe(false)
  })
})

describe("audit: upload-image is authenticated and bounded", () => {
  const upload = source("app/api/upload-image/route.ts")

  it("requires an authenticated caller", () => {
    expect(upload).toContain("getAuthenticatedUser")
    expect(upload).toContain('{ error: "Unauthorized" }')
  })

  it("allow-lists image content types and caps the size", () => {
    expect(upload).toContain("ALLOWED_CONTENT_TYPES")
    expect(upload).toContain("MAX_BYTES")
    expect(upload).toMatch(/12 \* 1024 \* 1024/)
  })

  it("derives the blob key server-side instead of trusting the filename", () => {
    // `put(file.name, ...)` let a caller choose the public path on a SSELFIE URL.
    expect(upload).not.toMatch(/put\(\s*file\.name/)
    expect(upload).toMatch(/put\(`uploads\/\$\{user\.id\}/)
  })
})

describe("audit: middleware upload bypass is an allow-list", () => {
  const middleware = source("middleware.ts")

  it("no longer bypasses every path containing /upload", () => {
    expect(middleware).not.toContain('pathname.includes("/upload")')
    expect(middleware).toContain("RAW_BODY_UPLOAD_PATHS")
  })
})

describe("audit: Next redirect signals survive a catch", () => {
  it("recognises redirect and notFound digests, and nothing else", async () => {
    const { isNextControlFlowError } = await import("@/lib/next-redirect-error")

    expect(isNextControlFlowError({ digest: "NEXT_REDIRECT;replace;/vault-maya/studio" })).toBe(
      true
    )
    expect(isNextControlFlowError({ digest: "NEXT_NOT_FOUND" })).toBe(true)
    expect(isNextControlFlowError(new Error("connection terminated"))).toBe(false)
    expect(isNextControlFlowError({ digest: 500 })).toBe(false)
    expect(isNextControlFlowError(null)).toBe(false)
    expect(isNextControlFlowError(undefined)).toBe(false)
  })

  it("rethrows only control-flow signals", async () => {
    const { rethrowIfNextControlFlow } = await import("@/lib/next-redirect-error")
    const redirectSignal = { digest: "NEXT_REDIRECT;replace;/vault-maya/studio" }

    expect(() => rethrowIfNextControlFlow(redirectSignal)).toThrow()
    expect(() => rethrowIfNextControlFlow(new Error("db down"))).not.toThrow()
  })

  it("the /app gate rethrows instead of falling through to the limited shell", () => {
    // A Vault Maya member's redirect to her own studio was swallowed here, dropping her
    // into the limited shell with generation locked.
    const gate = source("app/app/page.tsx")
    expect(gate).toContain("rethrowIfNextControlFlow(e)")
    // A core entitlement failure must fail visibly rather than silently downgrade.
    expect(gate).toMatch(/rethrowIfNextControlFlow\(e\)[\s\S]{0,600}?throw e/)
  })
})

describe("audit: transactional email is not rate limited", () => {
  const sendEmail = source("lib/email/send-email.ts")

  it("gates the per-recipient limiter behind the marketing flag", () => {
    // 5 sends/hour/recipient applied to everything, so a password-setup email could be
    // dropped and logged failed behind a morning of marketing crons.
    const limiterCall = sendEmail.indexOf("await checkEmailRateLimit(recipient)")
    expect(limiterCall).toBeGreaterThan(-1)

    const precedingSource = sendEmail.slice(0, limiterCall)
    const enclosingGuard = precedingSource.lastIndexOf("if (options.marketing)")
    expect(enclosingGuard).toBeGreaterThan(-1)

    // The limiter sits inside a marketing-only branch, not at the top level.
    expect(sendEmail.slice(enclosingGuard, limiterCall)).not.toContain("\n  }\n")
  })

  it("still suppresses bounced and complained recipients on every send", () => {
    // Deliverability protection is separate from the frequency cap and must stay global.
    expect(sendEmail).toContain("await getRecipientSuppression(recipient)")
  })
})

describe("audit: invoice fulfillment persists the billing period before notifying", () => {
  const invoicePaid = source("lib/payments/lifecycle/invoice-paid.ts")

  it("updates current_period_end ahead of the renewal email", () => {
    // The renewal email throws so Stripe retries. With the period update behind it, an
    // email outage left a paying member on a stale current_period_end, which the access
    // policy reads as an expiring membership.
    const periodUpdate = invoicePaid.indexOf("Subscription period updated for")
    const renewalEmail = invoicePaid.indexOf("membership-credit-renewal:")

    expect(periodUpdate).toBeGreaterThan(-1)
    expect(renewalEmail).toBeGreaterThan(-1)
    expect(periodUpdate).toBeLessThan(renewalEmail)
  })
})

describe("audit: checkout fulfillment does not scan every auth account", () => {
  const checkout = source("lib/payments/lifecycle/checkout-session-completed.ts")

  it("resolves the buyer from the application database, not an auth-page scan", () => {
    // findAuthUserByEmail pages up to 100k auth users. Running it on every purchase was
    // O(all users) inside the webhook.
    expect(checkout).toContain("LOWER(email) = LOWER(${customerEmail})")
  })

  it("calls the exhaustive scan exactly once, on the create-conflict path", () => {
    const scanCalls = checkout.match(/await findAuthUserByEmail\(\{/g) ?? []
    expect(scanCalls).toHaveLength(1)

    // The single remaining call sits after createUser has already failed.
    const createUser = checkout.indexOf("supabaseAdmin.auth.admin.createUser(")
    const scan = checkout.indexOf("await findAuthUserByEmail({")
    expect(createUser).toBeGreaterThan(-1)
    expect(scan).toBeGreaterThan(createUser)
    expect(checkout).toContain("Recovered Supabase auth user")
  })
})

describe("audit: the Stripe webhook declares a duration budget", () => {
  it("sets maxDuration so fulfillment is not cut off mid-handler", () => {
    expect(source("app/api/webhooks/stripe/route.ts")).toMatch(
      /export const maxDuration = \d+/
    )
  })
})

describe("audit: photoshoot results are saved to the caller", () => {
  const route = source("app/api/maya/check-photoshoot-prediction/route.ts")

  it("ignores a client-supplied userId", () => {
    // Any authenticated member could write generated images into another member's gallery.
    expect(route).not.toContain('searchParams.get("userId")')
  })

  it("resolves the owner from the session", () => {
    expect(route).toContain("WHERE supabase_user_id = ${user.id}")
  })
})

describe("audit: Sentry does not ingest every log line in production", () => {
  const configs = [
    "sentry.server.config.ts",
    "sentry.client.config.ts",
    "sentry.edge.config.ts",
  ]

  it.each(configs)("%s samples traces and disables debug in production", path => {
    const config = source(path)
    expect(config).not.toContain("tracesSampleRate: 1,")
    expect(config).not.toContain("debug: true,")
    expect(config).toContain('process.env.NODE_ENV === "production" ? 0.1 : 1')
  })

  it("forwards only console.error, not every console.log", () => {
    // 1,797 console.log calls were shipped as Sentry logs, including customer emails and
    // full Stripe session metadata from the checkout webhook.
    for (const path of ["sentry.server.config.ts", "sentry.client.config.ts"]) {
      const config = source(path)
      if (!config.includes("consoleLoggingIntegration")) continue
      expect(config).toContain('levels: ["error"]')
      expect(config).not.toContain('"log"')
    }
  })
})

describe("audit: upload-image rejects unauthenticated callers at runtime", () => {
  const authMock = vi.fn()
  const putMock = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    authMock.mockReset()
    putMock.mockReset()
    vi.doMock("@/lib/auth-helper", () => ({ getAuthenticatedUser: authMock }))
    vi.doMock("@vercel/blob", () => ({ put: putMock }))
  })

  afterEach(() => {
    vi.doUnmock("@/lib/auth-helper")
    vi.doUnmock("@vercel/blob")
    vi.resetModules()
  })

  it("returns 401 and never touches blob storage without a session", async () => {
    authMock.mockResolvedValue({ user: null, error: null })

    const { POST } = await import("@/app/api/upload-image/route")
    const response = await POST(new Request("https://sselfie.ai/api/upload-image", {
      method: "POST",
    }))

    expect(response.status).toBe(401)
    expect(putMock).not.toHaveBeenCalled()
  })

  it("rejects a non-image upload from an authenticated caller", async () => {
    authMock.mockResolvedValue({ user: { id: "auth_user_1" }, error: null })

    const form = new FormData()
    form.append("file", new File(["#!/bin/sh\n"], "payload.sh", { type: "text/x-sh" }))

    const { POST } = await import("@/app/api/upload-image/route")
    const response = await POST(new Request("https://sselfie.ai/api/upload-image", {
      method: "POST",
      body: form,
    }))

    expect(response.status).toBe(415)
    expect(putMock).not.toHaveBeenCalled()
  })

  it("stores an allowed image under a server-derived key", async () => {
    authMock.mockResolvedValue({ user: { id: "auth_user_1" }, error: null })
    putMock.mockResolvedValue({ url: "https://blob.example/uploads/auth_user_1/1.png" })

    const form = new FormData()
    form.append("file", new File([new Uint8Array(64)], "../../escape.png", { type: "image/png" }))

    const { POST } = await import("@/app/api/upload-image/route")
    const response = await POST(new Request("https://sselfie.ai/api/upload-image", {
      method: "POST",
      body: form,
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      url: "https://blob.example/uploads/auth_user_1/1.png",
    })

    const [blobKey, , options] = putMock.mock.calls[0]
    expect(blobKey).toMatch(/^uploads\/auth_user_1\/\d+\.png$/)
    expect(blobKey).not.toContain("escape")
    expect(options).toMatchObject({ access: "public", contentType: "image/png" })
  })
})

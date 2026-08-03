// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  del: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  getUserIdFromSupabase: vi.fn(),
  getSupabaseUser: vi.fn(),
  getSuiteAccess: vi.fn(),
  stripeCustomerRetrieve: vi.fn(),
  stripePortalCreate: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@vercel/blob", () => ({ del: mocks.del }))
vi.mock("@/lib/auth-helper", () => ({ getAuthenticatedUser: mocks.getAuthenticatedUser }))
vi.mock("@/lib/user-mapping", () => ({
  getUserIdFromSupabase: mocks.getUserIdFromSupabase,
}))
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(async () => ({
    auth: { getUser: mocks.getSupabaseUser },
  })),
}))
vi.mock("@/lib/trial/suite-trial", () => ({ getSuiteAccess: mocks.getSuiteAccess }))
vi.mock("@/lib/stripe", () => ({
  stripe: {
    customers: {
      retrieve: mocks.stripeCustomerRetrieve,
      list: vi.fn(),
    },
    billingPortal: {
      sessions: { create: mocks.stripePortalCreate },
    },
  },
}))
vi.mock("@/lib/auth/with-auth", () => ({
  withAuth: (handler: unknown) => handler,
}))

beforeEach(() => {
  vi.resetModules()
  for (const mock of Object.values(mocks)) mock.mockReset()
})

describe("B4: identity-reference ownership behavior", () => {
  it("returns every stored URL that is not owned by the authenticated account", async () => {
    const owned = "https://one.public.blob.vercel-storage.com/owned.png"
    const foreign = "https://one.public.blob.vercel-storage.com/foreign.png"
    mocks.sql.mockResolvedValue([{ image_url: owned }])

    const { findUnownedIdentityReferences } =
      await import("@/lib/app-v3/identity-reference-ownership")
    await expect(
      findUnownedIdentityReferences({
        neonUserId: "user-1",
        referenceUrls: [owned, foreign],
        admin: false,
      })
    ).resolves.toEqual([foreign])
  })

  it("does not query stored ownership for a self-supplied data URI", async () => {
    const { findUnownedIdentityReferences } =
      await import("@/lib/app-v3/identity-reference-ownership")
    await expect(
      findUnownedIdentityReferences({
        neonUserId: "user-1",
        referenceUrls: ["data:image/png;base64,abc"],
        admin: false,
      })
    ).resolves.toEqual([])
    expect(mocks.sql).not.toHaveBeenCalled()
  })

  it("preserves the explicit admin-tooling exemption", async () => {
    const { findUnownedIdentityReferences } =
      await import("@/lib/app-v3/identity-reference-ownership")
    await expect(
      findUnownedIdentityReferences({
        neonUserId: "admin-1",
        referenceUrls: ["https://one.public.blob.vercel-storage.com/customer.png"],
        admin: true,
      })
    ).resolves.toEqual([])
    expect(mocks.sql).not.toHaveBeenCalled()
  })
})

describe("B3: duplicate checkout prevention behavior", () => {
  it("allows a cleanly confirmed anonymous checkout", async () => {
    mocks.getSupabaseUser.mockResolvedValue({ data: { user: null }, error: null })
    const { assertVaultMayaCheckoutAllowed } =
      await import("@/lib/launch/vault-maya-checkout-guard")
    await expect(assertVaultMayaCheckoutAllowed()).resolves.toBeUndefined()
  })

  it("allows anonymous checkout when Supabase reports a missing auth session", async () => {
    const missingSession = new Error("Auth session missing!")
    missingSession.name = "AuthSessionMissingError"
    mocks.getSupabaseUser.mockRejectedValue(missingSession)
    const { assertVaultMayaCheckoutAllowed } =
      await import("@/lib/launch/vault-maya-checkout-guard")
    await expect(assertVaultMayaCheckoutAllowed()).resolves.toBeUndefined()
  })

  it("blocks a signed-in SUITE member", async () => {
    mocks.getSupabaseUser.mockResolvedValue({
      data: { user: { id: "auth-member" } },
      error: null,
    })
    mocks.getUserIdFromSupabase.mockResolvedValue("member-1")
    mocks.getSuiteAccess.mockResolvedValue({ level: "member" })
    const { assertVaultMayaCheckoutAllowed, VAULT_MAYA_ALREADY_INCLUDED } =
      await import("@/lib/launch/vault-maya-checkout-guard")
    await expect(assertVaultMayaCheckoutAllowed()).rejects.toThrow(VAULT_MAYA_ALREADY_INCLUDED)
  })

  it("fails closed when a signed-in account cannot be mapped or checked", async () => {
    mocks.getSupabaseUser.mockResolvedValue({
      data: { user: { id: "auth-unknown" } },
      error: null,
    })
    mocks.getUserIdFromSupabase.mockRejectedValue(new Error("database unavailable"))
    const { assertVaultMayaCheckoutAllowed, VAULT_MAYA_ACCESS_CHECK_FAILED } =
      await import("@/lib/launch/vault-maya-checkout-guard")
    await expect(assertVaultMayaCheckoutAllowed()).rejects.toThrow(VAULT_MAYA_ACCESS_CHECK_FAILED)
  })
})

describe("B8: selfie deletion behavior", () => {
  beforeEach(() => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: "auth-1", email: "member@example.com" },
      error: null,
    })
    mocks.getUserIdFromSupabase.mockResolvedValue("user-1")
  })

  it("deletes the blob before deleting its database row", async () => {
    const url = "https://one.public.blob.vercel-storage.com/selfie.png"
    mocks.sql.mockResolvedValueOnce([{ id: 9, image_url: url }]).mockResolvedValueOnce([])
    mocks.del.mockResolvedValue(undefined)
    const { DELETE } = await import("@/app/api/vault-maya/delete-selfie/route")

    const response = await DELETE()

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      ok: true,
      rowsDeleted: 1,
      blobsDeleted: 1,
      blobFailures: 0,
    })
    expect(mocks.del).toHaveBeenCalledWith(url)
    expect(mocks.sql).toHaveBeenCalledTimes(2)
    expect(mocks.del.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.sql.mock.invocationCallOrder[1]
    )
  })

  it("does not remove the database pointer or claim success when blob deletion fails", async () => {
    const url = "https://one.public.blob.vercel-storage.com/selfie.png"
    mocks.sql.mockResolvedValueOnce([{ id: 9, image_url: url }])
    mocks.del.mockRejectedValue(new Error("blob unavailable"))
    const { DELETE } = await import("@/app/api/vault-maya/delete-selfie/route")

    const response = await DELETE()

    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ ok: false, blobFailures: 1 })
    expect(mocks.sql).toHaveBeenCalledTimes(1)
  })

  it("deletes only the selected user-owned selfie", async () => {
    const url = "https://one.public.blob.vercel-storage.com/selected-selfie.png"
    mocks.sql.mockResolvedValueOnce([{ id: 12, image_url: url }]).mockResolvedValueOnce([])
    mocks.del.mockResolvedValue(undefined)
    const { DELETE } = await import("@/app/api/vault-maya/delete-selfie/route")

    const response = await DELETE(
      new NextRequest("https://sselfie.ai/api/vault-maya/delete-selfie?imageId=12")
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true, rowsDeleted: 1 })
    expect(mocks.del).toHaveBeenCalledWith(url)
    expect(mocks.sql).toHaveBeenCalledTimes(2)
    expect(mocks.sql.mock.calls[0]).toContain("12")
  })
})

describe("B1: billing portal behavior", () => {
  it("creates a Vault Maya portal session that returns to the Vault studio", async () => {
    mocks.sql.mockResolvedValueOnce([{ stripe_customer_id: "cus_vault" }])
    mocks.stripeCustomerRetrieve.mockResolvedValue({ id: "cus_vault" })
    mocks.stripePortalCreate.mockResolvedValue({ url: "https://billing.stripe.test/session" })
    const { handleCreatePortalSession } =
      await import("@/app/api/stripe/create-portal-session/route")

    const response = await handleCreatePortalSession({
      request: new Request("https://sselfie.ai/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", origin: "https://sselfie.ai" },
        body: JSON.stringify({ returnPath: "/vault-maya/studio" }),
      }),
      user: { id: "user-1", email: "member@example.com" },
    })

    expect(response.status).toBe(200)
    expect(mocks.stripePortalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_vault",
        return_url: "https://sselfie.ai/vault-maya/studio",
      })
    )
  })
})

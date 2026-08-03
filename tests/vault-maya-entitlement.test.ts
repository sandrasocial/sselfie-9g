// @vitest-environment node
import fs from "fs"
import path from "path"
import { beforeEach, describe, expect, it, vi } from "vitest"

// B2 (Sandra, 2026-07-30): access resolves to the HIGHEST active entitlement —
// paid SUITE > active bundle pass > active trial > Vault Maya. A vault_maya row must never
// downgrade a higher tier, and must keep studio access after the higher temporary tier
// expires. B7: founder pricing fails safely instead of silently charging $29.

const mocks = vi.hoisted(() => ({ sql: vi.fn() }))
vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))

const DAY = 86_400_000

function futureIso(days: number) {
  return new Date(Date.now() + days * DAY).toISOString()
}

async function accessFor(rows: Array<Record<string, unknown>>) {
  mocks.sql.mockResolvedValueOnce(rows)
  const { getSuiteAccess } = await import("@/lib/trial/suite-trial")
  return getSuiteAccess("user-1")
}

beforeEach(() => {
  vi.resetModules()
  mocks.sql.mockReset()
})

describe("B2: getSuiteAccess precedence with vault_maya", () => {
  it("paid membership beats vault_maya", async () => {
    const access = await accessFor([
      { product_type: "sselfie_studio_membership", status: "active", trial_ends_at: null },
      { product_type: "vault_maya", status: "active", trial_ends_at: null },
    ])
    expect(access.level).toBe("member")
  })

  it.each(["brand_studio_membership", "pro"])(
    "treats the existing %s SUITE product as full Vault Maya access",
    async productType => {
      const access = await accessFor([
        { product_type: productType, status: "active", trial_ends_at: null },
      ])
      expect(access.level).toBe("member")
    }
  )

  it("active bundle pass beats vault_maya", async () => {
    const access = await accessFor([
      {
        product_type: "selfie_visibility_bundle_pass",
        status: "active",
        trial_ends_at: futureIso(10),
      },
      { product_type: "vault_maya", status: "active", trial_ends_at: null },
    ])
    expect(access.level).toBe("member")
  })

  it("active trial beats vault_maya (no downgrade on purchase)", async () => {
    const access = await accessFor([
      { product_type: "suite_trial", status: "active", trial_ends_at: futureIso(3) },
      { product_type: "vault_maya", status: "active", trial_ends_at: null },
    ])
    expect(access.level).toBe("trial")
    expect(access.trialDaysLeft).toBeGreaterThan(0)
  })

  it("expired trial with active vault_maya keeps vault access, not limited", async () => {
    const access = await accessFor([
      { product_type: "suite_trial", status: "active", trial_ends_at: futureIso(-2) },
      { product_type: "vault_maya", status: "active", trial_ends_at: null },
    ])
    expect(access.level).toBe("vault")
  })

  it("expired bundle pass with active vault_maya keeps vault access", async () => {
    const access = await accessFor([
      {
        product_type: "selfie_visibility_bundle_pass",
        status: "active",
        trial_ends_at: futureIso(-1),
      },
      { product_type: "vault_maya", status: "active", trial_ends_at: null },
    ])
    expect(access.level).toBe("vault")
  })

  it("vault_maya alone resolves to vault", async () => {
    const access = await accessFor([
      { product_type: "vault_maya", status: "active", trial_ends_at: null },
    ])
    expect(access.level).toBe("vault")
  })

  it("expired trial alone still resolves to limited", async () => {
    const access = await accessFor([
      { product_type: "suite_trial", status: "active", trial_ends_at: futureIso(-2) },
    ])
    expect(access.level).toBe("limited")
  })
})

describe("B7: founder pricing fails safely", () => {
  it("founder window + missing founder price id -> undefined (loud checkout failure)", async () => {
    const { resolveVaultMayaPriceId } = await import("@/lib/launch/cash-launch-pricing")
    const env = { STRIPE_VAULT_MAYA_PRICE_ID: "price_STANDARD" }
    const inFounderWindow = new Date("2026-08-01T00:00:00.000Z")
    expect(resolveVaultMayaPriceId(env, inFounderWindow)).toBeUndefined()
  })

  it("after flip + missing standard price id -> undefined, never the founder price", async () => {
    const { resolveVaultMayaPriceId } = await import("@/lib/launch/cash-launch-pricing")
    const env = {
      STRIPE_VAULT_MAYA_FOUNDER_PRICE_ID: "price_FOUNDER",
      VAULT_MAYA_FOUNDER_PRICE_FLIPS_AT: "2026-08-01T00:00:00.000Z",
    }
    const afterFlip = new Date("2026-08-02T00:00:00.000Z")
    expect(resolveVaultMayaPriceId(env, afterFlip)).toBeUndefined()
  })

  it("env override controls the flip moment", async () => {
    const { isVaultMayaFounderPriceFlipped } = await import("@/lib/launch/cash-launch-pricing")
    const env = { VAULT_MAYA_FOUNDER_PRICE_FLIPS_AT: "2026-08-10T12:00:00.000Z" }
    expect(isVaultMayaFounderPriceFlipped(new Date("2026-08-10T11:59:59.000Z"), env)).toBe(false)
    expect(isVaultMayaFounderPriceFlipped(new Date("2026-08-10T12:00:00.000Z"), env)).toBe(true)
  })

  it("has no flip clock at all until launch sets the env timestamp", async () => {
    const { resolveVaultMayaFlipMoment } = await import("@/lib/launch/cash-launch-pricing")
    expect(resolveVaultMayaFlipMoment({})).toBe(Number.POSITIVE_INFINITY)
  })

  it("fails loudly when a configured flip timestamp is invalid", async () => {
    const { resolveVaultMayaFlipMoment } = await import("@/lib/launch/cash-launch-pricing")
    expect(() =>
      resolveVaultMayaFlipMoment({ VAULT_MAYA_FOUNDER_PRICE_FLIPS_AT: "not-a-date" })
    ).toThrow("must be a valid ISO timestamp")
  })
})

describe("B4: generation identity references are server-verified as user-owned", () => {
  const route = fs.readFileSync(
    path.join(process.cwd(), "app/api/app-v3/maya/generate/route.ts"),
    "utf8"
  )

  it("wires the ownership verifier before generating", () => {
    expect(route).toContain("identity_reference_not_owned")
    expect(route).toContain("findUnownedIdentityReferences")
  })

  it("passes the authenticated account and admin status to the verifier", () => {
    expect(route).toContain("neonUserId: String(neonUser.id)")
    expect(route).toContain("admin: isAdminEmail(user.email)")
  })

  it("refuses with 403, never silently strips a foreign reference", () => {
    const guard = route.slice(
      route.indexOf("identity_reference_not_owned") - 900,
      route.indexOf("identity_reference_not_owned") + 200
    )
    expect(guard).toContain("status: 403")
    expect(guard).not.toContain("filter(url => ownedUrls.has(url))")
  })
})

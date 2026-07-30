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

  it("active bundle pass beats vault_maya", async () => {
    const access = await accessFor([
      { product_type: "selfie_visibility_bundle_pass", status: "active", trial_ends_at: futureIso(10) },
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
      { product_type: "selfie_visibility_bundle_pass", status: "active", trial_ends_at: futureIso(-1) },
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

  it("default placeholder flip is far-future (no Day 0 scheduled)", async () => {
    const { VAULT_MAYA_FOUNDER_PRICE_FLIPS_AT } = await import("@/lib/launch/cash-launch-pricing")
    expect(Date.parse(VAULT_MAYA_FOUNDER_PRICE_FLIPS_AT)).toBeGreaterThan(Date.parse("2026-12-01T00:00:00.000Z"))
  })
})

describe("B4: generation identity references are server-verified as user-owned", () => {
  const route = fs.readFileSync(
    path.join(process.cwd(), "app/api/app-v3/maya/generate/route.ts"),
    "utf8",
  )

  it("verifies ownership against user_avatar_images before generating", () => {
    expect(route).toContain("identity_reference_not_owned")
    expect(route).toMatch(/FROM user_avatar_images\s+WHERE user_id = \$\{String\(neonUser\.id\)\}\s+AND image_url = ANY\(/)
  })

  it("keeps data: URIs as self-supplied content and exempts admin tooling", () => {
    expect(route).toContain('url => !url.startsWith("data:")')
    expect(route).toMatch(/!isAdminEmail\(user\.email\) && Array\.isArray\(referenceUrls\)/)
  })

  it("refuses with 403, never silently strips a foreign reference", () => {
    const guard = route.slice(route.indexOf("identity_reference_not_owned") - 900, route.indexOf("identity_reference_not_owned") + 200)
    expect(guard).toContain("status: 403")
    expect(guard).not.toContain("filter(url => ownedUrls.has(url))")
  })
})

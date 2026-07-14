import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8")
}

describe("One Selfie Visibility Bundle product registry", () => {
  it("registers the paid bundle before strict Academy entitlement grants", () => {
    const migration = read(
      "migrations/20260714_selfie_visibility_bundle_product_registry.sql",
    )
    const handler = read("lib/payments/handlers/selfie-visibility-bundle.ts")
    const entitlements = read("lib/academy-entitlements.ts")

    expect(migration).toContain("'selfie_visibility_bundle'")
    expect(migration).toContain("ON CONFLICT (id) DO UPDATE")
    expect(handler).toContain("ensureSelfieVisibilityBundleProductRegistry")
    expect(handler).toContain("await ensureSelfieVisibilityBundleProductRegistry()")
    expect(entitlements).toMatch(
      /DIRECT_ONE_TIME_ACADEMY_TYPES[\s\S]*?"selfie_visibility_bundle"/,
    )
  })

  it("delivers presets through preset_orders instead of the Academy foreign key", () => {
    const handler = read("lib/payments/handlers/selfie-visibility-bundle.ts")
    const lifetimeEntitlements = handler.match(
      /const LIFETIME_ENTITLEMENTS = \[([\s\S]*?)\] as const/,
    )?.[1]

    expect(lifetimeEntitlements).toBeTruthy()
    expect(lifetimeEntitlements).not.toContain("presets_bundle")
    expect(handler).toContain("upsertPresetOrderForPurchase")
  })
})

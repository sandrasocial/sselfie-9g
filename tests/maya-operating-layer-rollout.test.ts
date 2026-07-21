// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { isMayaOperatingLayerEnabled } from "@/lib/app-v3/maya/operating-layer-rollout"

const originalGlobal = process.env.FEATURE_MAYA_OPERATING_LAYER
const originalAllowlist = process.env.MAYA_OPERATING_LAYER_ALLOWLIST

afterEach(() => {
  if (originalGlobal === undefined) delete process.env.FEATURE_MAYA_OPERATING_LAYER
  else process.env.FEATURE_MAYA_OPERATING_LAYER = originalGlobal
  if (originalAllowlist === undefined) delete process.env.MAYA_OPERATING_LAYER_ALLOWLIST
  else process.env.MAYA_OPERATING_LAYER_ALLOWLIST = originalAllowlist
})

describe("Maya operating layer rollout", () => {
  it("is disabled by default", () => {
    delete process.env.FEATURE_MAYA_OPERATING_LAYER
    delete process.env.MAYA_OPERATING_LAYER_ALLOWLIST

    expect(isMayaOperatingLayerEnabled({ email: "sandra@example.com", userId: "42" })).toBe(false)
  })

  it("enables only an exact normalized allowlist identity while the global flag is off", () => {
    process.env.FEATURE_MAYA_OPERATING_LAYER = "false"
    process.env.MAYA_OPERATING_LAYER_ALLOWLIST = " SANDRA@EXAMPLE.COM, user-42 "

    expect(isMayaOperatingLayerEnabled({ email: "sandra@example.com" })).toBe(true)
    expect(isMayaOperatingLayerEnabled({ userId: "USER-42" })).toBe(true)
    expect(isMayaOperatingLayerEnabled({ email: "member@example.com" })).toBe(false)
  })

  it("supports an explicit global rollout without changing access or entitlement code", () => {
    process.env.FEATURE_MAYA_OPERATING_LAYER = "true"
    delete process.env.MAYA_OPERATING_LAYER_ALLOWLIST

    expect(isMayaOperatingLayerEnabled({ email: "member@example.com" })).toBe(true)
  })
})

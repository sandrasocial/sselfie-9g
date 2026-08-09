// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  isMayaHomeEnabled,
  isMayaOperatingLayerEnabled,
} from "@/lib/app-v3/maya/operating-layer-rollout"

const originalGlobal = process.env.FEATURE_MAYA_OPERATING_LAYER
const originalAllowlist = process.env.MAYA_OPERATING_LAYER_ALLOWLIST
const originalHomeAllowlist = process.env.MAYA_HOME_ALLOWLIST
const originalValueTestAllowlist = process.env.MAYA_VALUE_TEST_ALLOWLIST

afterEach(() => {
  if (originalGlobal === undefined) delete process.env.FEATURE_MAYA_OPERATING_LAYER
  else process.env.FEATURE_MAYA_OPERATING_LAYER = originalGlobal
  if (originalAllowlist === undefined) delete process.env.MAYA_OPERATING_LAYER_ALLOWLIST
  else process.env.MAYA_OPERATING_LAYER_ALLOWLIST = originalAllowlist
  if (originalHomeAllowlist === undefined) delete process.env.MAYA_HOME_ALLOWLIST
  else process.env.MAYA_HOME_ALLOWLIST = originalHomeAllowlist
  if (originalValueTestAllowlist === undefined) delete process.env.MAYA_VALUE_TEST_ALLOWLIST
  else process.env.MAYA_VALUE_TEST_ALLOWLIST = originalValueTestAllowlist
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

  it("supports an explicit global rollout for full members and trials", () => {
    process.env.FEATURE_MAYA_OPERATING_LAYER = "true"
    delete process.env.MAYA_OPERATING_LAYER_ALLOWLIST

    expect(isMayaOperatingLayerEnabled({ email: "member@example.com", accessLevel: "full" })).toBe(
      true
    )
    expect(isMayaOperatingLayerEnabled({ email: "trial@example.com", accessLevel: "trial" })).toBe(
      true
    )
  })

  it("keeps limited shell users out of the global rollout", () => {
    process.env.FEATURE_MAYA_OPERATING_LAYER = "true"
    delete process.env.MAYA_OPERATING_LAYER_ALLOWLIST

    expect(
      isMayaOperatingLayerEnabled({ email: "limited@example.com", accessLevel: "limited" })
    ).toBe(false)
    expect(isMayaOperatingLayerEnabled({ email: "unknown@example.com" })).toBe(false)
  })

  it("keeps the private allowlist as a server-side override", () => {
    process.env.FEATURE_MAYA_OPERATING_LAYER = "false"
    process.env.MAYA_OPERATING_LAYER_ALLOWLIST = " sandra@example.com "

    expect(
      isMayaOperatingLayerEnabled({ email: "sandra@example.com", accessLevel: "limited" })
    ).toBe(true)
  })

  it("never widens Maya Home through the global operating-layer flag", () => {
    process.env.FEATURE_MAYA_OPERATING_LAYER = "true"
    process.env.MAYA_OPERATING_LAYER_ALLOWLIST = "sandra@example.com"
    delete process.env.MAYA_HOME_ALLOWLIST

    expect(isMayaHomeEnabled({ email: "sandra@example.com", accessLevel: "full" })).toBe(true)
    expect(isMayaHomeEnabled({ email: "member@example.com", accessLevel: "full" })).toBe(false)
    expect(isMayaHomeEnabled({ email: "trial@example.com", accessLevel: "trial" })).toBe(false)
  })

  it("supports a dedicated Maya Home allowlist without changing the operating cohort", () => {
    process.env.FEATURE_MAYA_OPERATING_LAYER = "true"
    process.env.MAYA_OPERATING_LAYER_ALLOWLIST = "legacy-preview@example.com"
    process.env.MAYA_HOME_ALLOWLIST = " founder@example.com "

    expect(isMayaHomeEnabled({ email: "founder@example.com", accessLevel: "full" })).toBe(true)
    expect(isMayaHomeEnabled({ email: "legacy-preview@example.com", accessLevel: "full" })).toBe(
      false
    )
  })

  it("supports a bounded paid-value cohort without enabling every member", () => {
    delete process.env.MAYA_HOME_ALLOWLIST
    delete process.env.MAYA_OPERATING_LAYER_ALLOWLIST
    process.env.MAYA_VALUE_TEST_ALLOWLIST = " test-buyer@example.com, test-user-id "

    expect(isMayaHomeEnabled({ email: "test-buyer@example.com", accessLevel: "full" })).toBe(true)
    expect(isMayaOperatingLayerEnabled({ email: "test-buyer@example.com", accessLevel: "full" })).toBe(true)
    expect(isMayaHomeEnabled({ userId: "TEST-USER-ID", accessLevel: "full" })).toBe(true)
    expect(isMayaHomeEnabled({ email: "other-member@example.com", accessLevel: "full" })).toBe(false)
  })

  it("fails closed when the paid-value cohort exceeds twenty identities", () => {
    delete process.env.MAYA_HOME_ALLOWLIST
    delete process.env.MAYA_OPERATING_LAYER_ALLOWLIST
    process.env.MAYA_VALUE_TEST_ALLOWLIST = Array.from(
      { length: 21 },
      (_, index) => `buyer-${index + 1}@example.com`
    ).join(",")

    expect(isMayaHomeEnabled({ email: "buyer-1@example.com", accessLevel: "full" })).toBe(false)
    expect(isMayaOperatingLayerEnabled({ email: "buyer-1@example.com", accessLevel: "full" })).toBe(false)
  })
})

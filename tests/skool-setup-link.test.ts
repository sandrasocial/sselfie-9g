// @vitest-environment node
import { describe, expect, it } from "vitest"

import {
  buildSkoolSetupEntryLink,
  verifySkoolSetupEntryToken,
} from "@/lib/skool/setup-link"

const SECRET = Buffer.alloc(32, 7).toString("base64url")
const OTHER_SECRET = Buffer.alloc(32, 8).toString("base64url")
const MEMBERSHIP = `skool:sselfie-photo-club-2569:${"a".repeat(32)}`

describe("Skool setup entry links", () => {
  it("creates the same stable link on webhook retries and keeps the bearer token in the fragment", () => {
    const first = buildSkoolSetupEntryLink({
      membershipKey: MEMBERSHIP,
      secret: SECRET,
      productionUrl: "https://sselfie.ai",
    })
    const second = buildSkoolSetupEntryLink({
      membershipKey: MEMBERSHIP,
      secret: SECRET,
      productionUrl: "https://sselfie.ai",
    })

    expect(second).toBe(first)
    const url = new URL(first)
    expect(url.origin).toBe("https://sselfie.ai")
    expect(url.pathname).toBe("/auth/skool-setup")
    expect(url.searchParams.get("membership")).toBe(MEMBERSHIP)
    expect(url.searchParams.has("token")).toBe(false)
    expect(url.hash).toMatch(/^#token=[A-Za-z0-9_-]{43}$/)
  })

  it("verifies only the exact membership + secret pair", () => {
    const link = new URL(buildSkoolSetupEntryLink({
      membershipKey: MEMBERSHIP,
      secret: SECRET,
    }))
    const token = new URLSearchParams(link.hash.slice(1)).get("token")

    expect(verifySkoolSetupEntryToken({
      membershipKey: MEMBERSHIP,
      token,
      secret: SECRET,
    })).toBe(true)
    expect(verifySkoolSetupEntryToken({
      membershipKey: `skool:sselfie-photo-club-2569:${"b".repeat(32)}`,
      token,
      secret: SECRET,
    })).toBe(false)
    expect(verifySkoolSetupEntryToken({
      membershipKey: MEMBERSHIP,
      token,
      secret: OTHER_SECRET,
    })).toBe(false)
  })

  it("never accepts a non-production origin for customer setup links", () => {
    const url = new URL(buildSkoolSetupEntryLink({
      membershipKey: MEMBERSHIP,
      secret: SECRET,
      productionUrl: "https://evil.example.com",
    }))
    expect(url.origin).toBe("https://sselfie.ai")
  })
})

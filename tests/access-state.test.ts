import { describe, expect, it } from "vitest"

import { getAccessState } from "@/components/sselfie/access"

describe("getAccessState", () => {
  it("grants full access to admin role users even without subscription", () => {
    const access = getAccessState({
      credits: 0,
      subscriptionStatus: null,
      productType: null,
      userEmail: "admin+alias@example.com",
      userRole: "admin",
    })

    expect(access.isMember).toBe(true)
    expect(access.canUseGenerators).toBe(true)
    expect(access.hasFullAccess).toBe(true)
  })

  it("treats paid studio membership as member access", () => {
    const access = getAccessState({
      credits: 0,
      subscriptionStatus: "active",
      productType: "sselfie_studio_membership",
      userEmail: "member@example.com",
      userRole: "user",
    })

    expect(access.isMember).toBe(true)
    expect(access.canUseGenerators).toBe(true)
    expect(access.isPaidBlueprintOnly).toBe(false)
  })
})

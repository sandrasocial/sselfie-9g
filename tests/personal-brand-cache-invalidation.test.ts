import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("personal brand cache invalidation", () => {
  it("makes newly saved Calendar context available to Maya immediately", () => {
    const route = readFileSync("app/api/profile/personal-brand/route.ts", "utf8")

    expect(route).toContain("CacheKeys.mayaPersonalBrand(String(neonUser.id))")
    expect(route).toContain("await getRedisClient().del")
  })
})

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

// getFeedPlannerAccess resolves entitlements via subscriptions.user_id, which stores the NEON
// users.id. For 905 of 906 accounts that id differs from the auth-provider id, so passing an
// auth id silently 403s every member (this is the bug that made "Save to calendar" do nothing
// and made the monthly draft cron skip everyone). These tests pin the id space at each caller.

const read = (path: string) => readFileSync(path, "utf8")

describe("feed planner access checks use the neon user id", () => {
  it("place-photo passes the neon user id", () => {
    const src = read("app/api/app-v3/maya/feed-plan/place-photo/route.ts")
    expect(src).toContain("getFeedPlannerAccess(String(neonUser.id))")
    expect(src).not.toContain("getFeedPlannerAccess(user.id)")
  })

  it("monthly draft cron passes the neon user id", () => {
    const src = read("app/api/cron/feed-plan-monthly-draft/route.ts")
    expect(src).toContain("getFeedPlannerAccess(String(row.user_id))")
    expect(src).not.toContain("getFeedPlannerAccess(authUserId)")
  })
})

// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("Resend auth-path delivery", () => {
  it("schedules the one new-user sync after the response and avoids callback duplication", () => {
    const userMapping = readFileSync("lib/user-mapping.ts", "utf8")
    const authCallback = readFileSync("app/auth/callback/route.ts", "utf8")

    expect(userMapping).toContain('import { after } from "next/server"')
    expect(userMapping).toContain("after(syncNewUserToResend)")
    expect(userMapping).toContain("await autoSyncUserToResend(")
    expect(userMapping).toContain("await syncNewUserToResend()")
    expect(authCallback).not.toContain("addOrUpdateResendContact")
    expect(authCallback).not.toContain("Resend contact synced")
  })
})

import { describe, expect, it } from "vitest"

import { resolveInstagramGraphBase } from "@/lib/instagram/connection-mode"

describe("resolveInstagramGraphBase", () => {
  it("uses the Instagram Graph host for Instagram Login connections", () => {
    expect(
      resolveInstagramGraphBase({
        account_type: "instagram_login",
        access_token: "IGAA-valid-token",
      }),
    ).toBe("https://graph.instagram.com/v21.0")
  })

  it("keeps the Facebook Graph host for Facebook Page connections", () => {
    expect(
      resolveInstagramGraphBase({
        account_type: "business",
        access_token: "facebook-user-token",
      }),
    ).toBe("https://graph.facebook.com/v21.0")
  })
})

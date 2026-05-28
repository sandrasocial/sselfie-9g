import { describe, expect, it } from "vitest"

import { selectPageWithInstagramAccount } from "@/lib/instagram/page-selection"

describe("selectPageWithInstagramAccount", () => {
  it("does not pick the first Facebook Page when it has no linked Instagram account", () => {
    const selected = selectPageWithInstagramAccount([
      {
        id: "page_1",
        name: "Next Level Sandra",
        instagram_business_account: null,
      },
      {
        id: "page_2",
        name: "SSELFIE",
        access_token: "page-token",
        instagram_business_account: { id: "ig_1", username: "sandra.social" },
      },
    ])

    expect(selected?.id).toBe("page_2")
    expect(selected?.instagram_business_account?.username).toBe("sandra.social")
  })

  it("returns null when none of the granted Pages have a linked Instagram account", () => {
    expect(
      selectPageWithInstagramAccount([
        { id: "page_1", name: "Next Level Sandra" },
        { id: "page_2", name: "Dibs Social", instagram_business_account: null },
      ]),
    ).toBeNull()
  })

  it("prefers the configured Instagram username when multiple linked accounts are available", () => {
    const selected = selectPageWithInstagramAccount(
      [
        {
          id: "page_1",
          name: "Aamodt",
          instagram_business_account: { id: "ig_1", username: "aamodt_as" },
        },
        {
          id: "page_2",
          name: "SSELFIE",
          instagram_business_account: { id: "ig_2", username: "sandra.social" },
        },
      ],
      ["sandra.social"],
    )

    expect(selected?.instagram_business_account?.username).toBe("sandra.social")
  })
})

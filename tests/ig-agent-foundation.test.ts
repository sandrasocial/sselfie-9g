import { createHmac } from "crypto"
import { describe, expect, it } from "vitest"

import { isLikelyIcelandic } from "@/lib/ig-agent/icelandic-detector"
import { triageIncomingMessage } from "@/lib/ig-agent/triage"
import { verifyMetaSignature } from "@/lib/ig-agent/webhook-security"
import { isInstagramLoginToken, resolveInstagramConnectionMode } from "@/lib/instagram/connection-mode"

describe("IG agent foundation", () => {
  it("detects Icelandic names with accented and normalized surnames", () => {
    expect(isLikelyIcelandic("ingab", "Inga Sigurjónsdóttir")).toBe(true)
    expect(isLikelyIcelandic("anna_magnusson", null)).toBe(true)
    expect(isLikelyIcelandic("jane", "Jane Smith")).toBe(false)
  })

  it("always flags Icelandic contacts before keyword automation", () => {
    const result = triageIncomingMessage("PROMPT please", {
      igUserId: "123",
      username: "ingab",
      fullName: "Inga Sigurjonsdottir",
      isIcelandic: true,
      tags: ["icelandic"],
    })

    expect(result.action).toBe("flag")
    expect(result.flagReason).toBe("icelandic_contact")
  })

  it("tags buyer intent and aesthetics from audience language", () => {
    const result = triageIncomingMessage("wait I need the dark feminine vault, how much is it?", {
      igUserId: "123",
      username: "buyer",
      tags: [],
    })

    expect(result.action).toBe("auto_respond")
    expect(result.growthTags).toContain("vault_interest")
    expect(result.growthTags).toContain("aesthetic_dark_feminine")
    expect(result.growthTags).toContain("price_objection")
  })

  it("rejects invalid Meta webhook signatures", () => {
    const body = JSON.stringify({ object: "instagram" })
    const appSecret = "secret"
    const signature = `sha256=${createHmac("sha256", appSecret).update(body).digest("hex")}`

    expect(verifyMetaSignature({ body, appSecret, signature })).toBe(true)
    expect(verifyMetaSignature({ body, appSecret, signature: "sha256=bad" })).toBe(false)
  })

  it("detects Instagram Login IGAA tokens for the DM send path", () => {
    expect(isInstagramLoginToken("IGAA_mock_token")).toBe(true)
    expect(isInstagramLoginToken("EAAR_mock_token")).toBe(false)
    expect(resolveInstagramConnectionMode({ access_token: "IGAA_mock_token" })).toBe("instagram_login")
    expect(resolveInstagramConnectionMode({ access_token: "EAAR_mock_token", page_access_token: "page-token" })).toBe(
      "facebook_page",
    )
    expect(resolveInstagramConnectionMode({ access_token: "not-prefixed", account_type: "instagram_login" })).toBe(
      "instagram_login",
    )
  })
})

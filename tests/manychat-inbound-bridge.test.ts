import { describe, expect, it } from "vitest"

import { normalizeManychatInboundPayload } from "@/lib/ig-agent/manychat-inbound"

describe("ManyChat inbound bridge normalization", () => {
  it("accepts ManyChat alias fields instead of only the original hand-written keys", () => {
    const result = normalizeManychatInboundPayload({
      user_id: 12345,
      instagram_username: "@sandra.social",
      first_name: "Sandra",
      last_name: "Emilie",
      message: "Can you send me the Vault link?",
      bridge_secret: "secret-from-body",
      message_id: "msg_1",
      timestamp: 1718377200,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toMatchObject({
      subscriberId: "12345",
      username: "sandra.social",
      fullName: "Sandra Emilie",
      text: "Can you send me the Vault link?",
      bridgeSecret: "secret-from-body",
      messageId: "msg_1",
      channel: "dm",
    })
    expect(result.value.timestamp).toBe(1718377200000)
  })

  it("treats unsubstituted ManyChat placeholders as missing values", () => {
    const result = normalizeManychatInboundPayload({
      subscriber_id: "{{user_id}}",
      username: "{{ig_username}}",
      text: "{{last_text_input}}",
    })

    expect(result).toMatchObject({
      ok: false,
      error: "subscriber_id and text required",
      status: 400,
    })
  })

  it("skips oversized messages without asking ManyChat to retry forever", () => {
    const result = normalizeManychatInboundPayload({
      subscriber_id: "mc-1",
      text: "x".repeat(4001),
    })

    expect(result).toMatchObject({
      ok: false,
      status: 200,
      skipped: "oversized",
    })
  })
})

// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { sqlMock, fetchMock } = vi.hoisted(() => ({
  sqlMock: vi.fn(),
  fetchMock: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({
  sql: sqlMock,
}))

import { sendInstagramDm } from "@/lib/ig-agent/send-dm"
import { sendManychatDm } from "@/lib/ig-agent/send-manychat"

const ORIGINAL_ENV = process.env

describe("Instagram DM send policy", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...ORIGINAL_ENV, IG_AGENT_AUTO_SEND_ENABLED: "false" }
    vi.stubGlobal("fetch", fetchMock)
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ message_id: "ig_mid_123" }),
    })
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = Array.from(strings).join("?")
      if (query.includes("FROM instagram_connections")) {
        return [
          {
            id: 7,
            instagram_user_id: "1784_owner",
            page_id: "174704043326739",
            access_token: "EAAR_user_token",
            page_access_token: "EAAR_page_token",
            account_type: "facebook_page",
          },
        ]
      }
      return []
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    process.env = ORIGINAL_ENV
  })

  it("keeps automated agent replies as drafts while auto-send is disabled", async () => {
    const result = await sendInstagramDm({
      igUserId: "1784_contact",
      message: "Hey lovely, here is the link.",
      conversationId: 42,
      fromType: "agent",
    })

    expect(result).toEqual({ sent: false, reason: "auto_send_disabled" })
    expect(fetchMock).not.toHaveBeenCalled()

    // The draft is recorded with ai_generated = true (this branch only runs for
    // fromType "agent"). Guards the always-true comparison that previously lived here.
    const draftInsert = sqlMock.mock.calls.find(([strings]) =>
      Array.from(strings as TemplateStringsArray)
        .join("")
        .includes("INSERT INTO ig_messages"),
    )
    expect(draftInsert).toBeDefined()
    // interpolated values: [conversationId, fromType, message, ai_generated, send_status]
    expect(draftInsert?.slice(1)).toEqual([42, "agent", "Hey lovely, here is the link.", true, "draft"])
  })

  it("allows Sandra-approved replies even while automated sends are disabled", async () => {
    const result = await sendInstagramDm({
      igUserId: "1784_contact",
      message: "Yes, send me a screenshot and I will check it.",
      conversationId: 42,
      fromType: "sandra",
    })

    expect(result).toEqual({ sent: true, messageId: "ig_mid_123" })
    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/174704043326739/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer EAAR_page_token",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          messaging_type: "RESPONSE",
          recipient: { id: "1784_contact" },
          message: { text: "Yes, send me a screenshot and I will check it." },
        }),
      }),
    )
  })

  it("blocks Sandra-approved ManyChat replies until the intended account is verified", async () => {
    process.env.MANYCHAT_API_KEY = "shared-token"
    process.env.MANYCHAT_OUTBOUND_ENABLED = "false"

    const result = await sendManychatDm({
      igUserId: "mc:12345",
      message: "This must not reach the stale account.",
      conversationId: 44,
      fromType: "sandra",
    })

    expect(result).toEqual({
      sent: false,
      reason: "manychat_outbound_disabled_pending_account_verification",
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("refuses a ManyChat API key issued by a different account", async () => {
    process.env.MANYCHAT_API_KEY = "999999:stale-token"
    process.env.MANYCHAT_ACCOUNT_ID = "877156"
    process.env.MANYCHAT_OUTBOUND_ENABLED = "true"

    const result = await sendManychatDm({
      igUserId: "mc:12345",
      message: "This must stay inside the intended account.",
      conversationId: 44,
      fromType: "sandra",
    })

    expect(result).toEqual({ sent: false, reason: "manychat_api_key_account_mismatch" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("allows a Sandra-approved ManyChat reply with the intended account key", async () => {
    process.env.MANYCHAT_API_KEY = "877156:verified-token"
    process.env.MANYCHAT_ACCOUNT_ID = "877156"
    process.env.MANYCHAT_OUTBOUND_ENABLED = "true"
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ status: "success" }) })

    const result = await sendManychatDm({
      igUserId: "mc:12345",
      message: "Your test reply is here.",
      conversationId: 44,
      fromType: "sandra",
    })

    expect(result).toEqual({ sent: true })
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.manychat.com/fb/sending/sendContent",
      expect.objectContaining({ method: "POST" }),
    )
  })
})

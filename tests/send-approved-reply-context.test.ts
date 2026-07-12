// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const { sqlMock, sendInstagramDmMock, sendManychatDmMock } = vi.hoisted(() => ({
  sqlMock: vi.fn(),
  sendInstagramDmMock: vi.fn(),
  sendManychatDmMock: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/db/client", () => ({ sql: sqlMock }))
vi.mock("@/lib/ig-agent/send-dm", () => ({ sendInstagramDm: sendInstagramDmMock }))
vi.mock("@/lib/ig-agent/send-manychat", () => ({ sendManychatDm: sendManychatDmMock }))

import { sendApprovedInstagramReply } from "@/lib/ig-agent/send-approved-reply"

describe("approved Instagram reply context guard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does not send when the customer wrote a newer message after the approval was created", async () => {
    sqlMock.mockResolvedValue([
      {
        ig_user_id: "mc:12345",
        draft_response: "The saved draft",
        latest_inbound_message_id: 92,
      },
    ])

    await expect(
      sendApprovedInstagramReply({
        conversationId: 42,
        message: "The saved draft",
        expectedDraft: "The saved draft",
        expectedInboundMessageId: 91,
      }),
    ).rejects.toThrow("The customer sent a newer message")

    expect(sendInstagramDmMock).not.toHaveBeenCalled()
    expect(sendManychatDmMock).not.toHaveBeenCalled()
  })
})

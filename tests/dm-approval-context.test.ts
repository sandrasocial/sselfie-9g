// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const { sqlMock } = vi.hoisted(() => ({ sqlMock: vi.fn() }))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/db/client", () => ({ sql: sqlMock }))

import { getDmApprovalContext } from "@/lib/admin/dm-approval-context"

function action(payload: Record<string, unknown>) {
  return {
    kind: "send_ig_reply" as const,
    payload,
    created_at: "2026-07-12T12:00:00.000Z",
  }
}

describe("getDmApprovalContext", () => {
  beforeEach(() => {
    sqlMock.mockReset()
  })

  it("loads the exact contact message captured on a new approval action", async () => {
    sqlMock.mockResolvedValue([
      {
        conversation_id: 42,
        username: "anna",
        inbound_message_id: 91,
        customer_message: "Can this help me create photos for my offer?",
        received_at: "2026-07-12T11:55:00.000Z",
      },
    ])

    await expect(
      getDmApprovalContext(action({ conversationId: 42, inboundMessageId: 91, draft: "Yes." })),
    ).resolves.toEqual({
      conversationId: 42,
      username: "anna",
      inboundMessageId: 91,
      customerMessage: "Can this help me create photos for my offer?",
      receivedAt: "2026-07-12T11:55:00.000Z",
    })
    expect(sqlMock).toHaveBeenCalledTimes(1)
  })

  it("supports older signed links that only contain a conversation and draft", async () => {
    sqlMock.mockResolvedValue([
      {
        conversation_id: 42,
        username: "anna",
        inbound_message_id: 90,
        customer_message: "Older message that the saved draft answered.",
        received_at: "2026-07-12T11:50:00.000Z",
      },
    ])

    const context = await getDmApprovalContext(action({ conversationId: 42, draft: "Saved draft" }))

    expect(context?.inboundMessageId).toBe(90)
    expect(context?.customerMessage).toBe("Older message that the saved draft answered.")
    expect(sqlMock).toHaveBeenCalledTimes(1)
  })

  it("rejects invalid conversation identifiers without querying another conversation", async () => {
    await expect(
      getDmApprovalContext(action({ conversationId: "not-a-number", inboundMessageId: 91 })),
    ).resolves.toBeNull()
    expect(sqlMock).not.toHaveBeenCalled()
  })
})

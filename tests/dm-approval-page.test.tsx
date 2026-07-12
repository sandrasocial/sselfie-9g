import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { getAdminActionByTokenMock, getDmApprovalContextMock } = vi.hoisted(() => ({
  getAdminActionByTokenMock: vi.fn(),
  getDmApprovalContextMock: vi.fn(),
}))

vi.mock("@/lib/admin/action-queue", () => ({
  getAdminActionByToken: getAdminActionByTokenMock,
}))
vi.mock("@/lib/admin/dm-approval-context", () => ({
  getDmApprovalContext: getDmApprovalContextMock,
}))
vi.mock("@/lib/resend/client", () => ({
  requireResendClient: vi.fn(),
}))

import ApproveActionPage from "@/app/approve/[token]/page"

const pendingDmAction = {
  id: 7,
  kind: "send_ig_reply",
  title: "Reply to @anna",
  summary: "They wrote: Can you help?",
  source: "ig_conversations",
  payload: { conversationId: 42, inboundMessageId: 91, draft: "Yes, I can help." },
  status: "pending",
  expires_at: "2026-07-19T12:00:00.000Z",
  acted_at: null,
  review_note: null,
  last_error: null,
  created_at: "2026-07-12T12:00:00.000Z",
  updated_at: "2026-07-12T12:00:00.000Z",
}

describe("DM approval page", () => {
  beforeEach(() => {
    getAdminActionByTokenMock.mockReset().mockResolvedValue(pendingDmAction)
    getDmApprovalContextMock.mockReset().mockResolvedValue({
      conversationId: 42,
      username: "anna",
      inboundMessageId: 91,
      customerMessage: "Can you help me create photos for my new offer?",
      receivedAt: "2026-07-12T11:55:00.000Z",
    })
  })

  it("shows the customer's message above the editable suggested reply", async () => {
    render(await ApproveActionPage({ params: Promise.resolve({ token: "signed-token" }) }))

    expect(screen.getByText("They wrote")).toBeInTheDocument()
    expect(screen.getByText("Can you help me create photos for my new offer?")).toBeInTheDocument()
    expect(screen.getByLabelText("Suggested reply")).toHaveValue("Yes, I can help.")
    expect(screen.getByRole("button", { name: "Send this reply" })).toBeEnabled()
  })

  it("disables Send when the original customer message cannot be verified", async () => {
    getDmApprovalContextMock.mockResolvedValue(null)

    render(await ApproveActionPage({ params: Promise.resolve({ token: "signed-token" }) }))

    expect(
      screen.getByText(/The original customer message could not be loaded/),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Send this reply" })).toBeDisabled()
    expect(screen.getByRole("button", { name: /Dismiss/ })).toBeEnabled()
  })
})

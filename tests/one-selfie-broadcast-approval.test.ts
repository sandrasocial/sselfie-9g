import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { isFounderApprovalBroadcastName } from "@/lib/admin/sync-approval-actions"

describe("One Selfie launch draft approvals", () => {
  it("surfaces attended launch drafts beside founder Story drafts", () => {
    expect(isFounderApprovalBroadcastName("Story · Sunday note")).toBe(true)
    expect(isFounderApprovalBroadcastName("Launch · One Selfie · 1 Open")).toBe(true)
    expect(isFounderApprovalBroadcastName("Launch · One Selfie · 2 Inside")).toBe(true)
    expect(isFounderApprovalBroadcastName("Automated newsletter")).toBe(false)
  })
})

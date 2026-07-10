// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { generateDraftMock, sendEmailMock, sqlMock } = vi.hoisted(() => ({
  generateDraftMock: vi.fn(),
  sendEmailMock: vi.fn(),
  sqlMock: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({
  sql: sqlMock,
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: sendEmailMock,
}))

vi.mock("@/lib/ig-agent/responder", () => ({
  generateSandraDraft: generateDraftMock,
}))

import { processInboundInstagramMessage } from "@/lib/ig-agent/processor"
import { triageIncomingMessage } from "@/lib/ig-agent/triage"

const ORIGINAL_ENV = process.env

function mockDatabase() {
  sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
    const query = Array.from(strings).join("?")

    if (query.includes("INSERT INTO ig_contacts")) {
      return [
        {
          ig_user_id: "contact-1",
          username: "keyword_user",
          full_name: "Keyword User",
          profile_pic_url: null,
          is_icelandic: false,
          is_verified_friend: false,
          tags: [],
        },
      ]
    }

    if (query.includes("INSERT INTO ig_conversations")) {
      return [{ id: 42, status: "pending" }]
    }

    return []
  })
}

describe("IG agent ManyChat keyword filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...ORIGINAL_ENV }
    delete process.env.IG_AGENT_EMAIL_ALERTS_ENABLED
    mockDatabase()
    generateDraftMock.mockResolvedValue({
      response: "Draft response",
      confidence: 0.9,
      intent: "unknown",
      shouldSend: false,
      growthTags: [],
    })
    sendEmailMock.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it.each(["KIT", "SUITE ❤️", "PROMPT", "SELFIE", "PRESET", "ANDROID"])(
    "treats the bare %s automation keyword as already handled by ManyChat",
    message => {
      const result = triageIncomingMessage(message, {
        igUserId: "contact-1",
        username: "keyword_user",
        tags: [],
      })

      expect(result.action).toBe("keyword_handled")
    }
  )

  it("does not hide a WORK lead as an automation keyword", () => {
    const result = triageIncomingMessage("WORK", {
      igUserId: "contact-1",
      username: "warm_lead",
      tags: [],
    })

    expect(result.action).toBe("flag")
  })

  it("stores an exact keyword as auto-handled without drafting or emailing", async () => {
    const result = await processInboundInstagramMessage({
      igUserId: "contact-1",
      username: "keyword_user",
      channel: "comment",
      text: "KIT",
    })

    expect(result.status).toBe("auto_handled")
    expect(result.draft).toBeNull()
    expect(generateDraftMock).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it("keeps per-conversation alert emails off by default", async () => {
    const result = await processInboundInstagramMessage({
      igUserId: "contact-1",
      username: "warm_lead",
      channel: "dm",
      text: "WORK",
    })

    expect(result.status).toBe("flagged")
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it("allows an explicit production opt-in to re-enable alert emails", async () => {
    process.env.IG_AGENT_EMAIL_ALERTS_ENABLED = "true"

    await processInboundInstagramMessage({
      igUserId: "contact-1",
      username: "warm_lead",
      channel: "dm",
      text: "WORK",
    })

    expect(sendEmailMock).toHaveBeenCalledTimes(1)
  })
})

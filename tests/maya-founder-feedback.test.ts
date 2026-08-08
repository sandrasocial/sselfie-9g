import { describe, expect, it } from "vitest"

import {
  buildFounderFeedbackSubject,
  canTransitionFounderFeedbackStatus,
  founderFeedbackStatusLabel,
  normalizeFounderFeedbackPayload,
  summarizeFounderFeedbackMessages,
} from "@/lib/app-v3/maya/founder-feedback"

describe("Maya founder feedback contract", () => {
  it("keeps Sandra's report simple while preserving bounded diagnostic context", () => {
    const payload = normalizeFounderFeedbackPayload({
      clientReportId: "report-123",
      reportType: "quality",
      message: "The result is polished, but it does not feel enough like me.",
      context: {
        currentPath: "/app?view=create",
        surface: "create",
        taskId: "maya-task-123",
        chatId: "chat-123",
        outputFormat: "photo",
        viewport: { width: 390, height: 844 },
        recentMessages: [
          { role: "user", text: "Make this feel more like my brand." },
          { role: "assistant", text: "Here is the first direction." },
        ],
        capturedAt: "2026-08-08T12:00:00.000Z",
      },
    })

    expect(payload).toMatchObject({
      clientReportId: "report-123",
      reportType: "quality",
      message: "The result is polished, but it does not feel enough like me.",
      context: {
        currentPath: "/app?view=create",
        surface: "create",
        taskId: "maya-task-123",
        viewport: { width: 390, height: 844 },
      },
    })
    expect(payload?.context.recentMessages).toHaveLength(2)
  })

  it("rejects empty, oversized, or malformed reports before they reach the queue", () => {
    expect(normalizeFounderFeedbackPayload({ reportType: "blocked", message: "   " })).toBeNull()
    expect(
      normalizeFounderFeedbackPayload({
        clientReportId: "report-123",
        reportType: "invented",
        message: "This should not be accepted.",
      })
    ).toBeNull()
    expect(
      normalizeFounderFeedbackPayload({
        clientReportId: "report-123",
        reportType: "idea",
        message: "x".repeat(5001),
      })
    ).toBeNull()
  })

  it("summarizes only the latest useful text without storing tool payloads", () => {
    const summaries = summarizeFounderFeedbackMessages(
      Array.from({ length: 9 }, (_, index) => ({
        role: index % 2 ? "assistant" : "user",
        parts: [
          { type: "tool-output-available", output: { private: "do not copy" } },
          { type: "text", text: `Message ${index} ${"x".repeat(1300)}` },
        ],
      }))
    )

    expect(summaries).toHaveLength(6)
    expect(summaries[0].text).toContain("Message 3")
    expect(summaries[0].text.length).toBeLessThanOrEqual(1200)
    expect(JSON.stringify(summaries)).not.toContain("private")
  })

  it("uses human queue language instead of engineering states", () => {
    expect(founderFeedbackStatusLabel("new")).toBe("Received")
    expect(founderFeedbackStatusLabel("fixing")).toBe("Being fixed")
    expect(founderFeedbackStatusLabel("deployed")).toBe("Ready to retest")
    expect(founderFeedbackStatusLabel("verified")).toBe("Fixed")
    expect(canTransitionFounderFeedbackStatus("new", "fixing")).toBe(true)
    expect(canTransitionFounderFeedbackStatus("fixing", "deployed")).toBe(false)
    expect(canTransitionFounderFeedbackStatus("deployed", "verified")).toBe(true)
  })

  it("creates a short strategic subject from the report", () => {
    expect(
      buildFounderFeedbackSubject(
        "quality",
        "The result is polished, but it does not feel enough like me."
      )
    ).toBe(
      "Maya test · Not good enough · The result is polished, but it does not feel enough like me."
    )
  })
})

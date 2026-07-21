import { describe, expect, it } from "vitest"
import {
  buildStoredSectionHref,
  coerceStoredAppSection,
  sanitizeConciergeSnapshot,
  sanitizeMayaDraftForSession,
} from "@/components/app-v3/continuity"
import { sanitizeMayaMessages } from "@/lib/app-v3/maya/message-sanitizer"

describe("App v3 refresh continuity", () => {
  it("keeps the last valid app section and maps it to a refresh-safe URL", () => {
    expect(coerceStoredAppSection("photos", "create")).toBe("photos")
    expect(coerceStoredAppSection("content", "create")).toBe("content")
    expect(coerceStoredAppSection("calendar", "create")).toBe("calendar")
    expect(coerceStoredAppSection("maya", "photos")).toBe("photos")

    expect(buildStoredSectionHref("create")).toBe("/app")
    expect(buildStoredSectionHref("library")).toBe("/app?view=library")
  })

  it("restores only a valid open Maya concierge session", () => {
    const snapshot = sanitizeConciergeSnapshot({
      isOpen: true,
      savedAt: Date.now(),
      session: {
        aesthetic: {
          id: "quiet-luxury",
          name: "Quiet Luxury",
          blurb: "Soft city light.",
          coverImage: "",
          thumbnails: [],
          shotCount: 6,
          intent: "Editorial city shoot.",
        },
        outputFormat: "photo",
        referenceSelfieUrl: "https://example.com/selfie.png",
        graphicText: null,
        seedPrompt: null,
        calendarTarget: {
          requestId: "calendar:12:9",
          feedId: 12,
          postId: 9,
          position: 2,
          caption: "A clear post idea",
          contentPillar: "Authority",
          scheduledAt: "2026-07-20T09:00:00.000Z",
          hasImage: false,
          imageUrl: null,
          aiImageId: null,
          announced: true,
          delivery: {
            generationRequestId: "manual:123",
            imageUrl: "https://example.com/new.png",
            aiImageId: 12,
            previousImageUrl: "https://example.com/original.png",
            previousAiImageId: 9,
          },
        },
        startedAt: 123,
      },
    })

    expect(snapshot?.isOpen).toBe(true)
    expect(snapshot?.session?.aesthetic.name).toBe("Quiet Luxury")
    expect(snapshot?.session.calendarTarget).toMatchObject({
      requestId: "calendar:12:9",
      announced: true,
      aiImageId: null,
      delivery: {
        previousImageUrl: "https://example.com/original.png",
        previousAiImageId: 9,
        previousCaption: "A clear post idea",
        deliveredCaption: "A clear post idea",
      },
    })
    expect(
      sanitizeConciergeSnapshot({ isOpen: true, session: null, savedAt: Date.now() })
    ).toBeNull()
    expect(
      sanitizeConciergeSnapshot({ isOpen: true, session: { aesthetic: {} }, savedAt: Date.now() })
    ).toBeNull()
  })

  it("restores generated concept card images only for the active session", () => {
    const draft = {
      chatId: "chat_123",
      sessionStartedAt: 123,
      savedAt: Date.now(),
      generatedOnce: true,
      setupOpen: false,
      messages: [{ id: "m1", role: "assistant", parts: [{ type: "text", text: "Pick one." }] }],
      genState: {
        "m1:concept-1": {
          status: "done",
          imageUrls: ["https://blob.vercel-storage.com/final.png"],
        },
      },
    }

    expect(sanitizeMayaDraftForSession(draft, 123)?.genState["m1:concept-1"]?.status).toBe("done")
    expect(sanitizeMayaDraftForSession(draft, 999)).toBeNull()
    expect(sanitizeMayaDraftForSession({ ...draft, chatId: "" }, 123)).toBeNull()
  })

  it("strips retired Maya tool parts from restored chat history", () => {
    const messages = [
      {
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "Can I see text styles?" }],
      },
      {
        id: "a1",
        role: "assistant",
        parts: [
          { type: "text", text: "Here are a few." },
          {
            type: "tool-show_style_options",
            toolCallId: "old-tool",
            state: "output-available",
            output: { options: [] },
          },
          {
            type: "tool-emit_concepts",
            toolCallId: "current-tool",
            state: "output-available",
            output: { concepts: [] },
          },
          {
            type: "dynamic-tool",
            toolName: "show_style_options",
            toolCallId: "old-dynamic-tool",
            state: "output-available",
            output: { options: [] },
          },
        ],
      },
    ]

    const cleaned = sanitizeMayaMessages(messages) as any[]

    expect(cleaned).toHaveLength(2)
    expect(cleaned[1].parts.map((part: any) => part.type)).toEqual(["text", "tool-emit_concepts"])
    expect(cleaned[1].parts.some((part: any) => part.toolName === "show_style_options")).toBe(false)
  })
})

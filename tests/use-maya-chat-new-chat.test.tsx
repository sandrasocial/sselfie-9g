import React from "react"
import { act, render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useMayaChat } from "@/components/sselfie/maya/hooks/use-maya-chat"

const useChatCallIds = vi.hoisted(() => [] as string[])
const transportConfigs = vi.hoisted(() => [] as any[])

vi.mock("@ai-sdk/react", () => ({
  useChat: (config: { id?: string }) => {
    useChatCallIds.push(config.id || "")
    return {
      messages: [],
      sendMessage: vi.fn(),
      status: "ready",
      setMessages: vi.fn(),
    }
  },
}))

vi.mock("ai", () => ({
  DefaultChatTransport: class MockDefaultChatTransport {
    constructor(config: unknown) {
      transportConfigs.push(config)
    }
  },
}))

type HookValue = ReturnType<typeof useMayaChat>

function HookHarness({
  onReady,
  activeTab,
}: {
  onReady: (value: HookValue) => void
  activeTab?: "photos" | "plan" | "videos" | "training" | "prompts" | "feed"
}) {
  const value = useMayaChat({
    proMode: false,
    user: null,
    getModeString: () => "maya",
    activeTab,
  })

  React.useEffect(() => {
    onReady(value)
  }, [onReady, value])

  return null
}

describe("useMayaChat handleNewChat", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useChatCallIds.length = 0
    transportConfigs.length = 0
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
      configurable: true,
    })
  })

  it("creates a new chat without throwing runtime errors", async () => {
    const fetchMock = vi.spyOn(global, "fetch" as any).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes("/api/maya/new-chat")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ chatId: 123 }),
        } as Response
      }

      if (url.includes("/api/maya/chats")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ chats: [] }),
        } as Response
      }

      if (url.includes("/api/maya/load-chat")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ chatId: null, chatTitle: "Chat with Maya", messages: [] }),
        } as Response
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({}),
      } as Response
    })

    let hookValue: HookValue | null = null

    render(<HookHarness onReady={(value) => { hookValue = value }} />)

    await waitFor(() => {
      expect(hookValue).not.toBeNull()
    })

    await act(async () => {
      await expect(hookValue!.handleNewChat()).resolves.toBeUndefined()
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/maya/new-chat",
      expect.objectContaining({ method: "POST" }),
    )
  })

  it("creates a videos chat when the active tab is videos", async () => {
    const fetchMock = vi.spyOn(global, "fetch" as any).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.includes("/api/maya/new-chat")) {
        expect(init?.body).toBe(JSON.stringify({ chatType: "videos" }))
        return {
          ok: true,
          status: 200,
          json: async () => ({ chatId: 456 }),
        } as Response
      }

      if (url.includes("/api/maya/chats")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ chats: [] }),
        } as Response
      }

      if (url.includes("/api/maya/load-chat")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ chatId: null, chatTitle: "Chat with Maya", messages: [] }),
        } as Response
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({}),
      } as Response
    })

    let hookValue: HookValue | null = null

    render(<HookHarness activeTab="videos" onReady={(value) => { hookValue = value }} />)

    await waitFor(() => {
      expect(hookValue).not.toBeNull()
    })

    await act(async () => {
      await expect(hookValue!.handleNewChat()).resolves.toBeUndefined()
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/maya/new-chat",
      expect.objectContaining({ method: "POST" }),
    )
  })

  it("isolates the client chat session id between photos and videos tabs", async () => {
    let hookValue: HookValue | null = null

    const { rerender } = render(
      <HookHarness activeTab="photos" onReady={(value) => { hookValue = value }} />,
    )

    await waitFor(() => {
      expect(hookValue).not.toBeNull()
    })

    expect(useChatCallIds.at(-1)).toBe("maya-chat-maya-new")

    rerender(<HookHarness activeTab="videos" onReady={(value) => { hookValue = value }} />)

    await waitFor(() => {
      expect(useChatCallIds.at(-1)).toBe("maya-chat-videos-new")
    })
  })

  it("passes active chat metadata to the Maya chat transport body", async () => {
    let hookValue: HookValue | null = null

    render(
      <HookHarness activeTab="photos" onReady={(value) => { hookValue = value }} />,
    )

    await waitFor(() => {
      expect(hookValue).not.toBeNull()
    })

    expect(transportConfigs.at(-1)).toEqual(
      expect.objectContaining({
        api: "/api/maya/chat",
        body: expect.objectContaining({
          chatId: null,
          chatType: "maya",
        }),
      }),
    )

    await act(async () => {
      hookValue!.setChatId(789)
    })

    await waitFor(() => {
      expect(transportConfigs.at(-1)).toEqual(
        expect.objectContaining({
          body: expect.objectContaining({
            chatId: 789,
            chatType: "maya",
          }),
        }),
      )
    })
  })
})

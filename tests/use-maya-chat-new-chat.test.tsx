import React from "react"
import { act, render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useMayaChat } from "@/components/sselfie/maya/hooks/use-maya-chat"

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: [],
    sendMessage: vi.fn(),
    status: "ready",
    setMessages: vi.fn(),
  }),
}))

vi.mock("ai", () => ({
  DefaultChatTransport: class MockDefaultChatTransport {
    constructor(_config: unknown) {}
  },
}))

type HookValue = ReturnType<typeof useMayaChat>

function HookHarness({ onReady }: { onReady: (value: HookValue) => void }) {
  const value = useMayaChat({
    proMode: false,
    user: null,
    getModeString: () => "maya",
  })

  React.useEffect(() => {
    onReady(value)
  }, [onReady, value])

  return null
}

describe("useMayaChat handleNewChat", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
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
})

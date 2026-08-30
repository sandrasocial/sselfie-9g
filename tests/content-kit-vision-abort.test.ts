// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  messagesCreate: vi.fn(),
}))

vi.mock("server-only", () => ({}))

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mocks.messagesCreate },
  })),
}))

vi.mock("@/lib/content/grounding", () => ({
  groundingSystemPrompt: () => "grounded",
}))

describe("content-kit vision aborts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENROUTER_API_KEY = "openrouter-test"
    process.env.ANTHROPIC_API_KEY = "anthropic-test"
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("cancels OpenRouter and does not start Anthropic fallback after the deadline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), {
              once: true,
            })
          })
      )
    )
    const { callContentKitVision } = await import("@/lib/content-kit/llm")
    const controller = new AbortController()

    const pending = callContentKitVision("plan", ["https://example.com/image.png"], undefined, {
      signal: controller.signal,
    })
    controller.abort()

    await expect(pending).rejects.toThrow("aborted")
    expect(mocks.messagesCreate).not.toHaveBeenCalled()
  })

  it("passes the shared deadline to Anthropic without provider retries", async () => {
    delete process.env.OPENROUTER_API_KEY
    mocks.messagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "planned" }],
      stop_reason: "end_turn",
    })
    const { callContentKitVision } = await import("@/lib/content-kit/llm")
    const controller = new AbortController()

    await expect(
      callContentKitVision("plan", ["https://example.com/image.png"], undefined, {
        signal: controller.signal,
      })
    ).resolves.toBe("planned")

    expect(mocks.messagesCreate).toHaveBeenCalledWith(expect.any(Object), {
      signal: controller.signal,
      maxRetries: 0,
    })
  })
})

import { describe, expect, it } from "vitest"

import {
  getMayaMaxTokensForTask,
  getMayaModelForTask,
  resolveMayaChatTask,
} from "@/lib/maya/openrouter"

describe("Maya OpenRouter model routing", () => {
  it("uses lower-cost model for default Maya conversation", () => {
    expect(getMayaModelForTask("chat_default")).toBe("anthropic/claude-haiku-4.5")
  })

  it("uses higher-quality model for pro and prompt-heavy tasks", () => {
    expect(getMayaModelForTask("chat_pro")).toBe("anthropic/claude-sonnet-4.5")
    expect(getMayaModelForTask("prompt_builder")).toBe("anthropic/claude-sonnet-4.5")
    expect(getMayaModelForTask("feed_prompt")).toBe("anthropic/claude-sonnet-4.5")
  })

  it("gives feed planner extra output budget to finish inline strategy payloads", () => {
    expect(getMayaMaxTokensForTask("chat_default")).toBe(4096)
    expect(getMayaMaxTokensForTask("feed_planner")).toBe(8192)
  })

  it("resolves chat task from chat context", () => {
    expect(
      resolveMayaChatTask({
        chatType: "maya",
        isPromptBuilder: false,
        isStudioProMode: false,
      }),
    ).toBe("chat_default")

    expect(
      resolveMayaChatTask({
        chatType: "maya",
        isPromptBuilder: false,
        isStudioProMode: true,
      }),
    ).toBe("chat_pro")

    expect(
      resolveMayaChatTask({
        chatType: "prompt_builder",
        isPromptBuilder: true,
        isStudioProMode: true,
      }),
    ).toBe("prompt_builder")

    expect(
      resolveMayaChatTask({
        chatType: "feed_planner",
        isPromptBuilder: false,
        isStudioProMode: false,
      }),
    ).toBe("feed_planner")

    expect(
      resolveMayaChatTask({
        chatType: "feed-planner",
        isPromptBuilder: false,
        isStudioProMode: false,
      }),
    ).toBe("feed_planner")

    expect(
      resolveMayaChatTask({
        chatType: "maya",
        isPromptBuilder: false,
        isStudioProMode: false,
        preferFeedPlannerContext: true,
      }),
    ).toBe("feed_planner")
  })
})

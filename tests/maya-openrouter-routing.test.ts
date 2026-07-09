// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

import {
  getMayaMaxTokensForTask,
  getMayaModelForTask,
  isMayaOpenRouterPrimaryEnabled,
  resolveMayaChatTask,
} from "@/lib/maya/openrouter"

const ROOT = process.cwd()
const OPENROUTER_MIGRATED_FILES = [
  "app/api/feed-planner/enhance-goal/route.ts",
  "app/api/feed/[feedId]/add-highlight-overlay/route.ts",
  "app/api/feed/[feedId]/add-row/route.ts",
  "app/api/feed/[feedId]/enhance-caption/route.ts",
  "app/api/feed/[feedId]/generate-highlights/route.ts",
  "app/api/feed/[feedId]/generate-profile/route.ts",
  "app/api/feed/[feedId]/generate-strategy/route.ts",
  "app/api/maya/chat/route.ts",
  "app/api/maya/instagram-tips/route.ts",
  "lib/feed-planner/caption-writer.ts",
  "lib/feed-planner/instagram-strategy-agent.ts",
]

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

describe("Maya OpenRouter model routing", () => {
  it("uses lower-cost model for default Maya conversation", () => {
    expect(getMayaModelForTask("chat_default")).toBe("anthropic/claude-haiku-4.5")
  })

  it("uses higher-quality model for pro and prompt-heavy tasks", () => {
    expect(getMayaModelForTask("chat_pro")).toBe("anthropic/claude-sonnet-5")
    expect(getMayaModelForTask("prompt_builder")).toBe("anthropic/claude-sonnet-5")
    expect(getMayaModelForTask("feed_prompt")).toBe("anthropic/claude-sonnet-5")
    expect(getMayaModelForTask("instagram_caption")).toBe("anthropic/claude-sonnet-5")
    expect(getMayaModelForTask("feed_strategy_document")).toBe("anthropic/claude-sonnet-5")
  })

  it("gives feed planner extra output budget to finish inline strategy payloads", () => {
    expect(getMayaMaxTokensForTask("chat_default")).toBe(4096)
    expect(getMayaMaxTokensForTask("feed_planner")).toBe(8192)
    expect(getMayaMaxTokensForTask("instagram_bio")).toBe(1000)
    expect(getMayaMaxTokensForTask("feed_highlight_overlay")).toBe(256)
  })

  it("defaults OpenRouter primary on unless explicitly disabled", () => {
    expect(isMayaOpenRouterPrimaryEnabled(undefined)).toBe(true)
    expect(isMayaOpenRouterPrimaryEnabled("false")).toBe(false)
    expect(isMayaOpenRouterPrimaryEnabled("0")).toBe(false)
    expect(isMayaOpenRouterPrimaryEnabled("true")).toBe(true)
  })

  it("routes migrated Maya and feed tools through the shared OpenRouter helper", () => {
    for (const relPath of OPENROUTER_MIGRATED_FILES) {
      const contents = read(relPath)
      expect(contents).toMatch(/createMayaOpenRouter(Model|FallbackModel)\(/)
      expect(contents).not.toMatch(/model:\s*"(anthropic|openai)\//)
      expect(contents).not.toMatch(/builder:\s*"(anthropic|openai)\//)
    }
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

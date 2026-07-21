import { describe, expect, it } from "vitest"

import {
  getAppV3ChatMaxOutputTokens,
  getAppV3ChatTask,
} from "@/lib/app-v3/maya/cost-controls"
import {
  estimateMayaTextCostUsd,
  normalizeMayaUsage,
} from "@/lib/maya/ai-usage"

describe("Maya AI cost controls", () => {
  it("keeps Sonnet headroom only for complex creative plans", () => {
    expect(getAppV3ChatMaxOutputTokens("carousel", false)).toBe(16_384)
    expect(getAppV3ChatMaxOutputTokens("story-sequence", false)).toBe(16_384)
    expect(getAppV3ChatMaxOutputTokens("photoshoot", false)).toBe(9_000)
    expect(getAppV3ChatMaxOutputTokens("photo", false)).toBe(5_000)
    expect(getAppV3ChatMaxOutputTokens("video", false)).toBe(3_000)
    expect(getAppV3ChatMaxOutputTokens("photo", true)).toBe(1_200)
  })

  it("uses Haiku for clarification and Sonnet for committed creative work", () => {
    expect(getAppV3ChatTask({ needsFormatClarification: true })).toBe("chat_default")
    expect(getAppV3ChatTask({ needsFormatClarification: false })).toBe("chat_pro")
  })

  it("normalizes token usage without storing prompt content", () => {
    expect(
      normalizeMayaUsage({
        inputTokens: { total: 10_000, noCache: 8_000, cacheRead: 2_000, cacheWrite: 0 },
        outputTokens: { total: 500, text: 500, reasoning: 0 },
      })
    ).toEqual({
      inputTokens: 10_000,
      noCacheTokens: 8_000,
      cacheReadTokens: 2_000,
      cacheWriteTokens: 0,
      outputTokens: 500,
      reasoningTokens: 0,
      totalTokens: 10_500,
    })
  })

  it("does not double count cached input when providers omit no-cache details", () => {
    expect(
      normalizeMayaUsage({
        inputTokens: 10_000,
        inputTokenDetails: { cacheReadTokens: 2_000 },
        outputTokens: 500,
      })
    ).toMatchObject({
      inputTokens: 10_000,
      noCacheTokens: 8_000,
      cacheReadTokens: 2_000,
      cacheWriteTokens: 0,
    })
  })

  it("estimates Sonnet and Haiku costs using current routed rates", () => {
    expect(
      estimateMayaTextCostUsd("anthropic/claude-sonnet-5", {
        inputTokens: 10_000,
        noCacheTokens: 10_000,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        outputTokens: 1_000,
        reasoningTokens: 0,
        totalTokens: 11_000,
      })
    ).toBeCloseTo(0.03, 6)
    expect(
      estimateMayaTextCostUsd("anthropic/claude-haiku-4.5", {
        inputTokens: 10_000,
        noCacheTokens: 10_000,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        outputTokens: 1_000,
        reasoningTokens: 0,
        totalTokens: 11_000,
      })
    ).toBeCloseTo(0.015, 6)
  })
})

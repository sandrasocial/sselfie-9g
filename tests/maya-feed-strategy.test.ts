import { describe, expect, it } from "vitest"

import {
  extractFeedStrategyJson,
  isSupportedFeedPlanPostCount,
  shouldRetryInlineFeedGeneration,
  stripFeedStrategyArtifacts,
} from "@/lib/maya/feed-strategy"

describe("maya feed strategy helpers", () => {
  it("extracts fenced feed strategy JSON from Maya responses", () => {
    const value = extractFeedStrategyJson(
      'I built your grid.\n\n[CREATE_FEED_STRATEGY]\n```json\n{"feedTitle":"Launch","posts":[{"position":1,"visualDirection":"Portrait"}]}\n```',
    )

    expect(value).toContain('"feedTitle":"Launch"')
    expect(value).toContain('"position":1')
  })

  it("strips feed strategy payload fragments from user-facing text", () => {
    const value = stripFeedStrategyArtifacts(
      'I built your grid.\n\n[CREATE_FEED_STRATEGY]\n```json\n{"feedTitle":"Launch"}\n```\n"posts":[{"position":1,"visualDirection":"Portrait"}]',
    )

    expect(value).toBe("I built your grid.")
  })

  it("treats feed cards as 6-, 9-, or 12-post layouts and only retries transient failures", () => {
    expect(isSupportedFeedPlanPostCount(6)).toBe(true)
    expect(isSupportedFeedPlanPostCount(9)).toBe(true)
    expect(isSupportedFeedPlanPostCount(12)).toBe(true)
    expect(isSupportedFeedPlanPostCount(8)).toBe(false)

    expect(shouldRetryInlineFeedGeneration(400)).toBe(false)
    expect(shouldRetryInlineFeedGeneration(429)).toBe(true)
    expect(shouldRetryInlineFeedGeneration(500)).toBe(true)
  })
})

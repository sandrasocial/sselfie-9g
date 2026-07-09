// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("PHASE2-MODEL-REFRESH-01 current model contract", () => {
  it("routes OpenRouter quality tasks to live Sonnet 5 and keeps Haiku on its current tier", () => {
    const router = read("lib/maya/openrouter.ts")

    expect(router).toContain('chat_default: "anthropic/claude-haiku-4.5"')
    expect(router).toContain('chat_pro: "anthropic/claude-sonnet-5"')
    expect(router).toContain('instagram_caption: "anthropic/claude-sonnet-5"')
    expect(router).toContain('"anthropic/claude-haiku-4.5": "claude-haiku-4-5-20251001"')
    expect(router).toContain('"anthropic/claude-sonnet-5": "claude-sonnet-4-6"')
  })

  it("uses verified direct IDs for direct-only Anthropic calls", () => {
    const cronHealth = read("app/api/cron/cron-health-check/route.ts")
    const trends = read("lib/this-week/trends.ts")
    const contentKit = read("lib/content-kit/llm.ts")

    expect(cronHealth).toContain('model: "claude-haiku-4-5-20251001"')
    expect(trends).toContain('const DIGEST_MODEL = "claude-sonnet-5"')
    expect(contentKit).toContain('const OPENROUTER_MODEL = "anthropic/claude-sonnet-5"')
    expect(contentKit).toContain('const ANTHROPIC_MODEL = "claude-sonnet-5"')
  })

  it("removes the retired model IDs from the refreshed files", () => {
    const refreshedSource = [
      "lib/maya/openrouter.ts",
      "app/api/cron/cron-health-check/route.ts",
      "lib/this-week/trends.ts",
      "lib/content-kit/llm.ts",
    ]
      .map(read)
      .join("\n")

    for (const staleId of [
      "anthropic/claude-sonnet-4.5",
      'anthropic/claude-sonnet-4"',
      "claude-3-7-sonnet-20250219",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-sonnet-4-5",
    ]) {
      expect(refreshedSource).not.toContain(staleId)
    }
  })
})

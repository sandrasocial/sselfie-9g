import { describe, expect, it } from "vitest"

import {
  MAYA_CHAT_TYPE_FEED_PLANNER,
  getMayaChatTypeAliases,
  isFeedPlannerChatType,
  normalizeMayaChatType,
} from "@/lib/maya/chat-type"

describe("Maya chat type normalization", () => {
  it("normalizes all legacy feed planner aliases to one persisted value", () => {
    expect(normalizeMayaChatType("feed-planner")).toBe(MAYA_CHAT_TYPE_FEED_PLANNER)
    expect(normalizeMayaChatType("feed_planner")).toBe(MAYA_CHAT_TYPE_FEED_PLANNER)
    expect(normalizeMayaChatType("feed_designer")).toBe(MAYA_CHAT_TYPE_FEED_PLANNER)
    expect(normalizeMayaChatType("feed-designer")).toBe(MAYA_CHAT_TYPE_FEED_PLANNER)
  })

  it("reports feed planner aliases for backward-compatible reads", () => {
    expect(getMayaChatTypeAliases("feed-planner")).toEqual([
      "feed_planner",
      "feed-planner",
      "feed_designer",
      "feed-designer",
    ])
  })

  it("identifies feed planner chats regardless of legacy spelling", () => {
    expect(isFeedPlannerChatType("feed_planner")).toBe(true)
    expect(isFeedPlannerChatType("feed-planner")).toBe(true)
    expect(isFeedPlannerChatType("feed_designer")).toBe(true)
    expect(isFeedPlannerChatType("maya")).toBe(false)
  })
})

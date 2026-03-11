import { describe, expect, it } from "vitest"

import {
  MAYA_CHAT_TYPE_FEED_PLANNER,
  MAYA_CHAT_TYPE_VIDEOS,
  getMayaChatTypeAliases,
  isFeedPlannerChatType,
  isVideosChatType,
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

  it("normalizes Maya video aliases to one persisted value", () => {
    expect(normalizeMayaChatType("videos")).toBe(MAYA_CHAT_TYPE_VIDEOS)
    expect(normalizeMayaChatType("maya-videos")).toBe(MAYA_CHAT_TYPE_VIDEOS)
    expect(normalizeMayaChatType("maya_videos")).toBe(MAYA_CHAT_TYPE_VIDEOS)
  })

  it("identifies feed planner chats regardless of legacy spelling", () => {
    expect(isFeedPlannerChatType("feed_planner")).toBe(true)
    expect(isFeedPlannerChatType("feed-planner")).toBe(true)
    expect(isFeedPlannerChatType("feed_designer")).toBe(true)
    expect(isFeedPlannerChatType("maya")).toBe(false)
  })

  it("identifies videos chats regardless of legacy spelling", () => {
    expect(isVideosChatType("videos")).toBe(true)
    expect(isVideosChatType("maya-videos")).toBe(true)
    expect(isVideosChatType("maya_videos")).toBe(true)
    expect(isVideosChatType("maya")).toBe(false)
  })
})

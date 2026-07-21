// @vitest-environment node

import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8")

describe("Maya operating layer Phase 1 integration contract", () => {
  it("gates task-scoped context behind Sandra's operating-layer decision", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")
    const context = read("components/app-v3/concierge-context.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(shell).toContain("operatingLayerEnabled={mayaOperatingLayerEnabled}")
    expect(context).toContain("operatingLayerEnabled = false")
    expect(concierge).toContain("operatingLayerEnabled")
  })

  it("uses the envelope taskId as the conversation identity", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(concierge).toContain("session.mayaContext.taskId")
    expect(concierge).toContain("readMayaTaskDraft")
    expect(concierge).toContain("saveMayaTaskDraft")
    expect(concierge).toContain("hydrateTaskConversation")
  })

  it("never appends a new Calendar target to the current Create or post task", () => {
    const context = read("components/app-v3/concierge-context.tsx")

    expect(context).toContain("calendarMayaTaskId(target.feedId, target.postId)")
    expect(context).toContain("createCleanSession")
    expect(context).not.toContain("Calendar is another surface for the same conversation")
  })

  it("keeps the working single-overlay post handoff", () => {
    const calendar = read("components/feed-planner/instagram-feed-view.tsx")

    const closeSheet = calendar.indexOf("setSelectedPost(null)")
    const openMaya = calendar.indexOf("feedNav?.navigateToMaya?.(target)", closeSheet)
    expect(closeSheet).toBeGreaterThan(-1)
    expect(openMaya).toBeGreaterThan(closeSheet)
  })

  it("does not modify a protected creative source", () => {
    const protectedFreeze = read("tests/maya-calendar-prompt-source-freeze.test.ts")
    expect(protectedFreeze).toContain("prompt-bearing")
  })
})

// @vitest-environment node

import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8")

describe("founder-only Maya Home", () => {
  it("makes the allowlisted Create destination an always-ready Maya conversation", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(shell).toContain("MayaHomeWorkspace")
    expect(shell).toContain('label: "Maya", icon: MessageCircle')
    expect(shell).toContain('homeMode={mayaHomeEnabled && section === "create"}')
    expect(shell).toContain("vaultMayaIncluded && !mayaHomeEnabled")
    expect(concierge).toContain('role={homeMode ? "region" : "dialog"}')
    expect(concierge).toContain("Ask Maya anything…")
    expect(concierge).toContain("What should I focus on today?")
    expect(concierge).toContain("What Maya knows")
  })

  it("starts neutral instead of reopening an unrelated format task", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")

    expect(shell).toContain("const alreadyNeutral")
    expect(shell).toContain('sessionSurface === "create"')
    expect(shell).toContain("!sessionOutputFormat && !sessionCreationIdea")
    expect(shell).toContain("openWithAesthetic(MAYA_GENERAL")
    expect(shell).toContain("A specific previous Create task stays in History")
  })

  it("answers ordinary questions with the paid-quality route and silently hands off visuals", () => {
    const route = read("app/api/app-v3/maya/chat/route.ts")
    const prompt = read("lib/maya/general-assistant-persona.ts")

    expect(route).toContain("const generalConversation = !committedFormat")
    expect(route).toContain('generalConversation\n      ? "chat_pro"')
    expect(route).toContain(
      "getMayaGeneralAssistantPrompt({ memory, recentActivity, brandContext })"
    )
    expect(prompt).toContain("Start by helping with the actual request")
    expect(prompt).toContain("For writing, give her usable words in the chat")
    expect(prompt).toContain("set_format with the matching format")
  })

  it("keeps the public member experience behind the existing server-owned allowlist", () => {
    const rollout = read("lib/app-v3/maya/operating-layer-rollout.ts")
    const page = read("app/app/page.tsx")

    expect(rollout).toContain("MAYA_HOME_ALLOWLIST || process.env.MAYA_OPERATING_LAYER_ALLOWLIST")
    expect(rollout).not.toContain("NEXT_PUBLIC")
    expect(page).toContain("isMayaHomeEnabled")
    expect(page).toContain("isMayaOperatingLayerEnabled")
  })
})

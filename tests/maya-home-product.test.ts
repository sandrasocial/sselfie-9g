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

  it("owns one finished weekly outcome instead of presenting another tool menu", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const prompt = read("lib/maya/general-assistant-persona.ts")
    const inline = read("components/app-v3/maya-inline-components.tsx")
    const route = read("app/api/app-v3/maya/chat/route.ts")
    const placementRoute = read("app/api/app-v3/maya/feed-plan/place-photo/route.ts")

    expect(concierge).toContain("Finish this week&apos;s content")
    expect(concierge).toContain("WEEKLY_VISIBILITY_PACKAGE_REQUEST")
    expect(concierge).toContain("suite_weekly_package_started")
    expect(concierge).toContain("suite_weekly_package_planned")
    expect(prompt).toContain("WEEKLY VISIBILITY OUTCOME")
    expect(prompt).toContain("call set_format in the same turn")
    expect(prompt).toContain("Do not give her a content plan and stop")
    expect(inline).toContain("Your weekly package")
    expect(inline).toContain("Core piece ready")
    expect(inline).toContain("Add it to your plan for the caption")
    expect(route).toContain('"unfinished"')
    expect(concierge).toContain("weeklyPackage: true")
    expect(placementRoute).toContain("resolveWeeklyPackageCalendarCopy")
  })

  it("keeps the public member experience behind the existing server-owned allowlist", () => {
    const rollout = read("lib/app-v3/maya/operating-layer-rollout.ts")
    const page = read("app/app/page.tsx")

    expect(rollout).toContain("MAYA_HOME_ALLOWLIST || process.env.MAYA_OPERATING_LAYER_ALLOWLIST")
    expect(rollout).not.toContain("NEXT_PUBLIC")
    expect(page).toContain("isMayaHomeEnabled")
    expect(page).toContain("isMayaOperatingLayerEnabled")
  })

  it("gives the founder a durable report-and-continue testing lane", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const capture = read("components/app-v3/maya-founder-test-mode.tsx")
    const feedbackContract = read("lib/app-v3/maya/founder-feedback.ts")
    const route = read("app/api/app-v3/maya/founder-feedback/route.ts")
    const attachmentRoute = read("app/api/admin/customer-support/feedback-attachment/route.ts")
    const migration = read("db/migrations/71-add-maya-founder-feedback-workflow.sql")

    expect(concierge).toContain("MayaFounderTestMode")
    expect(concierge).toContain("messages={messages}")
    expect(capture).toContain("Save and keep testing")
    expect(feedbackContract).toContain("Not good enough")
    expect(capture).toContain("Reports")
    expect(route).toContain("isMayaHomeEnabled")
    expect(route).toContain("client_report_id")
    expect(route).toContain("VERCEL_GIT_COMMIT_SHA")
    expect(route).toContain("encryptFounderScreenshot")
    expect(route).toContain('access: "public"')
    expect(route).toContain("screenshotEncryption.body")
    expect(route).toContain("uploaded.pathname")
    expect(attachmentRoute).toContain('get(pathname, { access: "public"')
    expect(attachmentRoute).toContain("decryptFounderScreenshot")
    expect(attachmentRoute).toContain("user?.email === ADMIN_EMAIL")
    expect(migration).toContain("founder_test_status")
    expect(migration).toContain("feedback_context")
    expect(migration).toContain("resolution_commit_sha")
  })
})

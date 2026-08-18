// @vitest-environment node

import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8")

describe("member Maya Home", () => {
  it("makes the member Create destination an always-ready Maya conversation", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(shell).toContain("MayaHomeWorkspace")
    expect(shell).toContain('label: "Maya", icon: MessageCircle')
    expect(shell).toContain("const [sectionReady, setSectionReady] = useState(true)")
    expect(shell).toContain('saveStoredAppSection("create")')
    expect(shell).toContain('homeMode={mayaHomeEnabled && section === "create"}')
    expect(shell).toContain("vaultMayaIncluded && !mayaHomeEnabled")
    expect(concierge).toContain('role={homeMode ? "region" : "dialog"}')
    expect(concierge).toContain("Tell Maya the messy version…")
    expect(concierge).toContain("One idea in. One finished post out.")
    expect(concierge).toContain("what do you want to say?")
    expect(concierge).toContain("Brand profile")
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
    expect(route).toContain("getMayaGeneralAssistantPrompt({")
    expect(route).toContain("brandContext: neutralBrandContext")
    expect(prompt).toContain("Start with the actual thought, even when it is messy")
    expect(prompt).toContain("For writing, give her usable words in the chat")
    expect(prompt).toContain("recommend one format in plain language")
    expect(prompt).toContain("Do not call set_format until")
  })

  it("owns one selfie-led finished post instead of presenting another tool menu", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const prompt = read("lib/maya/general-assistant-persona.ts")
    const inline = read("components/app-v3/maya-inline-components.tsx")
    const route = read("app/api/app-v3/maya/chat/route.ts")
    const finishRoute = read("app/api/app-v3/maya/finish-post/route.ts")

    expect(concierge).toContain("Tell me what you want to say, share, or sell")
    expect(concierge).not.toContain('aria-label="Ways Maya can help"')
    expect(concierge).toContain("NEXT_POST_REQUEST")
    expect(concierge).toContain('homeMode ? "starter_chip" : "gallery_action"')
    expect(concierge).not.toContain("suite_weekly_package_started")
    expect(concierge).toContain('fetch("/api/app-v3/maya/finish-post"')
    expect(concierge).not.toContain('fetch("/api/app-v3/maya/feed-plan/place-photo"')
    expect(prompt).toContain("NEXT POST OUTCOME")
    expect(prompt).toContain("wait for her confirmation")
    expect(prompt).toContain("Prefer a selfie-led photo post")
    expect(prompt).toContain("Do not give her a content plan and stop")
    expect(inline).toContain("Make it more like me")
    expect(inline).toContain("Maya recommends one format")
    expect(inline).toContain("You confirm it")
    expect(inline).not.toContain("Maya chooses the strongest format")
    expect(inline).not.toContain("Photos")
    expect(inline).not.toContain("Slides")
    expect(inline).not.toContain("Motion")
    expect(inline).not.toContain("More things Maya can make")
    expect(route).toContain('"unfinished"')
    expect(finishRoute).toContain("generateInstagramCaption")
    expect(finishRoute).not.toContain("resolveWeeklyPackageCalendarCopy")
  })

  it("keeps Maya Home to Maya, Work, and You while preserving direct legacy routes", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")

    expect(shell).toContain('label: "Maya", icon: MessageCircle')
    expect(shell).toContain('label: "Work", icon: FolderOpen')
    expect(shell).toContain('label: "You", icon: UserRound')
    expect(shell).toContain("NAV.filter(item => isPrimaryMemberSection(item.id))")
  })

  it("retires the founder allowlist and keeps limited accounts protected", () => {
    const rollout = read("lib/app-v3/maya/operating-layer-rollout.ts")
    const page = read("app/app/page.tsx")

    expect(rollout).toContain('identity?.accessLevel === "full"')
    expect(rollout).toContain('identity?.accessLevel === "trial"')
    expect(rollout).not.toContain("MAYA_HOME_ALLOWLIST")
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
    expect(concierge).toContain('homeMode && cohort === "admin"')
    expect(concierge).toContain("messages={messages}")
    expect(capture).toContain("Save and keep testing")
    expect(feedbackContract).toContain("Not good enough")
    expect(capture).toContain("Reports")
    expect(route).toContain("isAdminEmail")
    expect(route).toContain("client_report_id")
    expect(route).toContain("VERCEL_GIT_COMMIT_SHA")
    expect(route).toContain("encryptFounderScreenshot")
    expect(route).toContain('access: "public"')
    expect(route).toContain("screenshotEncryption.body")
    expect(route).toContain("uploaded.pathname")
    expect(attachmentRoute).toContain("head(pathname)")
    expect(attachmentRoute).toContain("fetch(attachment.url")
    expect(attachmentRoute).toContain("decryptFounderScreenshot")
    expect(attachmentRoute).toContain("user?.email === ADMIN_EMAIL")
    expect(migration).toContain("founder_test_status")
    expect(migration).toContain("feedback_context")
    expect(migration).toContain("resolution_commit_sha")
  })
})

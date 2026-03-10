// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

describe("maya landing page chat hygiene", () => {
  it("surfaces landing pages in Maya entry actions while keeping the UI flag available", () => {
    const mayaChatScreen = read("components/sselfie/maya-chat-screen.tsx")
    expect(mayaChatScreen).toContain("Build a page")
    expect(mayaChatScreen).toContain("NEXT_PUBLIC_FEATURE_MAYA_LANDING_PAGES_UI")
  })

  it("keeps feed planning inline from the Maya home state", () => {
    const mayaChatScreen = read("components/sselfie/maya-chat-screen.tsx")
    expect(mayaChatScreen).toContain('handleSendMessage("Plan my week and build an Instagram feed for my offer")')
    expect(mayaChatScreen).not.toContain('setActiveTab?.("feed-planner")')
  })

  it("removes duplicate header upload/library actions in Maya shell", () => {
    const mayaChatScreen = read("components/sselfie/maya-chat-screen.tsx")
    expect(mayaChatScreen).toContain("onManageLibrary={undefined}")
    expect(mayaChatScreen).toContain("onAddImages={undefined}")
    expect(mayaChatScreen).toContain("onStartFresh={undefined}")
    expect(mayaChatScreen).toContain("onEditIntent={undefined}")
  })

  it("keeps new chat scoped to conversation reset without clearing image library", () => {
    const mayaChatScreen = read("components/sselfie/maya-chat-screen.tsx")
    const handleNewChatBlock = mayaChatScreen.match(/const handleNewChat[\s\S]*?\}, \[baseHandleNewChat[\s\S]*?\]\)/)?.[0] || ""
    expect(handleNewChatBlock).toContain("await baseHandleNewChat()")
    expect(handleNewChatBlock).not.toContain("clearLibrary(")
  })

  it("enables landing page routing in maya chat by default while preserving an explicit off switch", () => {
    const mayaChatRoute = read("app/api/maya/chat/route.ts")
    expect(mayaChatRoute).toContain("if (!envValue) return true")
    expect(mayaChatRoute).toContain("Landing pages are paused right now")
  })
})

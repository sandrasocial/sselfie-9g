// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

describe("maya landing page chat hygiene", () => {
  it("removes landing pages from Maya entry actions and retired page prompts", () => {
    const mayaChatScreen = read("components/sselfie/maya-chat-screen.tsx")
    expect(mayaChatScreen).not.toContain("Build a page")
    expect(mayaChatScreen).not.toContain("Create a landing page draft for my current offer")
    expect(mayaChatScreen).not.toContain("or a page draft")
  })

  it("removes plan-my-week from Maya home actions (stabilization)", () => {
    const mayaChatScreen = read("components/sselfie/maya-chat-screen.tsx")
    expect(mayaChatScreen).not.toContain('handleSendMessage("Plan my week and build an Instagram feed for my offer")')
    expect(mayaChatScreen).not.toContain('setActiveTab?.("feed-planner")')
    expect(mayaChatScreen).not.toContain('onPlanFeed')
  })

  it("removes duplicate header upload/library actions in Maya shell", () => {
    const mayaChatScreen = read("components/sselfie/maya-chat-screen.tsx")
    expect(mayaChatScreen).toContain("onManageLibrary={undefined}")
    expect(mayaChatScreen).toContain("onAddImages={undefined}")
    expect(mayaChatScreen).not.toContain("onStartFresh={undefined}")
    expect(mayaChatScreen).toContain("onEditIntent={undefined}")
  })

  it("keeps new chat scoped to conversation reset without clearing image library", () => {
    const mayaChatScreen = read("components/sselfie/maya-chat-screen.tsx")
    const handleNewChatBlock = mayaChatScreen.match(/const handleNewChat[\s\S]*?\}, \[baseHandleNewChat[\s\S]*?\]\)/)?.[0] || ""
    expect(handleNewChatBlock).toContain("await baseHandleNewChat()")
    expect(handleNewChatBlock).not.toContain("clearLibrary(")
  })

  it("retires landing page routing in maya chat", () => {
    const mayaChatRoute = read("app/api/maya/chat/route.ts")
    expect(mayaChatRoute).toContain("Landing page drafts are retired right now")
  })
})

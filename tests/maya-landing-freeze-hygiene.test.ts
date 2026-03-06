// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

describe("maya landing freeze hygiene", () => {
  it("keeps landing pages hidden from entry prompts and enables UI flag gating", () => {
    const mayaChatScreen = read("components/sselfie/maya-chat-screen.tsx")
    expect(mayaChatScreen).not.toContain("Build Landing Page")
    expect(mayaChatScreen).toContain("NEXT_PUBLIC_FEATURE_MAYA_LANDING_PAGES_UI")
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

  it("uses paused routing copy for landing page intents in maya chat route", () => {
    const mayaChatRoute = read("app/api/maya/chat/route.ts")
    expect(mayaChatRoute).toContain("Landing pages are paused right now")
    expect(mayaChatRoute).not.toContain("I opened your Studio Hub so you can continue page work there.")
  })
})

// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

describe("maya layout hygiene", () => {
  it("uses a valid fixed header z-index utility", () => {
    const mayaChatScreen = read("components/sselfie/maya-chat-screen.tsx")
    expect(mayaChatScreen).toContain("z-[100]")
    expect(mayaChatScreen).not.toContain("z-100")
  })

  it("does not render a duplicate legacy showNavMenu overlay in maya-chat-screen", () => {
    const mayaChatScreen = read("components/sselfie/maya-chat-screen.tsx")
    // Navigation overlay should be owned by MayaHeader to avoid double overlays.
    expect(mayaChatScreen).not.toContain("{showNavMenu && (")
  })

  it("keeps mobile input controls compact to avoid horizontal overflow", () => {
    const unifiedInput = read("components/sselfie/maya/maya-unified-input.tsx")
    expect(unifiedInput).toContain("secondaryToolbarButtonClass")
    expect(unifiedInput).toContain("h-9 px-3")
    expect(unifiedInput).toContain("min-w-[56px] sm:min-w-[96px]")
  })

  it("uses concise mobile action labels to reduce input bar clutter", () => {
    const unifiedInput = read("components/sselfie/maya/maya-unified-input.tsx")
    expect(unifiedInput).toContain("font-medium")
    expect(unifiedInput).toContain("Image")
    expect(unifiedInput).toContain("sm:hidden\">Go</span>")
  })

  it("keeps chat and video tabs lightweight so they don't dominate the chat canvas", () => {
    const tabSwitcher = read("components/sselfie/maya/maya-tab-switcher.tsx")
    expect(tabSwitcher).toContain("min-h-[34px] sm:min-h-[36px]")
    expect(tabSwitcher).toContain("letterSpacing: \"0.26em\"")
    expect(tabSwitcher).toContain('inline: "nearest"')
    expect(tabSwitcher).not.toContain("rounded-full border transition-all")
    expect(tabSwitcher).not.toContain("container.scrollTo({")
  })

  it("uses the shared scroll shell with Maya overflow visibility", () => {
    const appShell = read("components/sselfie/sselfie-app.tsx")
    expect(appShell).toContain("const appShellClassName =")
    expect(appShell).toContain('activeTab === "maya"')
    expect(appShell).toContain('"relative h-full overflow-visible"')
    expect(appShell).toContain('`relative h-full ${DesignClasses.container} overflow-hidden`')
    expect(appShell).toContain("overflow-y-auto")
    expect(appShell).toContain("StudioAppTopBar")
    expect(appShell).toContain("--studio-app-header-height")
  })

  it("always shows the selfie and my model toggle on the Maya photos surface", () => {
    const mayaChatScreen = read("components/sselfie/maya-chat-screen.tsx")
    expect(mayaChatScreen).toContain('showModeToggle={activeMayaTab === "photos"}')
    expect(mayaChatScreen).not.toContain("showModeToggle={!hideModeComplexity && activeMayaTab === \"photos\"}")
  })

  it("uses the shared header offset contract across Maya tab surfaces", () => {
    const mayaChatScreen = read("components/sselfie/maya-chat-screen.tsx")
    const mayaChatInterface = read("components/sselfie/maya/maya-chat-interface.tsx")

    expect(mayaChatScreen).toContain("--studio-app-header-height")
    expect(mayaChatScreen).toContain("MAYA_SURFACE_TOP_OFFSET")
    expect(mayaChatScreen).not.toContain('calc(var(--maya-header-height, 124px) + 8px)')
    expect(mayaChatScreen).not.toContain("calc(106px + max(0.625rem, env(safe-area-inset-top, 0px)))")
    expect(mayaChatInterface).toContain("MAYA_CHAT_SCROLL_TOP_OFFSET")
    expect(mayaChatInterface).not.toContain('calc(var(--maya-header-height, 124px) + 16px)')
  })

  it("keeps Maya fixed-header tabs on a single scroll shell", () => {
    const mayaChatScreen = read("components/sselfie/maya-chat-screen.tsx")
    const mayaTrainingTab = read("components/sselfie/maya/maya-training-tab.tsx")
    const mayaVideosTab = read("components/sselfie/maya/maya-videos-tab.tsx")

    expect(mayaChatScreen).toContain('className="flex-1 min-h-0 flex flex-col overflow-hidden"')
    expect(mayaTrainingTab).not.toContain('className="flex-1 overflow-y-auto p-4 sm:p-6 relative min-h-0"')
    expect(mayaVideosTab).not.toContain('className="flex-1 overflow-y-auto p-4 sm:p-6"')
  })
})

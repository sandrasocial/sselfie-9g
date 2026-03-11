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
    expect(unifiedInput).toContain("min-w-[56px] sm:min-w-[92px]")
    expect(unifiedInput).toContain("min-w-[56px] sm:min-w-[96px]")
  })

  it("uses concise mobile action labels to reduce input bar clutter", () => {
    const unifiedInput = read("components/sselfie/maya/maya-unified-input.tsx")
    expect(unifiedInput).toContain("sm:hidden\">Image</span>")
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
  })

  it("always shows the selfie and my model toggle on the Maya photos surface", () => {
    const mayaChatScreen = read("components/sselfie/maya-chat-screen.tsx")
    expect(mayaChatScreen).toContain('showModeToggle={activeMayaTab === "photos"}')
    expect(mayaChatScreen).not.toContain("showModeToggle={!hideModeComplexity && activeMayaTab === \"photos\"}")
  })
})

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(path, "utf8")
}

describe("Suite UI/UX trust pass", () => {
  it("gives every App v3 child overlay one accessible modal contract", () => {
    const modalFiles = [
      "components/app-v3/chat-history-modal.tsx",
      "components/app-v3/credit-modal.tsx",
      "components/app-v3/memory-modal.tsx",
      "components/app-v3/reference-library-modal.tsx",
      "components/app-v3/trial-cap-offer.tsx",
    ]

    for (const file of modalFiles) {
      const source = read(file)
      expect(source, file).toContain("useAccessibleModal")
      expect(source, file).toContain('role="dialog"')
      expect(source, file).toContain('aria-modal="true"')
    }
  })

  it("keeps the Gallery fast and makes destructive actions explicit", () => {
    const gallery = read("components/app-v3/gallery-view.tsx")

    expect(gallery).toContain("GALLERY_PAGE_SIZE")
    expect(gallery).toContain("visibleAssetCount")
    expect(gallery).toContain("Load more")
    expect(gallery).not.toContain("window.confirm")
    expect(gallery).toContain("pendingDeleteIds")
    expect(gallery).toContain('role="dialog"')
    expect(gallery).toContain('aria-modal="true"')
  })

  it("keeps long project archives manageable and never archives in one tap", () => {
    const history = read("components/app-v3/chat-history-modal.tsx")

    expect(history).toContain("CHAT_PAGE_SIZE")
    expect(history).toContain("visibleChatCount")
    expect(history).toContain("Show older projects")
    expect(history).toContain("pendingDeleteId")
    expect(history).toContain("Confirm archive")
    expect(history).toContain("if (!response.ok)")
  })

  it("announces navigation state and new Maya responses", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")
    const maya = read("components/app-v3/maya-concierge.tsx")

    expect(shell).toContain('aria-current={active ? "page" : undefined}')
    expect(maya).toContain('role="log"')
    expect(maya).toContain('aria-live="polite"')
    expect(maya).toContain('aria-label="Message Maya"')
    expect(maya).toContain('role="status"')
  })
})

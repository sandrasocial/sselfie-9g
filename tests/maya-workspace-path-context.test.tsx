// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ConciergeProvider, useConcierge } from "@/components/app-v3/concierge-context"

const aesthetic = {
  id: "contract-test",
  name: "Contract test",
  blurb: "Test",
  coverImage: "",
  thumbnails: [],
  shotCount: 0,
  intent: "Test",
}

function Harness() {
  const { session, openWithAesthetic, setWorkspacePath } = useConcierge()
  return (
    <div>
      <button
        onClick={() =>
          openWithAesthetic(aesthetic, {
            workspacePath: "ai-photos",
            format: "photo",
            referenceSelfieUrl: "https://example.com/selfie.jpg",
            creationIntent: { format: "photo", source: "manual", confidence: "high" },
          })
        }
      >
        Start photo
      </button>
      <button onClick={() => setWorkspacePath("build-post")}>Switch to build post</button>
      <output data-testid="session">{JSON.stringify(session)}</output>
    </div>
  )
}

describe("Maya workspace path session switching", () => {
  beforeEach(() => {
    const storage = new Map<string, string>()
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    })
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ draft: null }), { status: 200 }))
    )
  })

  it("starts a clean task and preserves only the reusable selfie when the path changes", () => {
    render(
      <ConciergeProvider operatingLayerEnabled>
        <Harness />
      </ConciergeProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Start photo" }))
    const photoSession = JSON.parse(screen.getByTestId("session").textContent || "{}")
    expect(photoSession.workspacePath).toBe("ai-photos")
    expect(photoSession.outputFormat).toBe("photo")

    fireEvent.click(screen.getByRole("button", { name: "Switch to build post" }))
    const postSession = JSON.parse(screen.getByTestId("session").textContent || "{}")
    expect(postSession.workspacePath).toBe("build-post")
    expect(postSession.outputFormat).toBeNull()
    expect(postSession.creationIntent).toBeNull()
    expect(postSession.referenceSelfieUrl).toBe("https://example.com/selfie.jpg")
    expect(postSession.mayaContext.taskId).not.toBe(photoSession.mayaContext.taskId)
  })
})

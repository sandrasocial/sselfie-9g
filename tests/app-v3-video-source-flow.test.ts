import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(path, "utf8")
}

describe("App v3 video source flow", () => {
  it("keeps the video source separate from the selfie identity reference", () => {
    const types = read("components/app-v3/types.ts")
    const context = read("components/app-v3/concierge-context.tsx")
    const shell = read("components/app-v3/app-v3-shell.tsx")

    expect(types).toContain("videoSourceUrl: string | null")
    expect(types).toContain("setVideoSourceUrl: (url: string | null) => void")
    expect(context).toContain("videoSourceUrl: opts?.videoSourceUrl ?? null")
    expect(context).toContain("setVideoSourceUrl")
    expect(shell).toContain("videoSourceUrl: imageUrl")
    expect(shell).not.toContain("referenceSelfieUrl: imageUrl")
  })

  it("sends the selected video source image to the Replicate video pipeline", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const chatRoute = read("app/api/app-v3/maya/chat/route.ts")

    expect(concierge).toContain("const videoSourceUrl = session.videoSourceUrl")
    expect(concierge).toContain('if (fmt === "video" && !session.videoSourceUrl) return')
    expect(concierge).toContain("imageUrl: videoSourceUrl")
    expect(concierge).toContain("Animating this photo")
    expect(concierge).toContain("Pick from your photos")
    expect(concierge).toContain('handleUpload("video"')
    expect(chatRoute).toContain("attachVideoSource")
    expect(chatRoute).toContain("VIDEO SOURCE IMAGE ATTACHED")
  })
})

import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchImageAsDataUrlForVision } from "@/lib/maya/motion-prompt-llm"

describe("fetchImageAsDataUrlForVision", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("returns a data URL when fetch returns image bytes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        headers: { get: (name: string) => (name === "content-type" ? "image/png" : null) },
        arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer,
      })) as unknown as typeof fetch,
    )

    const out = await fetchImageAsDataUrlForVision("https://example.com/a.png")
    expect(out).toMatch(/^data:image\/png;base64,/)
  })

  it("returns null when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 404,
        headers: { get: () => null },
        arrayBuffer: async () => new ArrayBuffer(0),
      })) as unknown as typeof fetch,
    )

    expect(await fetchImageAsDataUrlForVision("https://example.com/missing")).toBeNull()
  })
})

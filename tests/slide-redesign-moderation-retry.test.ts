// @vitest-environment node
//
// 2026-07-05: redesignContentSlideToBuffer (the render behind story-sequence/carousel/reel-cover
// graphic jobs, shared by admin Content Kit AND member Maya's app-v3 generate route) previously
// had ZERO moderation retry - a content-policy rejection here propagated straight to the caller's
// "even after I softened it" message even though no softening had ever been attempted. Real
// incident: two story-sequence rejections (safety_violations=[sexual]) on otherwise-tasteful
// personal-story content, with that softening claim false both times.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ edit: vi.fn(), put: vi.fn() }))

vi.mock("server-only", () => ({}))

vi.mock("sharp", () => ({
  default: vi.fn((buffer: Buffer) => ({
    rotate: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn(async () => buffer),
  })),
}))

vi.mock("@vercel/blob", () => ({ put: mocks.put }))

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({ images: { edit: mocks.edit } })),
  toFile: vi.fn(async (buffer: Buffer, name: string) => ({ name, content: buffer.toString("utf8") })),
}))

vi.mock("@/lib/db/client", () => ({ sql: vi.fn(async () => []) }))

const baseSlide = {
  kind: "photo" as const,
  title: "This is where I started again",
}

describe("redesignContentSlideToBuffer moderation retry", () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.edit.mockReset()
    mocks.put.mockReset()
    process.env.OPENAI_API_KEY = "test-key"
    process.env.OPENAI_IMAGE_MODEL = "gpt-image-2"
    global.fetch = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode("fake-image-bytes").buffer,
    })) as unknown as typeof fetch
  })

  afterEach(() => {
    delete process.env.OPENAI_IMAGE_MODEL
  })

  it("sends the documented moderation:low param on every call", async () => {
    mocks.edit.mockResolvedValueOnce({
      data: [{ b64_json: Buffer.from("rendered").toString("base64") }],
    })
    const { redesignContentSlideToBuffer } = await import("@/lib/content-kit/slide-redesign-generator")

    await redesignContentSlideToBuffer({
      referenceUrl: "https://blob.example.com/ref.png",
      styleReferenceUrl: "https://blob.example.com/style.png",
      category: "story-sequence",
      topic: "her real story",
      slide: baseSlide,
    })

    expect(mocks.edit.mock.calls[0][0].moderation).toBe("low")
  })

  it("retries once with a softened prompt on a content-policy rejection, then succeeds", async () => {
    mocks.edit
      .mockRejectedValueOnce(
        Object.assign(
          new Error(
            "400 Your request was rejected by the safety system. safety_violations=[sexual]."
          ),
          { code: "content_policy" }
        )
      )
      .mockResolvedValueOnce({ data: [{ b64_json: Buffer.from("rendered").toString("base64") }] })
    const { redesignContentSlideToBuffer } = await import("@/lib/content-kit/slide-redesign-generator")

    const result = await redesignContentSlideToBuffer({
      referenceUrl: "https://blob.example.com/ref.png",
      styleReferenceUrl: "https://blob.example.com/style.png",
      category: "story-sequence",
      topic: "her real story",
      slide: baseSlide,
    })

    expect(mocks.edit).toHaveBeenCalledTimes(2)
    expect(result.prompt).toContain("Keep the styling modest, fully clothed, elegant, and tasteful.")
  })

  it("on a double rejection, throws an error carrying the softened prompt for diagnosis", async () => {
    const rejection = Object.assign(
      new Error("400 Your request was rejected by the safety system. safety_violations=[sexual]."),
      { code: "content_policy" }
    )
    mocks.edit.mockRejectedValueOnce(rejection).mockRejectedValueOnce(rejection)
    const { redesignContentSlideToBuffer } = await import("@/lib/content-kit/slide-redesign-generator")

    await expect(
      redesignContentSlideToBuffer({
        referenceUrl: "https://blob.example.com/ref.png",
        styleReferenceUrl: "https://blob.example.com/style.png",
        category: "story-sequence",
        topic: "her real story",
        slide: baseSlide,
      })
    ).rejects.toThrow(/softened prompt sent:/)
  })
})

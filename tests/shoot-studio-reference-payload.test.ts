// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  edit: vi.fn(),
  put: vi.fn(),
}))

vi.mock("server-only", () => ({}))

vi.mock("sharp", () => ({
  default: vi.fn((buffer: Buffer) => ({
    rotate: vi.fn().mockReturnThis(),
    resize: vi.fn().mockReturnThis(),
    flatten: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn(async () => buffer),
  })),
}))

vi.mock("@vercel/blob", () => ({
  put: mocks.put,
}))

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    images: {
      edit: mocks.edit,
    },
  })),
  toFile: vi.fn(async (buffer: Buffer, name: string) => ({
    name,
    content: buffer.toString("utf8"),
  })),
}))

describe("Shoot Studio reference payload", () => {
  const originalFetch = global.fetch
  const originalApiKey = process.env.OPENAI_API_KEY

  beforeEach(() => {
    vi.resetModules()
    mocks.edit.mockResolvedValue({
      data: [{ b64_json: Buffer.from("rendered").toString("base64") }],
    })
    mocks.put.mockResolvedValue({ url: "https://blob.example.com/rendered.png" })
    process.env.OPENAI_API_KEY = "test-key"
    process.env.OPENAI_IMAGE_MODEL = "gpt-image-2"
    global.fetch = vi.fn(async (url: RequestInfo | URL) => ({
      ok: true,
      headers: new Headers({ "content-type": "image/png" }),
      arrayBuffer: async () => new TextEncoder().encode(String(url)).buffer,
    })) as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    process.env.OPENAI_API_KEY = originalApiKey
    delete process.env.OPENAI_IMAGE_MODEL
    vi.clearAllMocks()
  })

  it("sends selfies first and the inspiration image as a mandatory style reference on every shot", async () => {
    const { generateShotImage } = await import("@/lib/content-kit/shoot-generator")

    await generateShotImage({
      selfieUrls: [
        "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/selfie-front.png",
        "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/selfie-side.png",
      ],
      inspirationUrls: [
        "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/inspo.png",
      ],
      prompt: "Create image 1 of a 6-part editorial photoshoot. Scene: marble cafe. Outfit: black blazer. Pose: walking.",
      shotRole: "movement-lifestyle-action",
      quality: "medium",
    })

    expect(mocks.edit).toHaveBeenCalledTimes(1)
    const payload = mocks.edit.mock.calls[0][0]
    expect(payload.image).toEqual([
      expect.objectContaining({
        name: "shoot-input-0.png",
        content: expect.stringContaining("selfie-front.png"),
      }),
      expect.objectContaining({
        name: "shoot-input-1.png",
        content: expect.stringContaining("selfie-side.png"),
      }),
      expect.objectContaining({
        name: "shoot-input-2.png",
        content: expect.stringContaining("inspo.png"),
      }),
    ])
    expect(payload.prompt).toContain("the FIRST 2 input images are all the SAME woman")
    expect(payload.prompt).toContain("Every image after the first 2 is a style reference ONLY")
    expect(payload.prompt).toContain("Use the uploaded identity reference images as the ONLY source of facial identity.")
    expect(payload.prompt).toContain("Identity Priority: 100%")
    expect(payload.prompt).toContain("Use the inspiration image ONLY for:")
    expect(payload.prompt).toContain("Recreate the inspiration image composition as closely as possible")
    expect(payload.prompt).toContain("A person who knows the subject should immediately recognize them.")
    expect(payload.prompt).not.toContain("Sandra's exact facial structure")
    expect(payload.prompt).toContain("mandatory visual reference")
    expect(payload.prompt).toContain("crop, framing, subject scale")
    expect(payload.prompt).toContain("do not widen it into a full-body studio fashion image")
    expect(payload.prompt).toContain("must visibly belong to that reference world")
  })

  it("uses reconstruction for shot one and style-world variation for later photoshoot shots", async () => {
    const { generateShotImage } = await import("@/lib/content-kit/shoot-generator")

    await generateShotImage({
      selfieUrls: ["https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/selfie-front.png"],
      inspirationUrls: ["https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/inspo.png"],
      prompt: "Create image 1 of a 6-part editorial photoshoot. Pose: match the hero.",
      shotRole: "close-portrait",
      quality: "medium",
    })
    await generateShotImage({
      selfieUrls: ["https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/selfie-front.png"],
      inspirationUrls: ["https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/inspo.png"],
      prompt: "Create image 2 of the same editorial photoshoot. Pose: profile variation.",
      shotRole: "profile",
      quality: "medium",
    })

    const heroPrompt = mocks.edit.mock.calls[0][0].prompt
    const variationPrompt = mocks.edit.mock.calls[1][0].prompt

    expect(heroPrompt).toContain("TASK TYPE: IMAGE RECONSTRUCTION")
    expect(heroPrompt).toContain("Recreate the inspiration image composition as closely as possible")
    expect(variationPrompt).toContain("TASK TYPE: STYLE-WORLD VARIATION")
    expect(variationPrompt).toContain("Poses and angles may vary")
    expect(variationPrompt).toContain("Do not restyle the set into a generic new scene")
    expect(variationPrompt).not.toContain("TASK TYPE: IMAGE RECONSTRUCTION")
  })
})

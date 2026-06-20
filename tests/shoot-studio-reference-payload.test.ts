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

  it("sends selected selfies first and keeps inspiration as the Blue Stripe-era style anchor", async () => {
    const { generateShotImage } = await import("@/lib/content-kit/shoot-generator")

    await generateShotImage({
      selfieUrls: [
        "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/selfie-front.png",
        "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/selfie-side.png",
      ],
      inspirationUrls: ["https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/inspo.png"],
      prompt:
        "Create image 1 of a 6-part editorial photoshoot. Scene: marble cafe. Outfit: black blazer. Pose: walking.",
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
    expect(payload.prompt).toContain(
      "The FIRST style reference image is the primary visual anchor: match its outfit family, lighting direction, camera distance, makeup finish, accessories, color grading, location materials and mood as closely as possible."
    )
    expect(payload.prompt).toContain(
      "Never copy a face, skin, hair color or body from the style references."
    )
    expect(payload.prompt).toContain(
      "Keep the face natural, recognizable and completely true to the first 2 reference images"
    )

    const safetyIndex = payload.prompt.indexOf("Non-sexual adult fashion editorial")
    const roleIndex = payload.prompt.indexOf("Image roles for this generation")
    const writtenPromptIndex = payload.prompt.indexOf("Create image 1 of a 6-part")
    const identityIndex = payload.prompt.indexOf("Keep the face natural")
    expect(safetyIndex).toBeGreaterThanOrEqual(0)
    expect(roleIndex).toBeGreaterThan(safetyIndex)
    expect(writtenPromptIndex).toBeGreaterThan(roleIndex)
    expect(identityIndex).toBeGreaterThan(writtenPromptIndex)

    expect(payload.prompt).not.toContain("WRITTEN SHOT PROMPT")
    expect(payload.prompt).not.toContain("FINAL RENDER AUTHORITY")
    expect(payload.prompt).not.toContain("FINAL IDENTITY AUTHORITY")
    expect(payload.prompt).not.toContain("TASK TYPE: IMAGE RECONSTRUCTION")
    expect(payload.prompt).not.toContain("TASK TYPE: STYLE-WORLD VARIATION")
    expect(payload.prompt).not.toContain("mandatory visual reference")
    expect(payload.prompt).not.toContain("crop, framing, subject scale")
    expect(payload.prompt).not.toContain("If the written shot prompt conflicts")
    expect(payload.prompt).not.toContain(
      "If the written shot prompt invents or alters visible details from the attached inspiration image"
    )
  })

  it("does not switch shot one into reconstruction mode or later shots into separate variation mode", async () => {
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

    expect(heroPrompt).toContain("The FIRST style reference image is the primary visual anchor")
    expect(variationPrompt).toContain(
      "The FIRST style reference image is the primary visual anchor"
    )
    expect(heroPrompt).not.toContain("TASK TYPE: IMAGE RECONSTRUCTION")
    expect(heroPrompt).not.toContain(
      "Recreate the inspiration image composition as closely as possible"
    )
    expect(variationPrompt).not.toContain("TASK TYPE: STYLE-WORLD VARIATION")
    expect(variationPrompt).not.toContain("Poses and angles may vary")
    expect(variationPrompt).not.toContain("Do not restyle the set into a generic new scene")
    expect(variationPrompt).not.toContain("TASK TYPE: IMAGE RECONSTRUCTION")
  })

  it("does not make attached inspiration outrank the written shot prompt at render time", async () => {
    const { generateShotImage } = await import("@/lib/content-kit/shoot-generator")

    await generateShotImage({
      selfieUrls: ["https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/selfie-front.png"],
      inspirationUrls: [
        "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/mediterranean-inspo.png",
      ],
      prompt:
        "Create image 1 of a 6-part Mediterranean Moment editorial photoshoot. Outfit: Off-white linen midi dress, nude leather sandals, no pattern. Scene: pale stucco courtyard.",
      shotRole: "establishing-full-body",
      quality: "medium",
    })

    const prompt = mocks.edit.mock.calls[0][0].prompt
    const writtenPromptIndex = prompt.indexOf("Off-white linen midi dress")
    const roleIndex = prompt.indexOf("Image roles for this generation")
    const identityIndex = prompt.indexOf("Keep the face natural")

    expect(writtenPromptIndex).toBeGreaterThan(-1)
    expect(roleIndex).toBeGreaterThan(-1)
    expect(writtenPromptIndex).toBeGreaterThan(roleIndex)
    expect(identityIndex).toBeGreaterThan(writtenPromptIndex)
    expect(prompt).not.toContain("FINAL RENDER AUTHORITY:")
    expect(prompt).not.toContain("dress length, garment cut, accessories, bag, hat/no hat, shoes")
    expect(prompt).not.toContain(
      "If any written prompt conflicts with the inspiration image, the inspiration image wins"
    )
    expect(prompt).not.toContain(
      "If the written shot prompt invents or alters visible details from the attached inspiration image"
    )
  })
})

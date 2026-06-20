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

  it("sends selected selfies first and uses a short ChatGPT-like render prompt", async () => {
    const { generateShotImage } = await import("@/lib/content-kit/shoot-generator")

    await generateShotImage({
      selfieUrls: [
        "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/selfie-front.png",
        "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/selfie-side.png",
      ],
      inspirationUrls: ["https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/inspo.png"],
      prompt:
        "Create image 1 of a 6-part editorial photoshoot. Scene: marble cafe. Outfit: black blazer. Pose: walking toward camera with relaxed hands. Camera + lens: 85mm close portrait.",
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
    expect(payload.prompt).toContain("Use input images 1-2 as IDENTITY REFERENCES ONLY")
    expect(payload.prompt).toContain("Use input image 3 as INSPIRATION REFERENCES ONLY")
    expect(payload.prompt).toContain(
      "Follow the inspiration image directly for wardrobe family, pose language, composition, camera distance, lighting direction, shadow pattern, location/set, color grade, editorial mood, and styling."
    )
    expect(payload.prompt).toContain(
      "Do not copy, average, blend, or borrow their face, age, body, hair, or skin."
    )
    expect(payload.prompt).toContain("Shot role: lifestyle/action")
    expect(payload.prompt).toContain(
      "Shot-specific direction from the plan: walking toward camera with relaxed hands."
    )
    expect(payload.prompt).toContain("85mm close portrait.")

    expect(payload.prompt.length).toBeLessThan(2200)
    expect(payload.prompt).not.toContain("Scene: marble cafe")
    expect(payload.prompt).not.toContain("Outfit: black blazer")
    expect(payload.prompt).not.toContain("Use the uploaded reference photos")
    expect(payload.prompt).not.toContain("Body proportion lock:")
    expect(payload.prompt).not.toContain("Image quality:")
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

    expect(heroPrompt).toContain(
      "For this first image, stay very close to the inspiration image's visual feel"
    )
    expect(variationPrompt).toContain(
      "For this additional set image, keep the same inspiration-image world"
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

  it("does not forward planner-invented outfit and scene details into the render prompt", async () => {
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
    expect(prompt).toContain("Use input image 2 as INSPIRATION REFERENCES ONLY")
    expect(prompt).toContain("Shot role: establishing/wider context")
    expect(prompt).not.toContain("Off-white linen midi dress")
    expect(prompt).not.toContain("nude leather sandals")
    expect(prompt).not.toContain("pale stucco courtyard")
    expect(prompt).not.toContain("Scene:")
    expect(prompt).not.toContain("Outfit:")
    expect(prompt).not.toContain("FINAL RENDER AUTHORITY:")
    expect(prompt).not.toContain("dress length, garment cut, accessories, bag, hat/no hat, shoes")
    expect(prompt).not.toContain(
      "If any written prompt conflicts with the inspiration image, the inspiration image wins"
    )
    expect(prompt).not.toContain(
      "If the written shot prompt invents or alters visible details from the attached inspiration image"
    )
  })

  it("only applies the safer prompt wording after a content-policy rejection", async () => {
    mocks.edit
      .mockRejectedValueOnce(
        Object.assign(new Error("content_policy violation"), { code: "content_policy" })
      )
      .mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from("rendered").toString("base64") }],
      })
    const { generateShotImage } = await import("@/lib/content-kit/shoot-generator")

    await generateShotImage({
      selfieUrls: ["https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/selfie-front.png"],
      inspirationUrls: ["https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/inspo.png"],
      prompt:
        "Create image 1 of a 6-part editorial photoshoot. Pose: soft eye contact. Camera + lens: 85mm portrait.",
      shotRole: "close-portrait",
      quality: "medium",
    })

    expect(mocks.edit).toHaveBeenCalledTimes(2)
    expect(mocks.edit.mock.calls[0][0].prompt).not.toContain("Safety retry:")
    expect(mocks.edit.mock.calls[1][0].prompt).toContain("Safety retry:")
  })
})

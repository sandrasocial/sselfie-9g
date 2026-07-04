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

  it("sends selected selfies first and uses the shared suite inspiration contract", async () => {
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
    expect(payload.prompt).toContain("Use input image 3 as ORIGINAL INSPIRATION REFERENCES ONLY")
    expect(payload.prompt).toContain(
      "Follow the inspiration image directly for wardrobe family, pose language, composition, camera distance, lighting direction, shadow pattern, location/set, color grade, editorial mood, and styling."
    )
    expect(payload.prompt).toContain("Inspiration reference handling:")
    expect(payload.prompt).toContain("TASK TYPE: IMAGE RECONSTRUCTION.")
    expect(payload.prompt).toContain("The inspiration image is the visual blueprint")
    expect(payload.prompt).toContain("Identity Priority: 100%.")
    expect(payload.prompt).toContain("The inspiration image contributes 0% facial information")
    expect(payload.prompt).toContain("Shot role: close recreation of the inspiration image.")
    expect(payload.prompt).toContain(
      "Do not convert a close-up inspiration into a full-body, seated, walking, or wider brand shot."
    )
    expect(payload.prompt).not.toContain("Shot-specific direction from the plan:")

    // Shot 1 forwards the planner's styling + scene brief so Sandra's notes (location, outfit,
    // mood) reach the image model — the regression was that this was being stripped.
    expect(payload.prompt).toContain("Written styling brief to follow")
    expect(payload.prompt).toContain("Scene: marble cafe.")
    expect(payload.prompt).toContain("Outfit: black blazer.")
    // ...but shot 1's crop/pose/camera stay locked to the inspiration image, so framing sections
    // are omitted from its written brief.
    expect(payload.prompt).not.toContain("Pose: walking toward camera")
    expect(payload.prompt).not.toContain("Camera + lens: 85mm close portrait")
    expect(payload.prompt).not.toContain("Use the uploaded reference photos")
    expect(payload.prompt).not.toContain("Image quality:")
    expect(payload.prompt).not.toContain("WRITTEN SHOT PROMPT")
    expect(payload.prompt).not.toContain("FINAL RENDER AUTHORITY")
    expect(payload.prompt).not.toContain("mandatory visual reference")
    expect(payload.prompt).not.toContain(
      "If the written shot prompt invents or alters visible details from the attached inspiration image"
    )
  })

  it("sends up to 6 selfie angles as identity references, not just 4 (2026-07-05)", async () => {
    // Sandra's ask: gpt-image-2's edit endpoint accepts multiple reference images, and more
    // real angles (front, both side profiles, full body, plus extras) improves how well it
    // captures facial AND body features. Raised the cap from 4 to 6 end to end.
    const { generateShotImage } = await import("@/lib/content-kit/shoot-generator")
    const base = "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com"
    const sevenSelfies = Array.from({ length: 7 }, (_, i) => `${base}/selfie-${i}.png`)

    await generateShotImage({
      selfieUrls: sevenSelfies,
      inspirationUrls: [`${base}/inspo.png`],
      prompt: "Create image 2 of a 6-part editorial photoshoot. Pose: seated, relaxed.",
      shotRole: "seated-hero",
      quality: "medium",
    })

    const payload = mocks.edit.mock.calls[0][0]
    // 6 selfies + 1 inspiration = 7 images total; the 7th selfie is dropped, never a duplicate.
    expect(payload.image).toHaveLength(7)
    expect(payload.prompt).toContain("Use input images 1-6 as IDENTITY REFERENCES ONLY")
    expect(payload.prompt).toContain("Use input image 7 as ORIGINAL INSPIRATION REFERENCES ONLY")
  })

  it("uses close recreation for shot one and set variation for later shots", async () => {
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

    expect(heroPrompt).toContain("TASK TYPE: IMAGE RECONSTRUCTION.")
    expect(heroPrompt).toContain("The inspiration image is the visual blueprint")
    expect(heroPrompt).toContain(
      "Only replace the person with the identity from the uploaded identity reference images."
    )
    expect(heroPrompt).toContain("Do not convert a close-up inspiration into a full-body")
    expect(heroPrompt).not.toContain("Shot-specific direction from the plan:")
    expect(variationPrompt).toContain("TASK TYPE: STYLE-WORLD VARIATION.")
    expect(variationPrompt).toContain("Poses and angles may vary")
    expect(variationPrompt).toContain("Do not restyle the set into a generic new scene")
    expect(variationPrompt).not.toContain("TASK TYPE: IMAGE RECONSTRUCTION")
  })

  it("close-recreates EVERY shot when closeRecreate is set (story collection)", async () => {
    const { generateShotImage } = await import("@/lib/content-kit/shoot-generator")
    await generateShotImage({
      selfieUrls: ["https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/selfie-front.png"],
      inspirationUrls: ["https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/inspo.png"],
      prompt: "Create image 3 of the same editorial photoshoot. Pose: profile variation.",
      shotRole: "profile",
      quality: "medium",
      closeRecreate: true,
    })
    const prompt = mocks.edit.mock.calls[0][0].prompt
    // A non-first shot still recreates its own inspiration, not a set variation.
    expect(prompt).toContain("TASK TYPE: IMAGE RECONSTRUCTION.")
    expect(prompt).toContain("Shot role: close recreation of the inspiration image.")
    expect(prompt).not.toContain("TASK TYPE: STYLE-WORLD VARIATION.")
  })

  it("attaches generated shot one after selfies and original inspiration for anchored later shots", async () => {
    const { generateShotImage } = await import("@/lib/content-kit/shoot-generator")

    await generateShotImage({
      selfieUrls: ["https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/selfie-front.png"],
      inspirationUrls: ["https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/inspo.png"],
      continuityUrls: ["https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/shot-1.png"],
      prompt:
        "Create image 4 of the same editorial photoshoot. Scene: across the street in the same light. Pose: three-quarter turn. Camera angle: eye level.",
      shotRole: "profile",
      quality: "medium",
    })

    const payload = mocks.edit.mock.calls[0][0]
    expect(payload.image).toEqual([
      expect.objectContaining({
        name: "shoot-input-0.png",
        content: expect.stringContaining("selfie-front.png"),
      }),
      expect.objectContaining({
        name: "shoot-input-1.png",
        content: expect.stringContaining("inspo.png"),
      }),
      expect.objectContaining({
        name: "shoot-input-2.png",
        content: expect.stringContaining("shot-1.png"),
      }),
    ])
    expect(payload.prompt).toContain("Use input image 1 as IDENTITY REFERENCES ONLY")
    expect(payload.prompt).toContain("Use input image 2 as ORIGINAL INSPIRATION REFERENCES ONLY")
    expect(payload.prompt).toContain(
      "Use input image 3 as GENERATED SET CONTINUITY REFERENCES ONLY"
    )
    expect(payload.prompt).toContain(
      "If a generated continuity image shows a face, ignore that face, facial structure, skin, hair, age, and body features."
    )
    expect(payload.prompt).toContain(
      "Use the generated continuity reference only as a style/cohesion anchor"
    )
    expect(payload.prompt).toContain(
      "Match the generated continuity reference's wardrobe, accessories, hair, makeup, color grade, and location mood"
    )
    expect(payload.prompt).toContain("across the street in the same light.")
    expect(payload.prompt).toContain("three-quarter turn.")
    expect(payload.prompt).toContain("eye level.")
  })

  it("forwards the planner styling brief while keeping the inspiration image authoritative", async () => {
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
    expect(prompt).toContain("Use input image 2 as ORIGINAL INSPIRATION REFERENCES ONLY")
    expect(prompt).toContain("Shot role: close recreation of the inspiration image")
    // The styling brief now reaches the image model so notes like location/outfit are honored.
    expect(prompt).toContain("Written styling brief to follow")
    expect(prompt).toContain("Off-white linen midi dress")
    expect(prompt).toContain("Scene: pale stucco courtyard.")
    // The inspiration image stays authoritative for anything visible in it (conflict resolution).
    expect(prompt).toContain(
      "If any written prompt conflicts with the inspiration image, the inspiration image wins"
    )
    expect(prompt).not.toContain("FINAL RENDER AUTHORITY:")
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

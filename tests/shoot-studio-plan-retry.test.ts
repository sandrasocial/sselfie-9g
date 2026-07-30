// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  callContentKitVision: vi.fn(),
  moderate: vi.fn(),
  sql: vi.fn(),
}))

vi.mock("server-only", () => ({}))

vi.mock("@/lib/content-kit/llm", () => ({
  callContentKitLlm: vi.fn(),
  callContentKitVision: mocks.callContentKitVision,
}))

vi.mock("@/lib/db/client", () => ({
  sql: (...args: unknown[]) => mocks.sql(...args),
}))

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    moderations: {
      create: mocks.moderate,
    },
  })),
  toFile: vi.fn(),
}))

vi.mock("@/lib/vault/published-collections", () => ({
  ensurePublishedVaultPromptNumbers: vi.fn(),
  ensureVaultCollectionsSchema: vi.fn(),
}))

const baseUrl = "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com"

function validPlan() {
  const roles = [
    "establishing-full-body",
    "movement-lifestyle-action",
    "seated-hero",
    "profile",
    "close-portrait",
    "cover-safe-hero",
  ]

  return {
    title: "Recovered Editorial",
    shots: roles.map((shotRole, index) => ({
      shotRole,
      title: `Recovered Editorial · Shot ${index + 1}`,
      whenToUse: `Use shot ${index + 1} for a useful brand post.`,
      mood: `editorial · natural · shot-${index + 1}`,
      prompt: `${`Distinct shot ${index + 1} direction. `}${"Detailed editorial scene, styling, pose, camera, composition, mood, color grading, image quality, and avoid instructions. ".repeat(3)}`,
    })),
  }
}

describe("Shoot Studio planning retry", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = "test-key"
    mocks.moderate.mockResolvedValue({ results: [{ flagged: false }] })
    mocks.sql.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join("?")
      if (!query.includes("INSERT INTO content_shoots")) return []
      return [
        {
          id: 55,
          title: "Recovered Editorial",
          slug: "recovered-editorial",
          status: "draft",
          inspiration_urls: [`${baseUrl}/inspiration.png`],
          selfie_url: `${baseUrl}/selfie.png`,
          selfie_urls: [`${baseUrl}/selfie.png`],
          shots: [],
          messages: [],
          collection_type: "cohesive",
          vibe: null,
          created_at: "2026-07-14T08:00:00.000Z",
        },
      ]
    })
  })

  it("retries when the first planning response contains malformed JSON", async () => {
    mocks.callContentKitVision
      .mockResolvedValueOnce(
        '{"title":"Broken","shots":[{"prompt":"first"} {"prompt":"second"}]}'
      )
      .mockResolvedValueOnce(JSON.stringify(validPlan()))

    const { createShootDraft } = await import("@/lib/content-kit/shoot-generator")

    const shoot = await createShootDraft({
      inspirationUrls: [`${baseUrl}/inspiration.png`],
      selfieUrls: [`${baseUrl}/selfie.png`],
    })

    expect(mocks.callContentKitVision).toHaveBeenCalledTimes(2)
    expect(shoot.title).toBe("Recovered Editorial")
  })

  it("stops before planning when an inspiration image is already moderation-blocked", async () => {
    mocks.moderate.mockResolvedValue({ results: [{ flagged: true }] })
    const { createShootDraft } = await import("@/lib/content-kit/shoot-generator")

    await expect(
      createShootDraft({
        inspirationUrls: [`${baseUrl}/inspiration.png`],
        selfieUrls: [`${baseUrl}/selfie.png`],
      })
    ).rejects.toThrow("Replace inspiration image 1")
    expect(mocks.callContentKitVision).not.toHaveBeenCalled()
  })
})

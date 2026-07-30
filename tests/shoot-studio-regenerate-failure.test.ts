// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  edit: vi.fn(),
  put: vi.fn(),
  sql: vi.fn(),
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

vi.mock("@vercel/blob", () => ({ put: mocks.put }))

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    images: { edit: mocks.edit },
  })),
  toFile: vi.fn(async (buffer: Buffer, name: string) => ({
    name,
    content: buffer.toString("utf8"),
  })),
}))

vi.mock("@/lib/db/client", () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => mocks.sql(strings, ...values),
}))

vi.mock("@/lib/vault/published-collections", () => ({
  ensurePublishedVaultPromptNumbers: vi.fn(),
  ensureVaultCollectionsSchema: vi.fn(),
}))

describe("Shoot Studio regenerate failure persistence", () => {
  const originalFetch = global.fetch
  const originalApiKey = process.env.OPENAI_API_KEY
  const baseUrl = "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com"

  beforeEach(() => {
    vi.resetModules()
    process.env.OPENAI_API_KEY = "test-key"
    mocks.edit.mockRejectedValue(
      Object.assign(new Error("moderation_blocked safety_violations=[sexual]"), {
        code: "moderation_blocked",
        status: 400,
      })
    )
    mocks.sql.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join("?")
      if (query.includes("SELECT id FROM users")) return []
      if (query.includes("FROM content_shoots cs")) {
        return [
          {
            id: 63,
            title: "Photo dump",
            slug: "photo-dump",
            status: "draft",
            inspiration_urls: [`${baseUrl}/inspiration.png`],
            selfie_url: `${baseUrl}/selfie.png`,
            selfie_urls: [`${baseUrl}/selfie.png`],
            shots: [
              {
                id: "shot-1",
                shotRole: "close-portrait",
                title: "Photo dump · Portrait",
                whenToUse: "Use this for a post.",
                mood: "casual · candid · phone · natural · everyday",
                prompt:
                  "Create image 1 of a 1-part Photo dump collection. Scene: at home. Outfit: a casual top. Hair: natural. Makeup: minimal. Accessories/props: no phone. Pose: relaxed. Camera + lens: iPhone camera. Camera angle: eye level. Composition: vertical. Body proportion lock: natural. Mood: relaxed. Color grading: natural. Image quality: phone-camera realism. Avoid: blur.",
                status: "draft",
              },
            ],
            messages: [],
            collection_type: "story",
            vibe: "Photodump collection",
            created_at: "2026-07-30T08:00:00.000Z",
          },
        ]
      }
      return []
    })
    global.fetch = vi.fn(async (url: RequestInfo | URL) => ({
      ok: true,
      headers: new Headers({ "content-type": "image/png" }),
      arrayBuffer: async () => new TextEncoder().encode(String(url)).buffer,
    })) as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    process.env.OPENAI_API_KEY = originalApiKey
    vi.clearAllMocks()
  })

  it("records the second moderation rejection on the exact shot and makes it non-retryable", async () => {
    const { regenerateShot, ShootRenderError } = await import(
      "@/lib/content-kit/shoot-generator"
    )

    await expect(regenerateShot(63, "shot-1", "medium")).rejects.toMatchObject({
      name: "ShootRenderError",
      code: "moderation_blocked",
      retryable: false,
      status: 422,
    })
    expect(mocks.edit).toHaveBeenCalledTimes(2)

    const patchJson = mocks.sql.mock.calls
      .flatMap((call) => call.slice(1))
      .find(
        (value): value is string =>
          typeof value === "string" && value.includes('"renderStatus":"moderation_blocked"')
      )
    expect(patchJson).toBeTruthy()
    expect(JSON.parse(patchJson || "{}")).toMatchObject({
      renderStatus: "moderation_blocked",
      renderErrorCode: "moderation_blocked",
      renderAttempts: 1,
    })
    expect(ShootRenderError).toBeTypeOf("function")
  })
})

// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"
import { indexLatestVaultPhotosByCardKey } from "@/lib/vault-maya/personal-vault"

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8")

describe("Vault Maya personal collection cards", () => {
  it("uses the newest saved photo for each exact Vault look", () => {
    const index = indexLatestVaultPhotosByCardKey(
      [
        {
          id: "ai_3",
          url: "https://example.com/new.png",
          createdAt: "2026-08-02T12:00:00.000Z",
          generationRef: "app-v3-gen-user-vault-maya-golden-hour-01-123-0",
          vaultMayaCardKey: "golden-hour-01",
        },
        {
          id: "ai_2",
          url: "https://example.com/old.png",
          createdAt: "2026-08-01T12:00:00.000Z",
          generationRef: "app-v3-gen-user-vault-maya-golden-hour-01-122-0",
          vaultMayaCardKey: "golden-hour-01",
        },
      ],
      [
        {
          cardKey: "golden-hour-01",
          title: "Poolside Pause",
          collectionTitle: "Golden Hour Diary",
        },
      ]
    )

    expect(index["golden-hour-01"]?.url).toBe("https://example.com/new.png")
  })

  it("keeps legacy Vault Maya generations fillable from their request marker", () => {
    const index = indexLatestVaultPhotosByCardKey(
      [
        {
          id: "ai_1",
          url: "https://example.com/legacy.png",
          createdAt: "2026-08-01T12:00:00.000Z",
          generationRef: "app-v3-gen-user-vault-maya-poolside-pause-123456789-0",
          vaultMayaCardKey: null,
        },
      ],
      [
        {
          cardKey: "poolside-pause",
          title: "Poolside Pause",
          collectionTitle: "Golden Hour Diary",
        },
      ]
    )

    expect(index["poolside-pause"]?.url).toBe("https://example.com/legacy.png")
  })

  it("fills older cards from their saved collection and look title", () => {
    const index = indexLatestVaultPhotosByCardKey(
      [
        {
          id: "ai_0",
          url: "https://example.com/legacy-title.png",
          createdAt: "2026-08-01T12:00:00.000Z",
          generationRef: "app-v3-gen-user-123456789-0",
          vaultMayaCardKey: null,
          title: "Golden Hour Diary · Street Wander",
        },
      ],
      [
        {
          cardKey: "street-wander",
          title: "Street Wander",
          collectionTitle: "Golden Hour Diary",
        },
      ]
    )

    expect(index["street-wander"]?.url).toBe("https://example.com/legacy-title.png")
  })

  it("wires durable look metadata and saved photos into the collection cards", () => {
    const studio = read("components/vault-maya/vault-maya-studio.tsx")
    const generation = read("app/api/app-v3/maya/generate/route.ts")
    const galleryAssets = read("lib/app-v3/gallery-assets.ts")

    expect(studio).toContain("vaultMayaCardKey: look.cardKey")
    expect(studio).toContain("latestPhotosByCardKey")
    expect(studio).toContain("Your photo")
    expect(generation).toContain("vaultMayaCardKey")
    expect(galleryAssets).toContain("vaultMayaCardKey")
  })
})

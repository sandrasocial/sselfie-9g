import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  getShootPublishReadiness,
  MIN_VAULT_PUBLISH_SHOTS,
} from "@/lib/content-kit/shoot-readiness"
import type { Shoot } from "@/lib/content-kit/types"

function makeShoot(overrides: Partial<Shoot> = {}): Shoot {
  return {
    id: 1,
    title: "Cafe Minimalist Paris",
    slug: "cafe-minimalist-paris",
    status: "draft",
    inspirationUrls: [],
    selfieUrl: "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/selfie.png",
    selfieUrls: ["https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/selfie.png"],
    messages: [],
    createdAt: "2026-06-13T08:00:00.000Z",
    shots: Array.from({ length: MIN_VAULT_PUBLISH_SHOTS }, (_, index) => ({
      id: `shot-${index + 1}`,
      title: `Shot ${index + 1}`,
      whenToUse: "Use this for a post.",
      mood: "editorial · calm · useful",
      prompt: "Create the image.",
      imageUrl: `https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/shot-${index + 1}.png`,
      status: "approved" as const,
    })),
    ...overrides,
  }
}

describe("Shoot Studio publish pipeline", () => {
  it("requires at least six approved rendered shots before publishing", () => {
    const shoot = makeShoot({
      shots: makeShoot().shots.map((shot, index) =>
        index < 4 ? shot : { ...shot, status: "draft" as const }
      ),
    })

    const readiness = getShootPublishReadiness(shoot)

    expect(readiness.ready).toBe(false)
    expect(readiness.approvedCount).toBe(4)
    expect(readiness.needed).toBe(2)
  })

  it("uses the first approved rendered shot as the giveaway prompt", () => {
    const extendedShots = [
      ...makeShoot().shots,
      {
        ...makeShoot().shots[0],
        id: "shot-7",
        title: "Shot 7",
        imageUrl: "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/shot-7.png",
      },
      {
        ...makeShoot().shots[1],
        id: "shot-8",
        title: "Shot 8",
        imageUrl: "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/shot-8.png",
      },
    ]
    const shoot = makeShoot({
      shots: [
        { ...extendedShots[0], status: "killed" },
        { ...extendedShots[1], status: "draft" },
        { ...extendedShots[2], id: "shot-3", status: "approved" },
        ...extendedShots.slice(3),
      ],
    })

    const readiness = getShootPublishReadiness(shoot)

    expect(readiness.ready).toBe(true)
    expect(readiness.giveawayShotId).toBe("shot-3")
  })

  it("keeps the generator and API wired for six shots, extension, publish, and HQ preserve", () => {
    const root = process.cwd()
    const generator = fs.readFileSync(path.join(root, "lib/content-kit/shoot-generator.ts"), "utf8")
    const route = fs.readFileSync(
      path.join(root, "app/api/admin/content-kit/shoots/route.ts"),
      "utf8"
    )
    const client = fs.readFileSync(
      path.join(root, "components/admin/shoot-studio-client.tsx"),
      "utf8"
    )
    const types = fs.readFileSync(path.join(root, "lib/content-kit/types.ts"), "utf8")

    expect(generator).toContain("const DEFAULT_SHOTS_PER_SHOOT = 6")
    expect(generator).toContain("export async function extendShoot")
    expect(generator).toContain('quality === "high" ? shoot.shots[idx].status : "draft"')
    expect(generator).toContain("selfie_urls")
    expect(generator).toContain("buildShotRenderPrompt({")
    expect(generator).toContain("SSELFIE_INSPIRATION_CLOSE_RECREATE")
    expect(generator).toContain("SSELFIE_INSPIRATION_SET_VARIATION")
    expect(generator).toContain("IDENTITY REFERENCES ONLY")
    expect(generator).toContain("ORIGINAL INSPIRATION REFERENCES ONLY")
    expect(generator).toContain("GENERATED SET CONTINUITY REFERENCES ONLY")
    expect(generator).toContain("extractShotRenderBrief")
    expect(generator).toContain("renderShotIndicesWithContinuity")
    expect(generator).toContain("isContentPolicyError")
    expect(generator).toContain("parseJsonArray")
    expect(generator).toContain("const shoot = { ...mapRow(rows[0]), selfieUrls, inspirationUrls }")
    expect(generator).toContain("One or more selected selfies could not be used")
    expect(generator).toContain("FIRST attached inspiration image as the primary guide")
    expect(generator).toContain("SHOT 1 NON-NEGOTIABLE")
    expect(generator).toContain("If the inspiration image is a tight face crop")
    expect(generator).toContain("Do not force full-body, arrival, or lifestyle-action shots")
    expect(generator).not.toContain("FIRST style reference image is a mandatory visual reference")
    expect(generator).not.toContain("WRITTEN SHOT PROMPT (secondary planning notes")
    expect(generator).not.toContain("FINAL RENDER AUTHORITY")
    expect(generator).not.toContain("If the written shot prompt invents or alters visible details")
    expect(route).toContain("Array.isArray(body.selfieUrls)")
    expect(route).toContain("selfieUrls,")
    expect(client).toContain('fetch("/api/admin/content-kit/selfies"')
    expect(client).toContain("selfieUrls,")
    expect(client).toContain("Open full-size preview")
    expect(client).toContain('role="dialog"')
    expect(types).toContain("selfieUrls: string[]")
    expect(route).toContain('action === "extend"')
    expect(route).toContain('action === "publish"')
  })
})

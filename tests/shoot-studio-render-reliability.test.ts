import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

function source(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("Shoot Studio render reliability", () => {
  it("persists structured per-shot render failures and returns them safely from the API", () => {
    const types = source("lib/content-kit/types.ts")
    const generator = source("lib/content-kit/shoot-generator.ts")
    const route = source("app/api/admin/content-kit/shoots/route.ts")

    expect(types).toContain("renderStatus?:")
    expect(types).toContain("renderErrorCode?:")
    expect(types).toContain("renderErrorMessage?:")
    expect(types).toContain("renderAttempts?:")
    expect(generator).toContain("export class ShootRenderError")
    expect(generator).toContain("isContentPolicyError(error)")
    expect(generator).toContain("await saveShotPatch")
    expect(generator).toContain(
      'renderErrorCode: moderationBlocked ? "moderation_blocked" : "generation_failed"'
    )
    expect(route).toContain("error instanceof ShootRenderError")
    expect(route).toContain("retryable: error.retryable")
    expect(route).toContain("shoot: error.shoot")
  })

  it("preflights inspiration images before creating any preset collection", () => {
    const generator = source("lib/content-kit/shoot-generator.ts")

    expect(generator).toContain("openai.moderations.create")
    expect(generator).toContain('"omni-moderation-latest"')
    expect(generator).toContain("await assertSafeInspirationImages(inspirationUrls)")
    expect(generator).toContain("Replace inspiration")
  })

  it("does not blindly retry moderation-blocked cards or hide their reason", () => {
    const client = source("components/admin/shoot-studio-client.tsx")

    expect(client).toContain('shot.renderStatus !== "moderation_blocked"')
    expect(client).toContain('shot.renderStatus === "moderation_blocked"')
    expect(client).toContain("shot.renderErrorMessage")
    expect(client).toContain("data.shoot")
    expect(client).toContain("Replace the inspiration")
  })

  it("keeps story preset rules during refinement and prevents unsupported story extension", () => {
    const generator = source("lib/content-kit/shoot-generator.ts")

    expect(generator).toContain("shoot.collectionType === \"story\"")
    expect(generator).toContain("shoot.vibe")
    expect(generator).toContain("sanitizeShots(parsed.shots, shoot.shots.length, { story })")
    expect(generator).toContain("Story collections use one inspiration per image")
    expect(generator).not.toMatch(
      /export async function refineShoot[\s\S]*?await renderShotIndicesWithContinuity[\s\S]*?export async function regenerateShot/
    )
    expect(generator).not.toMatch(
      /export async function extendShoot[\s\S]*?await renderShotIndicesWithContinuity[\s\S]*?export async function setShotStatus/
    )
  })
})

import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("Vault public copy backfill route", () => {
  it("is secret protected and updates only derived public copy", () => {
    const route = fs.readFileSync(
      path.join(process.cwd(), "app/api/vault/backfill-public-copy/route.ts"),
      "utf8",
    )

    expect(route).toContain("VAULT_EMAIL_DROP_SECRET")
    expect(route).toContain("derivePublicVaultWhenToUse")
    expect(route).toContain("c.source_shoot_id IS NOT NULL")
    expect(route).toContain("p.status = 'published'")
    expect(route).toContain("SET when_to_use")
    expect(route).toContain("dryRun")
  })
})

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("Vault Maya welcome delivery", () => {
  it("uses the checkout session as the provider idempotency key", () => {
    const handler = readFileSync("lib/payments/handlers/studio-membership.ts", "utf8")

    expect(handler.split("vault-maya-welcome:${params.session.id}")).toHaveLength(3)
  })
})

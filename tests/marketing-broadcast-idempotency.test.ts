import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

describe("marketing broadcast idempotency", () => {
  const marketingSender = source("lib/email/marketing-sender.ts")
  const transactionalSender = source("lib/email/transactional-sender.ts")

  it("writes the required email_type column for every email event", () => {
    expect(marketingSender).toMatch(/INSERT INTO email_events \(\s*email_type,/)
    expect(transactionalSender).toMatch(/INSERT INTO email_events \(\s*email_type,/)
  })

  it("fails closed against an existing Resend broadcast before creating another", () => {
    expect(marketingSender).toContain("findExistingBroadcastByCampaignKey")
    expect(marketingSender).toContain("resend.broadcasts.list")
    expect(marketingSender).toContain("alreadySent: true")
  })

  it("uses provider idempotency on broadcast creation", () => {
    expect(marketingSender).toContain('"Idempotency-Key": broadcastCreateIdempotencyKey')
  })
})

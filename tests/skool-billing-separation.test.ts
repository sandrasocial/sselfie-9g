// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Skool members pay the €97 membership on Skool. The app must never bill them
 * for the same thing, and must never chase them to.
 *
 * The structural trap: a Skool member has NO row in `subscriptions` — her
 * entitlement lives in `skool_membership_entitlements`. Every guard written
 * before Skool existed asks "does this person have an active membership
 * subscription?", and for her the answer is no. So she reads as a non-member to
 * exactly the code whose job is to sell memberships to non-members.
 *
 * These are source-level contracts on purpose: they hold for surfaces that do
 * not exist yet, which is where the next instance of this bug will appear.
 */

const SKOOL_ENTITLEMENT_TABLE = "skool_membership_entitlements"
const SKOOL_ACCESS_CHECK = "hasActiveSkoolMembership"

function source(path: string): string {
  return readFileSync(path, "utf8")
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) out.push(full)
  }
  return out
}

describe("Skool members are billed by Skool, never by the app", () => {
  it("refuses to sell the membership to someone who already has it through Skool", () => {
    const page = source("app/checkout/membership/page.tsx")
    expect(page).toContain(SKOOL_ACCESS_CHECK)
    // The guard has to run before the Stripe session is created, or it guards nothing.
    expect(page.indexOf(SKOOL_ACCESS_CHECK)).toBeLessThan(
      page.indexOf("createLandingCheckoutSession("),
    )
  })

  it("never emails a Stripe membership checkout link to a Skool member", () => {
    // Any cron that can send someone to the membership checkout must exclude
    // Skool members. Checking `subscriptions` alone does not exclude them.
    const crons = walk("app/api/cron").filter((file) =>
      source(file).includes("/checkout/membership"),
    )
    expect(crons.length).toBeGreaterThan(0)

    for (const cron of crons) {
      expect(
        source(cron),
        `${cron} can send a member to the Stripe membership checkout but does not ` +
          `exclude Skool members, who have no subscriptions row and so look like non-members`,
      ).toContain(SKOOL_ENTITLEMENT_TABLE)
    }
  })

  it("keeps the provisioning path free of Stripe billing objects", () => {
    // Provisioning grants an entitlement and credits. It must never create a
    // Stripe customer, subscription, or payment — Skool took the money.
    for (const file of walk("lib/skool")) {
      const text = source(file)
      expect(text).not.toMatch(/stripe\.(customers|subscriptions|checkout|paymentIntents)\b/)
    }
  })
})

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("Visibility To Paid locked offer", () => {
  it("keeps the private offer focused on a client-ready online path", () => {
    const page = read("components/sselfie/public-marketing.tsx")

    expect(page).toContain("Five private places. &euro;2,000 paid in full.")
    expect(page).toContain("Your work is good. Your online presence should make that clear.")
    expect(page).toContain("one clear path from finding you to contacting you")
    expect(page).toContain("offer page copy")
    expect(page).toContain("simple inquiry path")
    expect(page).toContain("We are not rebuilding your whole business")
    expect(page).toContain("This is not a promise of clients or income")
    expect(page).not.toContain("2 &times; &euro;1,100")
    expect(page).not.toContain("inside your own SUITE account")
    expect(page).toContain("No payment is taken here.")
    expect(page).toContain("short fit call first")
    expect(page).toContain("Are you ready to invest €2,000 if it is a fit?")
    expect(page).not.toContain("All of it")
  })

  it("keeps the public page short enough to scan", () => {
    const page = read("components/sselfie/public-marketing.tsx")
    const start = page.indexOf("export function WorkWithMePageContent()")
    const end = page.indexOf("\n}\n", start)
    const workWithMe = page.slice(start, end)
    const paragraphCount = (workWithMe.match(/<p(?:\s|>)/g) ?? []).length

    expect(paragraphCount).toBeLessThanOrEqual(15)
    expect(workWithMe).not.toContain("space-y-4")
  })

  it("requires an existing paid service before accepting an application", () => {
    const page = read("components/sselfie/public-marketing.tsx")
    const route = read("app/api/inquiry/submit/route.ts")

    expect(page).toContain("What service are you already selling")
    expect(page).toContain("What result does it create")
    expect(page).toContain("what does a client usually pay")
    expect(route).toContain("!currentOffer")
    expect(route).toContain("!investmentReadiness")
  })

  it("routes every application through the tracked fit-call pipeline", () => {
    const route = read("app/api/inquiry/submit/route.ts")
    const pipeline = read("lib/brand-engine/applications.ts")

    expect(route).toContain('${"fit_call"}')
    expect(route).toContain('${"none"}')
    expect(route).toContain('${200000}')
    expect(route).toContain("private_sprint_requires_human_fit_call")
    for (const stage of [
      "qualified_queue",
      "call_booked",
      "call_completed",
      "offer_sent",
      "closed_won",
      "closed_lost",
    ]) {
      expect(pipeline).toContain(`"${stage}"`)
    }
  })
})

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("Visibility To Paid locked offer", () => {
  it("keeps the private offer focused, priced, and application-first", () => {
    const page = read("components/sselfie/public-marketing.tsx")

    expect(page).toContain("Five private places. &euro;2,000 paid in full.")
    expect(page).toContain("one clear offer people can understand and buy")
    expect(page).toContain("We are not rebuilding your whole business")
    expect(page).not.toContain("2 &times; &euro;1,100")
    expect(page).not.toContain("inside your own SUITE account")
    expect(page).toContain("No payment is taken here.")
    expect(page).toContain("short fit call first")
    expect(page).toContain("If it is a fit, are you ready to invest €2,000 paid in full?")
    expect(page).not.toContain("All of it")
  })

  it("requires an existing skill or service before accepting an application", () => {
    const page = read("components/sselfie/public-marketing.tsx")
    const route = read("app/api/inquiry/submit/route.ts")

    expect(page).toContain("What skill or service do you already want to turn into a clear paid offer?")
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

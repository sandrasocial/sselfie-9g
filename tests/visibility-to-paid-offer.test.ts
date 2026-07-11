import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("Visibility To Paid locked offer", () => {
  it("keeps the public offer private, priced, and application-first", () => {
    const page = read("components/sselfie/public-marketing.tsx")

    expect(page).toContain("Private 4-week sprint. &euro;2,000.")
    expect(page).toContain("2 &times; &euro;1,100")
    expect(page).toContain("No payment is taken here.")
    expect(page).toContain("short fit call first")
    expect(page).toContain("Are you open to a private €2,000 sprint if it is the right fit?")
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

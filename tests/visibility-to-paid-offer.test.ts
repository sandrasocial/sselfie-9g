import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("Your AI Content Team locked offer", () => {
  it("keeps the private offer focused on one personal AI content team", () => {
    const page = read("components/sselfie/public-marketing.tsx")

    expect(page).toContain("Six weeks together. &euro;2,000.")
    expect(page).toContain("You should not have to run your business")
    expect(page).toContain("personal AI content team")
    expect(page).toContain("Your AI Business Brain")
    expect(page).toContain("Your research assistant")
    expect(page).toContain("Your content director")
    expect(page).toContain("Your writer and repurposer")
    expect(page).toContain("Your team is built for the weekly marketing work")
    expect(page).toContain("Everything starts from the same Business Brain")
    expect(page).toContain("How is this different from using ChatGPT?")
    expect(page).not.toContain("promise of clients or income")
    expect(page).not.toContain("promise of leads")
    expect(page).not.toContain("2 &times; &euro;1,100")
    expect(page).not.toContain("inside your own SUITE account")
    expect(page).toContain("No payment is taken here.")
    expect(page).toContain("short fit call\n")
    expect(page).toContain("Are you ready to invest €2,000 if it is a fit?")
    expect(page).not.toContain("All of it")
  })

  it("keeps the public page short enough to scan", () => {
    const page = read("components/sselfie/public-marketing.tsx")
    const start = page.indexOf("export function WorkWithMePageContent()")
    const end = page.indexOf("\n}\n", start)
    const workWithMe = page.slice(start, end)
    const paragraphCount = (workWithMe.match(/<p(?:\s|>)/g) ?? []).length

    expect(paragraphCount).toBeLessThanOrEqual(16)
    expect(workWithMe).not.toContain("space-y-4")
  })

  it("requires an existing paid service before accepting an application", () => {
    const page = read("components/sselfie/public-marketing.tsx")
    const route = read("app/api/inquiry/submit/route.ts")

    expect(page).toContain("What service are you already selling")
    expect(page).toContain("What result does it create")
    expect(page).toContain("what does a client")
    expect(page).toContain("usually pay?")
    expect(route).toContain("!currentOffer")
    expect(route).toContain("!aiAttempts")
    expect(route).toContain("!investmentReadiness")
  })

  it("routes every application through the tracked fit-call pipeline", () => {
    const route = read("app/api/inquiry/submit/route.ts")
    const pipeline = read("lib/brand-engine/applications.ts")

    expect(route).toContain('${"fit_call"}')
    expect(route).toContain('${"none"}')
    expect(route).toContain('${200000}')
    expect(route).toContain("private_ai_content_team_requires_human_fit_call")
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

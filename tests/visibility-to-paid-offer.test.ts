import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("Your Personal AI Team locked offer", () => {
  it("keeps the private offer focused on the founder bottleneck", () => {
    const page = read("components/sselfie/public-marketing.tsx")

    expect(page).toContain("Six weeks together. &euro;2,000.")
    expect(page).toContain("Your business has grown. Your support has not.")
    expect(page).toContain("personal AI team")
    expect(page).toContain("Your AI Business Brain")
    expect(page).toContain("Your founder workload map")
    expect(page).toContain("Three personal AI roles")
    expect(page).toContain("Three repeatable workflows")
    expect(page).toContain("too much of the business still depends on you")
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
    expect(route).toContain("${200000}")
    expect(route).toContain("private_personal_ai_team_requires_human_fit_call")
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

  it("keeps every active customer journey on the same personal AI team promise", () => {
    const publicPage = read("components/sselfie/public-marketing.tsx")
    const activeSources = [
      publicPage.slice(publicPage.indexOf("export function WorkWithMePageContent()")),
      read("components/work-with-me/client-home.tsx"),
      read("lib/work-with-me/sales-assistant.ts"),
      read("lib/email/templates/work-with-me-welcome.ts"),
      read("docs/business/WORK_WITH_ME_PERSONAL_AI_TEAM_DELIVERY_2026-08-18.md"),
      read("docs/business/WORK_WITH_ME_LAUNCH_EMAILS_2026-08-14.md"),
    ]

    for (const source of activeSources) {
      expect(source).not.toContain("Your AI Content Team")
      expect(source).not.toContain("personal AI content team")
      expect(source).not.toContain("weekly marketing")
      expect(source).not.toMatch(/[–—]/)
    }
  })
})

// In-app freshness: the Create view surfaces the same rotating weekly look the Monday
// habit email announces, and the Library marks recent drops as new. Guards both the
// matching logic and the wiring so the member app never goes static between emails.

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { AESTHETICS } from "@/components/app-v3/aesthetics"
import { matchWeeklyLookAesthetic, toLookSlug } from "@/lib/app-v3/weekly-look"
import {
  WEEKLY_DROP_LOOKS,
  weeklyDropLookForDate,
} from "@/lib/email/templates/suite-habit-emails"

function read(path: string) {
  return readFileSync(path, "utf8")
}

describe("weekly look matching", () => {
  it("slugs are accent-insensitive and hyphen-normalized", () => {
    expect(toLookSlug("Dark Feminine Café")).toBe("dark-feminine-cafe")
    expect(toLookSlug("Cozy Leather + Oversized Knit Mirror")).toBe(
      "cozy-leather-oversized-knit-mirror"
    )
    expect(toLookSlug("  Quiet Luxury London  ")).toBe("quiet-luxury-london")
  })

  it("matches EVERY weekly drop email look to a real aesthetic tile", () => {
    for (const look of WEEKLY_DROP_LOOKS) {
      const matched = matchWeeklyLookAesthetic(look, AESTHETICS)
      expect(matched, `weekly look "${look.name}" has no aesthetic tile`).not.toBeNull()
      expect(matched!.coverImage.length).toBeGreaterThan(0)
    }
  })

  it("matches shorter email names inside longer collection names", () => {
    const denim = matchWeeklyLookAesthetic(
      { name: "Denim Street", oneLiner: "" },
      AESTHETICS
    )
    expect(denim?.name).toContain("Denim Street")
  })

  it("does not match on partial words or empty names", () => {
    expect(
      matchWeeklyLookAesthetic({ name: "Noir", oneLiner: "" }, AESTHETICS)?.name
    ).not.toBe("Quiet Luxury London")
    expect(matchWeeklyLookAesthetic({ name: "", oneLiner: "" }, AESTHETICS)).toBeNull()
    expect(
      matchWeeklyLookAesthetic({ name: "Something That Does Not Exist", oneLiner: "" }, AESTHETICS)
    ).toBeNull()
  })

  it("rotates deterministically with the email's week math", () => {
    // The email buckets by 7-day windows from Jan 1: Jul 2-8 2026 is one bucket.
    const a = weeklyDropLookForDate(new Date("2026-07-02T08:00:00Z"))
    const b = weeklyDropLookForDate(new Date("2026-07-08T20:00:00Z"))
    const c = weeklyDropLookForDate(new Date("2026-07-10T08:00:00Z"))
    expect(a.name).toBe(b.name) // same week, same look
    expect(a.name).not.toBe(c.name) // next week rotates
  })
})

describe("in-app freshness wiring", () => {
  it("aesthetics API returns the weekly look matched server-side", () => {
    const route = read("app/api/app-v3/aesthetics/route.ts")
    expect(route).toContain("weeklyDropLookForDate")
    expect(route).toContain("matchWeeklyLookAesthetic")
    expect(route).toContain("weeklyLook")
    expect(route).toContain("aestheticId: matched.id")
  })

  it("keeps the weekly look server-side only: Create stays a calm start surface (single-owner UX 2026-07-06)", () => {
    // The Monday email still announces the weekly look and the aesthetics API still matches
    // it to a tile (asserted above). The Create tab no longer renders a weekly tile or vault
    // grid - creation decisions live inside Maya per SUITE_MAYA_SINGLE_OWNER_UX_2026-07-06.
    const frontDoor = read("components/app-v3/visual-front-door.tsx")
    expect(frontDoor).not.toContain("New this week")
    expect(frontDoor).not.toContain("weeklyAesthetic")
    expect(frontDoor).not.toContain("openAesthetic(")
  })

  it("library API carries publishedAt for both vault and academy drops", () => {
    const route = read("app/api/app-v3/library/route.ts")
    expect(route).toContain("publishedAt: d.publishedAt")
    expect(route).toContain("created_at")
  })

  it("Library marks drops from the last 14 days as new", () => {
    const library = read("components/app-v3/library-view.tsx")
    expect(library).toContain("NEW_DROP_WINDOW_MS = 14")
    expect(library).toContain("isNewDrop(d.publishedAt)")
    expect(library).toContain("publishedAt?: string | null")
  })
})

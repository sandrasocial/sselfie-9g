// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8")
}

function exists(relativePath: string) {
  return fs.existsSync(path.join(ROOT, relativePath))
}

describe("visibility suite entitlements and routing", () => {
  it("PRODUCT_ACCESS_ALIASES maps visibility_suite to the three sub-products", () => {
    const contents = read("lib/academy-entitlements.ts")
    expect(contents).toContain('visibility_suite: ["what_to_say", "show_up", "get_paid"]')
  })

  it("suite buyer home page exists at the expected route", () => {
    expect(exists("app/academy/access/visibility-suite/page.tsx")).toBe(true)
  })

  it("Maya chat API route exists", () => {
    expect(exists("app/api/academy/visibility-suite/chat/route.ts")).toBe(true)
  })

  it("suite page fires visibility_suite_access_opened analytics event", () => {
    const contents = read("app/academy/access/visibility-suite/page.tsx")
    expect(contents).toContain("visibility_suite_access_opened")
  })

  it("suite page includes sprint upsell linking to /work-with-me", () => {
    const contents = read("app/academy/access/visibility-suite/page.tsx")
    expect(contents).toContain("/work-with-me")
    expect(contents).toContain("4-Week")
  })

  it("Maya component contains all five quick prompts", () => {
    const contents = read("components/academy/visibility-suite-maya-chat.tsx")
    expect(contents).toContain("Where should I start?")
    expect(contents).toContain("Review my answers so far")
    expect(contents).toContain("Turn this into my weekly plan")
    expect(contents).toContain("Help me map my monetization path")
    expect(contents).toContain("What is my next move?")
  })

  it("course library routes suite product owners to the suite home", () => {
    const contents = read("app/academy/_lib/course-library.ts")
    expect(contents).toContain("/academy/access/visibility-suite")
    expect(contents).toContain("SUITE_PRODUCT_IDS")
    expect(contents).toContain('product.deliveryKind !== "academy_course" ||')
  })

  it("Maya chat API checks server-side suite access", () => {
    const contents = read("app/api/academy/visibility-suite/chat/route.ts")
    expect(contents).toContain("getAcademyEntitlementState")
    expect(contents).toContain("Visibility Suite access required")
    expect(contents).toContain("entitlementState.membershipActive")
  })

  it("workbook Maya API exists and checks product access", () => {
    const contents = read("app/api/academy/visibility-suite/workbook/route.ts")
    expect(contents).toContain("visibility_suite_workbook_maya_used")
    expect(contents).toContain("Workbook access required")
    expect(contents).toContain("getAcademyEntitlementState")
  })

  it("each workbook includes a Maya output panel", () => {
    const workbooks = [
      ["public/academy/what_to_say/index.html", "Generate Message Kit"],
      ["public/academy/show_up/index.html", "Generate Content Plan"],
      ["public/academy/get_paid/index.html", "Generate Sales Path"],
    ] as const

    for (const [file, cta] of workbooks) {
      const contents = read(file)
      expect(contents).toContain("Maya Output")
      expect(contents).toContain(cta)
      expect(contents).toContain("/api/academy/visibility-suite/workbook")
      expect(contents).toContain("collectMayaAnswers")
    }
  })

  it("suite images exist in public folder", () => {
    const images = ["hero.png", "what-to-say.png", "show-up.png", "get-paid.png", "sprint.png"]
    for (const img of images) {
      expect(exists(`public/academy/visibility-suite/${img}`), `${img} missing`).toBe(true)
    }
  })
})

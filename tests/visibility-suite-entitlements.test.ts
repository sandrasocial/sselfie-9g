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

function countWorkbookFields(contents: string) {
  return (contents.match(/<textarea|<input type="text"/g) || []).length
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
    expect(contents).toContain("Want help turning this into")
  })

  it("Maya component contains simplified journey quick prompts", () => {
    const contents = read("components/academy/visibility-suite-maya-chat.tsx")
    expect(contents).toContain("Tell Me Where To Start")
    expect(contents).toContain("Review My Answers")
    expect(contents).toContain("Create My Next 7 Days")
    expect(contents).toContain("What Is My Next Paid Move?")
  })

  it("suite Maya chat sends saved workbook answers and renders markdown", () => {
    const client = read("components/academy/visibility-suite-maya-chat.tsx")
    const route = read("app/api/academy/visibility-suite/chat/route.ts")

    expect(client).toContain("collectWorkbookAnswers")
    expect(client).toContain("wts_answers")
    expect(client).toContain("showup_answers")
    expect(client).toContain("gp_answers")
    expect(client).toContain(
      "body: JSON.stringify({ question: cleanQuestion, ownedProducts, answers })"
    )
    expect(client).toContain("dangerouslySetInnerHTML={renderMarkdown(msg.text)}")
    expect(client).toContain("visibility_suite_maya_thread")
    expect(route).toContain("normalizeWorkbookAnswers")
    expect(route).toContain("Workbook answers saved in this browser")
    expect(route).toContain("answer_count: entitledAnswers.length")
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

  it("workbook Maya output renders markdown and persists locally", () => {
    const workbooks = [
      ["public/academy/what_to_say/index.html", "what_to_say"],
      ["public/academy/show_up/index.html", "show_up"],
      ["public/academy/get_paid/index.html", "get_paid"],
    ] as const

    for (const [file, productId] of workbooks) {
      const contents = read(file)
      expect(contents).toContain(`const MAYA_PRODUCT_ID = '${productId}'`)
      expect(contents).toContain("function renderMayaMarkdown")
      expect(contents).toContain("body.innerHTML = renderMayaMarkdown")
      expect(contents).toContain("saveMayaOutput(action")
      expect(contents).toContain("loadMayaOutput();")
      expect(contents).toContain("visibility_suite_workbook_output_")
      expect(contents).not.toContain("body.textContent = data.answer")
    }
  })

  it("visibility plan generator route and page exist", () => {
    const route = read("app/api/academy/visibility-suite/plan/generate/route.ts")
    const page = read("app/academy/visibility-plan/[token]/page.tsx")
    const client = read("components/academy/visibility-plan-generator.tsx")

    expect(route).toContain("visibility_suite_plan_generated")
    expect(route).toContain("visibility_suite_plans")
    expect(route).toContain("parseVisibilityPlanJson")
    expect(route).toContain("buildFallbackVisibilityPlan")
    expect(route).toContain("Visibility Suite AI plan fallback used")
    expect(route).toContain("await sql`")
    expect(route).not.toContain("db.query")
    expect(route).not.toContain("QueryableSql")
    expect(page).toContain("Maya Visibility Plan")
    expect(page).toContain("Apply For Private Sprint")
    expect(client).toContain("Create My Maya Visibility Plan")
    expect(client).toContain("Message")
    expect(client).toContain("Content rhythm")
    expect(client).toContain("Offer path")
    expect(client).toContain("Sales post")
    expect(client).toContain("DM scripts")
    expect(client).toContain("Next 7 days")
    expect(client).toContain("wts_answers")
    expect(client).toContain("showup_answers")
    expect(client).toContain("gp_answers")
    expect(exists("migrations/20260429_visibility_suite_plans.sql")).toBe(true)
    expect(exists("lib/academy/visibility-plan.ts")).toBe(true)
  })

  it("implements the market fit workbook question updates", () => {
    const whatToSay = read("public/academy/what_to_say/index.html")
    const showUp = read("public/academy/show_up/index.html")
    const getPaid = read("public/academy/get_paid/index.html")
    const generator = read("components/academy/visibility-plan-generator.tsx")
    const workbookRoute = read("app/api/academy/visibility-suite/workbook/route.ts")
    const planRoute = read("app/api/academy/visibility-suite/plan/generate/route.ts")
    const suitePage = read("app/academy/access/visibility-suite/page.tsx")

    expect(whatToSay).toContain("Message Test")
    expect(whatToSay).toContain("Proof — What Makes This Believable?")
    expect(whatToSay).toContain("Content-To-Offer Bridge")
    expect(showUp).toContain("How Many Posts Can You Realistically Create Each Week?")
    expect(showUp).toContain("Which Formats Fit You Best Right Now?")
    expect(showUp).toContain("What Content Assets Do You Already Have?")
    expect(showUp).toContain("What Can You Repurpose This Week?")
    expect(getPaid).toContain("Buyer Urgency")
    expect(getPaid).toContain("Willingness To Pay")
    expect(getPaid).toContain("Delivery Boundary")
    expect(getPaid).toContain("First 10 Buyers")
    expect(getPaid).toContain("What Part Of Selling Feels Hardest?")
    expect(generator).toContain("Content-to-offer bridge")
    expect(generator).toContain("Realistic weekly post capacity")
    expect(generator).toContain("Who do you help?")
    expect(generator).toContain("First 10 buyers")
    expect(workbookRoute).toContain("first 10 buyer invite list")
    expect(planRoute).toContain("Get Paid inputs should shape the buyer urgency")
    expect(suitePage).toContain("Your Visibility To Paid Path")
    expect(countWorkbookFields(whatToSay)).toBe(20)
    expect(countWorkbookFields(showUp)).toBe(15)
    expect(countWorkbookFields(getPaid)).toBe(31)
  })

  it("shows the guided four-step suite path across the buyer experience", () => {
    const publicPage = read("app/visibility-suite/page.tsx")
    const suitePage = read("app/academy/access/visibility-suite/page.tsx")
    const whatToSay = read("public/academy/what_to_say/index.html")
    const showUp = read("public/academy/show_up/index.html")
    const getPaid = read("public/academy/get_paid/index.html")
    const generator = read("components/academy/visibility-plan-generator.tsx")

    expect(publicPage).toContain("Generate your Maya Visibility Plan")
    expect(suitePage).toContain("Maya Visibility Plan")
    expect(suitePage).toContain("Start Step 01")
    expect(suitePage).toContain("Continue To Step")
    expect(whatToSay).toContain("Step 01 of 04 — What To Say")
    expect(whatToSay).toContain("Next: Show Up")
    expect(showUp).toContain("Step 02 of 04 — Show Up")
    expect(showUp).toContain("Next: Get Paid")
    expect(getPaid).toContain("Step 03 of 04 — Get Paid")
    expect(getPaid).toContain("Next: Maya Visibility Plan")
    expect(generator).toContain("Step 04 — Maya Visibility Plan")
    expect(publicPage).toContain("A simple visibility system for women")
    expect(suitePage).toContain("Visibility To Paid is a simple 3-part system")
  })

  it("suite images exist in public folder", () => {
    const images = ["hero.png", "what-to-say.png", "show-up.png", "get-paid.png", "sprint.png"]
    for (const img of images) {
      expect(exists(`public/academy/visibility-suite/${img}`), `${img} missing`).toBe(true)
    }
  })

  it("market fit audit plan is documented", () => {
    const contents = read("docs/academy/VISIBILITY_SUITE_MARKET_FIT_AUDIT_2026-04-29.md")
    expect(contents).toContain("Product Fit Verdict")
    expect(contents).toContain("Question-Level Audit")
    expect(contents).toContain("Pricing Hypotheses")
    expect(contents).toContain("Next Recommended Implementation")
  })
})

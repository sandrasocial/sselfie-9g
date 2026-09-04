import fs from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  isCompleteGetPaidSalesPlan,
  isCompleteShowUpContentPlan,
  normalizeGetPaidSalesPlan,
  normalizeShowUpContentPlan,
  parseGetPaidSalesPlan,
  parseShowUpContentPlan,
} from "@/lib/academy/follow-up-workbook-output"

const root = process.cwd()

export function completeShowUpPlan() {
  return {
    cover: { title: "What To Post", subtitle: "Your real 30-day plan", createdFor: "Sandra" },
    foundation: {
      monthlyFocus: "Help women understand what SSELFIE can do for them.",
      audienceAction: "Reply and start a conversation.",
      realisticCapacity: "Four feed posts each week, with simple Stories between them.",
      bestFormats: ["Selfies", "Carousels", "Stories"],
      formatToAvoid: "Daily talking Reels",
      easierSystem: "Batch four posts on Sunday and reuse each one in Stories.",
    },
    weeklyThemes: Array.from({ length: 4 }, (_, index) => ({
      week: `Week ${index + 1}`,
      theme: `Real theme ${index + 1}`,
      purpose: `Give the audience one clear reason to respond in week ${index + 1}.`,
    })),
    posts: Array.from({ length: 30 }, (_, index) => ({
      day: `Day ${index + 1}`,
      week: "wrong on purpose",
      type: "Story",
      goal: "connection",
      hook: `A finished hook for day ${index + 1}`,
      captionStarter: `A useful, specific caption starter for day ${index + 1} that sounds personal and is ready to continue.`,
      visual: "Use a real desk selfie from this week.",
      cta: "Reply and tell me where you feel stuck.",
    })),
    existingAssetIdeas: Array.from({ length: 5 }, (_, index) => `Existing asset ${index + 1}`),
    repurposingIdeas: Array.from({ length: 5 }, (_, index) => `Repurpose idea ${index + 1}`),
    sundayBatchPlan: Array.from({ length: 5 }, (_, index) => `Batch step ${index + 1}`),
    getPaidInput: "The strongest response is from women who need help saying what they sell.",
    nextSteps: ["Choose this week's posts.", "Pick the photos.", "Post day one."],
  }
}

export function completeGetPaidPlan() {
  return {
    cover: { title: "Get Paid", subtitle: "Your honest first-sales plan", createdFor: "Sandra" },
    offer: {
      name: "SSELFIE Starter",
      oneSentence: "I help women turn one real photo and their story into posts they can use.",
      exactResult: "A clear week of content they are ready to post.",
      timeline: "Seven days",
      price: "€100",
      deliverables: ["One message session", "Seven written posts", "A simple posting plan"],
      howToBuy: "DM me START and I will send the details.",
    },
    buyer: {
      oneSentence: "A woman building alone who freezes when it is time to post.",
      struggle: "She has ideas but cannot turn them into clear posts.",
      desiredChange: "She wants a week of honest content ready to share.",
      urgency: "She has something to sell now and does not want another quiet month.",
      willingnessToPay: "She has asked for hands-on help writing the posts.",
    },
    first500Path: {
      path: "Invite five people into a €100 starter service.",
      simpleMath: "Five buyers at €100 is €500. This is a target, not a promise.",
      firstMove: "Send one warm invitation today.",
    },
    salesPost: {
      hook: "If posting your offer makes you freeze, this is for you.",
      story:
        "I know what it is like to have something real to sell and still stare at a blank caption.",
      bridge: "That is why I made a small hands-on way to get the words finished.",
      offer:
        "In seven days, we will turn your story into seven clear posts and a plan you can keep using.",
      cta: "DM me START and I will send the details.",
    },
    dmScripts: Array.from({ length: 3 }, (_, index) => `Warm DM script ${index + 1}`),
    followUps: Array.from({ length: 3 }, (_, index) => `Warm follow-up ${index + 1}`),
    objectionReplies: Array.from({ length: 5 }, (_, index) => ({
      objection: `Honest objection ${index + 1}`,
      reply: `Pressure-free reply ${index + 1}`,
    })),
    firstTenBuyerPrompts: Array.from(
      { length: 10 },
      (_, index) => `Warm person category ${index + 1}`
    ),
    sevenDayPlan: Array.from({ length: 7 }, (_, index) => ({
      day: `Day ${index + 1}`,
      action: `Take sales action ${index + 1}`,
      output: `Finish useful output ${index + 1}`,
    })),
    safety: {
      deliveryBoundary:
        "This includes writing and a posting plan. It does not include daily account management.",
      nonGuarantee: "This gives you a clear sales path. It does not guarantee buyers or income.",
    },
    visibilityPlanInput:
      "Lead with the seven finished posts and the woman who freezes when she has to sell.",
    nextBestMove: "Post the sales post and reply personally to every real response.",
  }
}

describe("follow-up workbook complete PDF outputs", () => {
  it("parses, validates, and safely numbers all 30 What To Post days", () => {
    const parsed = parseShowUpContentPlan(
      `\n\`\`\`json\n${JSON.stringify(completeShowUpPlan())}\n\`\`\``
    )

    expect(isCompleteShowUpContentPlan(parsed)).toBe(true)
    expect(parsed.posts).toHaveLength(30)
    expect(parsed.posts[0]).toMatchObject({ day: "Day 1", week: "Week 1" })
    expect(parsed.posts[8]).toMatchObject({ day: "Day 9", week: "Week 2" })
    expect(parsed.posts[29]).toMatchObject({ day: "Day 30", week: "Week 4" })
  })

  it("rejects a short What To Post draft", () => {
    expect(
      isCompleteShowUpContentPlan(normalizeShowUpContentPlan({ posts: [{ hook: "One idea" }] }))
    ).toBe(false)
  })

  it("parses and validates the complete Get Paid plan", () => {
    const parsed = parseGetPaidSalesPlan(JSON.stringify(completeGetPaidPlan()))

    expect(isCompleteGetPaidSalesPlan(parsed)).toBe(true)
    expect(parsed.dmScripts).toHaveLength(3)
    expect(parsed.objectionReplies).toHaveLength(5)
    expect(parsed.firstTenBuyerPrompts).toHaveLength(10)
    expect(parsed.sevenDayPlan).toHaveLength(7)
  })

  it("rejects a short Get Paid draft", () => {
    expect(
      isCompleteGetPaidSalesPlan(normalizeGetPaidSalesPlan({ offer: { oneSentence: "One offer" } }))
    ).toBe(false)
  })

  it("connects both workbook buttons to saved result pages with PDF output", () => {
    const route = fs.readFileSync(
      path.join(root, "app/api/academy/visibility-suite/workbook/route.ts"),
      "utf8"
    )
    const resultPage = fs.readFileSync(
      path.join(root, "app/academy/workbook-result/[token]/page.tsx"),
      "utf8"
    )

    for (const [file, button, storageKey] of [
      [
        "server/academy-workbooks/show_up/index.html",
        "Create My What To Post PDF",
        "sselfie.showUp.latestResult",
      ],
      [
        "server/academy-workbooks/get_paid/index.html",
        "Create My Get Paid PDF",
        "sselfie.getPaid.latestResult",
      ],
    ]) {
      const workbook = fs.readFileSync(path.join(root, file), "utf8")
      expect(workbook).toContain(button)
      expect(workbook).toContain(storageKey)
      expect(workbook).toContain("window.location.href = data.url")
    }

    expect(route).toContain("generateFollowUpWorkbookOutput")
    expect(route).toContain("/academy/workbook-result/${token}")
    expect(resultPage).toContain("<PrintPlanButton />")
    expect(resultPage).toContain("Your Personal 30-Day Content Plan")
    expect(resultPage).toContain("Your Personal Offer And First-Sales Plan")
  })
})

// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  buildHigherSelfCommandCenter,
  type HigherSelfCommandCenterInput,
} from "@/lib/admin/higher-self-command-center"

const read = (path: string) => readFileSync(path, "utf8")

function input(overrides: Partial<HigherSelfCommandCenterInput> = {}): HigherSelfCommandCenterInput {
  return {
    money: {
      last48h: { payments: 1, revenue: 37 },
      week: { payments: 3, revenue: 111 },
      month: { payments: 8, revenue: 900 },
    },
    needsMe: {
      webhookReviews: 0,
      newSupportThreads: 0,
    },
    content: {
      nextPostTitle: "The bathroom studio",
      nextPostHook: "This was never just about selfies",
      topPrompt: { title: "Old Money London", copies: 12 },
    },
    scorecard: {
      workWithMe: {
        applications30d: 0,
        qualifiedOpen: 0,
        bookedCalls: 0,
        paymentLinksSent: 0,
        won: 0,
      },
      funnels30d: [],
      trials: {
        active: 0,
        claimed30d: 0,
        firstGeneration30d: 0,
      },
    },
    ...overrides,
  }
}

describe("Higher Self Command Center", () => {
  it("keeps a quiet 48h sales window on the approved Prompt Vault comeback instead of drifting", () => {
    const center = buildHigherSelfCommandCenter(
      input({
        money: {
          last48h: { payments: 0, revenue: 0 },
          week: { payments: 0, revenue: 0 },
          month: { payments: 8, revenue: 900 },
        },
      })
    )

    expect(center.headline).toContain("comeback")
    expect(center.moneyMove.id).toBe("run-owned-commerce-engine")
    expect(center.moneyMove.action).toContain("Prompt Vault")
    expect(center.moneyMove.action).not.toContain("Tutorial Partnership")
    expect(center.offerBridge.title).toBe("Keep private offers private")
    expect(center.storyMove.bridge).toContain("reply PROMPT")
    expect(center.storyMove.bridge).not.toContain("WORK")
    expect(center.coreLock).toContain("This was never just about selfies")
  })

  it("protects payment truth before content or sales conversations", () => {
    const center = buildHigherSelfCommandCenter(
      input({
        money: {
          last48h: { payments: 0, revenue: 0 },
          week: { payments: 0, revenue: 0 },
          month: { payments: 8, revenue: 900 },
        },
        needsMe: {
          webhookReviews: 2,
          newSupportThreads: 0,
        },
      })
    )

    expect(center.moneyMove.id).toBe("protect-payment-truth")
    expect(center.moneyMove.link.href).toBe("/admin/webhook-review")
    expect(center.followUpMove.id).toBe("move-approved-buyer-follow-ups")
  })

  it("protects existing attended inquiries without restoring Work With Me as the growth engine", () => {
    const center = buildHigherSelfCommandCenter(
      input({
        scorecard: {
          workWithMe: {
            applications30d: 3,
            qualifiedOpen: 1,
            bookedCalls: 1,
            paymentLinksSent: 1,
            won: 0,
          },
          funnels30d: [],
          trials: {
            active: 0,
            claimed30d: 0,
            firstGeneration30d: 0,
          },
        },
      })
    )

    expect(center.moneyMove.id).toBe("legacy-attended-follow-up")
    expect(center.moneyMove.action).toContain("3 existing attended inquiries")
    expect(center.moneyMove.action).not.toContain("before building anything new")
    expect(center.ceoRule).toContain("One owner, one weekly priority")
  })

  it("repairs a checkout bridge when starts have no purchases", () => {
    const center = buildHigherSelfCommandCenter(
      input({
        scorecard: {
          workWithMe: {
            applications30d: 0,
            qualifiedOpen: 0,
            bookedCalls: 0,
            paymentLinksSent: 0,
            won: 0,
          },
          funnels30d: [
            {
              productType: "Prompt Vault",
              starts: 18,
              recoverableStarts: 12,
              purchases: 0,
              revenue: 0,
            },
          ],
          trials: {
            active: 0,
            claimed30d: 0,
            firstGeneration30d: 0,
          },
        },
      })
    )

    expect(center.moneyMove.id).toBe("repair-leaking-funnel")
    expect(center.moneyMove.title).toContain("Prompt Vault")
    expect(center.systemMove.id).toBe("tighten-buying-moment")
  })

  it("is wired into the admin home as the live daily operating surface", () => {
    const homeReport = read("lib/admin/home-report.ts")
    const adminPage = read("app/admin/page.tsx")
    const operatingSystem = read("docs/business/SSELFIE_HIGHER_SELF_OPERATING_SYSTEM_2026-07-07.md")

    expect(homeReport).toContain("buildHigherSelfCommandCenter")
    expect(homeReport).toContain("last_48h_payments")
    expect(homeReport).toContain("commandCenter:")
    expect(adminPage).toContain("Higher Self Command Center")
    expect(adminPage).toContain("CEO rule today")
    expect(operatingSystem).toContain("Do the money move before opening a new build thread")
  })
})

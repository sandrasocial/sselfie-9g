import fs from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  isCompleteWhatToSayMessageKit,
  normalizeWhatToSayMessageKit,
  parseWhatToSayMessageKit,
} from "@/lib/academy/what-to-say-output"

const root = process.cwd()

function completeKit() {
  return {
    cover: { title: "What To Say", subtitle: "Your message", createdFor: "Sandra" },
    coreMessage: {
      oneLineMessage: "I help women say the real thing.",
      iHelpStatement: "I help women share their story with confidence.",
      instagramBio: "Helping women share their story and show up.",
    },
    foundation: {
      audience: "A woman building from her phone.",
      audienceSelfTalk: "I never know what to post.",
      transformation: "She can explain what she does clearly.",
      authority: "I learned this by building it myself.",
      story: "I started from scratch and kept showing up.",
      expertise: "Clear, personal content.",
      values: "Real over polished.",
      vision: "More women building what matters to them.",
      voice: "Warm, direct, and specific.",
    },
    contentBuckets: ["Story", "Teach", "Sell", "Connect"].map(name => ({
      name,
      purpose: `${name} with a clear reason.`,
      postIdeas: [`${name} idea one`, `${name} idea two`, `${name} idea three`],
    })),
    brandWords: ["real", "seen", "built it"],
    hooks: Array.from({ length: 10 }, (_, index) => `Finished hook ${index + 1}`),
    captions: Array.from({ length: 3 }, (_, index) => ({
      label: `Caption ${index + 1}`,
      hook: `Hook ${index + 1}`,
      body: `A complete caption body ${index + 1}.`,
      cta: "Reply and tell me where you are stuck.",
    })),
    softCta: "Reply if this sounds like you.",
    offerBridge: "If you want help with this, I made something for you.",
    nextSteps: ["Update your bio.", "Post the first caption.", "Start a conversation."],
  }
}

describe("What To Say complete PDF output", () => {
  it("parses and validates a complete personalized message kit", () => {
    const parsed = parseWhatToSayMessageKit(`\n\`\`\`json\n${JSON.stringify(completeKit())}\n\`\`\``)

    expect(isCompleteWhatToSayMessageKit(parsed)).toBe(true)
    expect(parsed.cover.createdFor).toBe("Sandra")
    expect(parsed.contentBuckets).toHaveLength(4)
    expect(parsed.hooks).toHaveLength(10)
    expect(parsed.captions).toHaveLength(3)
  })

  it("does not treat a short inline draft as a complete document", () => {
    const parsed = normalizeWhatToSayMessageKit({
      coreMessage: { oneLineMessage: "One sentence" },
    })

    expect(isCompleteWhatToSayMessageKit(parsed)).toBe(false)
  })

  it("connects the workbook button to a saved result page with PDF output", () => {
    const workbook = fs.readFileSync(
      path.join(root, "server/academy-workbooks/what_to_say/index.html"),
      "utf8"
    )
    const route = fs.readFileSync(
      path.join(root, "app/api/academy/visibility-suite/workbook/route.ts"),
      "utf8"
    )
    const resultPage = fs.readFileSync(
      path.join(root, "app/academy/what-to-say-result/[token]/page.tsx"),
      "utf8"
    )

    expect(workbook).toContain("Create My Complete PDF")
    expect(workbook).toContain("window.location.href = data.url")
    expect(route).toContain("academy_workbook_outputs")
    expect(route).toContain("/academy/what-to-say-result/${token}")
    expect(resultPage).toContain("<PrintPlanButton />")
    expect(resultPage).toContain("Three finished captions")
  })
})

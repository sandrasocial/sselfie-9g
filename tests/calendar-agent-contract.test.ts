import { describe, expect, it } from "vitest"
import { zodToJsonSchema } from "zod-to-json-schema"

import {
  calendarAgentGenerationSchema,
  calendarAgentResultSchema,
} from "@/lib/feed-planner/calendar-agent"

describe("Calendar agent contract", () => {
  it("accepts bounded previewable Calendar operations", () => {
    const result = calendarAgentResultSchema.parse({
      message: "I can move post 4 beside your strongest portrait.",
      proposal: {
        kind: "move_post",
        label: "Move post 4 to position 2",
        postId: 44,
        targetPosition: 2,
      },
    })

    expect(result.proposal?.kind).toBe("move_post")
  })

  it("rejects publishing or unknown autonomous actions", () => {
    expect(() =>
      calendarAgentResultSchema.parse({
        message: "Published it.",
        proposal: { kind: "publish_to_instagram", label: "Publish now" },
      })
    ).toThrow()
  })

  it("uses provider-compatible JSON schema constraints", () => {
    const jsonSchema = JSON.stringify(zodToJsonSchema(calendarAgentGenerationSchema))

    expect(jsonSchema).not.toContain("exclusiveMinimum")
    expect(jsonSchema).not.toContain('"minimum"')
    expect(jsonSchema).not.toContain('"maximum"')
  })
})

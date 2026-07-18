import { z } from "zod"

const proposalBase = z.object({
  label: z.string().trim().min(1).max(100),
})

function createProposalSchema(postId: z.ZodNumber, targetPosition: z.ZodNumber) {
  return z.discriminatedUnion("kind", [
    proposalBase.extend({ kind: z.literal("create_plan") }),
    proposalBase.extend({
      kind: z.literal("update_caption"),
      postId,
      caption: z.string().trim().min(1).max(2200),
    }),
    proposalBase.extend({
      kind: z.literal("move_post"),
      postId,
      targetPosition,
    }),
    proposalBase.extend({
      kind: z.literal("update_bio"),
      bio: z.string().trim().min(1).max(150),
    }),
    proposalBase.extend({
      kind: z.literal("generate_image"),
      postId,
    }),
    proposalBase.extend({
      kind: z.literal("open_photo_picker"),
      postId,
    }),
    proposalBase.extend({ kind: z.literal("open_style_picker") }),
    proposalBase.extend({ kind: z.literal("open_highlights") }),
  ])
}

export const calendarAgentProposalSchema = createProposalSchema(
  z.number().int().min(1),
  z.number().int().min(1).max(12)
)

export const calendarAgentResultSchema = z.object({
  message: z.string().trim().min(1).max(700),
  proposal: calendarAgentProposalSchema.nullable(),
})

// Anthropic structured outputs reject numeric range keywords in the JSON schema.
// The generated object is parsed through the stricter result schema before it is returned.
export const calendarAgentGenerationSchema = z.object({
  message: z.string().trim().min(1).max(700),
  proposal: createProposalSchema(z.number().int(), z.number().int()).nullable(),
})

const calendarPostSchema = z.object({
  id: z.number().int().positive(),
  position: z.number().int().positive(),
  caption: z.string().nullable().optional(),
  contentPillar: z.string().nullable().optional(),
  scheduledAt: z.string().nullable().optional(),
  hasImage: z.boolean(),
})

export const calendarAgentRequestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  feedId: z.number().int().positive().nullable(),
  selectedPostId: z.number().int().positive().nullable(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(1000),
      })
    )
    .max(12)
    .default([]),
  feedSummary: z
    .object({
      title: z.string().max(160).nullable().optional(),
      bio: z.string().max(150).nullable().optional(),
      visualDirectionMode: z.enum(["maya", "curated", "inspiration", "custom"]).nullable().optional(),
      visualDirectionBrief: z.string().max(500).nullable().optional(),
      inspirationImageUrl: z.string().url().max(2048).nullable().optional(),
      feedStyle: z.string().max(160).nullable().optional(),
      feedStyleVariationId: z.number().int().positive().nullable().optional(),
      posts: z.array(calendarPostSchema).max(12),
    })
    .nullable(),
})

export type CalendarAgentProposal = z.infer<typeof calendarAgentProposalSchema>
export type CalendarAgentResult = z.infer<typeof calendarAgentResultSchema>
export type CalendarAgentRequest = z.infer<typeof calendarAgentRequestSchema>

export function proposalRequiresFeed(proposal: CalendarAgentProposal): boolean {
  return proposal.kind !== "create_plan"
}

export function proposalPostId(proposal: CalendarAgentProposal): number | null {
  return "postId" in proposal ? proposal.postId : null
}

import { z } from "zod"
import { parseGalleryAssetId } from "@/lib/app-v3/gallery-assets"

export const CONVERSATIONAL_PHOTO_EDIT_CREDIT_COST = 1
export const CONVERSATIONAL_PHOTO_EDIT_MAX_INSTRUCTION_LENGTH = 2_000
export const CONVERSATIONAL_PHOTO_EDIT_MAX_HISTORY = 20

const assetIdSchema = z
  .string()
  .trim()
  .refine(value => parseGalleryAssetId(value)?.kind === "ai", {
    message: "Conversational editing requires a canonical Gallery photo",
  })

const historyEntrySchema = z.object({
  assetId: assetIdSchema,
  instruction: z.string().trim().min(1).max(CONVERSATIONAL_PHOTO_EDIT_MAX_INSTRUCTION_LENGTH),
})

const creditConfirmationSchema = z.object({
  confirmed: z.literal(true),
  expectedCost: z.literal(CONVERSATIONAL_PHOTO_EDIT_CREDIT_COST),
  requestId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{12,96}$/),
})

const applySchema = z.object({
  workspacePath: z.literal("edit-photo"),
  action: z.literal("apply"),
  sourceAssetId: assetIdSchema,
  rootAssetId: assetIdSchema.optional(),
  history: z.array(historyEntrySchema).max(CONVERSATIONAL_PHOTO_EDIT_MAX_HISTORY).default([]),
  creditConfirmation: creditConfirmationSchema.optional(),
})

const undoSchema = z.object({
  workspacePath: z.literal("edit-photo"),
  action: z.literal("undo"),
  sourceAssetId: assetIdSchema,
  rootAssetId: assetIdSchema.optional(),
  undoToAssetId: assetIdSchema,
  history: z.array(historyEntrySchema).max(CONVERSATIONAL_PHOTO_EDIT_MAX_HISTORY).default([]),
})

export const conversationalPhotoEditSchema = z.discriminatedUnion("action", [
  applySchema,
  undoSchema,
])

export type ConversationalPhotoEditRequest = z.infer<typeof conversationalPhotoEditSchema>

export type ConversationalPhotoEditReceipt = {
  action: "apply" | "undo"
  sourceAssetId: string
  resultAssetId: string
  rootAssetId: string
  instruction: string | null
  historyDepth: number
  creditRequestId: string | null
}

export function parseConversationalPhotoEditRequest(
  value: unknown
): ConversationalPhotoEditRequest | null {
  const parsed = conversationalPhotoEditSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function conversationalEditNeedsCreditConfirmation(
  request: ConversationalPhotoEditRequest
): boolean {
  return request.action === "apply" && !request.creditConfirmation
}

export function conversationalEditInstruction(value: unknown): string | null {
  if (typeof value !== "string") return null
  const instruction = value.trim()
  if (!instruction || instruction.length > CONVERSATIONAL_PHOTO_EDIT_MAX_INSTRUCTION_LENGTH) {
    return null
  }
  return instruction
}

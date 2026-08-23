import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  CONVERSATIONAL_PHOTO_EDIT_CREDIT_COST,
  conversationalEditInstruction,
  conversationalEditNeedsCreditConfirmation,
  parseConversationalPhotoEditRequest,
} from "@/lib/app-v3/maya/conversational-photo-edit"
import { isToolAllowedForMayaPath } from "@/lib/app-v3/maya/workspace-path"

describe("conversational photo edit contract", () => {
  it("accepts one unrestricted combined natural-language instruction", () => {
    const instruction =
      "Move me to a rainy Paris street, change the blazer to oxblood leather, add my product in my left hand, make my hair a sleek bun, and use a 50mm editorial flash look."
    expect(conversationalEditInstruction(instruction)).toBe(instruction)
    expect(conversationalEditInstruction("invent-an-entirely-new-edit-category")).toBe(
      "invent-an-entirely-new-edit-category"
    )
  })

  it("requires an explicit one-credit confirmation for paid apply actions", () => {
    const unconfirmed = parseConversationalPhotoEditRequest({
      workspacePath: "edit-photo",
      action: "apply",
      sourceAssetId: "ai_42",
      history: [],
    })
    expect(unconfirmed).not.toBeNull()
    expect(conversationalEditNeedsCreditConfirmation(unconfirmed!)).toBe(true)

    const confirmed = parseConversationalPhotoEditRequest({
      workspacePath: "edit-photo",
      action: "apply",
      sourceAssetId: "ai_42",
      history: [],
      creditConfirmation: {
        confirmed: true,
        expectedCost: CONVERSATIONAL_PHOTO_EDIT_CREDIT_COST,
        requestId: "edit_request_123456",
      },
    })
    expect(conversationalEditNeedsCreditConfirmation(confirmed!)).toBe(false)
  })

  it("supports a no-credit undo to one prior canonical Gallery version", () => {
    const undo = parseConversationalPhotoEditRequest({
      workspacePath: "edit-photo",
      action: "undo",
      sourceAssetId: "ai_44",
      rootAssetId: "ai_42",
      undoToAssetId: "ai_43",
      history: [{ assetId: "ai_43", instruction: "Make the blazer black" }],
    })
    expect(undo?.action).toBe("undo")
    expect(conversationalEditNeedsCreditConfirmation(undo!)).toBe(false)
  })

  it("does not accept a legacy staging asset that cannot preserve canonical lineage", () => {
    expect(
      parseConversationalPhotoEditRequest({
        workspacePath: "edit-photo",
        action: "apply",
        sourceAssetId: "gen_42",
      })
    ).toBeNull()
  })

  it("exposes edit_photo only inside the edit-photo workspace", () => {
    expect(isToolAllowedForMayaPath("edit-photo", "edit_photo")).toBe(true)
    expect(isToolAllowedForMayaPath("ai-photos", "edit_photo")).toBe(false)
    expect(isToolAllowedForMayaPath("build-post", "edit_photo")).toBe(false)
  })

  it("keeps ownership, lineage, confirmation, idempotency, and persistence failure server-side", () => {
    const route = readFileSync("app/api/app-v3/maya/edit/route.ts", "utf8")
    expect(route).toContain("resolveOwnedCanonicalEditAsset")
    expect(route).toContain("WHERE id = ${parsed.numericId} AND user_id = ${neonUserId}")
    expect(route).toContain('code: "edit_confirmation_required"')
    expect(route).toContain("conversation.creditConfirmation.requestId")
    expect(route).toContain("idempotentReplay: true")
    expect(route).toContain('code: "edit_request_already_used"')
    expect(route).toContain("variant_of")
    expect(route).toContain('code: "edit_persistence_failed"')
    expect(route).toContain("creditsDeducted: 0")
  })

  it("makes chat prepare a confirmation contract without charging or narrowing the request", () => {
    const route = readFileSync("app/api/app-v3/maya/chat/route.ts", "utf8")
    expect(route).toContain("tools.edit_photo = editPhoto")
    expect(route).toContain("Do not reduce her request to presets or a closed list")
    expect(route).toContain('status: "confirmation_required"')
    expect(route).toContain('action: "confirm_edit"')
    expect(route).toContain("This tool does not charge or edit yet")
  })
})

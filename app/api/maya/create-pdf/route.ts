import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { createMayaGeneratedAsset } from "@/lib/maya/asset-generation"

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const instruction =
      typeof body.instruction === "string" && body.instruction.trim().length > 0
        ? body.instruction.trim()
        : "Create a workbook draft I can share with my audience"

    const asset = await createMayaGeneratedAsset({
      userId: neonUser.id,
      assetType: "pdf",
      instruction,
    })

    return NextResponse.json({
      success: true,
      asset,
    })
  } catch (error) {
    console.error("[Maya Create PDF] Error:", error)
    return NextResponse.json({ error: "Failed to create workbook draft" }, { status: 500 })
  }
}

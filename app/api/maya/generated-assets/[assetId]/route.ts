import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { getMayaGeneratedAsset } from "@/lib/maya/asset-generation"

interface RouteParams {
  params: Promise<{ assetId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { assetId } = await params
    const asset = await getMayaGeneratedAsset(neonUser.id, assetId)

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      asset,
    })
  } catch (error) {
    console.error("[Maya Generated Asset] Error:", error)
    return NextResponse.json({ error: "Failed to load generated asset" }, { status: 500 })
  }
}

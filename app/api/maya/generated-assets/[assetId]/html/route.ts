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
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) {
      return new NextResponse("User not found", { status: 404 })
    }

    const { assetId } = await params
    const asset = await getMayaGeneratedAsset(neonUser.id, assetId)
    if (!asset) {
      return new NextResponse("Asset not found", { status: 404 })
    }

    return new NextResponse(asset.previewHtml, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("[Maya Generated Asset HTML] Error:", error)
    return new NextResponse("Failed to render generated asset", { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/with-auth"
import { regenerateMayaPersonalPageById } from "@/lib/maya/asset-generation"
import { logAnalyticsEvent } from "@/lib/analytics/events"

interface RouteParams {
  params: Promise<{ pageId: string }>
}

async function handleRegeneratePage(
  {
    user,
  }: {
    user: { id: string | number }
  },
  { params }: RouteParams,
): Promise<Response> {
  try {
    const { pageId } = await params
    const regenerated = await regenerateMayaPersonalPageById({
      userId: user.id,
      pageId,
    })

    void logAnalyticsEvent({
      eventName: "maya_asset_draft_updated",
      userId: String(user.id),
      path: "/api/maya/personal-pages/[pageId]/regenerate",
      properties: {
        pageId,
        assetId: regenerated.assetId,
      },
    })

    return NextResponse.json(regenerated)
  } catch (error) {
    console.error("[Maya Personal Page] Regenerate failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to regenerate page" },
      { status: 500 },
    )
  }
}

export const POST = withAuth(handleRegeneratePage)

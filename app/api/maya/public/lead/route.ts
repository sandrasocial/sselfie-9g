import { NextRequest, NextResponse } from "next/server"

import { logAnalyticsEvent } from "@/lib/analytics/events"
import { normalizeMayaPublicLeadInput } from "@/lib/maya/public-lead"
import { recordPersonalPageLead } from "@/lib/maya/personal-pages"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const normalized = normalizeMayaPublicLeadInput({
      pageId: body?.pageId,
      email: body?.email,
      name: body?.name,
      source: body?.source,
    })

    if (!normalized) {
      return NextResponse.json({ error: "Invalid lead payload" }, { status: 400 })
    }

    const result = await recordPersonalPageLead({
      pageId: normalized.pageId,
      email: normalized.email,
      name: normalized.name,
      source: normalized.source,
    })

    if (result.saved) {
      void logAnalyticsEvent({
        eventName: "maya_public_page_lead_captured",
        path: "/api/maya/public/lead",
        properties: {
          pageId: normalized.pageId,
          source: normalized.source,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Maya Public Lead] Error:", error)
    return NextResponse.json({ error: "Failed to capture lead" }, { status: 500 })
  }
}

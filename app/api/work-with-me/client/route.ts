import { NextRequest, NextResponse } from "next/server"

import { logAnalyticsEvent } from "@/lib/analytics/events"
import { sql } from "@/lib/db/client"
import { getWorkWithMeProject, hasWorkWithMeAccess } from "@/lib/work-with-me/client-project"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

export const dynamic = "force-dynamic"

const INTAKE_FIELDS = [
  "businessName",
  "businessSummary",
  "idealCustomer",
  "currentOffer",
  "marketingBurden",
  "aiAttempts",
  "weeklyOutput",
  "voiceExamples",
  "visualDirection",
  "businessLinks",
] as const

async function currentClient() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const neonUser = await getUserByAuthId(user.id)
  if (!neonUser) return null
  const userId = String(neonUser.id)
  if (!(await hasWorkWithMeAccess(userId))) return null
  return { userId }
}

export async function GET() {
  const client = await currentClient()
  if (!client) return NextResponse.json({ error: "Work With Me access required." }, { status: 403 })
  return NextResponse.json({ project: await getWorkWithMeProject(client.userId) })
}

export async function POST(request: NextRequest) {
  const client = await currentClient()
  if (!client) return NextResponse.json({ error: "Work With Me access required." }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const values = Object.fromEntries(
    INTAKE_FIELDS.map(field => [field, String(body[field] || "").trim()])
  ) as Record<(typeof INTAKE_FIELDS)[number], string>

  if (
    !values.businessName ||
    !values.businessSummary ||
    !values.idealCustomer ||
    !values.currentOffer ||
    !values.marketingBurden ||
    !values.weeklyOutput
  ) {
    return NextResponse.json({ error: "Please complete the required questions." }, { status: 400 })
  }

  const rows = await sql`
    UPDATE work_with_me_client_projects
    SET
      business_name = ${values.businessName},
      business_summary = ${values.businessSummary},
      ideal_customer = ${values.idealCustomer},
      current_offer = ${values.currentOffer},
      marketing_burden = ${values.marketingBurden},
      ai_attempts = ${values.aiAttempts || null},
      weekly_output = ${values.weeklyOutput},
      voice_examples = ${values.voiceExamples || null},
      visual_direction = ${values.visualDirection || null},
      business_links = ${values.businessLinks || null},
      intake_completed_at = COALESCE(intake_completed_at, NOW()),
      status = CASE WHEN status = 'paid' THEN 'intake_complete' ELSE status END,
      updated_at = NOW()
    WHERE user_id = ${client.userId}
    RETURNING *
  `

  if (!rows[0])
    return NextResponse.json(
      { error: "Your client workspace could not be found." },
      { status: 404 }
    )

  await logAnalyticsEvent({
    eventName: "work_with_me_intake_completed",
    userId: client.userId,
    path: "/work-with-me/welcome",
    properties: { source: "work_with_me_client_home" },
  }).catch(() => {})

  return NextResponse.json({ ok: true, project: rows[0] })
}

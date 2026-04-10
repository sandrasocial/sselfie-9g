import { NextRequest, NextResponse } from "next/server"

/**
 * One-time admin endpoint to provision Resend audience segments.
 *
 * Secured by CRON_SECRET so it can be called without a browser session:
 *   curl -X POST https://sselfie.ai/api/admin/audience/provision-segments \
 *     -H "x-cron-secret: YOUR_CRON_SECRET" | jq
 *
 * After running, paste the returned envBlock into Vercel env vars and redeploy.
 */

const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || "3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd"

const SEGMENTS = [
  { envKey: "RESEND_SEGMENT_ONBOARDING_DAY_0",      name: "Onboarding Day 0" },
  { envKey: "RESEND_SEGMENT_ONBOARDING_DAY_2",      name: "Onboarding Day 2" },
  { envKey: "RESEND_SEGMENT_ONBOARDING_DAY_7",      name: "Onboarding Day 7" },
  { envKey: "RESEND_SEGMENT_NURTURE_DAY_1",         name: "Nurture Day 1" },
  { envKey: "RESEND_SEGMENT_NURTURE_DAY_3",         name: "Nurture Day 3" },
  { envKey: "RESEND_SEGMENT_NURTURE_DAY_5",         name: "Nurture Day 5" },
  { envKey: "RESEND_SEGMENT_NURTURE_DAY_7",         name: "Nurture Day 7" },
  { envKey: "RESEND_SEGMENT_NURTURE_DAY_10",        name: "Nurture Day 10" },
  { envKey: "RESEND_SEGMENT_DISCOVERY_DAY_0",       name: "Discovery Day 0" },
  { envKey: "RESEND_SEGMENT_DISCOVERY_DAY_3",       name: "Discovery Day 3" },
  { envKey: "RESEND_SEGMENT_DISCOVERY_DAY_5",       name: "Discovery Day 5" },
  { envKey: "RESEND_SEGMENT_DISCOVERY_DAY_7",       name: "Discovery Day 7" },
  { envKey: "RESEND_SEGMENT_DISCOVERY_DAY_10",      name: "Discovery Day 10" },
  { envKey: "RESEND_SEGMENT_BLUEPRINT_DAY_3",       name: "Blueprint Day 3" },
  { envKey: "RESEND_SEGMENT_BLUEPRINT_DAY_7",       name: "Blueprint Day 7" },
  { envKey: "RESEND_SEGMENT_BLUEPRINT_DAY_14",      name: "Blueprint Day 14" },
  { envKey: "RESEND_SEGMENT_COLD_EDU_DAY_1",        name: "Cold Edu Day 1" },
  { envKey: "RESEND_SEGMENT_COLD_EDU_DAY_3",        name: "Cold Edu Day 3" },
  { envKey: "RESEND_SEGMENT_COLD_EDU_DAY_7",        name: "Cold Edu Day 7" },
  { envKey: "RESEND_SEGMENT_REACTIVATION_DAY_0",    name: "Reactivation Day 0" },
  { envKey: "RESEND_SEGMENT_REACTIVATION_DAY_2",    name: "Reactivation Day 2" },
  { envKey: "RESEND_SEGMENT_REACTIVATION_DAY_5",    name: "Reactivation Day 5" },
  { envKey: "RESEND_SEGMENT_REACTIVATION_DAY_7",    name: "Reactivation Day 7" },
  { envKey: "RESEND_SEGMENT_REACTIVATION_DAY_10",   name: "Reactivation Day 10" },
  { envKey: "RESEND_SEGMENT_REACTIVATION_DAY_14",   name: "Reactivation Day 14" },
  { envKey: "RESEND_SEGMENT_REACTIVATION_DAY_20",   name: "Reactivation Day 20" },
  { envKey: "RESEND_SEGMENT_REACTIVATION_DAY_25",   name: "Reactivation Day 25" },
  { envKey: "RESEND_SEGMENT_REENGAGEMENT_DAY_0",    name: "Reengagement Day 0" },
  { envKey: "RESEND_SEGMENT_REENGAGEMENT_DAY_7",    name: "Reengagement Day 7" },
  { envKey: "RESEND_SEGMENT_REENGAGEMENT_DAY_14",   name: "Reengagement Day 14" },
  { envKey: "RESEND_SEGMENT_UPSELL_DAY_10",         name: "Upsell Day 10" },
  { envKey: "RESEND_SEGMENT_UPSELL_FREEBIE_MEMBERSHIP", name: "Upsell Freebie to Membership" },
  { envKey: "RESEND_SEGMENT_WELCOME_DAY_0",         name: "Welcome Day 0" },
  { envKey: "RESEND_SEGMENT_WELCOME_DAY_3",         name: "Welcome Day 3" },
  { envKey: "RESEND_SEGMENT_WELCOME_DAY_7",         name: "Welcome Day 7" },
  { envKey: "RESEND_SEGMENT_WIN_BACK_OFFER",        name: "Win Back Offer" },
  { envKey: "RESEND_SEGMENT_PAID_BLUEPRINT_DAY_1",  name: "Paid Blueprint Day 1" },
  { envKey: "RESEND_SEGMENT_PAID_BLUEPRINT_DAY_3",  name: "Paid Blueprint Day 3" },
  { envKey: "RESEND_SEGMENT_PAID_BLUEPRINT_DAY_7",  name: "Paid Blueprint Day 7" },
] as const

async function resendFetch(path: string, options: RequestInit = {}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error("RESEND_API_KEY not configured")

  const res = await fetch(`https://api.resend.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })

  const text = await res.text()
  let body: any
  try {
    body = JSON.parse(text)
  } catch {
    body = { message: `Non-JSON response (${res.status}): ${text.slice(0, 200)}` }
  }

  return { status: res.status, body }
}

export async function POST(request: NextRequest) {
  // Auth: CRON_SECRET header
  const secret = request.headers.get("x-cron-secret")
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 })
  }

  // Step 1: Verify key and identify the correct audience ID
  const audiencesRes = await resendFetch("/audiences")
  if (audiencesRes.status !== 200) {
    return NextResponse.json({
      error: "Resend API unreachable",
      status: audiencesRes.status,
      body: audiencesRes.body,
      hint: "Check RESEND_API_KEY is valid and the Resend service is healthy",
    }, { status: 502 })
  }

  const audiences: any[] = audiencesRes.body?.data || []
  const audienceInfo = audiences.map((a: any) => ({ id: a.id, name: a.name, contactCount: a.contact_count }))

  // Identify which audience to use
  const targetAudience =
    audiences.find((a: any) => a.id === AUDIENCE_ID) ||
    audiences.find((a: any) => (a.contact_count || 0) > 100) ||
    audiences[0]

  const resolvedAudienceId = targetAudience?.id || AUDIENCE_ID

  // Step 2: List existing segments
  const segmentsRes = await resendFetch(`/audiences/${resolvedAudienceId}/segments`)
  const existingSegments: any[] = segmentsRes.body?.data || []
  const existingByName: Record<string, string> = {}
  for (const s of existingSegments) {
    if (s.name && s.id) existingByName[s.name] = s.id
  }

  // Step 3: Create missing segments
  const results: Array<{ envKey: string; name: string; id: string; action: string }> = []

  for (const seg of SEGMENTS) {
    const existingId = existingByName[seg.name]
    if (existingId) {
      results.push({ envKey: seg.envKey, name: seg.name, id: existingId, action: "existing" })
      continue
    }

    await new Promise((r) => setTimeout(r, 200))
    const createRes = await resendFetch(`/audiences/${resolvedAudienceId}/segments`, {
      method: "POST",
      body: JSON.stringify({ name: seg.name }),
    })

    if (createRes.status === 201 || createRes.status === 200) {
      const id = createRes.body?.id || createRes.body?.data?.id || ""
      results.push({ envKey: seg.envKey, name: seg.name, id, action: "created" })
    } else if (createRes.status === 409 || createRes.body?.message?.includes("already")) {
      // Already exists — re-fetch segments list to get the ID
      const refetch = await resendFetch(`/audiences/${resolvedAudienceId}/segments`)
      const all: any[] = refetch.body?.data || []
      const found = all.find((s: any) => s.name === seg.name)
      results.push({ envKey: seg.envKey, name: seg.name, id: found?.id || "", action: "found_on_refetch" })
    } else {
      results.push({ envKey: seg.envKey, name: seg.name, id: "", action: `error:${createRes.status}:${createRes.body?.message}` })
    }
  }

  // Build env block for easy copy-paste
  const envBlock = results.map((r) => `${r.envKey}="${r.id}"`).join("\n")
  const created = results.filter((r) => r.action === "created").length
  const existing = results.filter((r) => r.action === "existing" || r.action === "found_on_refetch").length
  const failed = results.filter((r) => r.id === "").length

  return NextResponse.json({
    success: failed === 0,
    summary: { created, existing, failed, total: results.length },
    audiences: audienceInfo,
    resolvedAudienceId,
    audienceIdNote: resolvedAudienceId !== AUDIENCE_ID
      ? `⚠️ Resolved audience differs from RESEND_AUDIENCE_ID env var. Update RESEND_AUDIENCE_ID to: ${resolvedAudienceId}`
      : "✅ Audience ID matches RESEND_AUDIENCE_ID env var",
    envBlock,
    results,
  })
}

import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db/client"
import {
  enforceSourceAwareRouting,
  ensureBrandEngineApplicationsSchema,
  expectedOfferValueCents,
  normalizeLeadSourceChannel,
  resolveLeadSource,
} from "@/lib/brand-engine/applications"
import { requireAdmin } from "@/lib/admin-feature-flags"

function sanitizeHandle(handle: string) {
  return handle.replace(/^@/, "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin()
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: adminCheck.error || "Unauthorized" },
        { status: adminCheck.error === "Not authenticated" ? 401 : 403 },
      )
    }

    const payload = await req.json()
    const { name, email, instagramHandle, sourceCampaign, sourceChannel, sourceDetail, notes, offerType } = payload ?? {}

    if (!name || typeof name !== "string") {
      return NextResponse.json({ success: false, error: "Name is required." }, { status: 400 })
    }

    const handle = typeof instagramHandle === "string" ? sanitizeHandle(instagramHandle) : ""
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : ""
    if (!normalizedEmail && !handle) {
      return NextResponse.json(
        { success: false, error: "Email or Instagram handle is required." },
        { status: 400 },
      )
    }

    const syntheticEmail = normalizedEmail || `${handle || "dm-lead"}.${Date.now()}@instagram-dm.local`
    const normalizedOfferType = typeof offerType === "string" ? offerType.toLowerCase() : "cohort"
    const campaign =
      typeof sourceCampaign === "string" && sourceCampaign.trim().length > 0
        ? sourceCampaign.trim().toLowerCase()
        : "ig_day1_dm_cohort"
    const normalizedSourceChannel = normalizeLeadSourceChannel(sourceChannel || "admin_manual")
    const fallbackDetail = handle ? `campaign:${campaign}; handle:${handle}` : `campaign:${campaign}`
    const source = resolveLeadSource(normalizedSourceChannel, sourceDetail || fallbackDetail)
    const sourceAwareRouting = enforceSourceAwareRouting({
      sourceChannel: source.channel,
      routingPath: "fit_call",
      nextAction: "book_call",
      callRequired: true,
      checkoutMode: "none",
      checkoutModeReason: "dm_bridge_fit_call_required",
    })

    const sql = getDb()
    await ensureBrandEngineApplicationsSchema(sql)

    const existing = await sql`
      SELECT id, email, pipeline_stage
      FROM brand_engine_applications
      WHERE LOWER(email) = LOWER(${syntheticEmail})
      LIMIT 1
    `

    if ((existing as any[]).length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Lead already exists.",
          existing: (existing as any[])[0],
        },
        { status: 409 },
      )
    }

    const dmNoteParts = [
      "[dm-intake]",
      `[source=${source.channel}]`,
      `campaign=${campaign}`,
      handle ? `instagram=@${handle}` : null,
      notes ? `note=${String(notes).trim()}` : null,
      `draft_mode=true`,
    ].filter(Boolean)

    const leadTags = [
      "brand-engine",
      "dm-intake",
      `offer:${normalizedOfferType}`,
      `source:${source.channel}`,
      `campaign:${campaign}`,
      `route:${sourceAwareRouting.routingPath}`,
      `next_action:${sourceAwareRouting.nextAction}`,
      `checkout:${sourceAwareRouting.checkoutMode}`,
    ]

    const website = handle ? `https://instagram.com/${handle}` : null
    const result = await sql`
      INSERT INTO brand_engine_applications (
        name,
        email,
        website,
        offer_type,
        revenue,
        current_spend,
        biggest_bottleneck,
        hours_per_week,
        business_description,
        why_interested,
        ready_to_invest,
        qualified,
        status,
        pipeline_stage,
        qualification_score,
        qualification_notes,
        priority_tier,
        routing_path,
        next_action,
        call_required,
        source_channel,
        source_detail,
        lead_tags,
        expected_value_cents,
        checkout_mode,
        checkout_mode_reason,
        draft_mode,
        notes,
        created_at,
        updated_at
      )
      VALUES (
        ${name.trim()},
        ${syntheticEmail},
        ${website},
        ${normalizedOfferType},
        ${"unknown"},
        ${"unknown"},
        ${"DM lead - needs qualification call"},
        ${"unknown"},
        ${"Inbound DM lead from cohort campaign"},
        ${"Requested cohort details via Instagram DM"},
        ${"maybe"},
        ${true},
        ${"contacted"},
        ${"contacted"},
        ${50},
        ${"dm_quick_add"},
        ${"medium"},
        ${sourceAwareRouting.routingPath},
        ${sourceAwareRouting.nextAction},
        ${sourceAwareRouting.callRequired},
        ${source.channel},
        ${source.detail},
        ${JSON.stringify(leadTags)}::jsonb,
        ${expectedOfferValueCents(normalizedOfferType)},
        ${sourceAwareRouting.checkoutMode},
        ${sourceAwareRouting.checkoutModeReason || "non_direct_offer_route"},
        ${true},
        ${dmNoteParts.join("; ")},
        NOW(),
        NOW()
      )
      RETURNING id, name, email, pipeline_stage, qualification_score, created_at
    `

    return NextResponse.json({
      success: true,
      lead: (result as any[])[0],
    })
  } catch (error) {
    console.error("[Brand Engine Quick Add] Error:", error)
    return NextResponse.json({ success: false, error: "Something went wrong." }, { status: 500 })
  }
}
